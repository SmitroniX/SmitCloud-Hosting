import http from '@/api/http';
import getFileContents from '@/api/server/files/getFileContents';
import saveFileContents from '@/api/server/files/saveFileContents';

export interface PerformanceSettings {
    viewDistance: number;
    simulationDistance: number;
    networkCompression: number;
    syncChunkWrites: boolean;
    entityBroadcastRange: number;
}

export const executeSparkCommand = async (uuid: string, command: string): Promise<void> => {
    await http.post(`/api/client/servers/${uuid}/command`, { command });
};

export const fetchPerformanceSettings = async (uuid: string): Promise<PerformanceSettings> => {
    try {
        const content = await getFileContents(uuid, '/server.properties');
        const viewMatch = content.match(/^view-distance=(\d+)/m);
        const simMatch = content.match(/^simulation-distance=(\d+)/m);
        const netMatch = content.match(/^network-compression-threshold=(\d+)/m);
        const syncMatch = content.match(/^sync-chunk-writes=(true|false)/m);
        const entityMatch = content.match(/^entity-broadcast-range-percentage=(\d+)/m);

        return {
            viewDistance: viewMatch ? parseInt(viewMatch[1], 10) : 10,
            simulationDistance: simMatch ? parseInt(simMatch[1], 10) : 10,
            networkCompression: netMatch ? parseInt(netMatch[1], 10) : 256,
            syncChunkWrites: syncMatch ? syncMatch[1] === 'true' : true,
            entityBroadcastRange: entityMatch ? parseInt(entityMatch[1], 10) : 100,
        };
    } catch {
        return {
            viewDistance: 10,
            simulationDistance: 10,
            networkCompression: 256,
            syncChunkWrites: true,
            entityBroadcastRange: 100,
        };
    }
};

export const applyOptimalSettings = async (uuid: string): Promise<void> => {
    let content = '';
    try {
        content = await getFileContents(uuid, '/server.properties');
    } catch {
        // empty
    }

    const updates: Record<string, string> = {
        'view-distance': '8',
        'simulation-distance': '6',
        'network-compression-threshold': '256',
        'sync-chunk-writes': 'false',
        'entity-broadcast-range-percentage': '80',
    };

    let updated = content;
    for (const [key, value] of Object.entries(updates)) {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (updated.match(regex)) {
            updated = updated.replace(regex, `${key}=${value}`);
        } else {
            updated += `\n${key}=${value}`;
        }
    }

    await saveFileContents(uuid, '/server.properties', updated);
};
