import getFileContents from '@/api/server/files/getFileContents';
import saveFileContents from '@/api/server/files/saveFileContents';
import axios from 'axios';

export interface WhitelistEntry {
    uuid: string;
    name: string;
}

export interface OpEntry {
    uuid: string;
    name: string;
    level: number; // 1 to 4
    bypassesPlayerLimit: boolean;
}

export interface BannedPlayerEntry {
    uuid: string;
    name: string;
    created: string;
    source: string;
    expires: string;
    reason: string;
}

export interface BannedIpEntry {
    ip: string;
    created: string;
    source: string;
    expires: string;
    reason: string;
}

export interface ModerationData {
    whitelistEnabled: boolean;
    whitelist: WhitelistEntry[];
    ops: OpEntry[];
    bannedPlayers: BannedPlayerEntry[];
    bannedIps: BannedIpEntry[];
}

/**
 * Resolve username to UUID via Mojang API
 */
export const resolvePlayerUuid = async (username: string): Promise<{ name: string; uuid: string } | null> => {
    try {
        const res = await axios.get(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(username)}`, {
            timeout: 5000,
        });
        if (res.data && res.data.id) {
            // Convert unhyphenated UUID to standard UUID format
            const raw = res.data.id;
            const formatted = `${raw.substr(0, 8)}-${raw.substr(8, 4)}-${raw.substr(12, 4)}-${raw.substr(16, 4)}-${raw.substr(20)}`;
            return { name: res.data.name, uuid: formatted };
        }
        return null;
    } catch {
        return null;
    }
};

export const fetchModerationData = async (uuid: string): Promise<ModerationData> => {
    let whitelistEnabled = false;
    let whitelist: WhitelistEntry[] = [];
    let ops: OpEntry[] = [];
    let bannedPlayers: BannedPlayerEntry[] = [];
    let bannedIps: BannedIpEntry[] = [];

    // Check server.properties for white-list=true
    try {
        const props = await getFileContents(uuid, '/server.properties');
        whitelistEnabled = /^white-list=true/im.test(props);
    } catch {
        whitelistEnabled = false;
    }

    try {
        const raw = await getFileContents(uuid, '/whitelist.json');
        whitelist = JSON.parse(raw);
    } catch {
        whitelist = [];
    }

    try {
        const raw = await getFileContents(uuid, '/ops.json');
        ops = JSON.parse(raw);
    } catch {
        ops = [];
    }

    try {
        const raw = await getFileContents(uuid, '/banned-players.json');
        bannedPlayers = JSON.parse(raw);
    } catch {
        bannedPlayers = [];
    }

    try {
        const raw = await getFileContents(uuid, '/banned-ips.json');
        bannedIps = JSON.parse(raw);
    } catch {
        bannedIps = [];
    }

    return {
        whitelistEnabled,
        whitelist: Array.isArray(whitelist) ? whitelist : [],
        ops: Array.isArray(ops) ? ops : [],
        bannedPlayers: Array.isArray(bannedPlayers) ? bannedPlayers : [],
        bannedIps: Array.isArray(bannedIps) ? bannedIps : [],
    };
};

export const toggleWhitelist = async (uuid: string, enable: boolean): Promise<void> => {
    try {
        let props = await getFileContents(uuid, '/server.properties');
        if (/^white-list=.*$/m.test(props)) {
            props = props.replace(/^white-list=.*$/m, `white-list=${enable}`);
        } else {
            props += `\nwhite-list=${enable}\n`;
        }
        await saveFileContents(uuid, '/server.properties', props);
    } catch {
        await saveFileContents(uuid, '/server.properties', `white-list=${enable}\n`);
    }
};

export const saveWhitelist = async (uuid: string, list: WhitelistEntry[]): Promise<void> => {
    await saveFileContents(uuid, '/whitelist.json', JSON.stringify(list, null, 2));
};

export const saveOps = async (uuid: string, list: OpEntry[]): Promise<void> => {
    await saveFileContents(uuid, '/ops.json', JSON.stringify(list, null, 2));
};

export const saveBannedPlayers = async (uuid: string, list: BannedPlayerEntry[]): Promise<void> => {
    await saveFileContents(uuid, '/banned-players.json', JSON.stringify(list, null, 2));
};

export const saveBannedIps = async (uuid: string, list: BannedIpEntry[]): Promise<void> => {
    await saveFileContents(uuid, '/banned-ips.json', JSON.stringify(list, null, 2));
};
