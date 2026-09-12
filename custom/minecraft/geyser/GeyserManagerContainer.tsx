import React, { useEffect, useState } from 'react';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { ServerContext } from '@/state/server';
import useFlash from '@/plugins/useFlash';
import Spinner from '@/components/elements/Spinner';
import classNames from 'classnames';
import {
    CheckCircleIcon,
    CogIcon,
    DeviceMobileIcon,
    DesktopComputerIcon,
    DuplicateIcon,
    ExclamationIcon,
    RefreshIcon,
    ShieldCheckIcon,
    SparklesIcon,
    TrashIcon,
} from '@heroicons/react/solid';
import {
    autoConfigureGeyser,
    GeyserConfig,
    GeyserStatus,
    getGeyserStatus,
    installGeyserAndFloodgate,
    saveCustomGeyserConfig,
    uninstallGeyser,
} from '@/api/server/minecraft/geyser';
import copy from 'copy-to-clipboard';

export default () => {
    const server = ServerContext.useStoreState((state) => state.server.data);
    const uuid = server?.uuid || '';
    const serverName = server?.name || 'Minecraft Server';
    const allocations = server?.allocations || [];
    const defaultAllocation = allocations.find((a) => a.isDefault) || allocations[0];

    const { clearFlashes, clearAndAddHttpError, addFlash } = useFlash();

    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [status, setStatus] = useState<GeyserStatus | null>(null);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    // Form state
    const [bedrockPort, setBedrockPort] = useState<number>(19132);
    const [remotePort, setRemotePort] = useState<number>(defaultAllocation?.port || 25565);
    const [authType, setAuthType] = useState<'floodgate' | 'online' | 'offline'>('floodgate');
    const [motd1, setMotd1] = useState(serverName);
    const [motd2, setMotd2] = useState('Bedrock & Java Crossplay Server');
    const [showCoordinates, setShowCoordinates] = useState(true);
    const [passthroughMotd, setPassthroughMotd] = useState(true);
    const [passthroughPlayerCounts, setPassthroughPlayerCounts] = useState(true);

    const primaryAddress = defaultAllocation?.ipAlias || defaultAllocation?.ip || 'play.shadowpixel.fun';

    // Check if 19132 is allocated, else suggest default port or 19132
    const bedrockAllocation = allocations.find((a) => a.port === 19132) || allocations.find((a) => a.port !== defaultAllocation?.port) || defaultAllocation;

    const refreshStatus = async () => {
        try {
            setLoading(true);
            const res = await getGeyserStatus(uuid);
            setStatus(res);

            if (res.config) {
                setBedrockPort(res.config.bedrockPort);
                setRemotePort(res.config.remotePort);
                setAuthType(res.config.authType);
                setMotd1(res.config.motd1);
                setMotd2(res.config.motd2);
                setShowCoordinates(res.config.showCoordinates);
                setPassthroughMotd(res.config.passthroughMotd);
                setPassthroughPlayerCounts(res.config.passthroughPlayerCounts);
            } else {
                setBedrockPort(bedrockAllocation?.port || 19132);
                setRemotePort(defaultAllocation?.port || 25565);
            }
        } catch (error) {
            clearAndAddHttpError({ error, key: 'geyser' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        clearFlashes('geyser');
        refreshStatus();
    }, [uuid]);

    const handleCopy = (text: string, label: string) => {
        copy(text);
        setCopiedField(label);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleAutoSetup = async () => {
        try {
            clearFlashes('geyser');
            setActionLoading(true);

            // Install Geyser and Floodgate jars
            await installGeyserAndFloodgate(uuid);

            // Auto-configure with optimal settings
            const chosenBedrockPort = bedrockAllocation?.port || 19132;
            const chosenJavaPort = defaultAllocation?.port || 25565;

            await autoConfigureGeyser(uuid, {
                bedrockPort: chosenBedrockPort,
                javaPort: chosenJavaPort,
                serverName,
                authType: 'floodgate',
            });

            addFlash({
                key: 'geyser',
                type: 'success',
                message:
                    'GeyserMC & Floodgate installed and auto-configured successfully! Please restart your server to apply changes.',
            });

            await refreshStatus();
        } catch (error) {
            clearAndAddHttpError({ error, key: 'geyser' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleSaveConfig = async () => {
        try {
            clearFlashes('geyser');
            setActionLoading(true);

            await saveCustomGeyserConfig(uuid, status?.rawConfig || '', {
                bedrockPort,
                remotePort,
                authType,
                motd1,
                motd2,
                serverName: motd1,
                passthroughMotd,
                passthroughPlayerCounts,
                showCoordinates,
            });

            addFlash({
                key: 'geyser',
                type: 'success',
                message: 'Geyser configuration saved successfully! Restart the server to apply changes.',
            });

            await refreshStatus();
        } catch (error) {
            clearAndAddHttpError({ error, key: 'geyser' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleAutoOptimize = async () => {
        try {
            clearFlashes('geyser');
            setActionLoading(true);

            await autoConfigureGeyser(uuid, {
                bedrockPort: bedrockAllocation?.port || 19132,
                javaPort: defaultAllocation?.port || 25565,
                serverName,
                authType: 'floodgate',
            });

            addFlash({
                key: 'geyser',
                type: 'success',
                message: 'Optimal Geyser settings applied! Restart the server to activate.',
            });

            await refreshStatus();
        } catch (error) {
            clearAndAddHttpError({ error, key: 'geyser' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleUninstall = async () => {
        if (!confirm('Are you sure you want to remove GeyserMC and Floodgate from this server?')) {
            return;
        }

        try {
            clearFlashes('geyser');
            setActionLoading(true);

            await uninstallGeyser(uuid, status?.geyserJarName, status?.floodgateJarName);

            addFlash({
                key: 'geyser',
                type: 'info',
                message: 'GeyserMC and Floodgate have been uninstalled. Restart the server to apply.',
            });

            await refreshStatus();
        } catch (error) {
            clearAndAddHttpError({ error, key: 'geyser' });
        } finally {
            setActionLoading(false);
        }
    };

    const isCrossplayActive = status?.isGeyserInstalled && status?.isFloodgateInstalled;

    return (
        <ServerContentBlock title={'Bedrock (GeyserMC)'} showFlashKey={'geyser'}>
            <div className={'flex flex-col gap-6'}>
                {/* Header Card */}
                <div
                    className={
                        'relative overflow-hidden rounded-2xl border border-cyan-500/25 bg-[#0a0f1d]/90 p-6 shadow-2xl backdrop-blur-xl'
                    }
                >
                    <div className={'flex flex-col md:flex-row md:items-center justify-between gap-4'}>
                        <div className={'flex items-start space-x-4'}>
                            <div
                                className={
                                    'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/30 shadow-[0_0_20px_rgba(56,189,248,0.25)]'
                                }
                            >
                                <SparklesIcon className={'h-8 w-8 text-cyan-400'} />
                            </div>
                            <div>
                                <div className={'flex items-center gap-3'}>
                                    <h1 className={'text-xl sm:text-2xl font-bold font-header text-white'}>
                                        Bedrock & GeyserMC Crossplay
                                    </h1>
                                    <span
                                        className={classNames(
                                            'px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider border',
                                            isCrossplayActive
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                                                : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                                        )}
                                    >
                                        {isCrossplayActive ? 'Active' : 'Setup Required'}
                                    </span>
                                </div>
                                <p className={'text-sm text-neutral-400 mt-1 max-w-2xl'}>
                                    Allows Minecraft Bedrock players (iOS, Android, Windows 10/11, Xbox, PlayStation,
                                    Nintendo Switch) to join your Java Edition server with seamless cross-play.
                                </p>
                            </div>
                        </div>

                        <div className={'flex items-center gap-2 self-start md:self-auto'}>
                            <button
                                type={'button'}
                                onClick={refreshStatus}
                                disabled={loading || actionLoading}
                                className={'flex items-center gap-1.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 px-3 py-2 text-xs font-medium text-neutral-300 border border-neutral-700/60 transition'}
                            >
                                <RefreshIcon className={classNames('w-4 h-4', { 'animate-spin': loading })} />
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className={'p-12 flex justify-center'}>
                        <Spinner size={'large'} />
                    </div>
                ) : (
                    <>
                        {/* 1-Click Setup Banner when not installed */}
                        {!isCrossplayActive && (
                            <div
                                className={
                                    'rounded-2xl border border-cyan-500/40 bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-[#0a0f1d] p-6 shadow-xl relative overflow-hidden'
                                }
                            >
                                <div className={'flex flex-col md:flex-row md:items-center justify-between gap-6'}>
                                    <div>
                                        <div className={'flex items-center gap-2 text-cyan-400 font-semibold text-base'}>
                                            <SparklesIcon className={'w-5 h-5'} />
                                            1-Click Bedrock Crossplay Setup
                                        </div>
                                        <p className={'text-sm text-gray-300 mt-1.5 max-w-xl'}>
                                            Instantly install <strong>Geyser-Spigot</strong> and <strong>Floodgate</strong>{' '}
                                            with auto-configured ports and authentication. Bedrock players can join
                                            directly using their free Xbox Gamertag without needing a paid Java account!
                                        </p>
                                    </div>
                                    <button
                                        type={'button'}
                                        onClick={handleAutoSetup}
                                        disabled={actionLoading}
                                        className={'shrink-0 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-600/20 transition'}
                                    >
                                        {actionLoading ? 'Configuring Crossplay...' : '⚡ Enable Bedrock Crossplay'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Connection Card */}
                        <div
                            className={
                                'rounded-2xl border border-white/10 bg-[#0a0f1d]/90 p-6 shadow-xl backdrop-blur-xl'
                            }
                        >
                            <h2 className={'text-lg font-bold text-white mb-4 flex items-center gap-2'}>
                                <ShieldCheckIcon className={'w-5 h-5 text-cyan-400'} />
                                Bedrock Connection Information
                            </h2>

                            <div className={'grid grid-cols-1 md:grid-cols-3 gap-4'}>
                                {/* Server Address */}
                                <div className={'rounded-xl bg-black/40 border border-white/5 p-4'}>
                                    <span className={'text-xs text-neutral-400 font-medium'}>Bedrock Server Address</span>
                                    <div className={'flex items-center justify-between mt-1'}>
                                        <span className={'text-base font-mono font-bold text-cyan-300 truncate'}>
                                            {primaryAddress}
                                        </span>
                                        <button
                                            type={'button'}
                                            onClick={() => handleCopy(primaryAddress, 'address')}
                                            className={'text-gray-400 hover:text-white p-1 rounded transition'}
                                            title={'Copy address'}
                                        >
                                            <DuplicateIcon className={'w-4 h-4'} />
                                        </button>
                                    </div>
                                    {copiedField === 'address' && (
                                        <span className={'text-[11px] text-emerald-400 font-medium'}>Copied!</span>
                                    )}
                                </div>

                                {/* Bedrock Port */}
                                <div className={'rounded-xl bg-black/40 border border-white/5 p-4'}>
                                    <span className={'text-xs text-neutral-400 font-medium'}>Bedrock Port</span>
                                    <div className={'flex items-center justify-between mt-1'}>
                                        <span className={'text-base font-mono font-bold text-emerald-400'}>
                                            {bedrockPort}
                                        </span>
                                        <button
                                            type={'button'}
                                            onClick={() => handleCopy(String(bedrockPort), 'port')}
                                            className={'text-gray-400 hover:text-white p-1 rounded transition'}
                                            title={'Copy port'}
                                        >
                                            <DuplicateIcon className={'w-4 h-4'} />
                                        </button>
                                    </div>
                                    {copiedField === 'port' && (
                                        <span className={'text-[11px] text-emerald-400 font-medium'}>Copied!</span>
                                    )}
                                </div>

                                {/* Java Port */}
                                <div className={'rounded-xl bg-black/40 border border-white/5 p-4'}>
                                    <span className={'text-xs text-neutral-400 font-medium'}>Java Server Port</span>
                                    <div className={'flex items-center justify-between mt-1'}>
                                        <span className={'text-base font-mono font-bold text-white'}>
                                            {remotePort}
                                        </span>
                                        <button
                                            type={'button'}
                                            onClick={() => handleCopy(String(remotePort), 'javaport')}
                                            className={'text-gray-400 hover:text-white p-1 rounded transition'}
                                            title={'Copy Java port'}
                                        >
                                            <DuplicateIcon className={'w-4 h-4'} />
                                        </button>
                                    </div>
                                    {copiedField === 'javaport' && (
                                        <span className={'text-[11px] text-emerald-400 font-medium'}>Copied!</span>
                                    )}
                                </div>
                            </div>

                            {/* Supported Devices Badges */}
                            <div className={'mt-5 pt-4 border-t border-white/5 flex flex-wrap items-center gap-2'}>
                                <span className={'text-xs text-neutral-400 mr-2 font-medium'}>Compatible Devices:</span>
                                <span className={'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300'}>
                                    <DeviceMobileIcon className={'w-3.5 h-3.5 text-cyan-400'} /> Android & iOS
                                </span>
                                <span className={'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300'}>
                                    <DesktopComputerIcon className={'w-3.5 h-3.5 text-blue-400'} /> Windows 10/11 Bedrock
                                </span>
                                <span className={'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300'}>
                                    🎮 Xbox & PlayStation (Bedrock)
                                </span>
                                <span className={'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300'}>
                                    🎮 Nintendo Switch
                                </span>
                            </div>
                        </div>

                        {/* Configuration Editor Card */}
                        <div
                            className={
                                'rounded-2xl border border-white/10 bg-[#0a0f1d]/90 p-6 shadow-xl backdrop-blur-xl'
                            }
                        >
                            <div className={'flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6'}>
                                <div>
                                    <h2 className={'text-lg font-bold text-white flex items-center gap-2'}>
                                        <CogIcon className={'w-5 h-5 text-cyan-400'} />
                                        Geyser Configuration & Port Settings
                                    </h2>
                                    <p className={'text-xs text-neutral-400 mt-1'}>
                                        Customize Bedrock connection port, player authentication mode, and in-game MOTD.
                                    </p>
                                </div>
                                <div className={'flex items-center gap-2'}>
                                    <button
                                        type={'button'}
                                        onClick={handleAutoOptimize}
                                        disabled={actionLoading}
                                        className={'text-xs font-semibold text-cyan-400 hover:text-cyan-300 px-2 py-1 rounded-lg hover:bg-cyan-950/40 transition'}
                                    >
                                        ✨ Apply Optimal Auto-Config
                                    </button>
                                </div>
                            </div>

                            <div className={'grid grid-cols-1 md:grid-cols-2 gap-6'}>
                                {/* Bedrock Port Selector */}
                                <div>
                                    <label className={'block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2'}>
                                        Bedrock Port (UDP)
                                    </label>
                                    <select
                                        value={bedrockPort}
                                        onChange={(e) => setBedrockPort(parseInt(e.target.value, 10))}
                                        className={'w-full bg-slate-900/90 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500'}
                                    >
                                        {allocations.map((a) => (
                                            <option key={a.id} value={a.port}>
                                                {a.port} {a.port === 19132 ? '(Bedrock Standard Default)' : a.isDefault ? '(Java Server Port)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <p className={'text-[11px] text-neutral-400 mt-1.5'}>
                                        Port 19132 is the official Bedrock default port. If 25565 is selected, players connect with the same port as Java.
                                    </p>
                                </div>

                                {/* Auth Type */}
                                <div>
                                    <label className={'block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2'}>
                                        Authentication Mode
                                    </label>
                                    <select
                                        value={authType}
                                        onChange={(e) => setAuthType(e.target.value as any)}
                                        className={'w-full bg-slate-900/90 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500'}
                                    >
                                        <option value={'floodgate'}>Floodgate (Recommended - Free Xbox Gamertag)</option>
                                        <option value={'online'}>Online (Requires Paid Minecraft Java Account)</option>
                                        <option value={'offline'}>Offline (Allows Unverified Accounts)</option>
                                    </select>
                                    <p className={'text-[11px] text-neutral-400 mt-1.5'}>
                                        Floodgate allows Bedrock players to play with just their phone/console Xbox account without purchasing Java Edition.
                                    </p>
                                </div>

                                {/* Bedrock MOTD Line 1 */}
                                <div>
                                    <label className={'block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2'}>
                                        Bedrock MOTD Line 1
                                    </label>
                                    <input
                                        type={'text'}
                                        value={motd1}
                                        onChange={(e) => setMotd1(e.target.value)}
                                        placeholder={'SmitCloud Crossplay Server'}
                                        className={'w-full bg-slate-900/90 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500'}
                                    />
                                </div>

                                {/* Bedrock MOTD Line 2 */}
                                <div>
                                    <label className={'block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2'}>
                                        Bedrock MOTD Line 2
                                    </label>
                                    <input
                                        type={'text'}
                                        value={motd2}
                                        onChange={(e) => setMotd2(e.target.value)}
                                        placeholder={'Bedrock & Java Players Welcome!'}
                                        className={'w-full bg-slate-900/90 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500'}
                                    />
                                </div>
                            </div>

                            {/* Toggles */}
                            <div className={'mt-6 pt-6 border-t border-white/5 grid grid-cols-1 sm:grid-cols-3 gap-4'}>
                                <label className={'flex items-center space-x-3 cursor-pointer select-none'}>
                                    <input
                                        type={'checkbox'}
                                        checked={showCoordinates}
                                        onChange={(e) => setShowCoordinates(e.target.checked)}
                                        className={'w-4 h-4 rounded border-gray-700 text-cyan-500 focus:ring-cyan-500/20 bg-slate-900'}
                                    />
                                    <span className={'text-xs text-gray-200'}>Show In-Game Coordinates</span>
                                </label>

                                <label className={'flex items-center space-x-3 cursor-pointer select-none'}>
                                    <input
                                        type={'checkbox'}
                                        checked={passthroughMotd}
                                        onChange={(e) => setPassthroughMotd(e.target.checked)}
                                        className={'w-4 h-4 rounded border-gray-700 text-cyan-500 focus:ring-cyan-500/20 bg-slate-900'}
                                    />
                                    <span className={'text-xs text-gray-200'}>Sync Server MOTD Automatically</span>
                                </label>

                                <label className={'flex items-center space-x-3 cursor-pointer select-none'}>
                                    <input
                                        type={'checkbox'}
                                        checked={passthroughPlayerCounts}
                                        onChange={(e) => setPassthroughPlayerCounts(e.target.checked)}
                                        className={'w-4 h-4 rounded border-gray-700 text-cyan-500 focus:ring-cyan-500/20 bg-slate-900'}
                                    />
                                    <span className={'text-xs text-gray-200'}>Sync Player Count Automatically</span>
                                </label>
                            </div>

                            {/* Action Buttons */}
                            <div className={'mt-8 flex flex-wrap items-center justify-between gap-4'}>
                                <div>
                                    {status?.isGeyserInstalled && (
                                        <button
                                            type={'button'}
                                            onClick={handleUninstall}
                                            disabled={actionLoading}
                                            className={'text-xs text-red-400 hover:text-red-300 flex items-center gap-1.5 transition'}
                                        >
                                            <TrashIcon className={'w-4 h-4'} />
                                            Uninstall GeyserMC & Floodgate
                                        </button>
                                    )}
                                </div>
                                <div className={'flex items-center gap-3'}>
                                    <button
                                        type={'button'}
                                        onClick={handleSaveConfig}
                                        disabled={actionLoading}
                                        className={'rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-cyan-600/20 transition'}
                                    >
                                        {actionLoading ? 'Saving...' : '💾 Save Configuration'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Joining Instructions Guide */}
                        <div
                            className={
                                'rounded-2xl border border-white/5 bg-[#0a0f1d]/50 p-6 shadow-xl backdrop-blur-xl'
                            }
                        >
                            <h3 className={'text-sm font-bold text-white mb-3 flex items-center gap-2'}>
                                📖 How Bedrock Players Connect to Your Server
                            </h3>
                            <div className={'grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-neutral-300'}>
                                <div className={'p-3 rounded-xl bg-black/30 border border-white/5'}>
                                    <div className={'font-bold text-cyan-400 mb-1'}>Step 1: Open Minecraft</div>
                                    Launch Minecraft on Android, iOS, Windows 10/11, or console. Tap <strong>Play</strong> and navigate to the <strong>Servers</strong> tab.
                                </div>
                                <div className={'p-3 rounded-xl bg-black/30 border border-white/5'}>
                                    <div className={'font-bold text-cyan-400 mb-1'}>Step 2: Add Server</div>
                                    Scroll to the bottom and click <strong>Add Server</strong>. Enter Server Name, Address <strong>{primaryAddress}</strong>, and Port <strong>{bedrockPort}</strong>.
                                </div>
                                <div className={'p-3 rounded-xl bg-black/30 border border-white/5'}>
                                    <div className={'font-bold text-cyan-400 mb-1'}>Step 3: Play Together</div>
                                    Click <strong>Save & Join</strong>! Bedrock and Java players will play together in the same world with unified chat, voice, and inventory.
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </ServerContentBlock>
    );
};
