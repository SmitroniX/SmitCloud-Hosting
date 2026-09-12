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
    SearchIcon,
    FireIcon,
    GlobeAltIcon,
    ExternalLinkIcon,
    CollectionIcon,
} from '@heroicons/react/solid';
import {
    InstalledDatapack,
    PresetDatapack,
    OnlineDatapack,
    PRESET_DATAPACKS,
    fetchInstalledDatapacks,
    toggleDatapack,
    deleteDatapack,
    installPresetDatapack,
    uploadDatapackFile,
    detectWorldFolder,
    searchOnlineDatapacks,
    installOnlineDatapack,
} from '@/api/server/minecraft/datapacks';

type Tab = 'installed' | 'presets' | 'online';

const PRESET_CATEGORIES = [
    'all',
    'World Generation',
    'Quality of Life',
    'Survival',
    'Building',
    'Utility',
    'Fun & PvP',
];

const MC_VERSIONS = [
    'all',
    '1.21.4',
    '1.21.1',
    '1.20.4',
    '1.20.1',
    '1.19.4',
    '1.18.2',
    '1.16.5',
];

const categoryBadgeStyles: Record<string, string> = {
    'World Generation': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    'Quality of Life': 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    'Survival': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    'Building': 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    'Utility': 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    'Fun & PvP': 'bg-rose-500/15 text-rose-400 border-rose-500/30',
};

