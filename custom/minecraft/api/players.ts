import http from '@/api/http';
import getFileContents from '@/api/server/files/getFileContents';

export interface MinecraftPlayer {
    uuid?: string;
    name: string;
    level?: number;
    bypassesPlayerLimit?: boolean;
    created?: string;
    source?: string;
    expires?: string;
    reason?: string;
}

export interface MinecraftBannedIp {
    ip: string;
    created?: string;
    source?: string;
    expires?: string;
    reason?: string;
}

export const sendServerCommand = async (uuid: string, command: string): Promise<void> => {
    await http.post(`/api/client/servers/${uuid}/command`, { command });
};

export const getWhitelist = async (uuid: string): Promise<MinecraftPlayer[]> => {
    try {
        const raw = await getFileContents(uuid, '/whitelist.json');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

export const getOperators = async (uuid: string): Promise<MinecraftPlayer[]> => {
    try {
        const raw = await getFileContents(uuid, '/ops.json');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

export const getBannedPlayers = async (uuid: string): Promise<MinecraftPlayer[]> => {
    try {
        const raw = await getFileContents(uuid, '/banned-players.json');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

export const getBannedIps = async (uuid: string): Promise<MinecraftBannedIp[]> => {
    try {
        const raw = await getFileContents(uuid, '/banned-ips.json');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};
