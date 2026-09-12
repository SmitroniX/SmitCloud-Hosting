import React, { useEffect, useState } from 'react';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { ServerContext } from '@/state/server';
import useFlash from '@/plugins/useFlash';
import Spinner from '@/components/elements/Spinner';
import Input from '@/components/elements/Input';
import copy from 'copy-to-clipboard';
import classNames from 'classnames';
import axios from 'axios';
import {
    BellIcon,
    ChatAlt2Icon,
    CheckCircleIcon,
    ClipboardCopyIcon,
    GlobeAltIcon,
    PaperAirplaneIcon,
    SparklesIcon,
    ShieldCheckIcon,
    ExclamationIcon,
    RefreshIcon,
    CloudDownloadIcon,
    UsersIcon,
    EyeIcon,
    EyeOffIcon,
    ExternalLinkIcon,
    KeyIcon,
    AdjustmentsIcon,
    LightningBoltIcon,
} from '@heroicons/react/solid';
import {
    DiscordConfig,
    DiscordEventType,
    fetchDiscordConfig,
    saveDiscordConfig,
    sendDiscordWebhookEvent,
    buildDiscordPayload,
    checkDiscordSRVInstalled,
    installDiscordSRV,
    loadDiscordSRVConfig,
    saveDiscordSRVConfig,
    generateDiscordSRVConfig,
} from '@/api/server/minecraft/discord';

type ActiveTab = 'webhooks' | 'preview' | 'discordsrv' | 'widgets';

