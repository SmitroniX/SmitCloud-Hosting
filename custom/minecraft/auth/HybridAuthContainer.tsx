import React, { useEffect, useState } from 'react';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { ServerContext } from '@/state/server';
import useFlash from '@/plugins/useFlash';
import Spinner from '@/components/elements/Spinner';
import Input from '@/components/elements/Input';
import classNames from 'classnames';
import {
    SparklesIcon,
    ShieldCheckIcon,
    CheckCircleIcon,
    ExclamationIcon,
    RefreshIcon,
    KeyIcon,
    ServerIcon,
    UsersIcon,
    CloudDownloadIcon,
    AdjustmentsIcon,
    PhotographIcon,
} from '@heroicons/react/solid';
import {
    HybridAuthStatus,
    HybridAuthSettings,
    DEFAULT_AUTH_SETTINGS,
    checkHybridAuthStatus,
    applyHybridAuthSuite,
} from '@/api/server/minecraft/auth';

export default () => {
    const server = ServerContext.useStoreState((state) => state.server.data!);
    const { clearFlashes, clearAndAddHttpError, addFlash } = useFlash();

    const [loading, setLoading] = useState(true);
    const [deploying, setDeploying] = useState(false);
    const [status, setStatus] = useState<HybridAuthStatus>({
        hasFastLogin: false,
        hasAuthMe: false,
        hasFloodgate: false,
        hasSkinsRestorer: false,
        isOfflineMode: false,
        isFullyConfigured: false,
    });

    const [settings, setSettings] = useState<HybridAuthSettings>(DEFAULT_AUTH_SETTINGS);

    useEffect(() => {
        loadData();
    }, [server.uuid]);

    const loadData = async () => {
        try {
            setLoading(true);
            clearFlashes('hybrid-auth');
            const authStatus = await checkHybridAuthStatus(server.uuid);
            setStatus(authStatus);
        } catch (error) {
            clearAndAddHttpError({ error, key: 'hybrid-auth' });
        } finally {
            setLoading(false);
        }
    };

    const handleDeploySuite = async () => {
        try {
            setDeploying(true);
            clearFlashes('hybrid-auth');
            await applyHybridAuthSuite(server.uuid, settings);
            await loadData();
            addFlash({
                key: 'hybrid-auth',
                type: 'success',
                message: '💎 SmitCloud Hybrid Auth Suite successfully deployed & configured! Restart server to activate auto-login in-game.',
            });
        } catch (error) {
            clearAndAddHttpError({ error, key: 'hybrid-auth' });
        } finally {
            setDeploying(false);
        }
    };

    return (
        <ServerContentBlock title={'Hybrid Auth & Auto-Login Studio'} showFlashKey={'hybrid-auth'}>
            <div className={'flex flex-col gap-6'}>
                {/* Premium Gold & Cyan Hero Header */}
                <div className={'relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-b from-[#161208] via-[#0d1322] to-[#080d1a] p-6 sm:p-8 shadow-2xl backdrop-blur-xl'}>
                    <div className={'pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-amber-500/15 blur-3xl'} />
                    <div className={'pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl'} />

                    <div className={'relative flex flex-col md:flex-row md:items-center md:justify-between gap-6'}>
                        <div className={'flex items-start gap-4 sm:gap-5'}>
                            <div className={'flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-400 text-black shadow-xl shadow-amber-500/30 font-black text-2xl'}>
                                👑
                            </div>
                            <div>
                                <div className={'flex flex-wrap items-center gap-2.5'}>
                                    <h1 className={'text-2xl sm:text-3xl font-black tracking-tight text-white'}>
                                        SmitCloud Hybrid Authentication
                                    </h1>
                                    <span className={'inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-0.5 text-xs font-bold text-amber-400 border border-amber-500/30 shadow-sm'}>
                                        <SparklesIcon className={'h-3.5 w-3.5'} />
                                        PREMIUM AUTO-LOGIN
                                    </span>
                                    {status.isFullyConfigured ? (
                                        <span className={'inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/40'}>
                                            <CheckCircleIcon className={'h-3.5 w-3.5'} />
                                            Active &amp; Armed
                                        </span>
                                    ) : (
                                        <span className={'inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-3 py-0.5 text-xs font-bold text-amber-400 border border-amber-500/40'}>
                                            <ExclamationIcon className={'h-3.5 w-3.5'} />
                                            1-Click Setup Ready
                                        </span>
                                    )}
                                </div>
                                <p className={'mt-1.5 text-xs sm:text-sm text-neutral-300 max-w-2xl leading-relaxed'}>
                                    The ultimate in-game login architecture: official Mojang Java buyers and Bedrock Xbox players log in <strong className={'text-amber-400'}>instantly without typing passwords</strong>, while cracked players are protected with secure passwords.
                                </p>
                            </div>
                        </div>

                        <div className={'flex items-center gap-3 shrink-0'}>
                            <button
                                type={'button'}
                                onClick={handleDeploySuite}
                                disabled={deploying}
                                className={'flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-extrabold px-6 py-3 text-xs shadow-xl shadow-amber-500/25 transition'}
                            >
                                <CloudDownloadIcon className={'h-4 w-4'} />
                                {deploying ? 'Deploying & Configuring...' : '⚡ Auto-Configure Hybrid Auth Suite'}
                            </button>
                            <button
                                type={'button'}
                                onClick={loadData}
                                disabled={loading}
                                className={'p-3 rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 transition'}
                                title={'Refresh Status'}
                            >
                                <RefreshIcon className={classNames('h-4 w-4', { 'animate-spin': loading })} />
                            </button>
                        </div>
                    </div>

                    {/* Live Engine Status Grid */}
                    <div className={'grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-neutral-800/80 text-xs'}>
                        <div className={'rounded-2xl bg-neutral-950/60 border border-neutral-800/70 p-3.5'}>
                            <span className={'text-neutral-500 block text-[10px] uppercase font-bold'}>Mojang Java Handshake</span>
                            <span className={classNames('text-sm font-black mt-0.5 block', status.hasFastLogin ? 'text-emerald-400' : 'text-neutral-400')}>
                                {status.hasFastLogin ? '🟢 FastLogin Active' : '⚪ Not Installed'}
                            </span>
                        </div>
                        <div className={'rounded-2xl bg-neutral-950/60 border border-neutral-800/70 p-3.5'}>
                            <span className={'text-neutral-500 block text-[10px] uppercase font-bold'}>Bedrock Xbox Bypass</span>
                            <span className={classNames('text-sm font-black mt-0.5 block', status.hasFloodgate ? 'text-emerald-400' : 'text-amber-400')}>
                                {status.hasFloodgate ? '🟢 Floodgate Linked' : '⚠️ Pending Install'}
                            </span>
                        </div>
                        <div className={'rounded-2xl bg-neutral-950/60 border border-neutral-800/70 p-3.5'}>
                            <span className={'text-neutral-500 block text-[10px] uppercase font-bold'}>Offline Password Vault</span>
                            <span className={classNames('text-sm font-black mt-0.5 block', status.hasAuthMe ? 'text-emerald-400' : 'text-neutral-400')}>
                                {status.hasAuthMe ? '🟢 AuthMe SHA-256' : '⚪ Not Installed'}
                            </span>
                        </div>
                        <div className={'rounded-2xl bg-neutral-950/60 border border-neutral-800/70 p-3.5'}>
                            <span className={'text-neutral-500 block text-[10px] uppercase font-bold'}>Universal Skins Sync</span>
                            <span className={classNames('text-sm font-black mt-0.5 block', status.hasSkinsRestorer ? 'text-emerald-400' : 'text-cyan-400')}>
                                {status.hasSkinsRestorer ? '🟢 SkinsRestorer Active' : '⚪ Ready to Install'}
                            </span>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className={'py-16 text-center'}>
                        <Spinner size={'large'} centered />
                    </div>
                ) : (
                    <div className={'grid grid-cols-1 lg:grid-cols-12 gap-6'}>
                        {/* Left 7 cols: Interactive Architecture & How It Works */}
                        <div className={'lg:col-span-7 flex flex-col gap-6'}>
                            {/* Workflow Visualizer */}
                            <div className={'rounded-2xl border border-neutral-800 bg-[#0a0f1d]/80 p-6 backdrop-blur-md'}>
                                <h2 className={'text-base font-bold text-white flex items-center gap-2 mb-4'}>
                                    <ShieldCheckIcon className={'h-5 w-5 text-amber-400'} />
                                    How SmitCloud Hybrid Authentication Operates
                                </h2>

                                <div className={'space-y-4'}>
                                    {/* Flow 1: Java Premium */}
                                    <div className={'p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-start gap-4'}>
                                        <div className={'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-lg'}>
                                            ☕
                                        </div>
                                        <div>
                                            <div className={'flex items-center gap-2'}>
                                                <h3 className={'text-sm font-bold text-white'}>Java Premium Players (Game Buyers)</h3>
                                                <span className={'px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400'}>
                                                    0 Prompts
                                                </span>
                                            </div>
                                            <p className={'text-xs text-neutral-300 mt-1 leading-relaxed'}>
                                                Player connects ➔ FastLogin initiates an encrypted handshake with <strong>sessionserver.mojang.com</strong> ➔ Mojang verifies ownership ➔ Player is logged in immediately without touching their keyboard!
                                            </p>
                                        </div>
                                    </div>

                                    {/* Flow 2: Bedrock Crossplay */}
                                    <div className={'p-4 rounded-xl border border-cyan-500/30 bg-cyan-500/5 flex items-start gap-4'}>
                                        <div className={'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-lg'}>
                                            🎮
                                        </div>
                                        <div>
                                            <div className={'flex items-center gap-2'}>
                                                <h3 className={'text-sm font-bold text-white'}>Bedrock Crossplay Players (iOS, Android, Xbox, PS)</h3>
                                                <span className={'px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-400'}>
                                                    Xbox Live
                                                </span>
                                            </div>
                                            <p className={'text-xs text-neutral-300 mt-1 leading-relaxed'}>
                                                Bedrock client connects ➔ Geyser &amp; Floodgate verify their Microsoft Xbox account token ➔ AuthMe detects Floodgate hook and skips password registration completely.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Flow 3: Cracked / Offline */}
                                    <div className={'p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 flex items-start gap-4'}>
                                        <div className={'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-lg'}>
                                            🔒
                                        </div>
                                        <div>
                                            <div className={'flex items-center gap-2'}>
                                                <h3 className={'text-sm font-bold text-white'}>Cracked / Offline Mode Players</h3>
                                                <span className={'px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-400'}>
                                                    Password Protected
                                                </span>
                                            </div>
                                            <p className={'text-xs text-neutral-300 mt-1 leading-relaxed'}>
                                                Non-official players cannot spoof legitimate accounts. They are safely prompted for <code className={'text-amber-300'}>/register &lt;password&gt;</code> and <code className={'text-amber-300'}>/login &lt;password&gt;</code>, preventing account theft.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right 5 cols: Settings & Configuration */}
                        <div className={'lg:col-span-5 flex flex-col gap-6'}>
                            <div className={'rounded-2xl border border-neutral-800 bg-[#0a0f1d]/80 p-5 backdrop-blur-md flex flex-col gap-4'}>
                                <h2 className={'text-base font-bold text-white flex items-center gap-2'}>
                                    <AdjustmentsIcon className={'h-5 w-5 text-amber-400'} />
                                    Hybrid Auth Tuning &amp; Security
                                </h2>

                                {/* Toggles */}
                                <div className={'space-y-3 pt-2'}>
                                    <div className={'flex items-center justify-between p-3 rounded-xl border border-neutral-800 bg-neutral-900/60'}>
                                        <div>
                                            <p className={'text-xs font-bold text-white'}>Java Mojang Auto-Login</p>
                                            <p className={'text-[11px] text-neutral-400'}>Zero passwords for official game buyers</p>
                                        </div>
                                        <input
                                            type={'checkbox'}
                                            checked={settings.mojangAutoLogin}
                                            onChange={(e) => setSettings({ ...settings, mojangAutoLogin: e.target.checked })}
                                            className={'h-4 w-4 rounded border-neutral-700 bg-neutral-800 text-amber-500'}
                                        />
                                    </div>

                                    <div className={'flex items-center justify-between p-3 rounded-xl border border-neutral-800 bg-neutral-900/60'}>
                                        <div>
                                            <p className={'text-xs font-bold text-white'}>Bedrock Xbox Auto-Login</p>
                                            <p className={'text-[11px] text-neutral-400'}>Zero passwords for Floodgate Bedrock players</p>
                                        </div>
                                        <input
                                            type={'checkbox'}
                                            checked={settings.bedrockAutoLogin}
                                            onChange={(e) => setSettings({ ...settings, bedrockAutoLogin: e.target.checked })}
                                            className={'h-4 w-4 rounded border-neutral-700 bg-neutral-800 text-amber-500'}
                                        />
                                    </div>

                                    <div className={'flex items-center justify-between p-3 rounded-xl border border-neutral-800 bg-neutral-900/60'}>
                                        <div>
                                            <p className={'text-xs font-bold text-white'}>SkinsRestorer Universal Engine</p>
                                            <p className={'text-[11px] text-neutral-400'}>Show skins for cracked &amp; premium players</p>
                                        </div>
                                        <input
                                            type={'checkbox'}
                                            checked={settings.restoreSkins}
                                            onChange={(e) => setSettings({ ...settings, restoreSkins: e.target.checked })}
                                            className={'h-4 w-4 rounded border-neutral-700 bg-neutral-800 text-amber-500'}
                                        />
                                    </div>
                                </div>

                                {/* Custom In-Game Server Branding */}
                                <div className={'mt-2'}>
                                    <label className={'block text-xs font-semibold text-neutral-300 mb-1'}>
                                        In-Game Brand Name (Chat Messages)
                                    </label>
                                    <Input
                                        value={settings.serverBrandingName}
                                        onChange={(e) => setSettings({ ...settings, serverBrandingName: e.target.value })}
                                        placeholder={'SmitCloud'}
                                    />
                                    <p className={'text-[10px] text-neutral-500 mt-1'}>
                                        Appears as &quot;[{settings.serverBrandingName.toUpperCase()}] Official account detected...&quot;
                                    </p>
                                </div>

                                {/* Session Cache */}
                                <div>
                                    <div className={'flex items-center justify-between text-xs font-semibold mb-1'}>
                                        <span className={'text-neutral-300'}>Remember Session Timeout</span>
                                        <span className={'text-amber-400 font-mono font-bold'}>{settings.sessionCacheMinutes} minutes</span>
                                    </div>
                                    <input
                                        type={'range'}
                                        min={5}
                                        max={180}
                                        step={5}
                                        value={settings.sessionCacheMinutes}
                                        onChange={(e) => setSettings({ ...settings, sessionCacheMinutes: parseInt(e.target.value, 10) })}
                                        className={'w-full accent-amber-500'}
                                    />
                                    <span className={'text-[10px] text-neutral-500'}>Players won&apos;t have to re-enter password on quick reconnects.</span>
                                </div>

                                {/* Max accounts per IP */}
                                <div className={'grid grid-cols-2 gap-3'}>
                                    <div>
                                        <label className={'block text-xs font-semibold text-neutral-300 mb-1'}>
                                            Min Password Length
                                        </label>
                                        <Input
                                            type={'number'}
                                            value={settings.minPasswordLength}
                                            onChange={(e) => setSettings({ ...settings, minPasswordLength: parseInt(e.target.value, 10) || 6 })}
                                        />
                                    </div>
                                    <div>
                                        <label className={'block text-xs font-semibold text-neutral-300 mb-1'}>
                                            Max Accounts / IP
                                        </label>
                                        <Input
                                            type={'number'}
                                            value={settings.maxAccountsPerIp}
                                            onChange={(e) => setSettings({ ...settings, maxAccountsPerIp: parseInt(e.target.value, 10) || 3 })}
                                        />
                                    </div>
                                </div>

                                <button
                                    type={'button'}
                                    disabled={deploying}
                                    onClick={handleDeploySuite}
                                    className={'mt-3 w-full rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold py-3 text-xs shadow-lg shadow-amber-500/20 transition'}
                                >
                                    {deploying ? 'Deploying...' : '💾 Save & Re-Sync Configurations'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ServerContentBlock>
    );
};
