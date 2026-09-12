import getFileContents from '@/api/server/files/getFileContents';
import saveFileContents from '@/api/server/files/saveFileContents';
import loadDirectory, { FileObject } from '@/api/server/files/loadDirectory';
import http from '@/api/http';
import axios from 'axios';

export interface DiscordConfig {
    webhookUrl: string;
    serverName: string;
    botUsername?: string;
    botAvatarUrl?: string;
    serverAddress: string;
    bedrockPort?: number;
    // Notification toggles
    notifyStart: boolean;
    notifyStop: boolean;
    notifyCrash: boolean;
    notifyPlayers: boolean;
    notifyDeaths?: boolean;
    notifyAdvancements?: boolean;
    notifyLowTps?: boolean;
    notifyHighRam?: boolean;
    notifyDDoS?: boolean;
    // Thresholds & Role Pings
    tpsThreshold?: number;
    ramThreshold?: number;
    crashMention?: 'none' | 'everyone' | 'role';
    crashRoleId?: string;
    // Embed custom colors (hex string, e.g. '#06b6d4')
    colorOnline?: string;
    colorOffline?: string;
    colorCrash?: string;
    colorEvent?: string;
    // Discord Community Widget
    discordInvite?: string;
    discordGuildId?: string;
    // DiscordSRV fields
    botToken?: string;
    guildId?: string;
    chatChannelId?: string;
    consoleChannelId?: string;
    logChannelId?: string;
}

export interface DiscordSRVFields {
    botToken: string;
    guildId: string;
    chatChannelId: string;
    consoleChannelId: string;
    logChannelId: string;
}

const DEFAULT_CONFIG: DiscordConfig = {
    webhookUrl: '',
    serverName: 'My Minecraft Server',
    botUsername: 'SmitCloud Alerts',
    botAvatarUrl: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/pterodactyl.png',
    serverAddress: 'play.shadowpixel.fun',
    bedrockPort: 19132,
    notifyStart: true,
    notifyStop: true,
    notifyCrash: true,
    notifyPlayers: true,
    notifyDeaths: true,
    notifyAdvancements: true,
    notifyLowTps: false,
    notifyHighRam: false,
    notifyDDoS: true,
    tpsThreshold: 15.0,
    ramThreshold: 90,
    crashMention: 'everyone',
    crashRoleId: '',
    colorOnline: '#10b981', // Emerald
    colorOffline: '#ef4444', // Red
    colorCrash: '#dc2626', // Dark Red
    colorEvent: '#3b82f6', // Blue
    discordInvite: '',
    discordGuildId: '',
    botToken: '',
    guildId: '',
    chatChannelId: '',
    consoleChannelId: '',
    logChannelId: '',
};

export const hexToColorInt = (hex?: string, defaultHex = '#06b6d4'): number => {
    const clean = (hex || defaultHex).replace('#', '');
    const num = parseInt(clean, 16);
    return isNaN(num) ? 0x06b6d4 : num;
};

export const fetchDiscordConfig = async (uuid: string): Promise<DiscordConfig> => {
    try {
        const raw = await getFileContents(uuid, '/smitcloud-discord.json');
        return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    } catch {
        return DEFAULT_CONFIG;
    }
};

export const saveDiscordConfig = async (uuid: string, config: DiscordConfig): Promise<void> => {
    await saveFileContents(uuid, '/smitcloud-discord.json', JSON.stringify(config, null, 2));
};

export type DiscordEventType =
    | 'start'
    | 'stop'
    | 'crash'
    | 'player_join'
    | 'player_leave'
    | 'player_death'
    | 'advancement'
    | 'low_tps'
    | 'high_ram'
    | 'status';

export interface DiscordEventOptions {
    playerName?: string;
    deathMessage?: string;
    advancementName?: string;
    currentTps?: number;
    currentRam?: number;
    onlinePlayers?: number;
    maxPlayers?: number;
    serverIp?: string;
    bedrockPort?: number;
}

