import React, { useEffect, useRef, useState } from 'react';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { ServerContext } from '@/state/server';
import useFlash from '@/plugins/useFlash';
import Spinner from '@/components/elements/Spinner';
import { bytesToString } from '@/lib/formatters';
import classNames from 'classnames';
import {
    SparklesIcon,
    TrashIcon,
    RefreshIcon,
    UploadIcon,
    CloudDownloadIcon,
    FolderIcon,
    CheckCircleIcon,
    ArchiveIcon,
} from '@heroicons/react/solid';
import {
    InstalledDatapack,
    PresetDatapack,
    PRESET_DATAPACKS,
    fetchInstalledDatapacks,
    toggleDatapack,
    deleteDatapack,
    installPresetDatapack,
    uploadDatapackFile,
    detectWorldFolder,
} from '@/api/server/minecraft/datapacks';

export default () => {
    const server = ServerContext.useStoreState((state) => state.server.data!);
    const { clearFlashes, clearAndAddHttpError, addFlash } = useFlash();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [worldName, setWorldName] = useState('world');
    const [datapacks, setDatapacks] = useState<InstalledDatapack[]>([]);
    const [activeTab, setActiveTab] = useState<'installed' | 'presets'>('installed');

    useEffect(() => {
        loadData();
    }, [server.uuid]);

    const loadData = async () => {
        try {
            setLoading(true);
            clearFlashes('datapacks');
            const wName = await detectWorldFolder(server.uuid);
            setWorldName(wName);
            const list = await fetchInstalledDatapacks(server.uuid);
            setDatapacks(list);
        } catch (error) {
            clearAndAddHttpError({ error, key: 'datapacks' });
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (dp: InstalledDatapack) => {
        try {
            setActionLoading(dp.filename);
            clearFlashes('datapacks');
            await toggleDatapack(server.uuid, dp.filename, !dp.isEnabled);
            await loadData();
            addFlash({
                key: 'datapacks',
                type: 'success',
                message: `✅ Datapack ${dp.name} is now ${!dp.isEnabled ? 'enabled' : 'disabled'}! Run /reload in console to apply.`,
            });
        } catch (error) {
            clearAndAddHttpError({ error, key: 'datapacks' });
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (dp: InstalledDatapack) => {
        if (!confirm(`Delete datapack "${dp.name}"?`)) return;
        try {
            setActionLoading(dp.filename);
            clearFlashes('datapacks');
            await deleteDatapack(server.uuid, dp.filename);
            await loadData();
            addFlash({
                key: 'datapacks',
                type: 'success',
                message: `Deleted datapack ${dp.name}.`,
            });
        } catch (error) {
            clearAndAddHttpError({ error, key: 'datapacks' });
        } finally {
            setActionLoading(null);
        }
    };

    const handleInstallPreset = async (preset: PresetDatapack) => {
        try {
            setActionLoading(preset.id);
            clearFlashes('datapacks');
            await installPresetDatapack(server.uuid, preset);
            await loadData();
            addFlash({
                key: 'datapacks',
                type: 'success',
                message: `✅ Installed ${preset.name} into /${worldName}/datapacks! Run /reload in console to apply.`,
            });
        } catch (error) {
            clearAndAddHttpError({ error, key: 'datapacks' });
        } finally {
            setActionLoading(null);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.zip')) {
            alert('Only .zip datapack archives are supported.');
            return;
        }

        try {
            setActionLoading('upload');
            clearFlashes('datapacks');
            await uploadDatapackFile(server.uuid, file);
            await loadData();
            addFlash({
                key: 'datapacks',
                type: 'success',
                message: `✅ Uploaded ${file.name} to /${worldName}/datapacks! Run /reload to apply.`,
            });
        } catch (error) {
            clearAndAddHttpError({ error, key: 'datapacks' });
        } finally {
            setActionLoading(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <ServerContentBlock title={'Datapacks Manager'} showFlashKey={'datapacks'}>
            <div className={'flex flex-col gap-6'}>
                {/* Header Card */}
                <div className={'relative overflow-hidden rounded-2xl border border-purple-500/25 bg-[#0a0f1d]/90 p-6 shadow-2xl backdrop-blur-xl'}>
                    <div className={'pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-purple-500/10 blur-3xl'} />
                    <div className={'pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl'} />

                    <div className={'relative flex flex-col md:flex-row md:items-center md:justify-between gap-6'}>
                        <div className={'flex items-start gap-4'}>
                            <div className={'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-lg shadow-purple-500/25 text-white'}>
                                <ArchiveIcon className={'h-7 w-7'} />
                            </div>
                            <div>
                                <div className={'flex flex-wrap items-center gap-2'}>
                                    <h1 className={'text-xl sm:text-2xl font-black tracking-tight text-white'}>
                                        Datapacks &amp; Vanilla Tweaks
                                    </h1>
                                    <span className={'inline-flex items-center gap-1.5 rounded-full bg-purple-500/15 px-3 py-0.5 text-xs font-bold text-purple-400 border border-purple-500/30'}>
                                        <SparklesIcon className={'h-3.5 w-3.5'} />
                                        /{worldName}/datapacks
                                    </span>
                                </div>
                                <p className={'mt-1 text-xs sm:text-sm text-neutral-400'}>
                                    Install and manage datapacks to add custom mechanics, recipes, and tweaks to your world without needing Forge or Fabric.
                                </p>
                            </div>
                        </div>

                        <div className={'flex flex-wrap items-center gap-3 shrink-0'}>
                            <button
                                type={'button'}
                                onClick={() => fileInputRef.current?.click()}
                                disabled={actionLoading === 'upload'}
                                className={'flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2 text-xs font-bold text-white shadow transition'}
                            >
                                <UploadIcon className={'h-4 w-4'} />
                                Upload .zip Datapack
                            </button>
                            <input
                                ref={fileInputRef}
                                type={'file'}
                                accept={'.zip'}
                                onChange={handleUpload}
                                className={'hidden'}
                            />
                            <button
                                type={'button'}
                                onClick={loadData}
                                disabled={loading}
                                className={'p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition'}
                            >
                                <RefreshIcon className={classNames('h-4 w-4', { 'animate-spin': loading })} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className={'flex items-center gap-2 border-b border-neutral-800 pb-3 text-sm font-semibold'}>
                    <button
                        type={'button'}
                        onClick={() => setActiveTab('installed')}
                        className={classNames('flex items-center gap-2 px-4 py-2 rounded-xl transition', {
                            'bg-purple-600 text-white font-bold shadow-md shadow-purple-600/25': activeTab === 'installed',
                            'text-neutral-400 hover:text-white hover:bg-neutral-800': activeTab !== 'installed',
                        })}
                    >
                        <FolderIcon className={'h-4 w-4'} />
                        Installed Datapacks ({datapacks.length})
                    </button>
                    <button
                        type={'button'}
                        onClick={() => setActiveTab('presets')}
                        className={classNames('flex items-center gap-2 px-4 py-2 rounded-xl transition', {
                            'bg-purple-600 text-white font-bold shadow-md shadow-purple-600/25': activeTab === 'presets',
                            'text-neutral-400 hover:text-white hover:bg-neutral-800': activeTab !== 'presets',
                        })}
                    >
                        <SparklesIcon className={'h-4 w-4 text-amber-400'} />
                        Vanilla Tweaks Catalog
                    </button>
                </div>

                {loading ? (
                    <div className={'py-16 text-center'}>
                        <Spinner size={'large'} centered />
                    </div>
                ) : (
                    <div>
                        {/* TAB 1: Installed */}
                        {activeTab === 'installed' && (
                            <div>
                                {datapacks.length === 0 ? (
                                    <div className={'rounded-2xl border border-dashed border-neutral-800 bg-[#0a0f1d]/50 p-12 text-center'}>
                                        <ArchiveIcon className={'mx-auto h-12 w-12 text-neutral-600'} />
                                        <h3 className={'mt-3 text-base font-bold text-white'}>No Datapacks Found</h3>
                                        <p className={'mt-1 text-xs text-neutral-400 max-w-md mx-auto'}>
                                            Your world currently has no custom datapacks. Explore the Vanilla Tweaks Catalog to install popular quality-of-life additions.
                                        </p>
                                        <button
                                            type={'button'}
                                            onClick={() => setActiveTab('presets')}
                                            className={'mt-4 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2 text-xs font-bold text-white transition'}
                                        >
                                            Explore Catalog
                                        </button>
                                    </div>
                                ) : (
                                    <div className={'grid grid-cols-1 md:grid-cols-2 gap-3'}>
                                        {datapacks.map((dp) => (
                                            <div
                                                key={dp.filename}
                                                className={classNames('flex items-center justify-between p-4 rounded-xl border transition bg-[#0a0f1d]/80 backdrop-blur-sm', {
                                                    'border-neutral-800 hover:border-purple-500/40': dp.isEnabled,
                                                    'border-neutral-800/50 opacity-60 bg-neutral-900/40': !dp.isEnabled,
                                                })}
                                            >
                                                <div className={'flex items-center gap-3 min-w-0'}>
                                                    <div className={'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400'}>
                                                        <ArchiveIcon className={'h-5 w-5'} />
                                                    </div>
                                                    <div className={'min-w-0'}>
                                                        <div className={'flex items-center gap-2'}>
                                                            <h4 className={'text-sm font-bold text-white truncate'}>{dp.name}</h4>
                                                            <span className={classNames('px-2 py-0.5 rounded text-[10px] font-bold uppercase', {
                                                                'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30': dp.isEnabled,
                                                                'bg-neutral-800 text-neutral-400 border border-neutral-700': !dp.isEnabled,
                                                            })}>
                                                                {dp.isEnabled ? 'Active' : 'Disabled'}
                                                            </span>
                                                        </div>
                                                        <p className={'text-[11px] text-neutral-500 font-mono mt-0.5'}>
                                                            {bytesToString(dp.size)} • {dp.filename}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className={'flex items-center gap-2 shrink-0'}>
                                                    <button
                                                        type={'button'}
                                                        onClick={() => handleToggle(dp)}
                                                        disabled={actionLoading === dp.filename}
                                                        className={classNames('px-3 py-1.5 rounded-lg text-xs font-semibold transition', {
                                                            'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30': dp.isEnabled,
                                                            'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30': !dp.isEnabled,
                                                        })}
                                                    >
                                                        {dp.isEnabled ? 'Disable' : 'Enable'}
                                                    </button>
                                                    <button
                                                        type={'button'}
                                                        onClick={() => handleDelete(dp)}
                                                        disabled={actionLoading === dp.filename}
                                                        className={'p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition'}
                                                    >
                                                        <TrashIcon className={'h-4 w-4'} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 2: Catalog Presets */}
                        {activeTab === 'presets' && (
                            <div className={'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'}>
                                {PRESET_DATAPACKS.map((preset) => {
                                    const installed = datapacks.some((d) => d.name.toLowerCase().includes(preset.id));
                                    return (
                                        <div
                                            key={preset.id}
                                            className={'flex flex-col rounded-2xl border border-neutral-800 bg-[#0a0f1d]/80 p-5 backdrop-blur-sm justify-between'}
                                        >
                                            <div>
                                                <div className={'flex items-center gap-3 mb-2'}>
                                                    <span className={'text-2xl'}>{preset.icon}</span>
                                                    <div>
                                                        <h4 className={'text-sm font-bold text-white'}>{preset.name}</h4>
                                                        <span className={'px-1.5 py-0.5 rounded text-[9px] font-bold bg-neutral-800 text-neutral-400 border border-neutral-700'}>
                                                            {preset.category}
                                                        </span>
                                                    </div>
                                                </div>
                                                <p className={'text-xs text-neutral-400 mt-2 leading-relaxed'}>
                                                    {preset.description}
                                                </p>
                                            </div>

                                            <div className={'mt-4 pt-3 border-t border-neutral-800/80 flex justify-end'}>
                                                <button
                                                    type={'button'}
                                                    onClick={() => handleInstallPreset(preset)}
                                                    disabled={actionLoading === preset.id}
                                                    className={classNames('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow', {
                                                        'bg-neutral-800 text-neutral-300 border border-neutral-700 hover:bg-neutral-700': installed,
                                                        'bg-purple-600 hover:bg-purple-500 text-white': !installed,
                                                    })}
                                                >
                                                    <CloudDownloadIcon className={'h-4 w-4'} />
                                                    {actionLoading === preset.id ? 'Installing...' : installed ? 'Reinstall' : '1-Click Install'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </ServerContentBlock>
    );
};
