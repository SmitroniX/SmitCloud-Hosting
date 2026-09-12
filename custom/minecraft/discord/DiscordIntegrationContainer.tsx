import React, { useEffect, useState } from 'react';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { ServerContext } from '@/state/server';
import useFlash from '@/plugins/useFlash';
import Spinner from '@/components/elements/Spinner';
import Button from '@/components/elements/Button';
import Input from '@/components/elements/Input';
import Switch from '@/components/elements/Switch';
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
} from '@heroicons/react/solid';
import {
    DiscordConfig,
    fetchDiscordConfig,
    saveDiscordConfig,
    sendTestDiscordWebhook,
} from '@/api/server/minecraft/discord';

export default () => {
    const server = ServerContext.useStoreState((state) => state.server.data!);
    const { clearFlashes, clearAndAddHttpError, addFlash } = useFlash();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [copiedHtml, setCopiedHtml] = useState(false);
    const [copiedMd, setCopiedMd] = useState(false);

    const [config, setConfig] = useState<DiscordConfig>({
        webhookUrl: '',
        serverName: server.name,
        notifyStart: true,
        notifyStop: true,
        notifyCrash: true,
        notifyPlayers: false,
        serverAddress: 'play.shadowpixel.fun',
    });

    const [publicStatus, setPublicStatus] = useState<any>(null);
    const [loadingPublicStatus, setLoadingPublicStatus] = useState(false);

    const loadConfig = async () => {
        try {
            setLoading(true);
            const data = await fetchDiscordConfig(server.uuid);
            setConfig((prev) => ({ ...prev, ...data, serverName: data.serverName || server.name }));
        } catch (error) {
            clearAndAddHttpError({ error, key: 'discord' });
        } finally {
            setLoading(false);
        }
    };

    const checkPublicStatus = async (address: string) => {
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

    useEffect(() => {
        clearFlashes('discord');
        loadConfig();
    }, []);

    useEffect(() => {
        if (config.serverAddress) {
            checkPublicStatus(config.serverAddress);
        }
    }, [config.serverAddress]);

    const handleSave = async () => {
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

    const handleTestWebhook = async () => {
        if (!config.webhookUrl) {
            alert('Please specify a Discord Webhook URL first.');
            return;
        }

        try {
            clearFlashes('discord');
            setTesting(true);
            await sendTestDiscordWebhook(config.webhookUrl, config.serverName);
            addFlash({
                key: 'discord',
                type: 'success',
                message: 'Test message sent to Discord! Check your Discord channel.',
            });
        } catch (error) {
            clearAndAddHttpError({ error, key: 'discord' });
        } finally {
            setTesting(false);
        }
    };

    const htmlEmbedCode = `<iframe src="https://api.mcsrvstat.us/icon/${encodeURIComponent(config.serverAddress)}" width="64" height="64" frameborder="0"></iframe>
<p><strong>${config.serverName}</strong>: <code>${config.serverAddress}</code></p>`;

    const mdBadgeCode = `![Server Status](https://img.shields.io/badge/Minecraft-${encodeURIComponent(config.serverAddress)}-06b6d4?logo=minecraft&style=for-the-badge)`;

    const handleCopyHtml = () => {
        copy(htmlEmbedCode);
        setCopiedHtml(true);
        setTimeout(() => setCopiedHtml(false), 2000);
    };

    const handleCopyMd = () => {
        copy(mdBadgeCode);
        setCopiedMd(true);
        setTimeout(() => setCopiedMd(false), 2000);
    };

    return (
        <ServerContentBlock title={'Discord & Public Status Widget'} showFlashKey={'discord'}>
            <div className={'flex flex-col gap-6'}>
                {/* Hero Banner */}
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
                                        Discord Webhooks & Public Status
                                    </h1>
                                    <span className={'inline-flex items-center gap-1.5 rounded-full bg-indigo-500/15 px-3 py-0.5 text-xs font-bold text-indigo-400 border border-indigo-500/30'}>
                                        <SparklesIcon className={'h-3.5 w-3.5'} />
                                        COMMUNITY BRIDGE
                                    </span>
                                </div>
                                <p className={'mt-1 text-xs sm:text-sm text-neutral-400'}>
                                    Broadcast server startups, crashes, and player activity directly into your Discord community channels and embed public status cards.
                                </p>
                            </div>
                        </div>

                        <div className={'flex flex-wrap items-center gap-3 shrink-0'}>
                            <button
                                type={'button'}
                                disabled={testing || !config.webhookUrl}
                                onClick={handleTestWebhook}
                                className={'flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/20 transition'}
                            >
                                <PaperAirplaneIcon className={'h-4 w-4'} />
                                {testing ? 'Sending...' : 'Send Test Webhook'}
                            </button>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className={'flex justify-center py-16'}>
                        <Spinner size={'large'} centered />
                    </div>
                ) : (
                    <div className={'grid grid-cols-1 lg:grid-cols-2 gap-6'}>
                        {/* Discord Webhook Settings */}
                        <div className={'rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 backdrop-blur-md flex flex-col justify-between'}>
                            <div className={'flex flex-col gap-4'}>
                                <h2 className={'text-base font-bold text-white flex items-center gap-2'}>
                                    <BellIcon className={'h-5 w-5 text-indigo-400'} />
                                    Discord Webhook Setup
                                </h2>
                                <p className={'text-xs text-neutral-400'}>
                                    Create a webhook in your Discord Server Settings &gt; Integrations &gt; Webhooks and paste the URL below.
                                </p>

                                <div>
                                    <label className={'block text-xs font-semibold text-neutral-300 mb-1'}>
                                        Discord Webhook URL
                                    </label>
                                    <Input
                                        placeholder={'https://discord.com/api/webhooks/...'}
                                        value={config.webhookUrl}
                                        onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className={'block text-xs font-semibold text-neutral-300 mb-1'}>
                                        Server Display Name
                                    </label>
                                    <Input
                                        placeholder={'e.g. SmitCloud Survival'}
                                        value={config.serverName}
                                        onChange={(e) => setConfig({ ...config, serverName: e.target.value })}
                                    />
                                </div>

                                <div className={'mt-2 border-t border-neutral-800/80 pt-4 flex flex-col gap-3'}>
                                    <span className={'text-xs font-bold uppercase tracking-wider text-neutral-400'}>
                                        Notification Triggers
                                    </span>

                                    <div className={'flex items-center justify-between'}>
                                        <div>
                                            <p className={'text-xs font-semibold text-white'}>Server Online Alert</p>
                                            <p className={'text-[11px] text-neutral-400'}>Send embed when server boots successfully</p>
                                        </div>
                                        <input
                                            type={'checkbox'}
                                            checked={config.notifyStart}
                                            onChange={(e) => setConfig({ ...config, notifyStart: e.target.checked })}
                                            className={'h-4 w-4 rounded border-neutral-700 bg-neutral-800 text-indigo-600 focus:ring-indigo-500'}
                                        />
                                    </div>

                                    <div className={'flex items-center justify-between'}>
                                        <div>
                                            <p className={'text-xs font-semibold text-white'}>Server Offline Alert</p>
                                            <p className={'text-[11px] text-neutral-400'}>Send embed when server is stopped gracefully</p>
                                        </div>
                                        <input
                                            type={'checkbox'}
                                            checked={config.notifyStop}
                                            onChange={(e) => setConfig({ ...config, notifyStop: e.target.checked })}
                                            className={'h-4 w-4 rounded border-neutral-700 bg-neutral-800 text-indigo-600 focus:ring-indigo-500'}
                                        />
                                    </div>

                                    <div className={'flex items-center justify-between'}>
                                        <div>
                                            <p className={'text-xs font-semibold text-white'}>Server Crash Alert</p>
                                            <p className={'text-[11px] text-neutral-400'}>High-priority alert if server crashes</p>
                                        </div>
                                        <input
                                            type={'checkbox'}
                                            checked={config.notifyCrash}
                                            onChange={(e) => setConfig({ ...config, notifyCrash: e.target.checked })}
                                            className={'h-4 w-4 rounded border-neutral-700 bg-neutral-800 text-indigo-600 focus:ring-indigo-500'}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className={'mt-6 pt-4 border-t border-neutral-800 flex justify-end gap-3'}>
                                <button
                                    type={'button'}
                                    disabled={saving}
                                    onClick={handleSave}
                                    className={'rounded-xl bg-cyan-600 hover:bg-cyan-500 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-cyan-600/20 transition'}
                                >
                                    {saving ? 'Saving...' : 'Save Discord Settings'}
                                </button>
                            </div>
                        </div>

                        {/* Public Status Widget & Embeds */}
                        <div className={'rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 backdrop-blur-md flex flex-col justify-between'}>
                            <div className={'flex flex-col gap-4'}>
                                <h2 className={'text-base font-bold text-white flex items-center gap-2'}>
                                    <GlobeAltIcon className={'h-5 w-5 text-cyan-400'} />
                                    Public Status Widget & Badges
                                </h2>
                                <p className={'text-xs text-neutral-400'}>
                                    Embed your Minecraft server&apos;s real-time online status badge directly on websites, GitHub, or forums.
                                </p>

                                <div>
                                    <label className={'block text-xs font-semibold text-neutral-300 mb-1'}>
                                        Server IP / Domain
                                    </label>
                                    <Input
                                        placeholder={'play.shadowpixel.fun'}
                                        value={config.serverAddress}
                                        onChange={(e) => setConfig({ ...config, serverAddress: e.target.value })}
                                    />
                                </div>

                                {/* Live Widget Preview */}
                                <div className={'rounded-xl border border-neutral-800 bg-neutral-950/80 p-4 mt-2'}>
                                    <div className={'flex items-center justify-between mb-2'}>
                                        <span className={'text-[10px] font-bold uppercase tracking-wider text-neutral-400'}>
                                            Widget Live Preview
                                        </span>
                                        {loadingPublicStatus ? (
                                            <span className={'text-[10px] text-cyan-400'}>Checking status...</span>
                                        ) : publicStatus?.online ? (
                                            <span className={'rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20'}>
                                                🟢 ONLINE
                                            </span>
                                        ) : (
                                            <span className={'rounded bg-neutral-800 px-2 py-0.5 text-[10px] font-bold text-neutral-400'}>
                                                ⚪ QUERY PENDING / STANDBY
                                            </span>
                                        )}
                                    </div>

                                    <div className={'flex items-center gap-3'}>
                                        <div className={'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-neutral-800 border border-neutral-700 text-xl'}>
                                            🎮
                                        </div>
                                        <div>
                                            <p className={'font-bold text-white text-sm'}>{config.serverName}</p>
                                            <p className={'text-xs text-cyan-400 font-mono'}>{config.serverAddress}</p>
                                            {publicStatus?.players && (
                                                <p className={'text-[11px] text-neutral-400 mt-0.5'}>
                                                    Players: {publicStatus.players.online} / {publicStatus.players.max}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Embed Codes */}
                                <div className={'mt-2 flex flex-col gap-3'}>
                                    <div>
                                        <div className={'flex items-center justify-between mb-1'}>
                                            <span className={'text-xs font-semibold text-neutral-300'}>Markdown Badge (GitHub / Discord)</span>
                                            <button
                                                type={'button'}
                                                onClick={handleCopyMd}
                                                className={'text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold'}
                                            >
                                                <ClipboardCopyIcon className={'h-3.5 w-3.5'} />
                                                {copiedMd ? 'Copied!' : 'Copy Markdown'}
                                            </button>
                                        </div>
                                        <pre className={'rounded-lg bg-neutral-950 p-2 text-[11px] text-neutral-300 overflow-x-auto font-mono border border-neutral-800'}>
                                            {mdBadgeCode}
                                        </pre>
                                    </div>

                                    <div>
                                        <div className={'flex items-center justify-between mb-1'}>
                                            <span className={'text-xs font-semibold text-neutral-300'}>HTML Embed (Website / Forum)</span>
                                            <button
                                                type={'button'}
                                                onClick={handleCopyHtml}
                                                className={'text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold'}
                                            >
                                                <ClipboardCopyIcon className={'h-3.5 w-3.5'} />
                                                {copiedHtml ? 'Copied!' : 'Copy HTML'}
                                            </button>
                                        </div>
                                        <pre className={'rounded-lg bg-neutral-950 p-2 text-[11px] text-neutral-300 overflow-x-auto font-mono border border-neutral-800'}>
                                            {htmlEmbedCode}
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ServerContentBlock>
    );
};