export const buildDiscordPayload = (config: DiscordConfig, eventType: DiscordEventType, options: DiscordEventOptions = {}) => {
    const botName = config.botUsername || 'SmitCloud Server Alert';
    const avatar = config.botAvatarUrl || 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/pterodactyl.png';
    const serverName = config.serverName || 'Minecraft Server';
    const serverAddr = options.serverIp || config.serverAddress || 'play.shadowpixel.fun';
    const bedrockPort = options.bedrockPort || config.bedrockPort || 19132;
    const now = new Date().toISOString();

    let content: string | undefined = undefined;
    let embed: any = {};

    switch (eventType) {
        case 'start':
            embed = {
                title: `🟢 ${serverName} is Online!`,
                description: `The Minecraft server is now running and accepting connections!`,
                color: hexToColorInt(config.colorOnline, '#10b981'),
                fields: [
                    { name: 'Java IP', value: `\`${serverAddr}:25565\``, inline: true },
                    { name: 'Bedrock IP', value: `\`${serverAddr}:${bedrockPort}\``, inline: true },
                    { name: 'Status', value: '🟢 Running (TPS: 20.0)', inline: true },
                ],
                footer: { text: `${serverName} • Powered by SmitCloud Hosting` },
                timestamp: now,
            };
            break;

        case 'stop':
            embed = {
                title: `🔴 ${serverName} has Stopped`,
                description: `The Minecraft server was shut down gracefully by an administrator.`,
                color: hexToColorInt(config.colorOffline, '#ef4444'),
                fields: [
                    { name: 'Status', value: '🔴 Offline', inline: true },
                    { name: 'Server Address', value: `\`${serverAddr}\``, inline: true },
                ],
                footer: { text: `${serverName} • Powered by SmitCloud Hosting` },
                timestamp: now,
            };
            break;

        case 'crash':
            if (config.crashMention === 'everyone') {
                content = '@everyone';
            } else if (config.crashMention === 'role' && config.crashRoleId) {
                content = `<@&${config.crashRoleId}>`;
            }
            embed = {
                title: `⚠️ CRITICAL: ${serverName} Crashed / Terminated Uncleanly!`,
                description: `The server stopped unexpectedly or exited with a non-zero exit code. Please check the console logs.`,
                color: hexToColorInt(config.colorCrash, '#dc2626'),
                fields: [
                    { name: 'Exit Status', value: '❌ Terminated (Crash detected)', inline: true },
                    { name: 'Action Required', value: 'Check console logs & restart', inline: true },
                ],
                footer: { text: `Immediate Staff Action Required • SmitCloud Panel` },
                timestamp: now,
            };
            break;

        case 'player_join': {
            const player = options.playerName || 'Steve';
            embed = {
                title: `👋 Player Joined the Server`,
                description: `**${player}** has connected to **${serverName}**!`,
                color: hexToColorInt(config.colorEvent, '#3b82f6'),
                thumbnail: { url: `https://mc-heads.net/avatar/${encodeURIComponent(player)}/128.png` },
                fields: [
                    { name: 'Player', value: `\`${player}\``, inline: true },
                    { name: 'Current Online', value: `${options.onlinePlayers || 1} / ${options.maxPlayers || 20}`, inline: true },
                ],
                footer: { text: `${serverName} • Join Notifications` },
                timestamp: now,
            };
            break;
        }

        case 'player_leave': {
            const player = options.playerName || 'Steve';
            embed = {
                title: `👋 Player Left the Server`,
                description: `**${player}** has disconnected from **${serverName}**.`,
                color: hexToColorInt('#64748b'),
                thumbnail: { url: `https://mc-heads.net/avatar/${encodeURIComponent(player)}/128.png` },
                fields: [
                    { name: 'Player', value: `\`${player}\``, inline: true },
                    { name: 'Remaining Online', value: `${options.onlinePlayers || 0} / ${options.maxPlayers || 20}`, inline: true },
                ],
                footer: { text: `${serverName} • Leave Notifications` },
                timestamp: now,
            };
            break;
        }

        case 'player_death': {
            const player = options.playerName || 'Alex';
            const death = options.deathMessage || `${player} was slain by a Zombie`;
            embed = {
                title: `💀 Player Death Alert`,
                description: `**${death}**`,
                color: hexToColorInt('#7f1d1d'),
                thumbnail: { url: `https://mc-heads.net/avatar/${encodeURIComponent(player)}/128.png` },
                fields: [
                    { name: 'Victim', value: `\`${player}\``, inline: true },
                    { name: 'Cause', value: death, inline: true },
                ],
                footer: { text: `${serverName} • In-Game Deaths` },
                timestamp: now,
            };
            break;
        }

        case 'advancement': {
            const player = options.playerName || 'Steve';
            const adv = options.advancementName || 'Diamonds!';
            embed = {
                title: `🏆 Advancement Unlocked!`,
                description: `**${player}** has made the advancement **[${adv}]**!`,
                color: hexToColorInt('#eab308'),
                thumbnail: { url: `https://mc-heads.net/avatar/${encodeURIComponent(player)}/128.png` },
                fields: [
                    { name: 'Player', value: `\`${player}\``, inline: true },
                    { name: 'Advancement', value: `🌟 **${adv}**`, inline: true },
                ],
                footer: { text: `${serverName} • Achievements` },
                timestamp: now,
            };
            break;
        }

        case 'low_tps':
            embed = {
                title: `⚠️ Performance Alert: Low TPS Detected`,
                description: `Server TPS dropped below the target threshold (**${options.currentTps?.toFixed(1) || '14.2'} / 20.0 TPS**).`,
                color: hexToColorInt('#f59e0b'),
                fields: [
                    { name: 'Current TPS', value: `⚠️ **${options.currentTps?.toFixed(1) || '14.2'}**`, inline: true },
                    { name: 'Target Threshold', value: `${config.tpsThreshold || 15.0} TPS`, inline: true },
                ],
                footer: { text: `SmitCloud Performance Watchdog • ${serverName}` },
                timestamp: now,
            };
            break;

        case 'high_ram':
            embed = {
                title: `⚠️ Memory Alert: High RAM Usage`,
                description: `Server RAM consumption reached **${options.currentRam || 92}%** of allocated memory!`,
                color: hexToColorInt('#f97316'),
                fields: [
                    { name: 'Current Usage', value: `💾 **${options.currentRam || 92}%**`, inline: true },
                    { name: 'Allocated Limit', value: `Target < ${config.ramThreshold || 90}%`, inline: true },
                ],
                footer: { text: `SmitCloud Memory Monitor • ${serverName}` },
                timestamp: now,
            };
            break;

        case 'status':
        default:
            embed = {
                title: `📊 ${serverName} — Live Server Status`,
                description: `Current real-time status and connection details for **${serverName}**.`,
                color: hexToColorInt(config.colorOnline, '#10b981'),
                fields: [
                    { name: 'Java IP', value: `\`${serverAddr}:25565\``, inline: true },
                    { name: 'Bedrock Port', value: `\`${bedrockPort}\``, inline: true },
                    { name: 'Status', value: '🟢 **ONLINE**', inline: true },
                    { name: 'Online Players', value: `👥 **${options.onlinePlayers || 0} / ${options.maxPlayers || 50}**`, inline: true },
                    { name: 'TPS', value: '⚡ **20.0 (Optimal)**', inline: true },
                    { name: 'Hosting', value: '🌐 **SmitCloud Hosting**', inline: true },
                ],
                footer: { text: `Last verified: ${new Date().toLocaleTimeString()} • SmitCloud Panel` },
                timestamp: now,
            };
            break;
    }

    return {
        username: botName,
        avatar_url: avatar,
        content,
        embeds: [embed],
    };
};

