import http from '@/api/http';
import loadDirectory, { FileObject } from '@/api/server/files/loadDirectory';
import createDirectory from '@/api/server/files/createDirectory';
import deleteFiles from '@/api/server/files/deleteFiles';
import getFileContents from '@/api/server/files/getFileContents';
import saveFileContents from '@/api/server/files/saveFileContents';

export interface GeyserConfig {
    bedrockAddress: string;
    bedrockPort: number;
    remoteAddress: string;
    remotePort: number;
    authType: 'floodgate' | 'online' | 'offline';
    motd1: string;
    motd2: string;
    serverName: string;
    passthroughMotd: boolean;
    passthroughPlayerCounts: boolean;
    showCoordinates: boolean;
    customSkinLoader: boolean;
}

export interface GeyserStatus {
    isGeyserInstalled: boolean;
    isFloodgateInstalled: boolean;
    geyserJarName?: string;
    floodgateJarName?: string;
    hasConfig: boolean;
    config?: GeyserConfig;
    rawConfig?: string;
}

export const GEYSER_DOWNLOAD_URL =
    'https://download.geysermc.org/v2/projects/geyser/versions/latest/builds/latest/downloads/spigot';
export const FLOODGATE_DOWNLOAD_URL =
    'https://download.geysermc.org/v2/projects/floodgate/versions/latest/builds/latest/downloads/spigot';

