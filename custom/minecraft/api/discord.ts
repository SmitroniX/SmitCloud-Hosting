import getFileContents from '@/api/server/files/getFileContents';
import saveFileContents from '@/api/server/files/saveFileContents';
import axios from 'axios';

export interface DiscordConfig {
    webhookUrl: string;
    serverName: string;
    notifyStart: boolean;
    notifyStop: boolean;
    notifyCrash: boolean;
    notifyPlayers: boolean;
    serverAddress: string;
}

const DEFAULT_CONFIG: DiscordConfig = {
    webhookUrl: '',
    serverName: 'My Minecraft Server',
    notifyStart: true,
    notifyStop: true,
    notifyCrash: true,
    notifyPlayers: false,
    serverAddress: 'play.shadowpixel.fun',
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

export const sendTestDiscordWebhook = async (webhookUrl: string, serverName: string): Promise<void> => {
    const payload = {
        username: 'SmitCloud Server Alert',
        avatar_url: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/pterodactyl.png',
        embeds: [
            {
                title: `🟢 ${serverName} is Online!`,
                description: 'This is a test notification from the SmitCloud Minecraft Webhook integration.',
                color: 0x06b6d4, // Cyan
                fields: [
                    { name: 'Status', value: '🟢 Running', inline: true },
                    { name: 'TPS', value: '20.0 (Optimal)', inline: true },
                    { name: 'Platform', value: 'SmitCloud Hosting', inline: true },
                ],
                footer: {
                    text: 'SmitCloud Panel • Minecraft Automation',
                },
                timestamp: new Date().toISOString(),
            },
        ],
    };

    await axios.post(webhookUrl, payload, { timeout: 8000 });
};