export const sendDiscordWebhookEvent = async (
    webhookUrl: string,
    config: DiscordConfig,
    eventType: DiscordEventType,
    options: DiscordEventOptions = {}
): Promise<void> => {
    if (!webhookUrl) throw new Error('Webhook URL is required');
    const payload = buildDiscordPayload(config, eventType, options);
    await axios.post(webhookUrl, payload, { timeout: 8000 });
};

/**
 * Check if DiscordSRV plugin .jar is installed in /plugins
 */
export const checkDiscordSRVInstalled = async (uuid: string): Promise<boolean> => {
    try {
        const files: FileObject[] = await loadDirectory(uuid, '/plugins');
        return files.some((f) => f.isFile && f.name.toLowerCase().includes('discordsrv') && f.name.endsWith('.jar'));
    } catch {
        return false;
    }
};

/**
 * 1-Click Install DiscordSRV from Modrinth CDN directly into /plugins
 */
export const installDiscordSRV = async (uuid: string): Promise<void> => {
    const downloadUrl = 'https://cdn.modrinth.com/data/UmLGoGij/versions/ATlquwiT/DiscordSRV-Build-1.30.5.jar';
    await http.post(`/api/client/servers/${uuid}/files/pull`, {
        url: downloadUrl,
        directory: '/plugins',
        filename: 'DiscordSRV-Build-1.30.5.jar',
        use_header: true,
    });
};

