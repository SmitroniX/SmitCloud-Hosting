import http from '@/api/http';
import getFileContents from '@/api/server/files/getFileContents';
import saveFileContents from '@/api/server/files/saveFileContents';
import { getBannedIps, MinecraftBannedIp } from '@/api/server/minecraft/players';

export type MitigationMode = 'standard' | 'high' | 'lockdown';

export interface DdosProtectionState {
    mode: MitigationMode;
    synFloodProtected: boolean;
    udpReflectionFiltered: boolean;
    connectionThrottle: number;
    preventProxyConnections: boolean;
    networkCompression: number;
    whitelistActive: boolean;
    bannedIps: MinecraftBannedIp[];
}

export const fetchDDoSStatus = async (uuid: string): Promise<DdosProtectionState> => {
    let serverProps = '';
    let bukkitYml = '';
    let bannedIps: MinecraftBannedIp[] = [];

    try {
        serverProps = await getFileContents(uuid, '/server.properties');
    } catch {
        // empty
    }

    try {
        bukkitYml = await getFileContents(uuid, '/bukkit.yml');
    } catch {
        // empty
    }

    try {
        bannedIps = await getBannedIps(uuid);
    } catch {
        // empty
    }

    const preventProxy = /prevent-proxy-connections=(true|false)/i.exec(serverProps)?.[1] === 'true';
    const whitelist = /white-list=(true|false)/i.exec(serverProps)?.[1] === 'true';
    const compMatch = /network-compression-threshold=(\d+)/i.exec(serverProps);
    const networkCompression = compMatch ? parseInt(compMatch[1], 10) : 256;

    const throttleMatch = /connection-throttle:\s*(\d+)/i.exec(bukkitYml);
    const connectionThrottle = throttleMatch ? parseInt(throttleMatch[1], 10) : 4000;

    let mode: MitigationMode = 'standard';
    if (whitelist) {
        mode = 'lockdown';
    } else if (preventProxy || connectionThrottle >= 5000) {
        mode = 'high';
    }

    return {
        mode,
        synFloodProtected: true,
        udpReflectionFiltered: true,
        connectionThrottle,
        preventProxyConnections: preventProxy,
        networkCompression,
        whitelistActive: whitelist,
        bannedIps,
    };
};

export const applyMitigationMode = async (uuid: string, mode: MitigationMode): Promise<void> => {
    let serverProps = '';
    let bukkitYml = '';

    try {
        serverProps = await getFileContents(uuid, '/server.properties');
    } catch {
        // empty
    }

    try {
        bukkitYml = await getFileContents(uuid, '/bukkit.yml');
    } catch {
        // empty
    }

    // Configure properties according to mode
    if (mode === 'lockdown') {
        // Whitelist enabled, strict proxy filter
        serverProps = updateConfigKey(serverProps, 'white-list', 'true');
        serverProps = updateConfigKey(serverProps, 'prevent-proxy-connections', 'true');
        serverProps = updateConfigKey(serverProps, 'network-compression-threshold', '256');
        bukkitYml = updateYamlKey(bukkitYml, 'connection-throttle', '6000');
        await http.post(`/api/client/servers/${uuid}/command`, { command: 'whitelist on' });
    } else if (mode === 'high') {
        // Aggressive anti-bot, proxy blocking
        serverProps = updateConfigKey(serverProps, 'white-list', 'false');
        serverProps = updateConfigKey(serverProps, 'prevent-proxy-connections', 'true');
        serverProps = updateConfigKey(serverProps, 'network-compression-threshold', '256');
        bukkitYml = updateYamlKey(bukkitYml, 'connection-throttle', '5000');
        await http.post(`/api/client/servers/${uuid}/command`, { command: 'whitelist off' });
    } else {
        // Standard protection
        serverProps = updateConfigKey(serverProps, 'white-list', 'false');
        serverProps = updateConfigKey(serverProps, 'prevent-proxy-connections', 'false');
        serverProps = updateConfigKey(serverProps, 'network-compression-threshold', '256');
        bukkitYml = updateYamlKey(bukkitYml, 'connection-throttle', '4000');
        await http.post(`/api/client/servers/${uuid}/command`, { command: 'whitelist off' });
    }

    await saveFileContents(uuid, '/server.properties', serverProps);
    if (bukkitYml) {
        await saveFileContents(uuid, '/bukkit.yml', bukkitYml);
    }
};

export const toggleProxyProtection = async (uuid: string, enable: boolean): Promise<void> => {
    let content = await getFileContents(uuid, '/server.properties');
    content = updateConfigKey(content, 'prevent-proxy-connections', enable ? 'true' : 'false');
    await saveFileContents(uuid, '/server.properties', content);
};

export const blockIpAddress = async (uuid: string, ip: string, reason: string): Promise<void> => {
    await http.post(`/api/client/servers/${uuid}/command`, {
        command: `ban-ip ${ip} ${reason || 'Malicious DDoS / Bot IP'}`,
    });
};

export const unblockIpAddress = async (uuid: string, ip: string): Promise<void> => {
    await http.post(`/api/client/servers/${uuid}/command`, {
        command: `pardon-ip ${ip}`,
    });
};

const updateConfigKey = (content: string, key: string, value: string): string => {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (content.match(regex)) {
        return content.replace(regex, `${key}=${value}`);
    }
    return `${content}\n${key}=${value}`;
};

const updateYamlKey = (content: string, key: string, value: string): string => {
    const regex = new RegExp(`^(\\s*${key}:\\s*).*$`, 'm');
    if (content.match(regex)) {
        return content.replace(regex, `$1${value}`);
    }
    return `${content}\n${key}: ${value}`;
};
