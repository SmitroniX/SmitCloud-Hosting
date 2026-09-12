import loadDirectory, { FileObject } from '@/api/server/files/loadDirectory';
import getFileContents from '@/api/server/files/getFileContents';
import saveFileContents from '@/api/server/files/saveFileContents';
import http from '@/api/http';
import axios from 'axios';

export interface MapPluginStatus {
    hasBlueMap: boolean;
    hasDynmap: boolean;
    configuredPort: number;
    mapType: 'bluemap' | 'dynmap' | 'none';
    webUrl: string;
}

export const checkMapStatus = async (uuid: string, serverIp: string): Promise<MapPluginStatus> => {
    let hasBlueMap = false;
    let hasDynmap = false;
    let configuredPort = 8100;
    let mapType: 'bluemap' | 'dynmap' | 'none' = 'none';

    try {
        const files: FileObject[] = await loadDirectory(uuid, '/plugins');
        hasBlueMap = files.some((f) => f.name.toLowerCase().includes('bluemap'));
        hasDynmap = files.some((f) => f.name.toLowerCase().includes('dynmap'));
    } catch {
        // no plugins folder
    }

    if (hasBlueMap) {
        mapType = 'bluemap';
        try {
            const conf = await getFileContents(uuid, '/plugins/BlueMap/webserver.conf');
            const match = conf.match(/port:\s*(\d+)/i);
            if (match) configuredPort = parseInt(match[1], 10);
        } catch {
            configuredPort = 8100;
        }
    } else if (hasDynmap) {
        mapType = 'dynmap';
        try {
            const conf = await getFileContents(uuid, '/plugins/dynmap/configuration.txt');
            const match = conf.match(/webserver-port:\s*(\d+)/i);
            if (match) configuredPort = parseInt(match[1], 10);
        } catch {
            configuredPort = 8123;
        }
    }

    const host = serverIp || 'play.shadowpixel.fun';
    const webUrl = `http://${host}:${configuredPort}`;

    return {
        hasBlueMap,
        hasDynmap,
        configuredPort,
        mapType,
        webUrl,
    };
};

export const installBlueMap = async (uuid: string): Promise<void> => {
    // Fetch latest BlueMap release from Modrinth API
    const res = await axios.get('https://api.modrinth.com/v2/project/bluemap/version', { timeout: 8000 });
    const latest = res.data?.[0];
    const file = latest?.files?.find((f: any) => f.primary && f.filename.endsWith('.jar')) || latest?.files?.[0];

    if (!file || !file.url) {
        throw new Error('Unable to find BlueMap release jar on Modrinth');
    }

    await http.post(`/api/client/servers/${uuid}/files/pull`, {
        url: file.url,
        directory: '/plugins',
        filename: file.filename || 'BlueMap.jar',
        use_header: true,
    });
};

export const installDynmap = async (uuid: string): Promise<void> => {
    // Fetch latest Dynmap release from Modrinth API
    const res = await axios.get('https://api.modrinth.com/v2/project/dynmap/version', { timeout: 8000 });
    const latest = res.data?.[0];
    const file = latest?.files?.find((f: any) => f.primary && f.filename.endsWith('.jar')) || latest?.files?.[0];

    if (!file || !file.url) {
        throw new Error('Unable to find Dynmap release jar on Modrinth');
    }

    await http.post(`/api/client/servers/${uuid}/files/pull`, {
        url: file.url,
        directory: '/plugins',
        filename: file.filename || 'Dynmap.jar',
        use_header: true,
    });
};

export const configureMapPort = async (uuid: string, mapType: 'bluemap' | 'dynmap', port: number): Promise<void> => {
    if (mapType === 'bluemap') {
        try {
            let conf = await getFileContents(uuid, '/plugins/BlueMap/webserver.conf');
            conf = conf.replace(/port:\s*\d+/i, `port: ${port}`);
            await saveFileContents(uuid, '/plugins/BlueMap/webserver.conf', conf);
        } catch {
            // file might not exist before first boot
        }
    } else if (mapType === 'dynmap') {
        try {
            let conf = await getFileContents(uuid, '/plugins/dynmap/configuration.txt');
            conf = conf.replace(/webserver-port:\s*\d+/i, `webserver-port: ${port}`);
            await saveFileContents(uuid, '/plugins/dynmap/configuration.txt', conf);
        } catch {
            // file might not exist before first boot
        }
    }
};