/**
 * Read existing DiscordSRV config.yml if available
 */
export const loadDiscordSRVConfig = async (uuid: string): Promise<string | null> => {
    try {
        return await getFileContents(uuid, '/plugins/DiscordSRV/config.yml');
    } catch {
        return null;
    }
};

/**
 * Generate or update a clean DiscordSRV config.yml with user's bot credentials
 */
export const generateDiscordSRVConfig = (fields: DiscordSRVFields, existingYaml?: string): string => {
    if (existingYaml && existingYaml.includes('BotToken')) {
        // Replace known keys in existing file preserving all other configuration
        let updated = existingYaml;
        if (fields.botToken) {
            updated = updated.replace(/BotToken:\s*"[^"]*"/, `BotToken: "${fields.botToken}"`);
        }
        if (fields.chatChannelId) {
            updated = updated.replace(/Channels:\s*\{"global":\s*"[^"]*"\}/, `Channels: {"global": "${fields.chatChannelId}"}`);
        }
        if (fields.consoleChannelId) {
            updated = updated.replace(/DiscordConsoleChannelId:\s*"[^"]*"/, `DiscordConsoleChannelId: "${fields.consoleChannelId}"`);
        }
        return updated;
    }

    // Default clean configuration
    return `# ------------------------------------------------------------------
# DiscordSRV Configuration (Generated by SmitCloud Minecraft Hub)
# ------------------------------------------------------------------
BotToken: "${fields.botToken || 'BOT_TOKEN_HERE'}"

# Channel IDs (Right-click channel in Discord with Dev Mode on -> Copy Channel ID)
Channels: {"global": "${fields.chatChannelId || '000000000000000000'}"}

DiscordConsoleChannelId: "${fields.consoleChannelId || '000000000000000000'}"
DiscordChatChannelDiscordToMinecraft: true
DiscordChatChannelMinecraftToDiscord: true
DiscordChatChannelTruncateLength: 256
DiscordChatChannelTranslateMentions: true

# Server Status Messages
ServerWatchdogMessage: "The server is unresponsive and may have crashed!"
ServerStatusChannelId: "${fields.logChannelId || ''}"

# Experiment: Direct Webhook Deliveries
Experiment_WebhookChatMessageDelivery: true
Experiment_WebhookChatMessageUsernameFormat: "%displayname%"
Experiment_WebhookChatMessageAvatarUrl: "https://mc-heads.net/avatar/%uuid%/128.png"
`;
};

/**
 * Save DiscordSRV config directly to /plugins/DiscordSRV/config.yml
 */
export const saveDiscordSRVConfig = async (uuid: string, yamlContent: string): Promise<void> => {
    await saveFileContents(uuid, '/plugins/DiscordSRV/config.yml', yamlContent);
};