export default () => {
    const server = ServerContext.useStoreState((state) => state.server.data!);
    const { clearFlashes, clearAndAddHttpError, addFlash } = useFlash();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [worldName, setWorldName] = useState('world');
    const [datapacks, setDatapacks] = useState<InstalledDatapack[]>([]);
    const [activeTab, setActiveTab] = useState<Tab>('presets');

    // Presets filter state
    const [presetCategory, setPresetCategory] = useState<string>('all');
    const [presetSearch, setPresetSearch] = useState<string>('');

    // Online search state
    const [onlineProvider, setOnlineProvider] = useState<'curseforge' | 'modrinth' | 'all'>('curseforge');
    const [onlineQuery, setOnlineQuery] = useState<string>('');
    const [onlineVersion, setOnlineVersion] = useState<string>('all');
    const [onlineResults, setOnlineResults] = useState<OnlineDatapack[]>([]);
    const [onlineLoading, setOnlineLoading] = useState<boolean>(false);
    const [hasOnlineSearched, setHasOnlineSearched] = useState<boolean>(false);

    useEffect(() => {
        loadData();
    }, [server.uuid]);

    // Live search online datapacks with debounce
    useEffect(() => {
        if (activeTab !== 'online') return;
        const timer = setTimeout(() => {
            executeOnlineSearch();
        }, 350);
        return () => clearTimeout(timer);
    }, [onlineQuery, onlineVersion, onlineProvider, activeTab]);

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

    const executeOnlineSearch = async () => {
        try {
            setOnlineLoading(true);
            clearFlashes('datapacks');
            const res = await searchOnlineDatapacks(
                onlineQuery,
                onlineVersion !== 'all' ? onlineVersion : undefined,
                onlineProvider
            );
            setOnlineResults(res);
            setHasOnlineSearched(true);
        } catch (error) {
            clearAndAddHttpError({ error, key: 'datapacks' });
        } finally {
            setOnlineLoading(false);
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
                message: `✅ Datapack "${dp.name}" is now ${!dp.isEnabled ? 'enabled' : 'disabled'}! Run /reload in console to apply.`,
            });
        } catch (error) {
            clearAndAddHttpError({ error, key: 'datapacks' });
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (dp: InstalledDatapack) => {
        if (!confirm(`Are you sure you want to delete datapack "${dp.name}"?`)) return;
        try {
            setActionLoading(dp.filename);
            clearFlashes('datapacks');
            await deleteDatapack(server.uuid, dp.filename);
            await loadData();
            addFlash({
                key: 'datapacks',
                type: 'success',
                message: `Deleted datapack "${dp.name}".`,
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

    const handleInstallOnline = async (dp: OnlineDatapack) => {
        try {
            setActionLoading(dp.id);
            clearFlashes('datapacks');
            await installOnlineDatapack(server.uuid, dp);
            await loadData();
            addFlash({
                key: 'datapacks',
                type: 'success',
                message: `✅ Installed "${dp.title}" into /${worldName}/datapacks! Run /reload in console to apply.`,
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
                message: `✅ Uploaded ${file.name} to /${worldName}/datapacks! Run /reload in console to apply.`,
            });
        } catch (error) {
            clearAndAddHttpError({ error, key: 'datapacks' });
        } finally {
            setActionLoading(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Filter presets
    const filteredPresets = PRESET_DATAPACKS.filter((p) => {
        const matchesCategory = presetCategory === 'all' || p.category.toLowerCase().includes(presetCategory.toLowerCase());
        const matchesSearch = !presetSearch.trim() ||
            p.name.toLowerCase().includes(presetSearch.toLowerCase()) ||
            p.description.toLowerCase().includes(presetSearch.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const isPresetInstalled = (presetId: string) =>
        datapacks.some((d) => d.name.toLowerCase().includes(presetId.toLowerCase()));

    const isOnlineInstalled = (title: string) => {
        const clean = title.toLowerCase().replace(/[^a-z0-9]/g, '');
        return datapacks.some((d) => {
            const installedClean = d.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            return installedClean.includes(clean) || clean.includes(installedClean);
        });
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
                                    Install and manage datapacks to add custom terrain, world generation, recipes, and tweaks to your world without needing Forge or Fabric.
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
                                title={'Refresh Datapacks'}
                            >
                                <RefreshIcon className={classNames('h-4 w-4', { 'animate-spin': loading })} />
                            </button>
                        </div>
                    </div>

                    {/* Quick Stats Strip */}
                    <div className={'grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-neutral-800/80 text-xs'}>
                        <div className={'rounded-xl bg-neutral-900/60 border border-neutral-800/70 p-3'}>
                            <span className={'text-neutral-500 block text-[10px] uppercase font-bold'}>Installed Datapacks</span>
                            <span className={'text-xl font-black text-white mt-0.5 block'}>{datapacks.length}</span>
                        </div>
                        <div className={'rounded-xl bg-neutral-900/60 border border-neutral-800/70 p-3'}>
                            <span className={'text-neutral-500 block text-[10px] uppercase font-bold'}>Active Datapacks</span>
                            <span className={'text-xl font-black text-emerald-400 mt-0.5 block'}>
                                {datapacks.filter((d) => d.isEnabled).length}
                            </span>
                        </div>
                        <div className={'rounded-xl bg-neutral-900/60 border border-neutral-800/70 p-3'}>
                            <span className={'text-neutral-500 block text-[10px] uppercase font-bold'}>Curated Presets</span>
                            <span className={'text-xl font-black text-purple-400 mt-0.5 block'}>{PRESET_DATAPACKS.length}</span>
                        </div>
                        <div className={'rounded-xl bg-neutral-900/60 border border-neutral-800/70 p-3'}>
                            <span className={'text-neutral-500 block text-[10px] uppercase font-bold'}>Target World</span>
                            <span className={'text-sm font-bold text-cyan-400 mt-1 block truncate'}>/{worldName}</span>
                        </div>
                    </div>
                </div>

                {/* Primary Tabs */}
                <div className={'flex items-center gap-2 border-b border-neutral-800 pb-3 text-sm font-semibold'}>
                    <button
                        type={'button'}
                        onClick={() => setActiveTab('presets')}
                        className={classNames('flex items-center gap-2 px-4 py-2 rounded-xl transition', {
                            'bg-purple-600 text-white font-bold shadow-md shadow-purple-600/25': activeTab === 'presets',
                            'text-neutral-400 hover:text-white hover:bg-neutral-800': activeTab !== 'presets',
                        })}
                    >
                        <SparklesIcon className={'h-4 w-4 text-amber-400'} />
                        Curated Library ({PRESET_DATAPACKS.length} Presets)
                    </button>
                    <button
                        type={'button'}
                        onClick={() => {
                            setActiveTab('online');
                            if (!hasOnlineSearched) executeOnlineSearch();
                        }}
                        className={classNames('flex items-center gap-2 px-4 py-2 rounded-xl transition', {
                            'bg-purple-600 text-white font-bold shadow-md shadow-purple-600/25': activeTab === 'online',
                            'text-neutral-400 hover:text-white hover:bg-neutral-800': activeTab !== 'online',
                        })}
                    >
                        <SearchIcon className={'h-4 w-4'} />
                        Browse Online (CurseForge &amp; Modrinth)
                    </button>
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
                </div>

                {loading ? (
                    <div className={'py-16 text-center'}>
                        <Spinner size={'large'} centered />
                    </div>
                ) : (
                    <div>
                        {/* TAB 1: Curated Presets */}
                        {activeTab === 'presets' && (
                            <div className={'flex flex-col gap-5'}>
                                {/* Search & Category Pills */}
                                <div className={'flex flex-col gap-3 rounded-2xl border border-neutral-800 bg-[#0a0f1d]/90 p-4 shadow-lg'}>
                                    <div className={'relative'}>
                                        <SearchIcon className={'absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500'} />
                                        <input
                                            type={'text'}
                                            placeholder={'Filter curated presets (e.g. Terralith, Incendium, Multiplayer Sleep, Timber, Graves)...'}
                                            value={presetSearch}
                                            onChange={(e) => setPresetSearch(e.target.value)}
                                            className={'w-full rounded-xl bg-neutral-950 border border-neutral-700/80 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-neutral-500 focus:border-purple-500 focus:outline-none transition'}
                                        />
                                    </div>

                                    {/* Category Filter Pills */}
                                    <div className={'flex flex-wrap items-center gap-1.5 text-xs'}>
                                        {PRESET_CATEGORIES.map((cat) => (
                                            <button
                                                key={cat}
                                                type={'button'}
                                                onClick={() => setPresetCategory(cat)}
                                                className={classNames('px-3 py-1.5 rounded-xl font-bold transition capitalize border', {
                                                    'bg-purple-600 text-white border-purple-500 shadow-sm': presetCategory === cat,
                                                    'bg-neutral-900/70 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700': presetCategory !== cat,
                                                })}
                                            >
                                                {cat === 'all' ? `All Presets (${PRESET_DATAPACKS.length})` : cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {filteredPresets.length === 0 ? (
                                    <div className={'rounded-2xl border border-dashed border-neutral-800 bg-[#0a0f1d]/50 p-12 text-center'}>
                                        <SearchIcon className={'mx-auto h-12 w-12 text-neutral-600'} />
                                        <h3 className={'mt-3 text-base font-bold text-white'}>No Matching Presets</h3>
                                        <p className={'mt-1 text-xs text-neutral-400'}>
                                            Try clearing your search query or selecting "All Presets".
                                        </p>
                                    </div>
                                ) : (
                                    <div className={'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'}>
                                        {filteredPresets.map((preset) => {
                                            const installed = isPresetInstalled(preset.id);
                                            const badgeStyle = categoryBadgeStyles[preset.category] || 'bg-neutral-800 text-neutral-400 border-neutral-700';

                                            return (
                                                <div
                                                    key={preset.id}
                                                    className={'flex flex-col rounded-2xl border border-neutral-800 bg-[#0a0f1d]/85 p-5 backdrop-blur-sm justify-between shadow-lg hover:border-purple-500/40 transition-all duration-200 group'}
                                                >
                                                    <div>
                                                        <div className={'flex items-start justify-between gap-2 mb-2'}>
                                                            <div className={'flex items-center gap-3'}>
                                                                <span className={'text-3xl p-1 bg-neutral-900/80 rounded-xl border border-neutral-800 shrink-0'}>
                                                                    {preset.icon}
                                                                </span>
                                                                <div>
                                                                    <h4 className={'text-sm font-bold text-white group-hover:text-purple-300 transition'}>
                                                                        {preset.name}
                                                                    </h4>
                                                                    <span className={classNames('px-2 py-0.5 rounded text-[9px] font-bold uppercase border mt-0.5 inline-block', badgeStyle)}>
                                                                        {preset.category}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {installed && (
                                                                <span className={'px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase shrink-0'}>
                                                                    Installed
                                                                </span>
                                                            )}
                                                        </div>

                                                        <p className={'text-xs text-neutral-300 mt-2 leading-relaxed'}>
                                                            {preset.description}
                                                        </p>
                                                    </div>

                                                    <div className={'mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between'}>
                                                        <span className={'text-[10px] text-neutral-500 font-mono'}>
                                                            0ms Local Nginx CDN
                                                        </span>
                                                        <button
                                                            type={'button'}
                                                            onClick={() => handleInstallPreset(preset)}
                                                            disabled={actionLoading === preset.id}
                                                            className={classNames('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow', {
                                                                'bg-neutral-800 text-neutral-300 border border-neutral-700 hover:bg-neutral-700': installed,
                                                                'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/20': !installed,
                                                            })}
                                                        >
                                                            {actionLoading === preset.id ? (
                                                                <Spinner size={'small'} />
                                                            ) : (
                                                                <CloudDownloadIcon className={'h-4 w-4'} />
                                                            )}
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

                        {/* TAB 2: Online Datapacks (CurseForge & Modrinth) */}
                        {activeTab === 'online' && (
                            <div className={'flex flex-col gap-5'}>
                                {/* Search & Filters */}
                                <div className={'flex flex-col gap-3 rounded-2xl border border-neutral-800 bg-[#0a0f1d]/90 p-4 shadow-lg'}>
                                    {/* Provider Tabs */}
                                    <div className={'flex items-center gap-2 mb-0.5'}>
                                        <button
                                            type={'button'}
                                            onClick={() => setOnlineProvider('curseforge')}
                                            className={classNames('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border', {
                                                'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-500/50 shadow-md shadow-amber-500/10': onlineProvider === 'curseforge',
                                                'bg-neutral-900/60 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700': onlineProvider !== 'curseforge',
                                            })}
                                        >
                                            <FireIcon className={'h-4 w-4 text-amber-400'} />
                                            <span>CurseForge</span>
                                            <span className={'ml-1 text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-mono'}>Class 6945</span>
                                        </button>
                                        <button
                                            type={'button'}
                                            onClick={() => setOnlineProvider('modrinth')}
                                            className={classNames('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border', {
                                                'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/50 shadow-md shadow-emerald-500/10': onlineProvider === 'modrinth',
                                                'bg-neutral-900/60 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700': onlineProvider !== 'modrinth',
                                            })}
                                        >
                                            <span className={'h-2 w-2 rounded-full bg-emerald-400'} />
                                            <span>Modrinth</span>
                                        </button>
                                        <button
                                            type={'button'}
                                            onClick={() => setOnlineProvider('all')}
                                            className={classNames('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border', {
                                                'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 border-indigo-500/50 shadow-md shadow-indigo-500/10': onlineProvider === 'all',
                                                'bg-neutral-900/60 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700': onlineProvider !== 'all',
                                            })}
                                        >
                                            <GlobeAltIcon className={'h-4 w-4 text-indigo-400'} />
                                            <span>All Sources</span>
                                        </button>
                                    </div>

                                    <div className={'grid grid-cols-1 sm:grid-cols-4 gap-2'}>
                                        <div className={'relative sm:col-span-3'}>
                                            <SearchIcon className={'absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500'} />
                                            <input
                                                type={'text'}
                                                placeholder={
                                                    onlineProvider === 'curseforge'
                                                        ? 'Search Minecraft datapacks on CurseForge (e.g. Terralith, Incendium, Dungeons)...'
                                                        : onlineProvider === 'modrinth'
                                                        ? 'Search Minecraft datapacks on Modrinth...'
                                                        : 'Search datapacks across CurseForge & Modrinth...'
                                                }
                                                value={onlineQuery}
                                                onChange={(e) => setOnlineQuery(e.target.value)}
                                                className={'w-full rounded-xl bg-neutral-950 border border-neutral-700/80 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-neutral-500 focus:border-purple-500 focus:outline-none transition'}
                                            />
                                        </div>

                                        <div>
                                            <select
                                                value={onlineVersion}
                                                onChange={(e) => setOnlineVersion(e.target.value)}
                                                className={'w-full rounded-xl bg-neutral-900 border border-neutral-700 px-3 py-2.5 text-xs text-white focus:outline-none'}
                                            >
                                                {MC_VERSIONS.map((v) => (
                                                    <option key={v} value={v}>
                                                        {v === 'all' ? 'All Game Versions' : `MC ${v}`}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {onlineLoading ? (
                                    <div className={'py-16 text-center'}>
                                        <Spinner size={'large'} centered />
                                        <p className={'text-xs text-purple-400 font-mono mt-3 animate-pulse'}>
                                            Querying {onlineProvider === 'curseforge' ? 'CurseForge' : onlineProvider === 'modrinth' ? 'Modrinth' : 'CurseForge & Modrinth'} Datapack Index...
                                        </p>
                                    </div>
                                ) : onlineResults.length === 0 ? (
                                    <div className={'rounded-2xl border border-dashed border-neutral-800 bg-[#0a0f1d]/50 p-12 text-center'}>
                                        <ArchiveIcon className={'mx-auto h-12 w-12 text-neutral-600'} />
                                        <h3 className={'mt-3 text-base font-bold text-white'}>No Online Datapacks Found</h3>
                                        <p className={'mt-1 text-xs text-neutral-400'}>
                                            Try adjusting your search query or selecting "All Game Versions".
                                        </p>
                                    </div>
                                ) : (
                                    <div className={'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'}>
                                        {onlineResults.map((dp) => {
                                            const installed = isOnlineInstalled(dp.title);

                                            return (
                                                <div
                                                    key={dp.id}
                                                    className={'flex flex-col justify-between rounded-2xl border border-neutral-800 bg-[#0a0f1d]/85 p-5 shadow-lg hover:border-purple-500/40 transition-all duration-200 group'}
                                                >
                                                    <div className={'flex flex-col gap-3'}>
                                                        <div className={'flex items-start gap-3'}>
                                                            {dp.iconUrl ? (
                                                                <img
                                                                    src={dp.iconUrl}
                                                                    alt={dp.title}
                                                                    className={'h-12 w-12 rounded-xl object-contain bg-neutral-900 p-1 border border-neutral-800 shrink-0'}
                                                                    onError={(e) => {
                                                                        (e.target as HTMLImageElement).src = 'https://cdn.modrinth.com/assets/favicon.ico';
                                                                    }}
                                                                />
                                                            ) : (
                                                                <div className={'h-12 w-12 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow'}>
                                                                    <ArchiveIcon className={'h-6 w-6'} />
                                                                </div>
                                                            )}

                                                            <div className={'min-w-0 flex-1'}>
                                                                <div className={'flex items-center justify-between gap-1'}>
                                                                    <h4 className={'text-sm font-black text-white truncate group-hover:text-purple-300 transition'}>
                                                                        {dp.title}
                                                                    </h4>
                                                                    <div className={'flex items-center gap-1 shrink-0'}>
                                                                        {dp.source === 'curseforge' ? (
                                                                            <span className={'px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[9px] font-black uppercase flex items-center gap-0.5'}>
                                                                                <FireIcon className={'h-2.5 w-2.5 text-amber-400'} /> CF
                                                                            </span>
                                                                        ) : (
                                                                            <span className={'px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase flex items-center gap-1'}>
                                                                                <span className={'h-1.5 w-1.5 rounded-full bg-emerald-400'} /> MR
                                                                            </span>
                                                                        )}
                                                                        {installed && (
                                                                            <span className={'px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase'}>
                                                                                Installed
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <p className={'text-[11px] text-neutral-400 font-mono mt-0.5'}>
                                                                    by {dp.author || 'Author'}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <p className={'text-xs text-neutral-300 line-clamp-2 leading-relaxed'}>
                                                            {dp.description}
                                                        </p>

                                                        {/* Tags */}
                                                        <div className={'flex flex-wrap items-center gap-1 mt-1'}>
                                                            {dp.categories.slice(0, 2).map((c) => (
                                                                <span
                                                                    key={c}
                                                                    className={'px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 text-[10px] font-semibold capitalize border border-neutral-700/60'}
                                                                >
                                                                    {c}
                                                                </span>
                                                            ))}
                                                            {dp.gameVersions.slice(0, 2).map((v) => (
                                                                <span
                                                                    key={v}
                                                                    className={'px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 text-[10px] font-mono border border-purple-500/20'}
                                                                >
                                                                    MC {v}
                                                                </span>
                                                            ))}
                                                            <span className={'ml-auto text-[10px] text-neutral-400 font-mono'}>
                                                                ⬇ {(dp.downloads || 0).toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className={'flex items-center gap-2 mt-4 pt-3 border-t border-neutral-800/80'}>
                                                        <a
                                                            href={dp.sourceUrl}
                                                            target={'_blank'}
                                                            rel={'noreferrer'}
                                                            className={'flex items-center justify-center gap-1 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 px-3 py-2 text-xs font-semibold text-neutral-200 border border-neutral-700/60 transition'}
                                                        >
                                                            <span>Page</span>
                                                            <ExternalLinkIcon className={'h-3 w-3'} />
                                                        </a>
                                                        <button
                                                            type={'button'}
                                                            onClick={() => handleInstallOnline(dp)}
                                                            disabled={actionLoading === dp.id}
                                                            className={'flex-1 flex items-center justify-center gap-1 rounded-xl bg-purple-600 hover:bg-purple-500 px-3 py-2 text-xs font-bold text-white shadow-md shadow-purple-600/20 transition'}
                                                            title={'1-Click Install into World Datapacks'}
                                                        >
                                                            {actionLoading === dp.id ? (
                                                                <Spinner size={'small'} />
                                                            ) : (
                                                                <CloudDownloadIcon className={'h-4 w-4'} />
                                                            )}
                                                            Install
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 3: Installed Datapacks */}
                        {activeTab === 'installed' && (
                            <div>
                                {datapacks.length === 0 ? (
                                    <div className={'rounded-2xl border border-dashed border-neutral-800 bg-[#0a0f1d]/50 p-12 text-center'}>
                                        <ArchiveIcon className={'mx-auto h-12 w-12 text-neutral-600'} />
                                        <h3 className={'mt-3 text-base font-bold text-white'}>No Datapacks Found</h3>
                                        <p className={'mt-1 text-xs text-neutral-400 max-w-md mx-auto'}>
                                            Your world currently has no custom datapacks in /{worldName}/datapacks. Explore the Curated Library or Browse Online to install additions.
                                        </p>
                                        <button
                                            type={'button'}
                                            onClick={() => setActiveTab('presets')}
                                            className={'mt-4 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2 text-xs font-bold text-white transition'}
                                        >
                                            Explore Library
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
                                                        title={'Delete Datapack'}
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
                    </div>
                )}
            </div>
        </ServerContentBlock>
    );
};
