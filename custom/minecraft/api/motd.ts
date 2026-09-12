import getFileContents from '@/api/server/files/getFileContents';
import saveFileContents from '@/api/server/files/saveFileContents';
import getFileUploadUrl from '@/api/server/files/getFileUploadUrl';
import axios from 'axios';

export interface MOTDConfig {
    rawMotd: string;
    line1: string;
    line2: string;
    cleanMotd: string;
    serverIconExists: boolean;
}

export const parsePropertiesMotd = (propertiesContent: string): string => {
    const match = propertiesContent.match(/^motd=(.*)$/m);
    return match ? match[1] : 'A Minecraft Server';
};

export const loadMotdConfig = async (uuid: string): Promise<MOTDConfig> => {
    let rawMotd = 'A Minecraft Server';
    let serverIconExists = false;

    try {
        const props = await getFileContents(uuid, '/server.properties');
        rawMotd = parsePropertiesMotd(props);
    } catch {
        // server.properties might not exist yet
    }

    try {
        // Check if server-icon.png exists by fetching its head/stat or contents
        await getFileContents(uuid, '/server-icon.png');
        serverIconExists = true;
    } catch {
        serverIconExists = false;
    }

    // Split by \n or literal \n
    const lines = rawMotd.split(/\\n|\n/);
    const line1 = lines[0] || '';
    const line2 = lines.slice(1).join(' ') || '';

    // Strip formatting codes for clean preview
    const cleanMotd = rawMotd.replace(/§[0-9a-fk-or]|&[0-9a-fk-or]|\\u00A7[0-9a-fk-or]/gi, '');

    return {
        rawMotd,
        line1,
        line2,
        cleanMotd,
        serverIconExists,
    };
};

export const saveMotdConfig = async (uuid: string, line1: string, line2: string): Promise<void> => {
    let fullMotd = line2.trim() ? `${line1}\\n${line2}` : line1;

    try {
        let props = await getFileContents(uuid, '/server.properties');
        if (/^motd=.*$/m.test(props)) {
            props = props.replace(/^motd=.*$/m, `motd=${fullMotd}`);
        } else {
            props += `\nmotd=${fullMotd}\n`;
        }
        await saveFileContents(uuid, '/server.properties', props);
    } catch {
        await saveFileContents(uuid, '/server.properties', `motd=${fullMotd}\n`);
    }
};

/**
 * Upload a processed 64x64 PNG File directly to server root as server-icon.png
 */
export const uploadServerIcon = async (uuid: string, file: File): Promise<void> => {
    const uploadUrl = await getFileUploadUrl(uuid);
    const formData = new FormData();
    formData.append('files', file, 'server-icon.png');

    await axios.post(`${uploadUrl}&directory=/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

/**
 * Format Minecraft color codes to HTML spans for previewing
 */
export const minecraftColorMap: { [key: string]: string } = {
    '0': '#000000',
    '1': '#0000aa',
    '2': '#00aa00',
    '3': '#00aaaa',
    '4': '#aa0000',
    '5': '#aa00aa',
    '6': '#ffaa00',
    '7': '#aaaaaa',
    '8': '#555555',
    '9': '#5555ff',
    a: '#55ff55',
    b: '#55ffff',
    c: '#ff5555',
    d: '#ff55ff',
    e: '#ffff55',
    f: '#ffffff',
};
