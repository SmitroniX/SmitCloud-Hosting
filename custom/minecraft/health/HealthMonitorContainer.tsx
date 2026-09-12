import React, { useEffect, useState } from 'react';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { ServerContext } from '@/state/server';
import useFlash from '@/plugins/useFlash';
import Spinner from '@/components/elements/Spinner';
import Button from '@/components/elements/Button';
import classNames from 'classnames';
import {
    ActivityIcon,
    HeartIcon,
    SparklesIcon,
    LightningBoltIcon,
    AdjustmentsIcon,
    CheckCircleIcon,
    ChartBarIcon,
    ChipIcon,
    TrashIcon,
} from '@heroicons/react/solid';
import {
    PerformanceSettings,
    executeSparkCommand,
    fetchPerformanceSettings,
    applyOptimalSettings,
} from '@/api/server/minecraft/health';

export default () => {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const { clearFlashes, clearAndAddHttpError, addFlash } = useFlash();

    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<PerformanceSettings | null>(null);
    const [runningCmd, setRunningCmd] = useState<string | null>(null);
    const [applyingOptimal, setApplyingOptimal] = useState(false);

    const loadData = async () => {
        try {
            setLoading(true);
            const s = await fetchPerformanceSettings(uuid);
            setSettings(s);
        } catch (error) {
            clearAndAddHttpError({ error, key: 'health' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        clearFlashes('health');
        loadData();
    }, []);

    const handleSparkCommand = async (command: string, label: string) => {
        try {
            clearFlashes('health');
            setRunningCmd(command);
            await executeSparkCommand(uuid, command);
            addFlash({
                key: 'health',
                type: 'success',
                message: `Executed "${command}". Check the Server Console to view output and click generated Spark profiler links!`,
            });
        } catch (error) {
            clearAndAddHttpError({ error, key: 'health' });
        } finally {
            setRunningCmd(null);
        }
    };

    const handleApplyOptimizations = async () => {
        try {
            clearFlashes('health');
            setApplyingOptimal(true);
            await applyOptimalSettings(uuid);
            await loadData();
            addFlash({
                key: 'health',
                type: 'success',
                message: 'Optimal server performance settings applied! Restart your server to apply the changes.',
            });
        } catch (error) {
            clearAndAddHttpError({ error, key: 'health' });
        } finally {
            setApplyingOptimal(false);
        }
    };

    return (
        <ServerContentBlock title={'Server Health & Performance'} showFlashKey={'health'}>
            <div className={'flex flex-col gap-6'}>
                {/* Hero Card */}
                <div className={'relative overflow-hidden rounded-2xl border border-cyan-500/25 bg-[#0a0f1d]/90 p-6 shadow-2xl backdrop-blur-xl'}>
                    <div className={'pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl'} />
                    <div className={'pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl'} />

                    <div className={'relative flex flex-col md:flex-row md:items-center md:justify-between gap-6'}>
                        <div className={'flex items-start gap-4'}>
                            <div className={'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 shadow-lg shadow-emerald-500/25 text-white'}>
                                <HeartIcon className={'h-7 w-7'} />
                            </div>
                            <div>
                                <div className={'flex flex-wrap items-center gap-2'}>
                                    <h1 className={'text-xl sm:text-2xl font-black tracking-tight text-white'}>
                                        Health, TPS & Spark Diagnostics
                                    </h1>
                                    <span className={'inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]'}>
                                        <CheckCircleIcon className={'h-3.5 w-3.5'} />
                                        PROFILER READY
                                    </span>
                                </div>
                                <p className={'mt-1 text-xs sm:text-sm text-neutral-400'}>
                                    Inspect real-time tick performance (TPS / MSPT), analyze CPU bottlenecks with Spark, and optimize chunk loading.
                                </p>
                            </div>
                        </div>

                        <div className={'flex flex-wrap items-center gap-3 shrink-0'}>
                            <button
                                type={'button'}
                                disabled={runningCmd === 'spark healthreport'}
                                onClick={() => handleSparkCommand('spark healthreport', 'Health Report')}
                                className={'flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-600/20 transition'}
                            >
                                <LightningBoltIcon className={'h-4 w-4'} />
                                {runningCmd === 'spark healthreport' ? 'Generating...' : 'Instant Health Report'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Metrics / Diagnostics Grid */}
                <div className={'grid grid-cols-1 md:grid-cols-3 gap-4'}>
                    <div className={'rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5 backdrop-blur-md'}>
                        <div className={'flex items-center justify-between'}>
                            <span className={'text-xs font-bold uppercase tracking-wider text-neutral-400'}>Target TPS</span>
                            <span className={'rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/20'}>
                                Optimal: 20.0
                            </span>
                        </div>
                        <div className={'mt-3 flex items-baseline gap-2'}>
                            <span className={'text-3xl font-black text-white'}>20.0</span>
                            <span className={'text-xs text-neutral-500'}>Ticks Per Second</span>
                        </div>
                        <p className={'mt-2 text-xs text-neutral-400'}>
                            1 tick every 50ms. If TPS drops below 18, lag occurs. Use Spark Sampler to identify lag sources.
                        </p>
                    </div>

                    <div className={'rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5 backdrop-blur-md'}>
                        <div className={'flex items-center justify-between'}>
                            <span className={'text-xs font-bold uppercase tracking-wider text-neutral-400'}>Tick Duration (MSPT)</span>
                            <span className={'rounded bg-cyan-500/10 px-2 py-0.5 text-xs font-bold text-cyan-400 border border-cyan-500/20'}>
                                Target &lt; 50ms
                            </span>
                        </div>
                        <div className={'mt-3 flex items-baseline gap-2'}>
                            <span className={'text-3xl font-black text-white'}>&lt; 25ms</span>
                            <span className={'text-xs text-neutral-500'}>Milliseconds Per Tick</span>
                        </div>
                        <p className={'mt-2 text-xs text-neutral-400'}>
                            Indicates how much spare CPU compute the server has per tick cycle before ticks fall behind.
                        </p>
                    </div>

                    <div className={'rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5 backdrop-blur-md'}>
                        <div className={'flex items-center justify-between'}>
                            <span className={'text-xs font-bold uppercase tracking-wider text-neutral-400'}>JVM Garbage Collection</span>
                            <span className={'rounded bg-purple-500/10 px-2 py-0.5 text-xs font-bold text-purple-400 border border-purple-500/20'}>
                                Auto Clean
                            </span>
                        </div>
                        <div className={'mt-3 flex items-baseline gap-2'}>
                            <span className={'text-3xl font-black text-white'}>ZGC / G1GC</span>
                            <span className={'text-xs text-neutral-500'}>Low-Pause Collector</span>
                        </div>
                        <p className={'mt-2 text-xs text-neutral-400'}>
                            Aikar&apos;s JVM flags prevent GC pause spikes. You can manually run GC cleanup anytime below.
                        </p>
                    </div>
                </div>

                {/* Spark Profiler Action Suite */}
                <div className={'rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 backdrop-blur-md'}>
                    <h2 className={'text-base font-bold text-white flex items-center gap-2'}>
                        <SparklesIcon className={'h-5 w-5 text-cyan-400'} />
                        Spark Diagnostic Tools (1-Click Console Triggers)
                    </h2>
                    <p className={'text-xs text-neutral-400 mt-1 mb-4'}>
                        Click any diagnostic action below to trigger Spark profiling. Results will appear instantly in the Server Console with shareable web links.
                    </p>

                    <div className={'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'}>
                        <button
                            type={'button'}
                            disabled={!!runningCmd}
                            onClick={() => handleSparkCommand('spark tps', 'Live TPS')}
                            className={'flex flex-col items-start p-4 rounded-xl border border-neutral-800 bg-neutral-800/60 hover:bg-neutral-800 hover:border-cyan-500/40 text-left transition group'}
                        >
                            <div className={'flex items-center justify-between w-full'}>
                                <span className={'font-bold text-white text-xs group-hover:text-cyan-400 transition'}>
                                    📊 Realtime TPS Check
                                </span>
                                <span className={'text-[10px] text-neutral-500'}>/spark tps</span>
                            </div>
                            <p className={'text-[11px] text-neutral-400 mt-2'}>
                                Shows rolling 5s, 10s, 1m, and 15m TPS and CPU averages.
                            </p>
                        </button>

                        <button
                            type={'button'}
                            disabled={!!runningCmd}
                            onClick={() => handleSparkCommand('spark sampler --timeout 30', 'Sampler (30s)')}
                            className={'flex flex-col items-start p-4 rounded-xl border border-neutral-800 bg-neutral-800/60 hover:bg-neutral-800 hover:border-cyan-500/40 text-left transition group'}
                        >
                            <div className={'flex items-center justify-between w-full'}>
                                <span className={'font-bold text-white text-xs group-hover:text-cyan-400 transition'}>
                                    ⏱ 30s CPU Profiler
                                </span>
                                <span className={'text-[10px] text-neutral-500'}>/spark sampler</span>
                            </div>
                            <p className={'text-[11px] text-neutral-400 mt-2'}>
                                Profiles CPU threads and generates an interactive flame graph web viewer.
                            </p>
                        </button>

                        <button
                            type={'button'}
                            disabled={!!runningCmd}
                            onClick={() => handleSparkCommand('spark gc', 'Clean GC')}
                            className={'flex flex-col items-start p-4 rounded-xl border border-neutral-800 bg-neutral-800/60 hover:bg-neutral-800 hover:border-cyan-500/40 text-left transition group'}
                        >
                            <div className={'flex items-center justify-between w-full'}>
                                <span className={'font-bold text-white text-xs group-hover:text-cyan-400 transition'}>
                                    🧹 Force JVM GC Clean
                                </span>
                                <span className={'text-[10px] text-neutral-500'}>/spark gc</span>
                            </div>
                            <p className={'text-[11px] text-neutral-400 mt-2'}>
                                Reclaims unused heap memory and releases memory back to the host system.
                            </p>
                        </button>

                        <button
                            type={'button'}
                            disabled={!!runningCmd}
                            onClick={() => handleSparkCommand('spark heapdump', 'Heapdump')}
                            className={'flex flex-col items-start p-4 rounded-xl border border-neutral-800 bg-neutral-800/60 hover:bg-neutral-800 hover:border-cyan-500/40 text-left transition group'}
                        >
                            <div className={'flex items-center justify-between w-full'}>
                                <span className={'font-bold text-white text-xs group-hover:text-cyan-400 transition'}>
                                    💾 Memory Heap Snapshot
                                </span>
                                <span className={'text-[10px] text-neutral-500'}>/spark heapdump</span>
                            </div>
                            <p className={'text-[11px] text-neutral-400 mt-2'}>
                                Captures memory references to identify memory leaks from rogue plugins.
                            </p>
                        </button>

                        <button
                            type={'button'}
                            disabled={!!runningCmd}
                            onClick={() => handleSparkCommand('spark ping', 'Ping Check')}
                            className={'flex flex-col items-start p-4 rounded-xl border border-neutral-800 bg-neutral-800/60 hover:bg-neutral-800 hover:border-cyan-500/40 text-left transition group'}
                        >
                            <div className={'flex items-center justify-between w-full'}>
                                <span className={'font-bold text-white text-xs group-hover:text-cyan-400 transition'}>
                                    📡 Player Ping Diagnostic
                                </span>
                                <span className={'text-[10px] text-neutral-500'}>/spark ping</span>
                            </div>
                            <p className={'text-[11px] text-neutral-400 mt-2'}>
                                Summarizes network latency and packet jitter for all connected players.
                            </p>
                        </button>

                        <button
                            type={'button'}
                            disabled={!!runningCmd}
                            onClick={() => handleSparkCommand('tps', 'Standard TPS')}
                            className={'flex flex-col items-start p-4 rounded-xl border border-neutral-800 bg-neutral-800/60 hover:bg-neutral-800 hover:border-cyan-500/40 text-left transition group'}
                        >
                            <div className={'flex items-center justify-between w-full'}>
                                <span className={'font-bold text-white text-xs group-hover:text-cyan-400 transition'}>
                                    ⚡ Server Core /tps
                                </span>
                                <span className={'text-[10px] text-neutral-500'}>/tps</span>
                            </div>
                            <p className={'text-[11px] text-neutral-400 mt-2'}>
                                Standard built-in Paper/Purpur/Spigot TPS command.
                            </p>
                        </button>
                    </div>
                </div>

                {/* Optimization Advisor */}
                <div className={'rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 backdrop-blur-md'}>
                    <div className={'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'}>
                        <div>
                            <h2 className={'text-base font-bold text-white flex items-center gap-2'}>
                                <AdjustmentsIcon className={'h-5 w-5 text-cyan-400'} />
                                Lag-Free Tuning Advisor
                            </h2>
                            <p className={'text-xs text-neutral-400 mt-1'}>
                                Minecraft performance is heavily influenced by render distance and synchronous chunk writes.
                            </p>
                        </div>

                        <button
                            type={'button'}
                            disabled={applyingOptimal}
                            onClick={handleApplyOptimizations}
                            className={'rounded-xl bg-cyan-600 hover:bg-cyan-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-cyan-600/20 transition shrink-0'}
                        >
                            {applyingOptimal ? 'Applying...' : 'Apply 1-Click Anti-Lag Settings'}
                        </button>
                    </div>

                    {settings && (
                        <div className={'grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs'}>
                            <div className={'rounded-xl bg-neutral-850 p-3 border border-neutral-800'}>
                                <span className={'text-neutral-500 block text-[10px] uppercase font-bold'}>View Distance</span>
                                <span className={'text-white font-bold text-sm'}>{settings.viewDistance} chunks</span>
                                <span className={'text-[10px] text-cyan-400 block mt-0.5'}>Recommended: 8</span>
                            </div>

                            <div className={'rounded-xl bg-neutral-850 p-3 border border-neutral-800'}>
                                <span className={'text-neutral-500 block text-[10px] uppercase font-bold'}>Sim Distance</span>
                                <span className={'text-white font-bold text-sm'}>{settings.simulationDistance} chunks</span>
                                <span className={'text-[10px] text-cyan-400 block mt-0.5'}>Recommended: 6</span>
                            </div>

                            <div className={'rounded-xl bg-neutral-850 p-3 border border-neutral-800'}>
                                <span className={'text-neutral-500 block text-[10px] uppercase font-bold'}>Network Compression</span>
                                <span className={'text-white font-bold text-sm'}>{settings.networkCompression} bytes</span>
                                <span className={'text-[10px] text-cyan-400 block mt-0.5'}>Recommended: 256</span>
                            </div>

                            <div className={'rounded-xl bg-neutral-850 p-3 border border-neutral-800'}>
                                <span className={'text-neutral-500 block text-[10px] uppercase font-bold'}>Sync Chunk Writes</span>
                                <span className={'text-white font-bold text-sm'}>{settings.syncChunkWrites ? 'Enabled' : 'Disabled (Async)'}</span>
                                <span className={'text-[10px] text-cyan-400 block mt-0.5'}>Recommended: Disabled</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </ServerContentBlock>
    );
};