export default () => {
    const server = ServerContext.useStoreState((state) => state.server.data!);
    const { clearFlashes, clearAndAddHttpError, addFlash } = useFlash();

    const [activeTab, setActiveTab] = useState<ActiveTab>('webhooks');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [sendingTest, setSendingTest] = useState<string | null>(null);

    // Main Config
    const [config, setConfig] = useState<DiscordConfig>({
        webhookUrl: '',
        serverName: server.name,
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
        colorOnline: '#10b981',
        colorOffline: '#ef4444',
        colorCrash: '#dc2626',
        colorEvent: '#3b82f6',
        discordInvite: '',
        discordGuildId: '',
        botToken: '',
        guildId: '',
        chatChannelId: '',
        consoleChannelId: '',
        logChannelId: '',
    });

    // DiscordSRV State
    const [discordSrvInstalled, setDiscordSrvInstalled] = useState(false);
    const [checkingSrv, setCheckingSrv] = useState(false);
    const [installingSrv, setInstallingSrv] = useState(false);
    const [savingSrvConfig, setSavingSrvConfig] = useState(false);
    const [showBotToken, setShowBotToken] = useState(false);

    // Live Minecraft Query State
    const [publicStatus, setPublicStatus] = useState<any>(null);
    const [loadingPublicStatus, setLoadingPublicStatus] = useState(false);

    // Preview / Mockup State
    const [previewEvent, setPreviewEvent] = useState<DiscordEventType>('start');
    const [testPlayerName, setTestPlayerName] = useState('Steve');
    const [testDeathMessage, setTestDeathMessage] = useState('Steve was slain by Zombie');
    const [copiedJson, setCopiedJson] = useState(false);
    const [copiedMd, setCopiedMd] = useState(false);
    const [copiedHtml, setCopiedHtml] = useState(false);

    useEffect(() => {
        clearFlashes('discord');
        loadAll();
    }, [server.uuid]);

    const loadAll = async () => {
        try {
            setLoading(true);
            const data = await fetchDiscordConfig(server.uuid);
            setConfig((prev) => ({
                ...prev,
                ...data,
                serverName: data.serverName || server.name,
            }));

            // Check DiscordSRV status
            setCheckingSrv(true);
            const isInstalled = await checkDiscordSRVInstalled(server.uuid);
            setDiscordSrvInstalled(isInstalled);

            // Fetch public server ping
            const targetAddress = data.serverAddress || 'play.shadowpixel.fun';
            fetchServerStatus(targetAddress);
        } catch (error) {
            clearAndAddHttpError({ error, key: 'discord' });
        } finally {
            setLoading(false);
            setCheckingSrv(false);
        }
    };

    const fetchServerStatus = async (address: string) => {
        if (!address) return;
        try {
            setLoadingPublicStatus(true);
            const res = await axios.get(`https://api.mcsrvstat.us/2/${encodeURIComponent(address)}`, { timeout: 6000 });
            setPublicStatus(res.data);
        } catch {
            setPublicStatus(null);
        } finally {
            setLoadingPublicStatus(false);
        }
    };

    const handleSaveConfig = async () => {
        try {
            clearFlashes('discord');
            setSaving(true);
            await saveDiscordConfig(server.uuid, config);
            addFlash({
                key: 'discord',
                type: 'success',
                message: 'Discord integration settings saved successfully!',
            });
        } catch (error) {
            clearAndAddHttpError({ error, key: 'discord' });
        } finally {
            setSaving(false);
        }
    };

    const handleSendTest = async (eventType: DiscordEventType) => {
        if (!config.webhookUrl) {
            alert('Please configure a valid Discord Webhook URL first in the Webhooks tab.');
            return;
        }

        try {
            clearFlashes('discord');
            setSendingTest(eventType);
            await sendDiscordWebhookEvent(config.webhookUrl, config, eventType, {
                playerName: testPlayerName,
                deathMessage: testDeathMessage,
                onlinePlayers: publicStatus?.players?.online || 1,
                maxPlayers: publicStatus?.players?.max || 20,
                serverIp: config.serverAddress,
                bedrockPort: config.bedrockPort || 19132,
            });

            addFlash({
                key: 'discord',
                type: 'success',
                message: `✅ Test ${eventType.toUpperCase()} event sent successfully! Check your Discord channel.`,
            });
        } catch (error) {
            clearAndAddHttpError({ error, key: 'discord' });
        } finally {
            setSendingTest(null);
        }
    };

    const handleInstallDiscordSRV = async () => {
        try {
            setInstallingSrv(true);
            clearFlashes('discord');
            await installDiscordSRV(server.uuid);
            setDiscordSrvInstalled(true);
            addFlash({
                key: 'discord',
                type: 'success',
                message: '✅ DiscordSRV installed into /plugins! Restart your server to generate configuration files.',
            });
        } catch (error) {
            clearAndAddHttpError({ error, key: 'discord' });
        } finally {
            setInstallingSrv(false);
        }
    };

    const handleSaveDiscordSRVConfig = async () => {
        try {
            setSavingSrvConfig(true);
            clearFlashes('discord');
            const existing = await loadDiscordSRVConfig(server.uuid);
            const generated = generateDiscordSRVConfig(
                {
                    botToken: config.botToken || '',
                    guildId: config.guildId || '',
                    chatChannelId: config.chatChannelId || '',
                    consoleChannelId: config.consoleChannelId || '',
                    logChannelId: config.logChannelId || '',
                },
                existing || undefined
            );

            await saveDiscordSRVConfig(server.uuid, generated);
            await saveDiscordConfig(server.uuid, config);

            addFlash({
                key: 'discord',
                type: 'success',
                message: '✅ DiscordSRV config.yml saved successfully to /plugins/DiscordSRV/config.yml!',
            });
        } catch (error) {
            clearAndAddHttpError({ error, key: 'discord' });
        } finally {
            setSavingSrvConfig(false);
        }
    };

    // Embed and Badge codes
    const mdBadgeCode = `![Server Status](https://img.shields.io/badge/Minecraft-${encodeURIComponent(config.serverAddress)}-06b6d4?logo=minecraft&style=for-the-badge)`;
    const htmlEmbedCode = `<iframe src="https://api.mcsrvstat.us/icon/${encodeURIComponent(config.serverAddress)}" width="64" height="64" frameborder="0"></iframe>
<p><strong>${config.serverName}</strong>: <code>${config.serverAddress}</code></p>`;

    const handleCopyMd = () => {
        copy(mdBadgeCode);
        setCopiedMd(true);
        setTimeout(() => setCopiedMd(false), 2000);
    };

    const handleCopyHtml = () => {
        copy(htmlEmbedCode);
        setCopiedHtml(true);
        setTimeout(() => setCopiedHtml(false), 2000);
    };

    // Current Mockup Payload
    const currentPayload = buildDiscordPayload(config, previewEvent, {
        playerName: testPlayerName,
        deathMessage: testDeathMessage,
        onlinePlayers: publicStatus?.players?.online || 3,
        maxPlayers: publicStatus?.players?.max || 50,
        serverIp: config.serverAddress,
        bedrockPort: config.bedrockPort || 19132,
    });

    const handleCopyPayloadJson = () => {
        copy(JSON.stringify(currentPayload, null, 2));
        setCopiedJson(true);
        setTimeout(() => setCopiedJson(false), 2000);
    };

    const currentEmbed = currentPayload.embeds?.[0] || {};
    const embedColorHex = '#' + (currentEmbed.color ? currentEmbed.color.toString(16).padStart(6, '0') : '06b6d4');

    return (
        <ServerContentBlock title={'Discord & Community Hub'} showFlashKey={'discord'}>
            <div className={'flex flex-col gap-6'}>
                {/* Hero Header Card */}
                <div className={'relative overflow-hidden rounded-2xl border border-indigo-500/25 bg-[#0a0f1d]/90 p-6 shadow-2xl backdrop-blur-xl'}>
                    <div className={'pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl'} />
                    <div className={'pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl'} />

                    <div className={'relative flex flex-col md:flex-row md:items-center md:justify-between gap-6'}>
                        <div className={'flex items-start gap-4'}>
                            <div className={'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25 text-white'}>
                                <ChatAlt2Icon className={'h-7 w-7'} />
                            </div>
                            <div>
                                <div className={'flex flex-wrap items-center gap-2'}>
                                    <h1 className={'text-xl sm:text-2xl font-black tracking-tight text-white'}>
                                        Discord &amp; Community Hub
                                    </h1>
                                    <span className={'inline-flex items-center gap-1.5 rounded-full bg-indigo-500/15 px-3 py-0.5 text-xs font-bold text-indigo-400 border border-indigo-500/30'}>
                                        <SparklesIcon className={'h-3.5 w-3.5'} />
                                        COMMUNITY BRIDGE
                                    </span>
                                    {config.webhookUrl ? (
                                        <span className={'inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/30'}>
                                            <CheckCircleIcon className={'h-3 w-3'} />
                                            Webhook Active
                                        </span>
                                    ) : (
                                        <span className={'inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-400 border border-amber-500/30'}>
                                            <ExclamationIcon className={'h-3 w-3'} />
                                            Setup Required
                                        </span>
                                    )}
                                </div>
                                <p className={'mt-1 text-xs sm:text-sm text-neutral-400'}>
                                    Broadcast server startups, crashes, player events, and live status to Discord. Setup 2-way in-game chat with DiscordSRV.
                                </p>
                            </div>
                        </div>

                        <div className={'flex flex-wrap items-center gap-3 shrink-0'}>
                            <button
                                type={'button'}
                                onClick={() => handleSendTest('start')}
                                disabled={!config.webhookUrl || sendingTest !== null}
                                className={'flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/20 transition'}
                            >
                                <PaperAirplaneIcon className={'h-3.5 w-3.5'} />
                                {sendingTest === 'start' ? 'Sending...' : 'Send Test Alert'}
                            </button>
                            <button
                                type={'button'}
                                onClick={loadAll}
                                disabled={loading}
                                className={'flex items-center gap-1.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 px-3.5 py-2 text-xs font-medium text-neutral-300 border border-neutral-700/60 transition'}
                            >
                                <RefreshIcon className={classNames('h-3.5 w-3.5', { 'animate-spin': loading })} />
                                Refresh
                            </button>
                        </div>
                    </div>

                    {/* Quick Stats Strip */}
                    <div className={'grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-neutral-800/80 text-xs'}>
                        <div className={'rounded-xl bg-neutral-900/60 border border-neutral-800/70 p-3'}>
                            <span className={'text-neutral-500 block text-[10px] uppercase font-bold'}>Webhook Status</span>
                            <span className={classNames('text-sm font-black mt-0.5 block', config.webhookUrl ? 'text-emerald-400' : 'text-neutral-400')}>
                                {config.webhookUrl ? 'Connected' : 'Not Configured'}
                            </span>
                        </div>
                        <div className={'rounded-xl bg-neutral-900/60 border border-neutral-800/70 p-3'}>
                            <span className={'text-neutral-500 block text-[10px] uppercase font-bold'}>DiscordSRV Bot</span>
                            <span className={classNames('text-sm font-black mt-0.5 block', discordSrvInstalled ? 'text-emerald-400' : 'text-amber-400')}>
                                {discordSrvInstalled ? 'Installed' : 'Not Installed'}
                            </span>
                        </div>
                        <div className={'rounded-xl bg-neutral-900/60 border border-neutral-800/70 p-3'}>
                            <span className={'text-neutral-500 block text-[10px] uppercase font-bold'}>Crash Mentions</span>
                            <span className={'text-sm font-black text-indigo-400 mt-0.5 block uppercase'}>
                                {config.crashMention || 'Everyone'}
                            </span>
                        </div>
                        <div className={'rounded-xl bg-neutral-900/60 border border-neutral-800/70 p-3'}>
                            <span className={'text-neutral-500 block text-[10px] uppercase font-bold'}>Server Address</span>
                            <span className={'text-sm font-black text-cyan-400 mt-0.5 block truncate'}>
                                {config.serverAddress}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Primary Navigation Tabs */}
                <div className={'flex flex-wrap items-center gap-2 border-b border-neutral-800 pb-3 text-sm font-semibold'}>
                    <button
                        type={'button'}
                        onClick={() => setActiveTab('webhooks')}
                        className={classNames('flex items-center gap-2 px-4 py-2 rounded-xl transition', {
                            'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 font-bold': activeTab === 'webhooks',
                            'text-neutral-400 hover:text-white hover:bg-neutral-800/80': activeTab !== 'webhooks',
                        })}
                    >
                        <BellIcon className={'h-4 w-4'} />
                        Webhooks &amp; Alerts
                    </button>
                    <button
                        type={'button'}
                        onClick={() => setActiveTab('preview')}
                        className={classNames('flex items-center gap-2 px-4 py-2 rounded-xl transition', {
                            'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 font-bold': activeTab === 'preview',
                            'text-neutral-400 hover:text-white hover:bg-neutral-800/80': activeTab !== 'preview',
                        })}
                    >
                        <EyeIcon className={'h-4 w-4'} />
                        Live Discord Preview &amp; Test Suite
                    </button>
                    <button
                        type={'button'}
                        onClick={() => setActiveTab('discordsrv')}
                        className={classNames('flex items-center gap-2 px-4 py-2 rounded-xl transition', {
                            'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 font-bold': activeTab === 'discordsrv',
                            'text-neutral-400 hover:text-white hover:bg-neutral-800/80': activeTab !== 'discordsrv',
                        })}
                    >
                        <UsersIcon className={'h-4 w-4 text-cyan-400'} />
                        DiscordSRV Bot Manager
                    </button>
                    <button
                        type={'button'}
                        onClick={() => setActiveTab('widgets')}
                        className={classNames('flex items-center gap-2 px-4 py-2 rounded-xl transition', {
                            'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 font-bold': activeTab === 'widgets',
                            'text-neutral-400 hover:text-white hover:bg-neutral-800/80': activeTab !== 'widgets',
                        })}
                    >
                        <GlobeAltIcon className={'h-4 w-4 text-emerald-400'} />
                        Live Status &amp; Widgets
                    </button>
                </div>

                {loading ? (
                    <div className={'flex justify-center py-16'}>
                        <Spinner size={'large'} centered />
                    </div>
                ) : (
                    <>
                        {/* TAB 1: WEBHOOKS & ALERTS */}
                        {activeTab === 'webhooks' && (
                            <div className={'grid grid-cols-1 lg:grid-cols-3 gap-6'}>
                                {/* Left 2 cols: Main Webhook Config */}
                                <div className={'lg:col-span-2 flex flex-col gap-6'}>
                                    {/* Webhook URL & Bot Identity */}
                                    <div className={'rounded-2xl border border-neutral-800 bg-[#0a0f1d]/80 p-6 backdrop-blur-md'}>
                                        <h2 className={'text-base font-bold text-white flex items-center gap-2 mb-4'}>
                                            <BellIcon className={'h-5 w-5 text-indigo-400'} />
                                            Webhook Endpoint &amp; Bot Identity
                                        </h2>

                                        <div className={'flex flex-col gap-4'}>
                                            <div>
                                                <label className={'block text-xs font-semibold text-neutral-300 mb-1'}>
                                                    Discord Webhook URL <span className={'text-rose-400'}>*</span>
                                                </label>
                                                <Input
                                                    placeholder={'https://discord.com/api/webhooks/1234567890/token...'}
                                                    value={config.webhookUrl}
                                                    onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
                                                />
                                                <p className={'text-[11px] text-neutral-500 mt-1'}>
                                                    In Discord: Channel Settings &gt; Integrations &gt; Webhooks &gt; New Webhook &gt; Copy Webhook URL.
                                                </p>
                                            </div>

                                            <div className={'grid grid-cols-1 sm:grid-cols-2 gap-4'}>
                                                <div>
                                                    <label className={'block text-xs font-semibold text-neutral-300 mb-1'}>
                                                        Bot Display Name
                                                    </label>
                                                    <Input
                                                        placeholder={'SmitCloud Alerts'}
                                                        value={config.botUsername}
                                                        onChange={(e) => setConfig({ ...config, botUsername: e.target.value })}
                                                    />
                                                </div>

                                                <div>
                                                    <label className={'block text-xs font-semibold text-neutral-300 mb-1'}>
                                                        Bot Avatar URL
                                                    </label>
                                                    <Input
                                                        placeholder={'https://.../avatar.png'}
                                                        value={config.botAvatarUrl}
                                                        onChange={(e) => setConfig({ ...config, botAvatarUrl: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            <div className={'grid grid-cols-1 sm:grid-cols-2 gap-4'}>
                                                <div>
                                                    <label className={'block text-xs font-semibold text-neutral-300 mb-1'}>
                                                        Server Display Name
                                                    </label>
                                                    <Input
                                                        placeholder={'My Minecraft Server'}
                                                        value={config.serverName}
                                                        onChange={(e) => setConfig({ ...config, serverName: e.target.value })}
                                                    />
                                                </div>

                                                <div>
                                                    <label className={'block text-xs font-semibold text-neutral-300 mb-1'}>
                                                        Server Public Address / IP
                                                    </label>
                                                    <Input
                                                        placeholder={'play.shadowpixel.fun'}
                                                        value={config.serverAddress}
                                                        onChange={(e) => setConfig({ ...config, serverAddress: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Notification Triggers */}
                                    <div className={'rounded-2xl border border-neutral-800 bg-[#0a0f1d]/80 p-6 backdrop-blur-md'}>
                                        <h2 className={'text-base font-bold text-white flex items-center gap-2 mb-4'}>
                                            <AdjustmentsIcon className={'h-5 w-5 text-purple-400'} />
                                            Automated Notification Triggers
                                        </h2>

                                        <div className={'grid grid-cols-1 sm:grid-cols-2 gap-4'}>
                                            <div className={'flex items-start justify-between p-3 rounded-xl border border-neutral-800 bg-neutral-900/40'}>
                                                <div>
                                                    <p className={'text-xs font-bold text-white'}>🟢 Server Online Alert</p>
                                                    <p className={'text-[11px] text-neutral-400'}>Send embed when server finishes booting</p>
                                                </div>
                                                <input
                                                    type={'checkbox'}
                                                    checked={config.notifyStart}
                                                    onChange={(e) => setConfig({ ...config, notifyStart: e.target.checked })}
                                                    className={'h-4 w-4 rounded border-neutral-700 bg-neutral-800 text-indigo-600'}
                                                />
                                            </div>

                                            <div className={'flex items-start justify-between p-3 rounded-xl border border-neutral-800 bg-neutral-900/40'}>
                                                <div>
                                                    <p className={'text-xs font-bold text-white'}>🔴 Server Offline Alert</p>
                                                    <p className={'text-[11px] text-neutral-400'}>Send embed when stopped gracefully</p>
                                                </div>
                                                <input
                                                    type={'checkbox'}
                                                    checked={config.notifyStop}
                                                    onChange={(e) => setConfig({ ...config, notifyStop: e.target.checked })}
                                                    className={'h-4 w-4 rounded border-neutral-700 bg-neutral-800 text-indigo-600'}
                                                />
                                            </div>

                                            <div className={'flex items-start justify-between p-3 rounded-xl border border-neutral-800 bg-neutral-900/40'}>
                                                <div>
                                                    <p className={'text-xs font-bold text-white'}>⚠️ Server Crash Alert</p>
                                                    <p className={'text-[11px] text-neutral-400'}>High priority alert if server crashes</p>
                                                </div>
                                                <input
                                                    type={'checkbox'}
                                                    checked={config.notifyCrash}
                                                    onChange={(e) => setConfig({ ...config, notifyCrash: e.target.checked })}
                                                    className={'h-4 w-4 rounded border-neutral-700 bg-neutral-800 text-indigo-600'}
                                                />
                                            </div>

                                            <div className={'flex items-start justify-between p-3 rounded-xl border border-neutral-800 bg-neutral-900/40'}>
                                                <div>
                                                    <p className={'text-xs font-bold text-white'}>👥 Player Join / Leave</p>
                                                    <p className={'text-[11px] text-neutral-400'}>Notify with player head avatar</p>
                                                </div>
                                                <input
                                                    type={'checkbox'}
                                                    checked={config.notifyPlayers}
                                                    onChange={(e) => setConfig({ ...config, notifyPlayers: e.target.checked })}
                                                    className={'h-4 w-4 rounded border-neutral-700 bg-neutral-800 text-indigo-600'}
                                                />
                                            </div>

                                            <div className={'flex items-start justify-between p-3 rounded-xl border border-neutral-800 bg-neutral-900/40'}>
                                                <div>
                                                    <p className={'text-xs font-bold text-white'}>💀 Player Death Alerts</p>
                                                    <p className={'text-[11px] text-neutral-400'}>Post death messages to channel</p>
                                                </div>
                                                <input
                                                    type={'checkbox'}
                                                    checked={config.notifyDeaths}
                                                    onChange={(e) => setConfig({ ...config, notifyDeaths: e.target.checked })}
                                                    className={'h-4 w-4 rounded border-neutral-700 bg-neutral-800 text-indigo-600'}
                                                />
                                            </div>

                                            <div className={'flex items-start justify-between p-3 rounded-xl border border-neutral-800 bg-neutral-900/40'}>
                                                <div>
                                                    <p className={'text-xs font-bold text-white'}>🏆 Advancement Alerts</p>
                                                    <p className={'text-[11px] text-neutral-400'}>Broadcast player achievements</p>
                                                </div>
                                                <input
                                                    type={'checkbox'}
                                                    checked={config.notifyAdvancements}
                                                    onChange={(e) => setConfig({ ...config, notifyAdvancements: e.target.checked })}
                                                    className={'h-4 w-4 rounded border-neutral-700 bg-neutral-800 text-indigo-600'}
                                                />
                                            </div>

                                            <div className={'flex items-start justify-between p-3 rounded-xl border border-neutral-800 bg-neutral-900/40'}>
                                                <div>
                                                    <p className={'text-xs font-bold text-white'}>📉 Low TPS Watchdog</p>
                                                    <p className={'text-[11px] text-neutral-400'}>Alert when TPS drops &lt; {config.tpsThreshold || 15.0}</p>
                                                </div>
                                                <input
                                                    type={'checkbox'}
                                                    checked={config.notifyLowTps}
                                                    onChange={(e) => setConfig({ ...config, notifyLowTps: e.target.checked })}
                                                    className={'h-4 w-4 rounded border-neutral-700 bg-neutral-800 text-indigo-600'}
                                                />
                                            </div>

                                            <div className={'flex items-start justify-between p-3 rounded-xl border border-neutral-800 bg-neutral-900/40'}>
                                                <div>
                                                    <p className={'text-xs font-bold text-white'}>🛡️ DDoS Shield Alert</p>
                                                    <p className={'text-[11px] text-neutral-400'}>Alert when attack is mitigated</p>
                                                </div>
                                                <input
                                                    type={'checkbox'}
                                                    checked={config.notifyDDoS}
                                                    onChange={(e) => setConfig({ ...config, notifyDDoS: e.target.checked })}
                                                    className={'h-4 w-4 rounded border-neutral-700 bg-neutral-800 text-indigo-600'}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right 1 col: Role Mentions, Colors, and Save Button */}
                                <div className={'flex flex-col gap-6'}>
                                    {/* Crash Pings & Mentions */}
                                    <div className={'rounded-2xl border border-neutral-800 bg-[#0a0f1d]/80 p-6 backdrop-blur-md'}>
                                        <h2 className={'text-base font-bold text-white flex items-center gap-2 mb-4'}>
                                            <ShieldCheckIcon className={'h-5 w-5 text-rose-400'} />
                                            Crash Alert Mentions
                                        </h2>

                                        <div className={'flex flex-col gap-3'}>
                                            <label className={'block text-xs font-semibold text-neutral-300'}>
                                                Ping on Server Crash
                                            </label>
                                            <select
                                                value={config.crashMention || 'everyone'}
                                                onChange={(e) => setConfig({ ...config, crashMention: e.target.value as any })}
                                                className={'rounded-xl bg-neutral-900 border border-neutral-700 px-3 py-2 text-xs text-white focus:outline-none'}
                                            >
                                                <option value={'none'}>No Mentions (Silent)</option>
                                                <option value={'everyone'}>@everyone</option>
                                                <option value={'role'}>Custom Staff Role ID</option>
                                            </select>

                                            {config.crashMention === 'role' && (
                                                <div className={'mt-2'}>
                                                    <label className={'block text-xs font-semibold text-neutral-300 mb-1'}>
                                                        Discord Role ID
                                                    </label>
                                                    <Input
                                                        placeholder={'e.g. 102938475610293847'}
                                                        value={config.crashRoleId || ''}
                                                        onChange={(e) => setConfig({ ...config, crashRoleId: e.target.value })}
                                                    />
                                                    <p className={'text-[10px] text-neutral-500 mt-1'}>
                                                        Right-click role in Discord &gt; Copy Role ID.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Embed Accent Colors */}
                                    <div className={'rounded-2xl border border-neutral-800 bg-[#0a0f1d]/80 p-6 backdrop-blur-md'}>
                                        <h2 className={'text-base font-bold text-white flex items-center gap-2 mb-4'}>
                                            <SparklesIcon className={'h-5 w-5 text-amber-400'} />
                                            Embed Accent Colors
                                        </h2>

                                        <div className={'flex flex-col gap-3 text-xs'}>
                                            <div className={'flex items-center justify-between'}>
                                                <span className={'text-neutral-300 font-semibold'}>Online Color</span>
                                                <div className={'flex items-center gap-2'}>
                                                    <input
                                                        type={'color'}
                                                        value={config.colorOnline || '#10b981'}
                                                        onChange={(e) => setConfig({ ...config, colorOnline: e.target.value })}
                                                        className={'h-6 w-8 rounded border-0 bg-transparent cursor-pointer'}
                                                    />
                                                    <span className={'font-mono text-[11px] text-neutral-400'}>{config.colorOnline || '#10b981'}</span>
                                                </div>
                                            </div>

                                            <div className={'flex items-center justify-between'}>
                                                <span className={'text-neutral-300 font-semibold'}>Offline Color</span>
                                                <div className={'flex items-center gap-2'}>
                                                    <input
                                                        type={'color'}
                                                        value={config.colorOffline || '#ef4444'}
                                                        onChange={(e) => setConfig({ ...config, colorOffline: e.target.value })}
                                                        className={'h-6 w-8 rounded border-0 bg-transparent cursor-pointer'}
                                                    />
                                                    <span className={'font-mono text-[11px] text-neutral-400'}>{config.colorOffline || '#ef4444'}</span>
                                                </div>
                                            </div>

                                            <div className={'flex items-center justify-between'}>
                                                <span className={'text-neutral-300 font-semibold'}>Crash Alert Color</span>
                                                <div className={'flex items-center gap-2'}>
                                                    <input
                                                        type={'color'}
                                                        value={config.colorCrash || '#dc2626'}
                                                        onChange={(e) => setConfig({ ...config, colorCrash: e.target.value })}
                                                        className={'h-6 w-8 rounded border-0 bg-transparent cursor-pointer'}
                                                    />
                                                    <span className={'font-mono text-[11px] text-neutral-400'}>{config.colorCrash || '#dc2626'}</span>
                                                </div>
                                            </div>

                                            <div className={'flex items-center justify-between'}>
                                                <span className={'text-neutral-300 font-semibold'}>Player Event Color</span>
                                                <div className={'flex items-center gap-2'}>
                                                    <input
                                                        type={'color'}
                                                        value={config.colorEvent || '#3b82f6'}
                                                        onChange={(e) => setConfig({ ...config, colorEvent: e.target.value })}
                                                        className={'h-6 w-8 rounded border-0 bg-transparent cursor-pointer'}
                                                    />
                                                    <span className={'font-mono text-[11px] text-neutral-400'}>{config.colorEvent || '#3b82f6'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Save Button */}
                                    <button
                                        type={'button'}
                                        disabled={saving}
                                        onClick={handleSaveConfig}
                                        className={'rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 py-3 text-sm font-bold text-white shadow-xl shadow-indigo-600/25 transition'}
                                    >
                                        {saving ? 'Saving Settings...' : '💾 Save Discord Settings'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: LIVE DISCORD PREVIEW & TEST SUITE */}
                        {activeTab === 'preview' && (
                            <div className={'grid grid-cols-1 lg:grid-cols-12 gap-6'}>
                                {/* Left 5 cols: Test Controls & Event Selector */}
                                <div className={'lg:col-span-5 flex flex-col gap-4'}>
                                    <div className={'rounded-2xl border border-neutral-800 bg-[#0a0f1d]/80 p-5 backdrop-blur-md'}>
                                        <h2 className={'text-base font-bold text-white flex items-center gap-2 mb-3'}>
                                            <SparklesIcon className={'h-5 w-5 text-indigo-400'} />
                                            Select Event Mockup
                                        </h2>
                                        <p className={'text-xs text-neutral-400 mb-4'}>
                                            Choose an event to see how it looks in Discord and test sending it to your channel.
                                        </p>

                                        <div className={'grid grid-cols-2 gap-2'}>
                                            {[
                                                { type: 'start', label: '🟢 Server Online', color: 'border-emerald-500/40 text-emerald-300' },
                                                { type: 'stop', label: '🔴 Server Offline', color: 'border-rose-500/40 text-rose-300' },
                                                { type: 'crash', label: '⚠️ Crash Alert', color: 'border-red-600/40 text-red-400' },
                                                { type: 'player_join', label: '👋 Player Join', color: 'border-blue-500/40 text-blue-300' },
                                                { type: 'player_death', label: '💀 Player Death', color: 'border-red-900/40 text-red-300' },
                                                { type: 'status', label: '📊 Status Card', color: 'border-cyan-500/40 text-cyan-300' },
                                            ].map((evt) => (
                                                <button
                                                    key={evt.type}
                                                    type={'button'}
                                                    onClick={() => setPreviewEvent(evt.type as DiscordEventType)}
                                                    className={classNames('p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-between', {
                                                        'bg-indigo-600/30 border-indigo-500 text-white shadow-md': previewEvent === evt.type,
                                                        'bg-neutral-900/60 hover:bg-neutral-800/80 text-neutral-300 border-neutral-800': previewEvent !== evt.type,
                                                    })}
                                                >
                                                    <span>{evt.label}</span>
                                                    {previewEvent === evt.type && <span className={'h-2 w-2 rounded-full bg-indigo-400'} />}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Custom Test Fields */}
                                        {(previewEvent === 'player_join' || previewEvent === 'player_death') && (
                                            <div className={'mt-4 pt-3 border-t border-neutral-800 flex flex-col gap-3'}>
                                                <div>
                                                    <label className={'block text-[11px] font-semibold text-neutral-400 mb-1'}>
                                                        Test Player Name (for avatar)
                                                    </label>
                                                    <Input
                                                        value={testPlayerName}
                                                        onChange={(e) => setTestPlayerName(e.target.value)}
                                                        placeholder={'Steve'}
                                                    />
                                                </div>
                                                {previewEvent === 'player_death' && (
                                                    <div>
                                                        <label className={'block text-[11px] font-semibold text-neutral-400 mb-1'}>
                                                            Death Cause Message
                                                        </label>
                                                        <Input
                                                            value={testDeathMessage}
                                                            onChange={(e) => setTestDeathMessage(e.target.value)}
                                                            placeholder={'Steve was blown up by Creeper'}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className={'mt-5 pt-4 border-t border-neutral-800 flex flex-col sm:flex-row gap-2'}>
                                            <button
                                                type={'button'}
                                                disabled={!config.webhookUrl || sendingTest !== null}
                                                onClick={() => handleSendTest(previewEvent)}
                                                className={'flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 py-2.5 text-xs font-bold text-white shadow transition'}
                                            >
                                                <PaperAirplaneIcon className={'h-3.5 w-3.5'} />
                                                {sendingTest === previewEvent ? 'Sending to Discord...' : 'Send This Alert to Discord'}
                                            </button>
                                            <button
                                                type={'button'}
                                                onClick={handleCopyPayloadJson}
                                                className={'px-3 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-300 border border-neutral-700 transition'}
                                            >
                                                {copiedJson ? 'Copied JSON!' : 'Copy JSON'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Right 7 cols: Discord Dark Theme Simulation */}
                                <div className={'lg:col-span-7 flex flex-col gap-3'}>
                                    <div className={'rounded-2xl border border-neutral-700/80 bg-[#313338] p-5 shadow-2xl font-sans text-left'}>
                                        {/* Discord Chat Header Mockup */}
                                        <div className={'flex items-center justify-between pb-3 mb-4 border-b border-[#3f4147] text-xs text-[#949ba4]'}>
                                            <div className={'flex items-center gap-1.5 font-bold text-white'}>
                                                <span className={'text-neutral-400 font-normal'}>#</span> server-alerts
                                            </div>
                                            <span>Discord Channel Preview</span>
                                        </div>

                                        {/* Discord Message Row */}
                                        <div className={'flex items-start gap-4'}>
                                            {/* Bot Avatar */}
                                            <img
                                                src={config.botAvatarUrl || 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/pterodactyl.png'}
                                                alt={'Bot Avatar'}
                                                className={'h-10 w-10 shrink-0 rounded-full bg-[#1e1f22] object-cover'}
                                                onError={(e: any) => {
                                                    e.target.src = 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/pterodactyl.png';
                                                }}
                                            />

                                            <div className={'min-w-0 flex-1'}>
                                                {/* Bot Name & BOT Badge */}
                                                <div className={'flex items-center gap-2 mb-1'}>
                                                    <span className={'text-sm font-bold text-white'}>
                                                        {config.botUsername || 'SmitCloud Alerts'}
                                                    </span>
                                                    <span className={'rounded bg-[#5865f2] px-1 py-0.2 text-[9px] font-black uppercase text-white tracking-wider'}>
                                                        BOT
                                                    </span>
                                                    <span className={'text-[11px] text-[#949ba4]'}>
                                                        Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>

                                                {/* Mention content if crash */}
                                                {currentPayload.content && (
                                                    <div className={'text-xs font-semibold text-[#5865f2] bg-[#5865f2]/15 px-1.5 py-0.5 rounded inline-block mb-2'}>
                                                        {currentPayload.content}
                                                    </div>
                                                )}

                                                {/* Discord Embed Container */}
                                                <div
                                                    className={'rounded-lg bg-[#2b2d31] p-4 text-xs shadow-md border-l-4'}
                                                    style={{ borderLeftColor: embedColorHex }}
                                                >
                                                    <div className={'flex items-start justify-between gap-4'}>
                                                        <div className={'flex-1 min-w-0'}>
                                                            {/* Embed Title */}
                                                            <h3 className={'text-sm font-bold text-white mb-1.5'}>
                                                                {currentEmbed.title}
                                                            </h3>
                                                            {/* Description */}
                                                            <p className={'text-xs text-[#dbdee1] mb-3 leading-relaxed'}>
                                                                {currentEmbed.description}
                                                            </p>

                                                            {/* Embed Fields */}
                                                            {currentEmbed.fields && currentEmbed.fields.length > 0 && (
                                                                <div className={'grid grid-cols-2 sm:grid-cols-3 gap-3 my-2'}>
                                                                    {currentEmbed.fields.map((f: any, i: number) => (
                                                                        <div key={i} className={'min-w-0'}>
                                                                            <span className={'block text-[10px] font-bold text-[#b5bac1] uppercase tracking-wider'}>
                                                                                {f.name}
                                                                            </span>
                                                                            <span className={'block text-xs font-semibold text-[#f2f3f5] mt-0.5'}>
                                                                                {f.value}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Thumbnail if present */}
                                                        {currentEmbed.thumbnail?.url && (
                                                            <img
                                                                src={currentEmbed.thumbnail.url}
                                                                alt={'Thumbnail'}
                                                                className={'h-14 w-14 shrink-0 rounded-lg object-contain bg-[#1e1f22] p-1 border border-neutral-700/60'}
                                                            />
                                                        )}
                                                    </div>

                                                    {/* Embed Footer */}
                                                    {currentEmbed.footer?.text && (
                                                        <div className={'mt-3 pt-2 border-t border-[#3f4147]/60 text-[10px] text-[#949ba4] flex items-center justify-between'}>
                                                            <span>{currentEmbed.footer.text}</span>
                                                            <span>{new Date().toLocaleDateString()}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 3: DISCORDSRV BOT MANAGER */}
                        {activeTab === 'discordsrv' && (
                            <div className={'flex flex-col gap-6'}>
                                {/* DiscordSRV Plugin Status Card */}
                                <div className={'rounded-2xl border border-neutral-800 bg-[#0a0f1d]/80 p-6 backdrop-blur-md'}>
                                    <div className={'flex flex-col sm:flex-row sm:items-center justify-between gap-4'}>
                                        <div className={'flex items-start gap-4'}>
                                            <div className={'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-md'}>
                                                <UsersIcon className={'h-6 w-6'} />
                                            </div>
                                            <div>
                                                <div className={'flex items-center gap-2'}>
                                                    <h2 className={'text-base font-bold text-white'}>DiscordSRV Plugin</h2>
                                                    {checkingSrv ? (
                                                        <Spinner size={'small'} />
                                                    ) : discordSrvInstalled ? (
                                                        <span className={'px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-bold border border-emerald-500/30'}>
                                                            🟢 Installed in /plugins
                                                        </span>
                                                    ) : (
                                                        <span className={'px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-xs font-bold border border-amber-500/30'}>
                                                            ⚠️ Not Installed
                                                        </span>
                                                    )}
                                                </div>
                                                <p className={'text-xs text-neutral-400 mt-1 max-w-2xl'}>
                                                    DiscordSRV provides 2-way live in-game chat sync, Discord console commands, and Discord audio/proximity voice chat.
                                                </p>
                                            </div>
                                        </div>

                                        <div>
                                            {!discordSrvInstalled ? (
                                                <button
                                                    type={'button'}
                                                    disabled={installingSrv}
                                                    onClick={handleInstallDiscordSRV}
                                                    className={'flex items-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 py-2.5 px-5 text-xs font-bold text-white shadow-lg shadow-cyan-600/20 transition'}
                                                >
                                                    <CloudDownloadIcon className={'h-4 w-4'} />
                                                    {installingSrv ? 'Installing DiscordSRV...' : '1-Click Install DiscordSRV'}
                                                </button>
                                            ) : (
                                                <button
                                                    type={'button'}
                                                    onClick={handleInstallDiscordSRV}
                                                    disabled={installingSrv}
                                                    className={'flex items-center gap-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 py-2 px-4 text-xs font-semibold text-neutral-300 border border-neutral-700 transition'}
                                                >
                                                    <RefreshIcon className={'h-3.5 w-3.5'} />
                                                    Reinstall / Update
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* DiscordSRV Configuration Form */}
                                <div className={'rounded-2xl border border-neutral-800 bg-[#0a0f1d]/80 p-6 backdrop-blur-md'}>
                                    <h2 className={'text-base font-bold text-white flex items-center gap-2 mb-2'}>
                                        <KeyIcon className={'h-5 w-5 text-cyan-400'} />
                                        Visual DiscordSRV Configuration (config.yml)
                                    </h2>
                                    <p className={'text-xs text-neutral-400 mb-5'}>
                                        Fill in your Bot Token and Channel IDs below. Saving will automatically write to <code className={'text-cyan-300'}>/plugins/DiscordSRV/config.yml</code>.
                                    </p>

                                    <div className={'grid grid-cols-1 sm:grid-cols-2 gap-5'}>
                                        {/* Bot Token */}
                                        <div className={'sm:col-span-2'}>
                                            <div className={'flex items-center justify-between mb-1'}>
                                                <label className={'text-xs font-semibold text-neutral-300'}>
                                                    Discord Bot Token <span className={'text-rose-400'}>*</span>
                                                </label>
                                                <a
                                                    href={'https://discord.com/developers/applications'}
                                                    target={'_blank'}
                                                    rel={'noopener noreferrer'}
                                                    className={'text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold'}
                                                >
                                                    <ExternalLinkIcon className={'h-3 w-3'} />
                                                    Discord Developer Portal
                                                </a>
                                            </div>
                                            <div className={'relative'}>
                                                <Input
                                                    type={showBotToken ? 'text' : 'password'}
                                                    placeholder={'MTAxOTI4Mzc...'}
                                                    value={config.botToken || ''}
                                                    onChange={(e) => setConfig({ ...config, botToken: e.target.value })}
                                                />
                                                <button
                                                    type={'button'}
                                                    onClick={() => setShowBotToken(!showBotToken)}
                                                    className={'absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white'}
                                                >
                                                    {showBotToken ? <EyeOffIcon className={'h-4 w-4'} /> : <EyeIcon className={'h-4 w-4'} />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Guild ID */}
                                        <div>
                                            <label className={'block text-xs font-semibold text-neutral-300 mb-1'}>
                                                Discord Server (Guild) ID
                                            </label>
                                            <Input
                                                placeholder={'e.g. 102938475610293847'}
                                                value={config.guildId || ''}
                                                onChange={(e) => setConfig({ ...config, guildId: e.target.value })}
                                            />
                                        </div>

                                        {/* Chat Channel ID */}
                                        <div>
                                            <label className={'block text-xs font-semibold text-neutral-300 mb-1'}>
                                                In-Game Chat Channel ID (2-Way Sync)
                                            </label>
                                            <Input
                                                placeholder={'e.g. 987654321098765432'}
                                                value={config.chatChannelId || ''}
                                                onChange={(e) => setConfig({ ...config, chatChannelId: e.target.value })}
                                            />
                                        </div>

                                        {/* Console Channel ID */}
                                        <div>
                                            <label className={'block text-xs font-semibold text-neutral-300 mb-1'}>
                                                Console Channel ID (Admin Commands)
                                            </label>
                                            <Input
                                                placeholder={'e.g. 876543210987654321'}
                                                value={config.consoleChannelId || ''}
                                                onChange={(e) => setConfig({ ...config, consoleChannelId: e.target.value })}
                                            />
                                        </div>

                                        {/* Log Channel ID */}
                                        <div>
                                            <label className={'block text-xs font-semibold text-neutral-300 mb-1'}>
                                                Alerts / Status Channel ID
                                            </label>
                                            <Input
                                                placeholder={'e.g. 765432109876543210'}
                                                value={config.logChannelId || ''}
                                                onChange={(e) => setConfig({ ...config, logChannelId: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    {/* Action row */}
                                    <div className={'mt-6 pt-4 border-t border-neutral-800 flex justify-end'}>
                                        <button
                                            type={'button'}
                                            disabled={savingSrvConfig}
                                            onClick={handleSaveDiscordSRVConfig}
                                            className={'rounded-xl bg-cyan-600 hover:bg-cyan-500 py-2.5 px-6 text-xs font-bold text-white shadow-lg shadow-cyan-600/20 transition'}
                                        >
                                            {savingSrvConfig ? 'Writing config.yml...' : '💾 Save DiscordSRV config.yml'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 4: LIVE STATUS & COMMUNITY WIDGET */}
                        {activeTab === 'widgets' && (
                            <div className={'grid grid-cols-1 lg:grid-cols-2 gap-6'}>
                                {/* Live Server Ping Card */}
                                <div className={'rounded-2xl border border-neutral-800 bg-[#0a0f1d]/80 p-6 backdrop-blur-md flex flex-col justify-between'}>
                                    <div>
                                        <div className={'flex items-center justify-between mb-4'}>
                                            <h2 className={'text-base font-bold text-white flex items-center gap-2'}>
                                                <GlobeAltIcon className={'h-5 w-5 text-emerald-400'} />
                                                Live Server Status
                                            </h2>
                                            {loadingPublicStatus ? (
                                                <span className={'text-xs text-neutral-400'}>Pinging...</span>
                                            ) : publicStatus?.online ? (
                                                <span className={'rounded-full bg-emerald-500/15 px-3 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/30'}>
                                                    🟢 ONLINE
                                                </span>
                                            ) : (
                                                <span className={'rounded-full bg-rose-500/15 px-3 py-0.5 text-xs font-bold text-rose-400 border border-rose-500/30'}>
                                                    🔴 OFFLINE / STANDBY
                                                </span>
                                            )}
                                        </div>

                                        {/* Status Card Body */}
                                        <div className={'rounded-xl border border-neutral-800 bg-neutral-950 p-4 mb-4'}>
                                            <div className={'flex items-center gap-4'}>
                                                <div className={'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-neutral-900 border border-neutral-800 text-2xl'}>
                                                    🎮
                                                </div>
                                                <div className={'min-w-0 flex-1'}>
                                                    <p className={'font-bold text-white text-sm truncate'}>{config.serverName}</p>
                                                    <p className={'text-xs text-cyan-400 font-mono mt-0.5'}>{config.serverAddress}:25565</p>
                                                    {publicStatus?.players && (
                                                        <p className={'text-xs text-neutral-300 mt-1'}>
                                                            Players: <strong className={'text-emerald-400'}>{publicStatus.players.online}</strong> / {publicStatus.players.max}
                                                        </p>
                                                    )}
                                                    {publicStatus?.version && (
                                                        <p className={'text-[11px] text-neutral-500'}>
                                                            Version: {publicStatus.version}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            type={'button'}
                                            disabled={!config.webhookUrl || sendingTest !== null}
                                            onClick={() => handleSendTest('status')}
                                            className={'w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 transition'}
                                        >
                                            <PaperAirplaneIcon className={'h-3.5 w-3.5'} />
                                            {sendingTest === 'status' ? 'Broadcasting...' : 'Broadcast Live Status Card to Discord'}
                                        </button>
                                    </div>
                                </div>

                                {/* Discord Server Invite & Badges */}
                                <div className={'rounded-2xl border border-neutral-800 bg-[#0a0f1d]/80 p-6 backdrop-blur-md flex flex-col justify-between'}>
                                    <div>
                                        <h2 className={'text-base font-bold text-white flex items-center gap-2 mb-2'}>
                                            <ClipboardCopyIcon className={'h-5 w-5 text-cyan-400'} />
                                            Badges &amp; Embed Codes
                                        </h2>
                                        <p className={'text-xs text-neutral-400 mb-4'}>
                                            Embed real-time online status badges on GitHub READMEs, forums, or server websites.
                                        </p>

                                        {/* Markdown Badge */}
                                        <div className={'mb-4'}>
                                            <div className={'flex items-center justify-between mb-1'}>
                                                <span className={'text-xs font-semibold text-neutral-300'}>Markdown Badge</span>
                                                <button
                                                    type={'button'}
                                                    onClick={handleCopyMd}
                                                    className={'text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold'}
                                                >
                                                    <ClipboardCopyIcon className={'h-3.5 w-3.5'} />
                                                    {copiedMd ? 'Copied!' : 'Copy'}
                                                </button>
                                            </div>
                                            <pre className={'rounded-lg bg-neutral-950 p-2.5 text-[11px] text-neutral-300 overflow-x-auto font-mono border border-neutral-800'}>
                                                {mdBadgeCode}
                                            </pre>
                                        </div>

                                        {/* HTML Embed */}
                                        <div>
                                            <div className={'flex items-center justify-between mb-1'}>
                                                <span className={'text-xs font-semibold text-neutral-300'}>HTML Snippet</span>
                                                <button
                                                    type={'button'}
                                                    onClick={handleCopyHtml}
                                                    className={'text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold'}
                                                >
                                                    <ClipboardCopyIcon className={'h-3.5 w-3.5'} />
                                                    {copiedHtml ? 'Copied!' : 'Copy'}
                                                </button>
                                            </div>
                                            <pre className={'rounded-lg bg-neutral-950 p-2.5 text-[11px] text-neutral-300 overflow-x-auto font-mono border border-neutral-800'}>
                                                {htmlEmbedCode}
                                            </pre>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </ServerContentBlock>
    );
};
