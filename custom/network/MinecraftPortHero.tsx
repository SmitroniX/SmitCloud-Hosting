import React, { useState } from 'react';
import { Allocation } from '@/api/server/getServer';
import copy from 'copy-to-clipboard';
import classNames from 'classnames';
import {
    CheckCircleIcon,
    CheckIcon,
    DesktopComputerIcon,
    DeviceMobileIcon,
    DuplicateIcon,
    ExclamationIcon,
    GlobeAltIcon,
    InformationCircleIcon,
    LightningBoltIcon,
    RefreshIcon,
    ShieldCheckIcon,
    SparklesIcon,
    XIcon,
} from '@heroicons/react/solid';
import { autoAssignBedrockAllocation, syncAllPortsToConfigs } from '@/api/server/minecraft/portSync';
import { getCustomDomains } from '@/api/server/minecraft/domains';
import { useFlashKey } from '@/plugins/useFlash';

interface Props {
    uuid: string;
    allocations: Allocation[];
    onAllocationsUpdated?: () => void;
}

const MinecraftPortHero = ({ uuid, allocations, onAllocationsUpdated }: Props) => {
    const { addFlash, clearFlashes } = useFlashKey('server:network');

    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);
    const [autoAssigning, setAutoAssigning] = useState(false);
    const [guideModalOpen, setGuideModalOpen] = useState(false);
    const [activeGuideTab, setActiveGuideTab] = useState<'java' | 'bedrock' | 'console' | 'addons'>('bedrock');
    const [primaryDomain, setPrimaryDomain] = useState<string | null>(null);

    React.useEffect(() => {
        getCustomDomains(uuid)
            .then((list) => {
                const primary = list.find((d) => d.isPrimary) || list[0];
                if (primary) {
                    setPrimaryDomain(primary.domain);
                }
            })
            .catch(() => {});
    }, [uuid]);

    // Detect Java Primary Allocation
    const javaAllocation =
        allocations.find((a) => a.isDefault) ||
        allocations.find((a) => a.port === 25565) ||
        allocations[0];

    // Detect Bedrock Allocation
    const bedrockAllocation =
        allocations.find((a) => a.port === 19132) ||
        allocations.find((a) => {
            const n = (a.notes || '').toLowerCase();
            return n.includes('bedrock') || n.includes('geyser');
        }) ||
        allocations.find((a) => a.port >= 19130 && a.port <= 19145 && a.id !== javaAllocation?.id);

    const javaHost = javaAllocation?.alias || javaAllocation?.ip || 'play.shadowpixel.fun';
    const javaPort = javaAllocation?.port || 25565;
    const javaAddress = javaPort === 25565 ? javaHost : `${javaHost}:${javaPort}`;

    const bedrockHost = bedrockAllocation?.alias || bedrockAllocation?.ip || javaHost;
    const bedrockPort = bedrockAllocation?.port;

    const handleCopy = (text: string, label: string) => {
        copy(text);
        setCopiedField(label);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleSyncConfigs = async () => {
        setSyncing(true);
        clearFlashes();
        try {
            const res = await syncAllPortsToConfigs(uuid, javaPort, bedrockPort);
            addFlash({
                type: res.javaSynced || res.bedrockSynced ? 'success' : 'warning',
                message: `✅ Ports synchronized! ${res.message}`,
            });
        } catch {
            addFlash({
                type: 'error',
                message: 'Failed to synchronize port configurations.',
            });
        } finally {
            setSyncing(false);
        }
    };

    const handleAutoAssignBedrock = async () => {
        setAutoAssigning(true);
        clearFlashes();
        try {
            const allocated = await autoAssignBedrockAllocation(uuid, allocations);
            addFlash({
                type: 'success',
                message: `🎉 Bedrock port ${allocated.port} (UDP) successfully assigned and linked to GeyserMC!`,
            });
            if (onAllocationsUpdated) {
                onAllocationsUpdated();
            }
        } catch (err: any) {
            addFlash({
                type: 'error',
                message: err?.response?.data?.errors?.[0]?.detail || 'Could not auto-assign Bedrock port. Server allocation limit may be reached.',
            });
        } finally {
            setAutoAssigning(false);
        }
    };

    return (
        <div className={'mb-8 space-y-4'}>
            {/* Header / Context Bar */}
            <div className={'rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-[#0a1222] via-[#0d1829] to-[#0a1222] p-5 shadow-2xl backdrop-blur-xl relative overflow-hidden'}>
                {/* Glow accent */}
                <div className={'absolute -right-20 -top-20 w-60 h-60 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none'} />
                <div className={'absolute -left-20 -bottom-20 w-60 h-60 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none'} />

                <div className={'flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10'}>
                    <div>
                        <div className={'flex items-center gap-2'}>
                            <span className={'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'}>
                                Dual-Protocol Routing
                            </span>
                            <span className={'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}>
                                Crossplay Enabled
                            </span>
                        </div>
                        <h2 className={'text-xl font-extrabold text-white tracking-tight mt-1.5 flex items-center gap-2'}>
                            🎮 Minecraft Java & Bedrock Port Allocations
                        </h2>
                        <p className={'text-xs text-neutral-400 mt-1 max-w-2xl'}>
                            Direct TCP port mapping for Java Edition (PC/Mac) and high-speed UDP port routing for Bedrock Edition (Mobile/Console/Windows).
                        </p>
                    </div>

                    <div className={'flex flex-wrap items-center gap-2.5'}>
                        <a
                            href={`/server/${uuid.split('-')[0]}/minecraft/domain`}
                            className={'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/40 shadow-md transition'}
                        >
                            <GlobeAltIcon className={'w-4 h-4 text-cyan-400'} />
                            Custom Domains
                        </a>
                        <button
                            type={'button'}
                            onClick={() => setGuideModalOpen(true)}
                            className={'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-neutral-800/90 hover:bg-neutral-700 text-neutral-200 border border-neutral-700/80 shadow-md transition'}
                        >
                            <InformationCircleIcon className={'w-4 h-4 text-cyan-400'} />
                            Connection Guide
                        </button>
                        <button
                            type={'button'}
                            onClick={handleSyncConfigs}
                            disabled={syncing}
                            className={'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white shadow-lg shadow-cyan-600/20 border border-cyan-400/30 transition'}
                            title={'Sync current Java and Bedrock ports to server.properties and Geyser config.yml'}
                        >
                            <RefreshIcon className={classNames('w-4 h-4', { 'animate-spin': syncing })} />
                            {syncing ? 'Syncing...' : 'Sync Config Ports'}
                        </button>
                    </div>
                </div>

                {primaryDomain && (
                    <div className={'mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs'}>
                        <div className={'flex items-center gap-2'}>
                            <span className={'px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'}>
                                Primary Custom Domain
                            </span>
                            <span className={'font-mono font-bold text-white text-sm'}>{primaryDomain}</span>
                        </div>
                        <button
                            type={'button'}
                            onClick={() => handleCopy(primaryDomain, 'heroPrimaryDom')}
                            className={'flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 text-xs font-medium border border-cyan-500/30 transition'}
                        >
                            {copiedField === 'heroPrimaryDom' ? (
                                <>
                                    <CheckIcon className={'w-3.5 h-3.5 text-emerald-400'} />
                                    <span className={'text-emerald-400'}>Copied</span>
                                </>
                            ) : (
                                <>
                                    <DuplicateIcon className={'w-3.5 h-3.5'} />
                                    <span>Copy Custom Domain</span>
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Dual Hero Cards: Java Edition & Bedrock Edition */}
            <div className={'grid grid-cols-1 md:grid-cols-2 gap-4'}>
                {/* Java Edition Card */}
                <div className={'rounded-2xl border border-blue-500/30 bg-[#0c162d]/90 p-5 shadow-xl backdrop-blur-md relative overflow-hidden flex flex-col justify-between'}>
                    <div className={'absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none'} />

                    <div>
                        <div className={'flex items-center justify-between'}>
                            <div className={'flex items-center gap-2.5'}>
                                <div className={'w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner'}>
                                    <DesktopComputerIcon className={'w-5 h-5'} />
                                </div>
                                <div>
                                    <h3 className={'text-base font-bold text-white flex items-center gap-1.5'}>
                                        ☕ Java Edition
                                    </h3>
                                    <span className={'text-[11px] text-blue-300 font-medium'}>
                                        PC • Mac • Linux
                                    </span>
                                </div>
                            </div>
                            <span className={'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30'}>
                                TCP {javaPort}
                            </span>
                        </div>

                        {/* Copyable Java Address */}
                        <div className={'mt-4 rounded-xl bg-black/40 border border-blue-500/20 p-3.5'}>
                            <div className={'flex items-center justify-between text-xs text-neutral-400 font-medium mb-1'}>
                                <span>Java Server IP / Address</span>
                                <span className={'text-[11px] text-blue-400'}>Direct Join</span>
                            </div>
                            <div className={'flex items-center justify-between gap-2'}>
                                <span className={'text-sm sm:text-base font-mono font-bold text-blue-200 truncate'}>
                                    {javaAddress}
                                </span>
                                <button
                                    type={'button'}
                                    onClick={() => handleCopy(javaAddress, 'javaAddress')}
                                    className={'flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600/80 hover:bg-blue-500 text-white text-xs font-semibold shadow transition'}
                                >
                                    {copiedField === 'javaAddress' ? (
                                        <>
                                            <CheckIcon className={'w-3.5 h-3.5 text-emerald-300'} />
                                            <span className={'text-emerald-300 text-[11px]'}>Copied</span>
                                        </>
                                    ) : (
                                        <>
                                            <DuplicateIcon className={'w-3.5 h-3.5'} />
                                            <span>Copy</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Details grid */}
                        <div className={'grid grid-cols-2 gap-2 mt-3 text-xs'}>
                            <div className={'rounded-lg bg-neutral-900/60 border border-white/5 p-2.5'}>
                                <div className={'text-[11px] text-neutral-400'}>Assigned Port</div>
                                <div className={'font-mono font-bold text-neutral-200 mt-0.5'}>{javaPort} (TCP)</div>
                            </div>
                            <div className={'rounded-lg bg-neutral-900/60 border border-white/5 p-2.5'}>
                                <div className={'text-[11px] text-neutral-400'}>Allocation Type</div>
                                <div className={'font-medium text-emerald-400 mt-0.5 flex items-center gap-1'}>
                                    <CheckCircleIcon className={'w-3.5 h-3.5'} /> Primary Default
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={'mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-neutral-400'}>
                        <span>Compatibility: Java 1.7.x — 1.21.x+</span>
                        <span className={'text-blue-400/90 font-medium'}>Standard Minecraft TCP</span>
                    </div>
                </div>

                {/* Bedrock Edition Card */}
                <div className={'rounded-2xl border border-emerald-500/30 bg-[#0c1f1a]/90 p-5 shadow-xl backdrop-blur-md relative overflow-hidden flex flex-col justify-between'}>
                    <div className={'absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none'} />

                    <div>
                        <div className={'flex items-center justify-between'}>
                            <div className={'flex items-center gap-2.5'}>
                                <div className={'w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner'}>
                                    <DeviceMobileIcon className={'w-5 h-5'} />
                                </div>
                                <div>
                                    <h3 className={'text-base font-bold text-white flex items-center gap-1.5'}>
                                        📱 Bedrock Edition
                                    </h3>
                                    <span className={'text-[11px] text-emerald-300 font-medium'}>
                                        Mobile • Windows Bedrock • Consoles
                                    </span>
                                </div>
                            </div>
                            <span className={'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}>
                                {bedrockPort ? `UDP ${bedrockPort}` : 'Unassigned'}
                            </span>
                        </div>

                        {bedrockPort ? (
                            <>
                                {/* Two separate fields for Bedrock: Server Address and Port */}
                                <div className={'mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5'}>
                                    {/* Server Address field */}
                                    <div className={'rounded-xl bg-black/40 border border-emerald-500/20 p-3'}>
                                        <div className={'text-[11px] text-neutral-400 font-medium mb-1'}>
                                            Server Address
                                        </div>
                                        <div className={'flex items-center justify-between gap-1.5'}>
                                            <span className={'text-xs sm:text-sm font-mono font-bold text-emerald-200 truncate'}>
                                                {bedrockHost}
                                            </span>
                                            <button
                                                type={'button'}
                                                onClick={() => handleCopy(bedrockHost, 'bedrockHost')}
                                                className={'p-1.5 rounded-md bg-emerald-600/80 hover:bg-emerald-500 text-white text-xs transition'}
                                                title={'Copy Bedrock Address'}
                                            >
                                                {copiedField === 'bedrockHost' ? (
                                                    <CheckIcon className={'w-3.5 h-3.5 text-white'} />
                                                ) : (
                                                    <DuplicateIcon className={'w-3.5 h-3.5'} />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Bedrock Port field */}
                                    <div className={'rounded-xl bg-black/40 border border-emerald-500/20 p-3'}>
                                        <div className={'text-[11px] text-neutral-400 font-medium mb-1'}>
                                            Bedrock Port
                                        </div>
                                        <div className={'flex items-center justify-between gap-1.5'}>
                                            <span className={'text-xs sm:text-sm font-mono font-bold text-emerald-300 truncate'}>
                                                {bedrockPort}
                                            </span>
                                            <button
                                                type={'button'}
                                                onClick={() => handleCopy(String(bedrockPort), 'bedrockPort')}
                                                className={'p-1.5 rounded-md bg-emerald-600/80 hover:bg-emerald-500 text-white text-xs transition'}
                                                title={'Copy Bedrock Port'}
                                            >
                                                {copiedField === 'bedrockPort' ? (
                                                    <CheckIcon className={'w-3.5 h-3.5 text-white'} />
                                                ) : (
                                                    <DuplicateIcon className={'w-3.5 h-3.5'} />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className={'grid grid-cols-2 gap-2 mt-3 text-xs'}>
                                    <div className={'rounded-lg bg-neutral-900/60 border border-white/5 p-2.5'}>
                                        <div className={'text-[11px] text-neutral-400'}>Protocol</div>
                                        <div className={'font-mono font-bold text-neutral-200 mt-0.5'}>UDP Packet Bridge</div>
                                    </div>
                                    <div className={'rounded-lg bg-neutral-900/60 border border-white/5 p-2.5'}>
                                        <div className={'text-[11px] text-neutral-400'}>GeyserMC Link</div>
                                        <div className={'font-medium text-emerald-400 mt-0.5 flex items-center gap-1 truncate'}>
                                            <SparklesIcon className={'w-3.5 h-3.5 shrink-0'} /> Auto-Forwarded
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className={'mt-4 rounded-xl bg-amber-500/10 border border-amber-500/30 p-4'}>
                                <div className={'flex items-start gap-2.5'}>
                                    <ExclamationIcon className={'w-5 h-5 text-amber-400 shrink-0 mt-0.5'} />
                                    <div>
                                        <h4 className={'text-xs font-bold text-amber-300'}>No Bedrock Port Assigned</h4>
                                        <p className={'text-[11px] text-neutral-300 mt-1'}>
                                            Bedrock players and GeyserMC require a dedicated UDP port (typically 19132).
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type={'button'}
                                    onClick={handleAutoAssignBedrock}
                                    disabled={autoAssigning}
                                    className={'mt-3 w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white shadow-lg transition'}
                                >
                                    <LightningBoltIcon className={'w-4 h-4'} />
                                    {autoAssigning ? 'Assigning Bedrock Port...' : '⚡ Auto-Assign Bedrock Port (19132)'}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className={'mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-neutral-400'}>
                        <span>iOS • Android • Xbox • PS4/5 • Switch</span>
                        <a
                            href={`/server/${uuid.split('-')[0]}/minecraft/geyser`}
                            className={'text-emerald-400 hover:text-emerald-300 font-medium transition underline'}
                        >
                            Geyser Settings →
                        </a>
                    </div>
                </div>
            </div>

            {/* Connection Guide Modal */}
            {guideModalOpen && (
                <div className={'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn'}>
                    <div className={'w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0d1526] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]'}>
                        {/* Modal Header */}
                        <div className={'flex items-center justify-between px-6 py-4 border-b border-white/10 bg-neutral-900/50'}>
                            <div className={'flex items-center gap-2.5'}>
                                <div className={'w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center'}>
                                    <InformationCircleIcon className={'w-5 h-5'} />
                                </div>
                                <div>
                                    <h3 className={'text-base font-bold text-white'}>Minecraft Player Connection Guide</h3>
                                    <p className={'text-xs text-neutral-400'}>Step-by-step instructions for Java, Bedrock, and Console players</p>
                                </div>
                            </div>
                            <button
                                type={'button'}
                                onClick={() => setGuideModalOpen(false)}
                                className={'text-neutral-400 hover:text-white p-1 rounded-lg transition'}
                            >
                                <XIcon className={'w-5 h-5'} />
                            </button>
                        </div>

                        {/* Modal Tabs */}
                        <div className={'flex border-b border-white/10 bg-neutral-900/30 px-6 gap-2 pt-2'}>
                            <button
                                type={'button'}
                                onClick={() => setActiveGuideTab('bedrock')}
                                className={classNames(
                                    'px-4 py-2 text-xs font-semibold rounded-t-lg transition border-b-2',
                                    activeGuideTab === 'bedrock'
                                        ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                                        : 'border-transparent text-neutral-400 hover:text-neutral-200'
                                )}
                            >
                                📱 Bedrock (Mobile/Win10)
                            </button>
                            <button
                                type={'button'}
                                onClick={() => setActiveGuideTab('java')}
                                className={classNames(
                                    'px-4 py-2 text-xs font-semibold rounded-t-lg transition border-b-2',
                                    activeGuideTab === 'java'
                                        ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                                        : 'border-transparent text-neutral-400 hover:text-neutral-200'
                                )}
                            >
                                ☕ Java Edition
                            </button>
                            <button
                                type={'button'}
                                onClick={() => setActiveGuideTab('console')}
                                className={classNames(
                                    'px-4 py-2 text-xs font-semibold rounded-t-lg transition border-b-2',
                                    activeGuideTab === 'console'
                                        ? 'border-purple-500 text-purple-400 bg-purple-500/10'
                                        : 'border-transparent text-neutral-400 hover:text-neutral-200'
                                )}
                            >
                                🎮 Xbox / PS / Switch
                            </button>
                            <button
                                type={'button'}
                                onClick={() => setActiveGuideTab('addons')}
                                className={classNames(
                                    'px-4 py-2 text-xs font-semibold rounded-t-lg transition border-b-2',
                                    activeGuideTab === 'addons'
                                        ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                                        : 'border-transparent text-neutral-400 hover:text-neutral-200'
                                )}
                            >
                                🎙️ Voice & Addon Ports
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className={'p-6 overflow-y-auto space-y-4 text-xs text-neutral-300'}>
                            {activeGuideTab === 'bedrock' && (
                                <div className={'space-y-3'}>
                                    <h4 className={'text-sm font-bold text-white'}>Connecting via Minecraft Bedrock (iOS, Android, Windows)</h4>
                                    <ol className={'list-decimal list-inside space-y-2 text-neutral-300 bg-black/30 p-4 rounded-xl border border-white/5'}>
                                        <li>Launch Minecraft on your mobile device or Windows Bedrock edition.</li>
                                        <li>Tap <strong>Play</strong> → <strong>Servers</strong> tab.</li>
                                        <li>Scroll down and tap <strong>Add Server</strong>.</li>
                                        <li>Enter any name you like in <strong>Server Name</strong>.</li>
                                        <li>
                                            In <strong>Server Address</strong>, enter:{' '}
                                            <span className={'font-mono font-bold text-emerald-300 select-all'}>{bedrockHost}</span>
                                        </li>
                                        <li>
                                            In <strong>Port</strong>, enter:{' '}
                                            <span className={'font-mono font-bold text-emerald-300 select-all'}>{bedrockPort || 19132}</span>
                                        </li>
                                        <li>Tap <strong>Save</strong> and tap to connect!</li>
                                    </ol>
                                    <div className={'rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-emerald-200'}>
                                        💡 <strong>No Java Account Required:</strong> Bedrock players connect via Floodgate using their normal Xbox Gamertag for free.
                                    </div>
                                </div>
                            )}

                            {activeGuideTab === 'java' && (
                                <div className={'space-y-3'}>
                                    <h4 className={'text-sm font-bold text-white'}>Connecting via Minecraft Java Edition (PC / Mac)</h4>
                                    <ol className={'list-decimal list-inside space-y-2 text-neutral-300 bg-black/30 p-4 rounded-xl border border-white/5'}>
                                        <li>Open your Minecraft Java Launcher and launch the game.</li>
                                        <li>Click <strong>Multiplayer</strong> → <strong>Add Server</strong>.</li>
                                        <li>
                                            In <strong>Server Address</strong>, enter:{' '}
                                            <span className={'font-mono font-bold text-blue-300 select-all'}>{javaAddress}</span>
                                        </li>
                                        <li>Click <strong>Done</strong> and double-click to join!</li>
                                    </ol>
                                    <div className={'rounded-xl bg-blue-500/10 border border-blue-500/30 p-3 text-blue-200'}>
                                        🌐 <strong>Custom Domain SRV Record:</strong> If using a custom domain on a non-25565 port, create a DNS SRV record:
                                        <div className={'font-mono text-[11px] text-blue-300 mt-1 bg-black/40 p-2 rounded'}>
                                            _minecraft._tcp.play.yourdomain.com → Priority: 0, Weight: 5, Port: {javaPort}, Target: {javaHost}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeGuideTab === 'console' && (
                                <div className={'space-y-3'}>
                                    <h4 className={'text-sm font-bold text-white'}>Connecting from Xbox, PlayStation & Nintendo Switch</h4>
                                    <p className={'text-neutral-300'}>
                                        Consoles do not natively provide an &quot;Add Server&quot; button due to platform restrictions. You can easily connect using <strong>BedrockConnect DNS</strong>:
                                    </p>
                                    <div className={'rounded-xl bg-purple-500/10 border border-purple-500/30 p-4 space-y-2'}>
                                        <div className={'font-bold text-purple-300'}>BedrockConnect DNS Method:</div>
                                        <ol className={'list-decimal list-inside space-y-1.5'}>
                                            <li>Go into your Console&apos;s Network / Wi-Fi settings.</li>
                                            <li>Change DNS Settings from Automatic to <strong>Manual</strong>.</li>
                                            <li>
                                                Set Primary DNS to:{' '}
                                                <span className={'font-mono font-bold text-purple-300'}>104.238.130.180</span>
                                            </li>
                                            <li>Set Secondary DNS to: <span className={'font-mono font-bold text-purple-300'}>1.1.1.1</span></li>
                                            <li>Open Minecraft on your console, go to <strong>Featured Servers</strong>, and join The Hive or Cubecraft.</li>
                                            <li>A custom server list menu will appear! Select <strong>Connect to a Server</strong>, enter <span className={'font-mono font-bold text-purple-200'}>{bedrockHost}</span> and port <span className={'font-mono font-bold text-purple-200'}>{bedrockPort || 19132}</span>.</li>
                                        </ol>
                                    </div>
                                </div>
                            )}

                            {activeGuideTab === 'addons' && (
                                <div className={'space-y-3'}>
                                    <h4 className={'text-sm font-bold text-white'}>Addon & Voice Chat Port Allocations</h4>
                                    <div className={'space-y-2.5'}>
                                        <div className={'rounded-xl bg-neutral-900/60 border border-white/5 p-3.5'}>
                                            <div className={'font-bold text-amber-300 flex items-center gap-1.5'}>
                                                🎙️ Simple Voice Chat / Plasmo Voice (UDP 24454)
                                            </div>
                                            <p className={'text-[11px] text-neutral-400 mt-1'}>
                                                In-game proximity voice chat uses a secondary UDP port. Make sure port 24454 (or an assigned port) is allocated, and set <code className={'text-amber-200'}>port = 24454</code> in <code className={'text-amber-200'}>plugins/voicechat/voicechat-server.properties</code>.
                                            </p>
                                        </div>
                                        <div className={'rounded-xl bg-neutral-900/60 border border-white/5 p-3.5'}>
                                            <div className={'font-bold text-amber-300 flex items-center gap-1.5'}>
                                                🗺️ Dynmap & BlueMap Live Web Maps (TCP 8123)
                                            </div>
                                            <p className={'text-[11px] text-neutral-400 mt-1'}>
                                                Web maps stream through an HTTP port (default 8123 or 8100). Allocate a port below and set <code className={'text-amber-200'}>webserver-port: 8123</code> in Dynmap&apos;s <code className={'text-amber-200'}>configuration.txt</code>.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className={'flex items-center justify-end px-6 py-3 border-t border-white/10 bg-neutral-900/50'}>
                            <button
                                type={'button'}
                                onClick={() => setGuideModalOpen(false)}
                                className={'px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-white transition'}
                            >
                                Close Guide
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MinecraftPortHero;