const parseYamlValue = (content: string, key: string): string | null => {
    const regex = new RegExp(`^\\s*${key}:\\s*(.+)$`, 'm');
    const match = content.match(regex);
    if (!match) return null;
    return match[1].trim().replace(/^["']|["']$/g, '');
};

export const parseGeyserConfig = (raw: string): GeyserConfig => {
    const portMatch = raw.match(/bedrock:\s*\n(?:[^\n]*\n)*?\s*port:\s*(\d+)/i) || raw.match(/port:\s*(\d+)/i);
    const remotePortMatch = raw.match(/remote:\s*\n(?:[^\n]*\n)*?\s*port:\s*(\d+)/i);
    const authTypeMatch = raw.match(/auth-type:\s*([a-zA-Z]+)/i);
    const motd1 = parseYamlValue(raw, 'motd1') || 'SmitCloud Crossplay Server';
    const motd2 = parseYamlValue(raw, 'motd2') || 'Bedrock & Java Supported';
    const serverName = parseYamlValue(raw, 'server-name') || 'SmitCloud Bedrock';

    const passthroughMotd = parseYamlValue(raw, 'passthrough-motd') === 'true';
    const passthroughPlayerCounts = parseYamlValue(raw, 'passthrough-player-counts') === 'true';
    const showCoordinates = parseYamlValue(raw, 'show-coordinates') !== 'false';
    const customSkinLoader = parseYamlValue(raw, 'custom-skin-loader') !== 'false';

    let authType: 'floodgate' | 'online' | 'offline' = 'floodgate';
    if (authTypeMatch) {
        const val = authTypeMatch[1].toLowerCase();
        if (val === 'online' || val === 'offline') {
            authType = val;
        }
    }

    return {
        bedrockAddress: parseYamlValue(raw, 'address') || '0.0.0.0',
        bedrockPort: portMatch ? parseInt(portMatch[1], 10) : 19132,
        remoteAddress: '127.0.0.1',
        remotePort: remotePortMatch ? parseInt(remotePortMatch[1], 10) : 25565,
        authType,
        motd1,
        motd2,
        serverName,
        passthroughMotd,
        passthroughPlayerCounts,
        showCoordinates,
        customSkinLoader,
    };
};

export const generateOptimalGeyserConfig = (options: {
    bedrockPort: number;
    javaPort: number;
    serverName?: string;
    authType?: 'floodgate' | 'online' | 'offline';
}): string => {
    const { bedrockPort, javaPort, serverName = 'SmitCloud Crossplay', authType = 'floodgate' } = options;

    return `# ----------------------------------------------------
# Geyser Configuration File - Auto-Configured by SmitCloud
# ----------------------------------------------------

bedrock:
  address: 0.0.0.0
  port: ${bedrockPort}
  clone-remote-port: false
  motd1: "${serverName}"
  motd2: "Bedrock & Java Crossplay"
  server-name: "${serverName}"
  compression-level: 6
  broadcast-port: ${bedrockPort}

remote:
  address: 127.0.0.1
  port: ${javaPort}
  auth-type: ${authType}
  use-proxy-protocol: false

floodgate:
  key-file: key.pem

saved-user-logins: []
user-auths: {}

command-suggestions: true
passthrough-motd: true
passthrough-player-counts: true
legacy-ping-passthrough: false
ping-passthrough-interval: 3
forward-player-ping: true

max-players: 100
debug-mode: false
allow-third-party-capes: true
show-coordinates: true
show-custom-skulls: true
custom-skin-loader: true
default-locale: "en_us"
cache-chunks: false

scoreboard:
  enable: true

metrics:
  enabled: true
`;
};

export const getGeyserStatus = async (uuid: string): Promise<GeyserStatus> => {
    let plugins: FileObject[] = [];
    try {
        plugins = await loadDirectory(uuid, '/plugins');
    } catch {
        plugins = [];
    }

    const geyserFile = plugins.find((f) => f.isFile && /geyser.*\.jar/i.test(f.name));
    const floodgateFile = plugins.find((f) => f.isFile && /floodgate.*\.jar/i.test(f.name));

    let hasConfig = false;
    let rawConfig = '';
    let config: GeyserConfig | undefined = undefined;

    try {
        rawConfig = await getFileContents(uuid, '/plugins/Geyser-Spigot/config.yml');
        if (rawConfig && rawConfig.trim().length > 0) {
            hasConfig = true;
            config = parseGeyserConfig(rawConfig);
        }
    } catch {
        hasConfig = false;
    }

    return {
        isGeyserInstalled: !!geyserFile,
        isFloodgateInstalled: !!floodgateFile,
        geyserJarName: geyserFile?.name,
        floodgateJarName: floodgateFile?.name,
        hasConfig,
        config,
        rawConfig,
    };
};

export const pullRemoteFile = async (uuid: string, url: string, directory: string, filename: string): Promise<void> => {
    await http.post(`/api/client/servers/${uuid}/files/pull`, {
        url,
        directory,
        filename,
        use_header: true,
    });
};

export const installGeyserAndFloodgate = async (uuid: string): Promise<void> => {
    try {
        await createDirectory(uuid, '/', 'plugins');
    } catch {
        // ignore if exists
    }

    await pullRemoteFile(uuid, GEYSER_DOWNLOAD_URL, '/plugins', 'Geyser-Spigot.jar');
    await pullRemoteFile(uuid, FLOODGATE_DOWNLOAD_URL, '/plugins', 'floodgate-spigot.jar');
};

export const autoConfigureGeyser = async (
    uuid: string,
    options: {
        bedrockPort: number;
        javaPort: number;
        serverName?: string;
        authType?: 'floodgate' | 'online' | 'offline';
    }
): Promise<void> => {
    try {
        await createDirectory(uuid, '/plugins', 'Geyser-Spigot');
    } catch {
        // ignore if exists
    }

    const content = generateOptimalGeyserConfig(options);
    await saveFileContents(uuid, '/plugins/Geyser-Spigot/config.yml', content);
};

export const saveCustomGeyserConfig = async (
    uuid: string,
    existingRaw: string,
    newConfig: Partial<GeyserConfig>
): Promise<void> => {
    let content = existingRaw;

    if (!content || content.trim().length === 0) {
        content = generateOptimalGeyserConfig({
            bedrockPort: newConfig.bedrockPort || 19132,
            javaPort: newConfig.remotePort || 25565,
            serverName: newConfig.serverName || 'SmitCloud Crossplay',
            authType: newConfig.authType || 'floodgate',
        });
    }

    if (newConfig.bedrockPort !== undefined) {
        content = content.replace(/(bedrock:\s*\n(?:[^\n]*\n)*?\s*port:\s*)\d+/i, `$1${newConfig.bedrockPort}`);
        content = content.replace(/(broadcast-port:\s*)\d+/i, `$1${newConfig.bedrockPort}`);
    }

    if (newConfig.remotePort !== undefined) {
        content = content.replace(/(remote:\s*\n(?:[^\n]*\n)*?\s*port:\s*)\d+/i, `$1${newConfig.remotePort}`);
    }

    if (newConfig.authType !== undefined) {
        content = content.replace(/(auth-type:\s*)[a-zA-Z]+/i, `$1${newConfig.authType}`);
    }

    if (newConfig.motd1 !== undefined) {
        content = content.replace(/(motd1:\s*)"?[^"\n]*"?/i, `$1"${newConfig.motd1}"`);
    }

    if (newConfig.motd2 !== undefined) {
        content = content.replace(/(motd2:\s*)"?[^"\n]*"?/i, `$1"${newConfig.motd2}"`);
    }

    if (newConfig.serverName !== undefined) {
        content = content.replace(/(server-name:\s*)"?[^"\n]*"?/i, `$1"${newConfig.serverName}"`);
    }

    if (newConfig.passthroughMotd !== undefined) {
        content = content.replace(/(passthrough-motd:\s*)(true|false)/i, `$1${newConfig.passthroughMotd}`);
    }

    if (newConfig.passthroughPlayerCounts !== undefined) {
        content = content.replace(/(passthrough-player-counts:\s*)(true|false)/i, `$1${newConfig.passthroughPlayerCounts}`);
    }

    if (newConfig.showCoordinates !== undefined) {
        content = content.replace(/(show-coordinates:\s*)(true|false)/i, `$1${newConfig.showCoordinates}`);
    }

    await saveFileContents(uuid, '/plugins/Geyser-Spigot/config.yml', content);
};

export const uninstallGeyser = async (
    uuid: string,
    geyserJar?: string,
    floodgateJar?: string
): Promise<void> => {
    const toDelete = [geyserJar || 'Geyser-Spigot.jar', floodgateJar || 'floodgate-spigot.jar'];
    await deleteFiles(uuid, '/plugins', toDelete);
};
