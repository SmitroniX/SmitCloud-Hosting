import http from '@/api/http';
import getFileContents from '@/api/server/files/getFileContents';
import getFileDownloadUrl from '@/api/server/files/getFileDownloadUrl';
import axios from 'axios';
import { parsePlayerDat, PlayerProfileData } from '@/api/server/minecraft/nbtParser';

export interface MinecraftPlayer {
    uuid?: string;
    name: string;
    level?: number;
    bypassesPlayerLimit?: boolean;
    created?: string;
    source?: string;
    expires?: string;
    reason?: string;
    isOnline?: boolean;
    isOp?: boolean;
    isWhitelisted?: boolean;
    isBanned?: boolean;
}

export interface MinecraftBannedIp {
    ip: string;
    created?: string;
    source?: string;
    expires?: string;
    reason?: string;
}

export interface CachedPlayer {
    uuid: string;
    name: string;
    expiresOn?: string;
}

export const sendServerCommand = async (uuid: string, command: string): Promise<void> => {
    await http.post(`/api/client/servers/${uuid}/command`, { command });
};

export const getUserCache = async (uuid: string): Promise<CachedPlayer[]> => {
    try {
        const raw = await getFileContents(uuid, '/usercache.json');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
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

export const getActiveWorld = async (uuid: string): Promise<string> => {
    try {
        const content = await getFileContents(uuid, '/server.properties');
        const match = content.match(/^level-name=(.+)$/m);
        return match && match[1] ? match[1].trim() : 'world';
    } catch {
        return 'world';
    }
};

/**
 * Fetch and decode the full player NBT file (.dat) for location, inventory, health, and stats
 */
export const fetchPlayerProfile = async (
    serverUuid: string,
    playerUuid: string,
    playerName: string,
    isOnline = false
): Promise<PlayerProfileData> => {
    const worldName = await getActiveWorld(serverUuid);
    const possiblePaths = [
        `/${worldName}/players/data/${playerUuid}.dat`,
        `/${worldName}/playerdata/${playerUuid}.dat`,
        `/world/players/data/${playerUuid}.dat`,
        `/world/playerdata/${playerUuid}.dat`,
    ];

    for (const filePath of possiblePaths) {
        try {
            const downloadUrl = await getFileDownloadUrl(serverUuid, filePath);
            const res = await axios.get(downloadUrl, {
                responseType: 'arraybuffer',
                timeout: 8000,
            });

            if (res.data && res.data.byteLength > 0) {
                return await parsePlayerDat(res.data, playerUuid, playerName, isOnline);
            }
        } catch {
            // Try next possible path
        }
    }

    // Fallback profile if .dat file is not accessible
    return {
        uuid: playerUuid,
        name: playerName,
        isOnline,
        dimension: 'minecraft:overworld',
        pos: [0, 64, 0],
        rotation: [0, 0],
        health: 20,
        maxHealth: 20,
        foodLevel: 20,
        foodSaturationLevel: 5,
        xpLevel: 0,
        xpProgress: 0,
        gameMode: 0,
        inventory: [],
        enderItems: [],
    };
};

/**
 * Admin action helpers
 */
export const teleportPlayerToCoords = async (
    uuid: string,
    player: string,
    x: number,
    y: number,
    z: number
): Promise<void> => {
    await sendServerCommand(uuid, `tp ${player} ${x} ${y} ${z}`);
};

export const teleportPlayerToPlayer = async (
    uuid: string,
    player: string,
    target: string
): Promise<void> => {
    await sendServerCommand(uuid, `tp ${player} ${target}`);
};

export const healPlayer = async (uuid: string, player: string): Promise<void> => {
    await sendServerCommand(uuid, `effect give ${player} instant_health 1 255`);
    await sendServerCommand(uuid, `effect give ${player} saturation 1 255`);
};

export const setPlayerGamemode = async (uuid: string, player: string, gamemode: string): Promise<void> => {
    await sendServerCommand(uuid, `gamemode ${gamemode} ${player}`);
};

export const givePlayerItem = async (
    uuid: string,
    player: string,
    item: string,
    count = 1
): Promise<void> => {
    const cleanItem = item.startsWith('minecraft:') ? item : `minecraft:${item}`;
    await sendServerCommand(uuid, `give ${player} ${cleanItem} ${count}`);
};

export const clearPlayerInventory = async (uuid: string, player: string): Promise<void> => {
    await sendServerCommand(uuid, `clear ${player}`);
};

export const smitePlayer = async (uuid: string, player: string): Promise<void> => {
    await sendServerCommand(uuid, `execute at ${player} run summon lightning_bolt`);
};

export const killPlayer = async (uuid: string, player: string): Promise<void> => {
    await sendServerCommand(uuid, `kill ${player}`);
};
