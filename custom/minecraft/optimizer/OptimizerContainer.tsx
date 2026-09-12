import React, { useEffect, useState } from 'react';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { ServerContext } from '@/state/server';
import useFlash from '@/plugins/useFlash';
import Spinner from '@/components/elements/Spinner';
import classNames from 'classnames';
import {
    LightningBoltIcon,
    CheckCircleIcon,
    AdjustmentsIcon,
    SparklesIcon,
    RefreshIcon,
    ShieldCheckIcon,
} from '@heroicons/react/solid';
import {
    AIKAR_FLAGS,
    LOW_RAM_FLAGS,
    MODDED_FLAGS,
    loadOptimizerConfig,
    saveJvmArgs,
    applyPropertiesOptimizations,
} from '@/api/server/minecraft/optimizer';

export default () => {
    const server = ServerContext.useStoreState((state) => state.server.data!);
    const { clearFlashes, clearAndAddHttpError, addFlash } = useFlash();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [selectedPreset, setSelectedPreset] = useState<string>('aikar');
    const [jvmArgsText, setJvmArgsText] = useState<string>('');
    const [viewDistance, setViewDistance] = useState<number>(8);
    const [simulationDistance, setSimulationDistance] = useState<number>(5);
    const [networkCompression, setNetworkCompression] = useState<number>(256);

    useEffect(() => {
        loadData();
    }, [server.uuid]);

    const loadData = async () => {
        try {
            setLoading(true);
            clearFlashes('optimizer');
            const conf = await loadOptimizerConfig(server.uuid);
            setJvmArgsText(conf.rawJvmArgs);
            setSelectedPreset(conf.activePreset);
            setViewDistance(conf.viewDistance);
            setSimulationDistance(conf.simulationDistance);
            setNetworkCompression(conf.networkCompression);
        } catch (error) {
            clearAndAddHttpError({ error, key: 'optimizer' });
        } finally {
            setLoading(false);
        }
    };

    const handleApplyPreset = (preset: 'aikar' | 'low_ram' | 'modded') => {
        setSelectedPreset(preset);
        if (preset === 'aikar') setJvmArgsText(AIKAR_FLAGS.join('\n'));
        if (preset === 'low_ram') setJvmArgsText(LOW_RAM_FLAGS.join('\n'));
        if (preset === 'modded') setJvmArgsText(MODDED_FLAGS.join('\n'));
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            clearFlashes('optimizer');
            await saveJvmArgs(server.uuid, jvmArgsText);
            await applyPropertiesOptimizations(server.uuid, viewDistance, simulationDistance, networkCompression);
            addFlash({
                key: 'optimizer',
                type: 'success',
                message: '✅ JVM flags saved to user_jvm_args.txt & server.properties distances updated! Restart server to apply.',
            });
        } catch (error) {
            clearAndAddHttpError({ error, key: 'optimizer' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <ServerContentBlock title={'JVM & Server Optimizer'} showFlashKey={'optimizer'}>
            <div className={'flex flex-col gap-6'}>
                {/* Header Banner */}
                <div className={'relative overflow-hidden rounded-2xl border border-cyan-500/25 bg-[#0a0f1d]/90 p-6 shadow-2xl backdrop-blur-xl'}>
                    <div className={'pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl'} />
                    <div className={'pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl'} />

                    <div className={'relative flex flex-col md:flex-row md:items-center md:justify-between gap-6'}>
                        <div className={'flex items-start gap-4'}>
                            <div className={'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/25 text-white'}>
                                <LightningBoltIcon className={'h-7 w-7'} />
                            </div>
                            <div>
                                <div className={'flex flex-wrap items-center gap-2'}>
                                    <h1 className={'text-xl sm:text-2xl font-black tracking-tight text-white'}>
                                        JVM &amp; Server Optimizer
                                    </h1>
                                    <span className={'inline-flex items-center gap-1.5 rounded-full bg-cyan-500/15 px-3 py-0.5 text-xs font-bold text-cyan-400 border border-cyan-500/30'}>
                                        <SparklesIcon className={'h-3.5 w-3.5'} />
                                        AIKAR&apos;S FLAGS &amp; PERFORMANCE
                                    </span>
                                </div>
                                <p className={'mt-1 text-xs sm:text-sm text-neutral-400'}>
                                    Eliminate Garbage Collection stutter spikes with Aikar&apos;s Flags and tune view/simulation distances for high TPS and low memory usage.
                                </p>
                            </div>
                        </div>

                        <div className={'flex items-center gap-3 shrink-0'}>
                            <button
                                type={'button'}
                                onClick={handleSave}
                                disabled={saving}
                                className={'rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold px-6 py-2.5 text-xs shadow-lg shadow-cyan-500/20 transition'}
                            >
                                {saving ? 'Applying Optimizations...' : '⚡ Apply Optimized Settings'}
                            </button>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className={'py-16 text-center'}>
                        <Spinner size={'large'} centered />
                    </div>
                ) : (
                    <div className={'grid grid-cols-1 lg:grid-cols-12 gap-6'}>
                        {/* Left 7 cols: JVM Presets & user_jvm_args.txt */}
                        <div className={'lg:col-span-7 flex flex-col gap-6'}>
                            <div className={'rounded-2xl border border-neutral-800 bg-[#0a0f1d]/80 p-5 backdrop-blur-md'}>
                                <h2 className={'text-base font-bold text-white flex items-center gap-2 mb-3'}>
                                    <SparklesIcon className={'h-5 w-5 text-cyan-400'} />
                                    Garbage Collector Presets (user_jvm_args.txt)
                                </h2>

                                <div className={'grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4'}>
                                    <button
                                        type={'button'}
                                        onClick={() => handleApplyPreset('aikar')}
                                        className={classNames('p-3 rounded-xl border text-left transition', {
                                            'bg-cyan-500/15 border-cyan-500 text-cyan-300 shadow': selectedPreset === 'aikar',
                                            'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:border-neutral-700': selectedPreset !== 'aikar',
                                        })}
                                    >
                                        <div className={'font-bold text-xs text-white'}>🚀 Aikar&apos;s Flags</div>
                                        <div className={'text-[10px] mt-1'}>Industry standard for Paper, Purpur, Fabric &amp; Forge.</div>
                                    </button>

                                    <button
                                        type={'button'}
                                        onClick={() => handleApplyPreset('low_ram')}
                                        className={classNames('p-3 rounded-xl border text-left transition', {
                                            'bg-cyan-500/15 border-cyan-500 text-cyan-300 shadow': selectedPreset === 'low_ram',
                                            'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:border-neutral-700': selectedPreset !== 'low_ram',
                                        })}
                                    >
                                        <div className={'font-bold text-xs text-white'}>🥔 Low-RAM Mode</div>
                                        <div className={'text-[10px] mt-1'}>Tuned for servers with 2GB–4GB allocated RAM.</div>
                                    </button>

                                    <button
                                        type={'button'}
                                        onClick={() => handleApplyPreset('modded')}
                                        className={classNames('p-3 rounded-xl border text-left transition', {
                                            'bg-cyan-500/15 border-cyan-500 text-cyan-300 shadow': selectedPreset === 'modded',
                                            'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:border-neutral-700': selectedPreset !== 'modded',
                                        })}
                                    >
                                        <div className={'font-bold text-xs text-white'}>📦 Heavy Modpack</div>
                                        <div className={'text-[10px] mt-1'}>Extended network timeouts and larger young gen heap.</div>
                                    </button>
                                </div>

                                <div>
                                    <label className={'block text-xs font-semibold text-neutral-300 mb-1'}>
                                        Custom JVM Flags (one per line)
                                    </label>
                                    <textarea
                                        rows={10}
                                        value={jvmArgsText}
                                        onChange={(e) => setJvmArgsText(e.target.value)}
                                        className={'w-full rounded-xl bg-neutral-950 border border-neutral-800 p-3 font-mono text-xs text-neutral-200 focus:border-cyan-500 focus:outline-none leading-relaxed'}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Right 5 cols: Server Distances & Network */}
                        <div className={'lg:col-span-5 flex flex-col gap-6'}>
                            <div className={'rounded-2xl border border-neutral-800 bg-[#0a0f1d]/80 p-5 backdrop-blur-md flex flex-col gap-4'}>
                                <h2 className={'text-base font-bold text-white flex items-center gap-2'}>
                                    <AdjustmentsIcon className={'h-5 w-5 text-indigo-400'} />
                                    Server Distances &amp; Network
                                </h2>
                                <p className={'text-xs text-neutral-400'}>
                                    High view distances are the #1 cause of server lag. Reducing simulation distance keeps TPS at a solid 20.0 without affecting player view.
                                </p>

                                {/* View Distance */}
                                <div>
                                    <div className={'flex items-center justify-between text-xs font-semibold mb-1'}>
                                        <span className={'text-neutral-300'}>View Distance (Chunks)</span>
                                        <span className={'text-cyan-400 font-mono font-bold'}>{viewDistance} chunks</span>
                                    </div>
                                    <input
                                        type={'range'}
                                        min={4}
                                        max={16}
                                        value={viewDistance}
                                        onChange={(e) => setViewDistance(parseInt(e.target.value, 10))}
                                        className={'w-full accent-cyan-500'}
                                    />
                                    <span className={'text-[10px] text-neutral-500'}>Recommended: 6–10 chunks for survival SMP.</span>
                                </div>

                                {/* Simulation Distance */}
                                <div>
                                    <div className={'flex items-center justify-between text-xs font-semibold mb-1'}>
                                        <span className={'text-neutral-300'}>Simulation Distance (Entity Ticks)</span>
                                        <span className={'text-cyan-400 font-mono font-bold'}>{simulationDistance} chunks</span>
                                    </div>
                                    <input
                                        type={'range'}
                                        min={3}
                                        max={10}
                                        value={simulationDistance}
                                        onChange={(e) => setSimulationDistance(parseInt(e.target.value, 10))}
                                        className={'w-full accent-cyan-500'}
                                    />
                                    <span className={'text-[10px] text-neutral-500'}>Recommended: 4–6 chunks (massive TPS gain).</span>
                                </div>

                                {/* Network Compression */}
                                <div>
                                    <div className={'flex items-center justify-between text-xs font-semibold mb-1'}>
                                        <span className={'text-neutral-300'}>Network Compression Threshold</span>
                                        <span className={'text-cyan-400 font-mono font-bold'}>{networkCompression} bytes</span>
                                    </div>
                                    <select
                                        value={networkCompression}
                                        onChange={(e) => setNetworkCompression(parseInt(e.target.value, 10))}
                                        className={'w-full rounded-xl bg-neutral-900 border border-neutral-700 px-3 py-2 text-xs text-white'}
                                    >
                                        <option value={256}>256 bytes (Default balanced)</option>
                                        <option value={512}>512 bytes (Lower CPU overhead)</option>
                                        <option value={-1}>-1 (Disabled, lowest CPU, higher bandwidth)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Info Box */}
                            <div className={'rounded-2xl border border-neutral-800 bg-[#0a0f1d]/80 p-5 backdrop-blur-md text-xs text-neutral-400'}>
                                <div className={'flex items-center gap-2 font-bold text-white mb-2'}>
                                    <ShieldCheckIcon className={'h-5 w-5 text-emerald-400'} />
                                    Why Aikar&apos;s Flags?
                                </div>
                                <p className={'text-[11px] leading-relaxed'}>
                                    Minecraft generates millions of short-lived objects every second. Standard Java GC stops the entire server to clean memory. Aikar&apos;s G1GC flags perform garbage collection concurrently in small slices, completely eliminating lag freezes.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ServerContentBlock>
    );
};
