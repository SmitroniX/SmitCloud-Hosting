import React, { useEffect, useRef, useState } from 'react';
import { ServerContext } from '@/state/server';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import FlashMessageRender from '@/components/FlashMessageRender';
import useFlash from '@/plugins/useFlash';
import Spinner from '@/components/elements/Spinner';
import Input from '@/components/elements/Input';
import Modal from '@/components/elements/Modal';
import { bytesToString } from '@/lib/formatters';
import classNames from 'classnames';
import copy from 'copy-to-clipboard';
import {
    CubeIcon,
    SparklesIcon,
    SearchIcon,
    CloudDownloadIcon,
    RefreshIcon,
    TrashIcon,
    CheckCircleIcon,
    ExclamationIcon,
    ExternalLinkIcon,
    UploadIcon,
    ChevronRightIcon,
    ChevronDownIcon,
    XIcon,
    FolderAddIcon,
    ShieldCheckIcon,
    InformationCircleIcon,
    AdjustmentsIcon,
    LightningBoltIcon,
    FireIcon,
    GlobeAltIcon,
} from '@heroicons/react/solid';
import {
    InstalledMod,
    OnlineMod,
    ModDetails,
    ModVersion,
    ModLoader,
    fetchInstalledMods,
    toggleMod,
    deleteMod,
    createModsFolder,
    pullMod,
    searchOnlineMods,
    fetchModDetailsUnified,
    fetchModVersionsUnified,
    getBestModDownload,
    uploadModFile,
    detectServerLoader,
} from '@/api/server/minecraft/mods';

type Tab = 'installed' | 'search' | 'popular';
type ModalTab = 'overview' | 'versions';

interface PopularModDef {
    name: string;
    slug: string;
    description: string;
    category: string;
    loaders: string[];
    serverCompatible: boolean;
}

const POPULAR_MODS: PopularModDef[] = [
    {
        name: 'FerriteCore',
        slug: 'ferrite-core',
        description: 'Memory usage optimization mod that drastically reduces server & client RAM overhead.',
        category: 'Performance',
        loaders: ['Fabric', 'Forge', 'NeoForge'],
        serverCompatible: true,
    },
    {
        name: 'Lithium',
        slug: 'lithium',
        description: 'General-purpose physics, chunk ticking, and mob AI optimization mod for Fabric/Quilt.',
        category: 'Performance',
        loaders: ['Fabric', 'Quilt', 'NeoForge'],
        serverCompatible: true,
    },
    {
        name: 'ModernFix',
        slug: 'modernfix',
        description: 'All-in-one performance and loading time improvements for modern modded Minecraft.',
        category: 'Performance',
        loaders: ['Fabric', 'Forge', 'NeoForge'],
        serverCompatible: true,
    },
    {
        name: 'Spark',
        slug: 'spark',
        description: 'High-precision performance profiler for CPU, TPS, tick duration, and memory allocation.',
        category: 'Profiler',
        loaders: ['Fabric', 'Forge', 'NeoForge', 'Quilt'],
        serverCompatible: true,
    },
    {
        name: 'Create',
        slug: 'create',
        description: 'A masterpiece mod of mechanical tools, automation, gears, trains, and kinetic power.',
        category: 'Technology',
        loaders: ['Fabric', 'Forge', 'NeoForge'],
        serverCompatible: true,
    },
    {
        name: 'Simple Voice Chat',
        slug: 'simple-voice-chat',
        description: 'Proximity voice chat with 3D spatial directional audio and push-to-talk in Minecraft.',
        category: 'Voice Chat',
        loaders: ['Fabric', 'Forge', 'NeoForge', 'Quilt'],
        serverCompatible: true,
    },
    {
        name: 'WorldEdit',
        slug: 'worldedit',
        description: 'Industry standard in-game Minecraft map editor, terraforming brush, and schematic tool.',
        category: 'Building',
        loaders: ['Fabric', 'Forge', 'NeoForge'],
        serverCompatible: true,
    },
    {
        name: 'Chunky',
        slug: 'chunky',
        description: 'Asynchronous pre-generator that generates world chunks ahead of time to eliminate exploration lag.',
        category: 'Performance',
        loaders: ['Fabric', 'Forge', 'NeoForge', 'Quilt'],
        serverCompatible: true,
    },
    {
        name: 'Terralith',
        slug: 'terralith',
        description: 'Huge world generation overhaul adding 100+ biomes without requiring custom blocks on client.',
        category: 'World Gen',
        loaders: ['Fabric', 'Forge', 'NeoForge', 'Quilt'],
        serverCompatible: true,
    },
    {
        name: 'Waystones',
        slug: 'waystones',
        description: 'Adds craftable waystone teleporter blocks for smooth cross-world fast-travel.',
        category: 'Adventure',
        loaders: ['Fabric', 'Forge', 'NeoForge'],
        serverCompatible: true,
    },
    {
        name: "Farmer's Delight",
        slug: 'farmers-delight',
        description: 'Gently expands farming and cooking in Minecraft with simple, immersive nutrition mechanics.',
        category: 'Food & Farming',
        loaders: ['Fabric', 'Forge', 'NeoForge'],
        serverCompatible: true,
    },
    {
        name: 'LuckPerms',
        slug: 'luckperms',
        description: 'Advanced permissions management system with web editor, groups, and prefix support for Fabric/Forge.',
        category: 'Permissions',
        loaders: ['Fabric', 'Forge', 'NeoForge'],
        serverCompatible: true,
    },
    {
        name: 'Ledger',
        slug: 'ledger',
        description: 'Comprehensive block change logging, grief inspection, and rollback utility for Fabric servers.',
        category: 'Security',
        loaders: ['Fabric', 'Quilt'],
        serverCompatible: true,
    },
    {
        name: 'Krypton',
        slug: 'krypton',
        description: 'Optimizes Minecraft networking stack to drastically reduce network lag on high player counts.',
        category: 'Networking',
        loaders: ['Fabric', 'Quilt'],
        serverCompatible: true,
    },
    {
        name: 'MemoryLeakFix',
        slug: 'memoryleakfix',
        description: 'Fixes multiple prominent vanilla Minecraft memory leaks on servers and clients.',
        category: 'Fixes',
        loaders: ['Fabric', 'Forge', 'NeoForge', 'Quilt'],
        serverCompatible: true,
    },
    {
        name: 'JEI (Just Enough Items)',
        slug: 'jei',
        description: 'The definitive recipe and item viewer for Minecraft modpacks.',
        category: 'Utility',
        loaders: ['Fabric', 'Forge', 'NeoForge'],
        serverCompatible: true,
    },
];

const MC_VERSIONS = [
    'all',
    '1.21.4',
    '1.21.1',
    '1.20.4',
    '1.20.1',
    '1.19.4',
    '1.19.2',
    '1.18.2',
    '1.16.5',
    '1.12.2',
];

export default () => {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const { clearFlashes, clearAndAddHttpError, addFlash } = useFlash();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [activeTab, setActiveTab] = useState<Tab>('installed');
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Detected server loader
    const [detectedLoader, setDetectedLoader] = useState<ModLoader>('all');

    // Installed mods
    const [installedMods, setInstalledMods] = useState<InstalledMod[]>([]);
    const [installedFilter, setInstalledFilter] = useState('');

    // Online search filters
    const [modProvider, setModProvider] = useState<'curseforge' | 'modrinth' | 'all'>('curseforge');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLoader, setSelectedLoader] = useState<string>('all');
    const [selectedVersion, setSelectedVersion] = useState<string>('all');
    const [serverOnly, setServerOnly] = useState<boolean>(true);
    const [sortBy, setSortBy] = useState<'downloads' | 'follows' | 'updated' | 'newest'>('downloads');
    const [searchResults, setSearchResults] = useState<OnlineMod[]>([]);
    const [hasSearched, setHasSearched] = useState(false);

    // Modal preview
    const [previewModId, setPreviewModId] = useState<string | null>(null);
    const [previewDetails, setPreviewDetails] = useState<ModDetails | null>(null);
    const [previewVersions, setPreviewVersions] = useState<ModVersion[]>([]);
    const [modalTab, setModalTab] = useState<ModalTab>('overview');
    const [modalLoading, setModalLoading] = useState(false);
    const [versionFilter, setVersionFilter] = useState('');
    const [expandedChangelogs, setExpandedChangelogs] = useState<{ [id: string]: boolean }>({});

    // Initial load
    useEffect(() => {
        if (!uuid) return;
        loadInstalled();
        detectServerLoader(uuid).then((loader) => {
            setDetectedLoader(loader);
            if (loader !== 'all') {
                setSelectedLoader(loader);
            }
        });
    }, [uuid]);

    // Live search trigger with debounce
    useEffect(() => {
        if (activeTab !== 'search') return;

        const timer = setTimeout(() => {
            executeSearch();
        }, 350);

        return () => clearTimeout(timer);
    }, [searchQuery, selectedLoader, selectedVersion, serverOnly, sortBy, modProvider, activeTab]);

    const loadInstalled = async () => {
        try {
            setLoading(true);
            clearFlashes('mods');
            const list = await fetchInstalledMods(uuid);
            setInstalledMods(list);
        } catch (error) {
            clearAndAddHttpError({ error, key: 'mods' });
        } finally {
            setLoading(false);
        }
    };

    const executeSearch = async () => {
        try {
            setLoading(true);
            clearFlashes('mods');
            const results = await searchOnlineMods(
                searchQuery,
                selectedLoader,
                selectedVersion,
                serverOnly,
                sortBy,
                modProvider
            );
            setSearchResults(results);
            setHasSearched(true);
        } catch (error) {
            clearAndAddHttpError({ error, key: 'mods' });
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (mod: InstalledMod) => {
        try {
            setActionLoading(mod.filename);
            await toggleMod(uuid, mod.filename, !mod.isEnabled);
            await loadInstalled();
            addFlash({
                key: 'mods',
                type: 'success',
                message: `${mod.name} is now ${!mod.isEnabled ? 'enabled' : 'disabled'}. Restart your server to apply changes.`,
            });
        } catch (error) {
            clearAndAddHttpError({ error, key: 'mods' });
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (mod: InstalledMod) => {
        if (!confirm(`Are you sure you want to permanently delete "${mod.filename}"?`)) return;

        try {
            setActionLoading(mod.filename);
            await deleteMod(uuid, mod.filename);
            await loadInstalled();
            addFlash({
                key: 'mods',
                type: 'success',
                message: `Deleted "${mod.filename}".`,
            });
        } catch (error) {
            clearAndAddHttpError({ error, key: 'mods' });
        } finally {
            setActionLoading(null);
        }
    };

    const handleCreateFolder = async () => {
        try {
            setActionLoading('create_folder');
            await createModsFolder(uuid);
            await loadInstalled();
            addFlash({
                key: 'mods',
                type: 'success',
                message: 'Successfully created the /mods directory.',
            });
        } catch (error) {
            clearAndAddHttpError({ error, key: 'mods' });
        } finally {
            setActionLoading(null);
        }
    };

    const handleInstallVersion = async (version: ModVersion, modTitle?: string) => {
        const download = getBestModDownload(version);
        if (!download) {
            alert('No valid .jar file found for this mod version.');
            return;
        }

        try {
            setActionLoading(version.id);
            await pullMod(uuid, download.url, download.filename);
            await loadInstalled();
            addFlash({
                key: 'mods',
                type: 'success',
                message: `✅ Installed ${modTitle || 'mod'} (${download.filename}) into /mods! Restart server to load.`,
            });
        } catch (error) {
            clearAndAddHttpError({ error, key: 'mods' });
        } finally {
            setActionLoading(null);
        }
    };

    const handleQuickInstall = async (mod: OnlineMod) => {
        try {
            setActionLoading(mod.id);
            const versions = await fetchModVersionsUnified(
                mod.id,
                selectedLoader !== 'all' ? selectedLoader : undefined,
                selectedVersion !== 'all' ? selectedVersion : undefined,
                mod.source
            );

            if (!versions.length) {
                alert(`No compatible versions found for ${mod.title} with the selected filters.`);
                return;
            }

            const latest = versions[0];
            await handleInstallVersion(latest, mod.title);
        } catch (error) {
            clearAndAddHttpError({ error, key: 'mods' });
        } finally {
            setActionLoading(null);
        }
    };

    const openPreview = async (projectId: string, source?: 'modrinth' | 'curseforge') => {
        setPreviewModId(projectId);
        setPreviewDetails(null);
        setPreviewVersions([]);
        setModalTab('overview');
        setModalLoading(true);

        try {
            const [details, versions] = await Promise.all([
                fetchModDetailsUnified(projectId, source),
                fetchModVersionsUnified(
                    projectId,
                    selectedLoader !== 'all' ? selectedLoader : undefined,
                    selectedVersion !== 'all' ? selectedVersion : undefined,
                    source
                ),
            ]);
            setPreviewDetails(details);
            setPreviewVersions(versions);
        } catch (e) {
            console.error(e);
        } finally {
            setModalLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || !files.length) return;

        const file = files[0];
        if (!file.name.endsWith('.jar')) {
            alert('Only .jar mod files are supported.');
            return;
        }

        try {
            setActionLoading('upload');
            await uploadModFile(uuid, file);
            await loadInstalled();
            addFlash({
                key: 'mods',
                type: 'success',
                message: `Uploaded ${file.name} to /mods!`,
            });
        } catch (error) {
            clearAndAddHttpError({ error, key: 'mods' });
        } finally {
            setActionLoading(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const filteredInstalled = installedMods.filter((m) =>
        m.name.toLowerCase().includes(installedFilter.toLowerCase())
    );

    const isInstalled = (slugOrTitle: string) => {
        const clean = slugOrTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
        return installedMods.some((m) => {
            const installedClean = m.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            return installedClean.includes(clean) || clean.includes(installedClean);
        });
    };

    return (
        <ServerContentBlock title={'Mod Manager'} showFlashKey={'mods'}>
            <div className={'flex flex-col gap-6'}>
                {/* Hero Header Card */}
                <div className={'relative overflow-hidden rounded-2xl border border-indigo-500/25 bg-[#0a0f1d]/90 p-6 shadow-2xl backdrop-blur-xl'}>
                    <div className={'pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl'} />
                    <div className={'pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl'} />

                    <div className={'relative flex flex-col md:flex-row md:items-center md:justify-between gap-6'}>
                        <div className={'flex items-start gap-4'}>
                            <div className={'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 shadow-lg shadow-indigo-500/25 text-white'}>
                                <CubeIcon className={'h-7 w-7'} />
                            </div>
                            <div>
                                <div className={'flex flex-wrap items-center gap-2'}>
                                    <h1 className={'text-xl sm:text-2xl font-black tracking-tight text-white'}>
                                        Minecraft Mod Manager
                                    </h1>
                                    <span className={'inline-flex items-center gap-1.5 rounded-full bg-indigo-500/15 px-3 py-0.5 text-xs font-bold text-indigo-400 border border-indigo-500/30'}>
                                        <SparklesIcon className={'h-3.5 w-3.5'} />
                                        MODRINTH API V2
                                    </span>
                                    {detectedLoader !== 'all' && (
                                        <span className={'inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/30 capitalize'}>
                                            <CheckCircleIcon className={'h-3 w-3'} />
                                            {detectedLoader} Detected
                                        </span>
                                    )}
                                </div>
                                <p className={'mt-1 text-xs sm:text-sm text-neutral-400'}>
                                    Browse, 1-click install, and manage Fabric, Forge, NeoForge, and Quilt mods with automated dependency and version resolution.
                                </p>
                            </div>
                        </div>

                        <div className={'flex flex-wrap items-center gap-3 shrink-0'}>
                            <button
                                type={'button'}
                                onClick={() => fileInputRef.current?.click()}
                                disabled={actionLoading === 'upload'}
                                className={'flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/20 transition'}
                            >
                                <UploadIcon className={'h-4 w-4'} />
                                Upload .jar Mod
                            </button>
                            <input
                                ref={fileInputRef}
                                type={'file'}
                                accept={'.jar'}
                                onChange={handleFileUpload}
                                className={'hidden'}
                            />

                            <button
                                type={'button'}
                                onClick={loadInstalled}
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
                            <span className={'text-neutral-500 block text-[10px] uppercase font-bold'}>Installed Mods</span>
                            <span className={'text-xl font-black text-white mt-0.5 block'}>{installedMods.length}</span>
                        </div>
                        <div className={'rounded-xl bg-neutral-900/60 border border-neutral-800/70 p-3'}>
                            <span className={'text-neutral-500 block text-[10px] uppercase font-bold'}>Active Mods</span>
                            <span className={'text-xl font-black text-emerald-400 mt-0.5 block'}>
                                {installedMods.filter((m) => m.isEnabled).length}
                            </span>
                        </div>
                        <div className={'rounded-xl bg-neutral-900/60 border border-neutral-800/70 p-3'}>
                            <span className={'text-neutral-500 block text-[10px] uppercase font-bold'}>Disabled Mods</span>
                            <span className={'text-xl font-black text-amber-400 mt-0.5 block'}>
                                {installedMods.filter((m) => !m.isEnabled).length}
                            </span>
                        </div>
                        <div className={'rounded-xl bg-neutral-900/60 border border-neutral-800/70 p-3'}>
                            <span className={'text-neutral-500 block text-[10px] uppercase font-bold'}>Target Loader</span>
                            <span className={'text-xl font-black text-indigo-400 mt-0.5 block capitalize'}>
                                {selectedLoader === 'all' ? (detectedLoader !== 'all' ? detectedLoader : 'Any') : selectedLoader}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Primary Navigation Tabs */}
                <div className={'flex items-center gap-2 border-b border-neutral-800 pb-3 text-sm font-semibold'}>
                    <button
                        type={'button'}
                        onClick={() => setActiveTab('installed')}
                        className={classNames('flex items-center gap-2 px-4 py-2 rounded-xl transition', {
                            'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 font-bold': activeTab === 'installed',
                            'text-neutral-400 hover:text-white hover:bg-neutral-800/80': activeTab !== 'installed',
                        })}
                    >
                        <CubeIcon className={'h-4 w-4'} />
                        Installed Mods ({installedMods.length})
                    </button>
                    <button
                        type={'button'}
                        onClick={() => {
                            setActiveTab('search');
                            if (!hasSearched) executeSearch();
                        }}
                        className={classNames('flex items-center gap-2 px-4 py-2 rounded-xl transition', {
                            'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 font-bold': activeTab === 'search',
                            'text-neutral-400 hover:text-white hover:bg-neutral-800/80': activeTab !== 'search',
                        })}
                    >
                        <SearchIcon className={'h-4 w-4'} />
                        Browse Mods (CurseForge &amp; Modrinth)
                    </button>
                    <button
                        type={'button'}
                        onClick={() => setActiveTab('popular')}
                        className={classNames('flex items-center gap-2 px-4 py-2 rounded-xl transition', {
                            'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 font-bold': activeTab === 'popular',
                            'text-neutral-400 hover:text-white hover:bg-neutral-800/80': activeTab !== 'popular',
                        })}
                    >
                        <SparklesIcon className={'h-4 w-4 text-amber-400'} />
                        Popular Server Mods
                    </button>
                </div>

                {/* TAB 1: Installed Mods */}
                {activeTab === 'installed' && (
                    <div className={'flex flex-col gap-4'}>
                        <div className={'flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3'}>
                            <div className={'w-full sm:w-80'}>
                                <Input
                                    placeholder={'Filter installed mods...'}
                                    value={installedFilter}
                                    onChange={(e) => setInstalledFilter(e.target.value)}
                                />
                            </div>

                            <button
                                type={'button'}
                                onClick={handleCreateFolder}
                                disabled={actionLoading === 'create_folder'}
                                className={'flex items-center justify-center gap-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 px-3.5 py-2 text-xs font-medium text-neutral-300 border border-neutral-700/60 transition'}
                            >
                                <FolderAddIcon className={'h-4 w-4 text-neutral-400'} />
                                Ensure /mods Folder
                            </button>
                        </div>

                        {loading && !installedMods.length ? (
                            <div className={'py-16 text-center'}>
                                <Spinner size={'large'} centered />
                                <p className={'text-xs text-neutral-400 font-mono mt-3'}>Scanning /mods directory...</p>
                            </div>
                        ) : filteredInstalled.length === 0 ? (
                            <div className={'rounded-2xl border border-dashed border-neutral-800 bg-[#0a0f1d]/50 p-12 text-center'}>
                                <CubeIcon className={'mx-auto h-12 w-12 text-neutral-600'} />
                                <h3 className={'mt-3 text-base font-bold text-white'}>No Mods Found in /mods</h3>
                                <p className={'mt-1 text-xs text-neutral-400 max-w-md mx-auto'}>
                                    Install mods directly from Modrinth using the Browse tab, choose from Popular Server Mods, or upload your own .jar files.
                                </p>
                                <div className={'mt-5 flex items-center justify-center gap-3'}>
                                    <button
                                        type={'button'}
                                        onClick={() => {
                                            setActiveTab('search');
                                            executeSearch();
                                        }}
                                        className={'rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-bold text-white shadow transition'}
                                    >
                                        Browse Modrinth Mods
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className={'grid grid-cols-1 md:grid-cols-2 gap-3'}>
                                {filteredInstalled.map((mod) => (
                                    <div
                                        key={mod.filename}
                                        className={classNames(
                                            'flex items-center justify-between gap-3 p-4 rounded-xl border transition-all duration-200 bg-[#0a0f1d]/80 backdrop-blur-sm',
                                            {
                                                'border-neutral-800 hover:border-indigo-500/40': mod.isEnabled,
                                                'border-neutral-800/50 opacity-60 bg-neutral-900/40': !mod.isEnabled,
                                            }
                                        )}
                                    >
                                        <div className={'flex items-center gap-3 min-w-0'}>
                                            <div className={classNames('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-sm font-bold', {
                                                'border-indigo-500/30 bg-indigo-500/10 text-indigo-400': mod.isEnabled,
                                                'border-neutral-700 bg-neutral-800 text-neutral-500': !mod.isEnabled,
                                            })}>
                                                <CubeIcon className={'h-5 w-5'} />
                                            </div>
                                            <div className={'min-w-0'}>
                                                <div className={'flex items-center gap-2'}>
                                                    <h4 className={'text-sm font-bold text-white truncate'} title={mod.name}>
                                                        {mod.name}
                                                    </h4>
                                                    <span className={classNames('px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider', {
                                                        'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30': mod.isEnabled,
                                                        'bg-neutral-800 text-neutral-400 border border-neutral-700': !mod.isEnabled,
                                                    })}>
                                                        {mod.isEnabled ? 'Active' : 'Disabled'}
                                                    </span>
                                                </div>
                                                <div className={'flex items-center gap-2 text-[11px] text-neutral-400 font-mono mt-0.5 truncate'}>
                                                    <span>{bytesToString(mod.size)}</span>
                                                    <span>•</span>
                                                    <span className={'truncate'}>{mod.filename}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={'flex items-center gap-2 shrink-0'}>
                                            <button
                                                type={'button'}
                                                onClick={() => handleToggle(mod)}
                                                disabled={actionLoading === mod.filename}
                                                className={classNames('px-3 py-1.5 rounded-lg text-xs font-semibold transition', {
                                                    'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30': mod.isEnabled,
                                                    'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30': !mod.isEnabled,
                                                })}
                                            >
                                                {mod.isEnabled ? 'Disable' : 'Enable'}
                                            </button>
                                            <button
                                                type={'button'}
                                                onClick={() => handleDelete(mod)}
                                                disabled={actionLoading === mod.filename}
                                                className={'p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition'}
                                                title={'Delete Mod'}
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

                {/* TAB 2: Browse & Search CurseForge & Modrinth */}
                {activeTab === 'search' && (
                    <div className={'flex flex-col gap-5'}>
                        {/* Search Bar & Advanced Filters */}
                        <div className={'flex flex-col gap-3 rounded-2xl border border-neutral-800 bg-[#0a0f1d]/90 p-4 shadow-lg'}>
                            {/* Provider Selection Tabs */}
                            <div className={'flex items-center gap-2 mb-0.5'}>
                                <button
                                    type={'button'}
                                    onClick={() => setModProvider('curseforge')}
                                    className={classNames('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border', {
                                        'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-500/50 shadow-md shadow-amber-500/10': modProvider === 'curseforge',
                                        'bg-neutral-900/60 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700': modProvider !== 'curseforge',
                                    })}
                                >
                                    <FireIcon className={'h-4 w-4 text-amber-400'} />
                                    <span>CurseForge</span>
                                    <span className={'ml-1 text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-mono'}>100k+</span>
                                </button>
                                <button
                                    type={'button'}
                                    onClick={() => setModProvider('modrinth')}
                                    className={classNames('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border', {
                                        'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/50 shadow-md shadow-emerald-500/10': modProvider === 'modrinth',
                                        'bg-neutral-900/60 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700': modProvider !== 'modrinth',
                                    })}
                                >
                                    <span className={'h-2 w-2 rounded-full bg-emerald-400'} />
                                    <span>Modrinth</span>
                                    <span className={'ml-1 text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-mono'}>50k+</span>
                                </button>
                                <button
                                    type={'button'}
                                    onClick={() => setModProvider('all')}
                                    className={classNames('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border', {
                                        'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 border-indigo-500/50 shadow-md shadow-indigo-500/10': modProvider === 'all',
                                        'bg-neutral-900/60 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700': modProvider !== 'all',
                                    })}
                                >
                                    <GlobeAltIcon className={'h-4 w-4 text-indigo-400'} />
                                    <span>All Sources</span>
                                </button>
                            </div>

                            <div className={'relative'}>
                                <SearchIcon className={'absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500'} />
                                <input
                                    type={'text'}
                                    placeholder={
                                        modProvider === 'curseforge'
                                            ? 'Search over 100,000+ Minecraft mods on CurseForge (e.g. JEI, Create, JourneyMap, Appleskin)...'
                                            : modProvider === 'modrinth'
                                            ? 'Search over 50,000+ Minecraft mods on Modrinth (e.g. Sodium, FerriteCore, Lithium)...'
                                            : 'Search mods across both CurseForge & Modrinth (e.g. Create, JEI, Chunky)...'
                                    }
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className={'w-full rounded-xl bg-neutral-950 border border-neutral-700/80 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-neutral-500 focus:border-indigo-500 focus:outline-none transition'}
                                />
                            </div>

                            <div className={'grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs'}>
                                {/* Loader Filter */}
                                <div className={'flex flex-col gap-1'}>
                                    <label className={'text-[10px] uppercase font-bold text-neutral-400'}>Mod Loader</label>
                                    <select
                                        value={selectedLoader}
                                        onChange={(e) => setSelectedLoader(e.target.value)}
                                        className={'rounded-xl bg-neutral-900 border border-neutral-700 px-3 py-2 text-xs text-white focus:outline-none capitalize'}
                                    >
                                        <option value={'all'}>All Loaders</option>
                                        <option value={'fabric'}>Fabric</option>
                                        <option value={'forge'}>Forge</option>
                                        <option value={'neoforge'}>NeoForge</option>
                                        <option value={'quilt'}>Quilt</option>
                                    </select>
                                </div>

                                {/* Minecraft Version Filter */}
                                <div className={'flex flex-col gap-1'}>
                                    <label className={'text-[10px] uppercase font-bold text-neutral-400'}>Game Version</label>
                                    <select
                                        value={selectedVersion}
                                        onChange={(e) => setSelectedVersion(e.target.value)}
                                        className={'rounded-xl bg-neutral-900 border border-neutral-700 px-3 py-2 text-xs text-white focus:outline-none'}
                                    >
                                        {MC_VERSIONS.map((v) => (
                                            <option key={v} value={v}>
                                                {v === 'all' ? 'All Versions' : v}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Sort Dropdown */}
                                <div className={'flex flex-col gap-1'}>
                                    <label className={'text-[10px] uppercase font-bold text-neutral-400'}>Sort By</label>
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value as any)}
                                        className={'rounded-xl bg-neutral-900 border border-neutral-700 px-3 py-2 text-xs text-white focus:outline-none'}
                                    >
                                        <option value={'downloads'}>Most Downloads</option>
                                        <option value={'follows'}>Most Followed</option>
                                        <option value={'updated'}>Recently Updated</option>
                                        <option value={'newest'}>Newest Release</option>
                                    </select>
                                </div>

                                {/* Server Only Toggle */}
                                <div className={'flex flex-col gap-1 justify-end'}>
                                    <button
                                        type={'button'}
                                        onClick={() => setServerOnly(!serverOnly)}
                                        className={classNames('flex items-center justify-between rounded-xl border px-3 py-2 text-xs font-semibold transition', {
                                            'bg-indigo-600/20 text-indigo-300 border-indigo-500/40': serverOnly,
                                            'bg-neutral-900 text-neutral-400 border-neutral-700': !serverOnly,
                                        })}
                                    >
                                        <span>🖥️ Server Compatible</span>
                                        <span className={classNames('h-2 w-2 rounded-full', {
                                            'bg-indigo-400 shadow-[0_0_6px_rgba(99,102,241,0.8)]': serverOnly,
                                            'bg-neutral-600': !serverOnly,
                                        })} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Search Results Grid */}
                        {loading ? (
                            <div className={'py-20 text-center'}>
                                <Spinner size={'large'} centered />
                                <p className={'text-xs text-indigo-400 font-mono mt-3 animate-pulse'}>
                                    Searching {modProvider === 'curseforge' ? 'CurseForge' : modProvider === 'modrinth' ? 'Modrinth' : 'CurseForge & Modrinth'} Mod Index...
                                </p>
                            </div>
                        ) : searchResults.length === 0 ? (
                            <div className={'rounded-2xl border border-dashed border-neutral-800 bg-[#0a0f1d]/50 p-12 text-center'}>
                                <SearchIcon className={'mx-auto h-12 w-12 text-neutral-600'} />
                                <h3 className={'mt-3 text-base font-bold text-white'}>No Mods Found</h3>
                                <p className={'mt-1 text-xs text-neutral-400'}>
                                    Try broadening your search query or setting loader / version filters to "All".
                                </p>
                            </div>
                        ) : (
                            <div className={'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'}>
                                {searchResults.map((mod) => {
                                    const installed = isInstalled(mod.slug) || isInstalled(mod.title);
                                    const isClientOnly = mod.serverSide === 'unsupported';

                                    return (
                                        <div
                                            key={mod.id}
                                            className={'flex flex-col justify-between rounded-2xl border border-neutral-800/80 bg-[#0a0f1d]/85 p-4 shadow-lg hover:border-indigo-500/40 transition-all duration-200 group'}
                                        >
                                            <div className={'flex flex-col gap-3'}>
                                                <div className={'flex items-start gap-3'}>
                                                    <img
                                                        src={mod.iconUrl || 'https://cdn.modrinth.com/assets/favicon.ico'}
                                                        alt={mod.title}
                                                        className={'h-12 w-12 rounded-xl object-contain bg-neutral-900 p-1 border border-neutral-800 shrink-0'}
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = 'https://cdn.modrinth.com/assets/favicon.ico';
                                                        }}
                                                    />
                                                    <div className={'min-w-0 flex-1'}>
                                                        <div className={'flex items-center justify-between gap-1'}>
                                                            <h4 className={'text-sm font-black text-white truncate group-hover:text-indigo-300 transition'}>
                                                                {mod.title}
                                                            </h4>
                                                            <div className={'flex items-center gap-1 shrink-0'}>
                                                                {mod.source === 'curseforge' ? (
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
                                                            by {mod.author || 'Author'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <p className={'text-xs text-neutral-300 line-clamp-2 leading-relaxed'}>
                                                    {mod.description}
                                                </p>

                                                {/* Badges: Loaders & Compatibility */}
                                                <div className={'flex flex-wrap items-center gap-1 mt-1'}>
                                                    {mod.loaders.slice(0, 3).map((l) => (
                                                        <span
                                                            key={l}
                                                            className={'px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 text-[10px] font-semibold capitalize border border-neutral-700/60'}
                                                        >
                                                            {l}
                                                        </span>
                                                    ))}
                                                    {isClientOnly ? (
                                                        <span className={'px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-bold'}>
                                                            Client Only
                                                        </span>
                                                    ) : (
                                                        <span className={'px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold'}>
                                                            Server OK
                                                        </span>
                                                    )}
                                                    <span className={'ml-auto text-[10px] text-neutral-400 font-mono'}>
                                                        ⬇ {(mod.downloads || 0).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className={'flex items-center gap-2 mt-4 pt-3 border-t border-neutral-800/80'}>
                                                <button
                                                    type={'button'}
                                                    onClick={() => openPreview(mod.id, mod.source)}
                                                    className={'flex-1 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 py-2 text-xs font-semibold text-neutral-200 border border-neutral-700/60 transition text-center'}
                                                >
                                                    Details &amp; Versions
                                                </button>
                                                <button
                                                    type={'button'}
                                                    onClick={() => handleQuickInstall(mod)}
                                                    disabled={actionLoading === mod.id}
                                                    className={'flex items-center gap-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/20 transition'}
                                                    title={'1-Click Install Latest Compatible Release'}
                                                >
                                                    {actionLoading === mod.id ? (
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

                {/* TAB 3: Popular Server Mods */}
                {activeTab === 'popular' && (
                    <div className={'flex flex-col gap-4'}>
                        <div className={'rounded-xl bg-indigo-950/30 border border-indigo-500/20 p-4 text-xs text-neutral-300 flex items-center justify-between'}>
                            <div className={'flex items-center gap-3'}>
                                <SparklesIcon className={'h-6 w-6 text-amber-400 shrink-0'} />
                                <span>
                                    Curated high-performance optimizations, world generation, and essential utilities recommended for modern Minecraft servers.
                                </span>
                            </div>
                        </div>

                        <div className={'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'}>
                            {POPULAR_MODS.map((mod) => {
                                const installed = isInstalled(mod.slug) || isInstalled(mod.name);

                                return (
                                    <div
                                        key={mod.slug}
                                        className={'flex flex-col justify-between rounded-2xl border border-neutral-800 bg-[#0a0f1d]/90 p-5 shadow-xl hover:border-indigo-500/40 transition-all duration-200'}
                                    >
                                        <div className={'flex flex-col gap-3'}>
                                            <div className={'flex items-center justify-between gap-2'}>
                                                <div className={'flex items-center gap-2.5'}>
                                                    <div className={'flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 font-black'}>
                                                        <CubeIcon className={'h-5 w-5'} />
                                                    </div>
                                                    <div>
                                                        <h4 className={'text-sm font-black text-white'}>{mod.name}</h4>
                                                        <span className={'text-[10px] text-indigo-400 font-bold uppercase tracking-wider'}>
                                                            {mod.category}
                                                        </span>
                                                    </div>
                                                </div>

                                                {installed && (
                                                    <span className={'px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase'}>
                                                        Installed
                                                    </span>
                                                )}
                                            </div>

                                            <p className={'text-xs text-neutral-300 leading-relaxed'}>
                                                {mod.description}
                                            </p>

                                            <div className={'flex flex-wrap items-center gap-1.5 mt-1'}>
                                                {mod.loaders.map((l) => (
                                                    <span
                                                        key={l}
                                                        className={'px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300 text-[10px] font-semibold border border-neutral-700/60'}
                                                    >
                                                        {l}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <div className={'flex items-center gap-2 mt-4 pt-3 border-t border-neutral-800/80'}>
                                            <button
                                                type={'button'}
                                                onClick={() => {
                                                    setSearchQuery(mod.slug);
                                                    setActiveTab('search');
                                                    executeSearch();
                                                }}
                                                className={'flex-1 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 py-2 text-xs font-semibold text-neutral-200 border border-neutral-700/60 transition text-center'}
                                            >
                                                Search on Modrinth
                                            </button>
                                            <button
                                                type={'button'}
                                                onClick={() => openPreview(mod.slug)}
                                                className={'rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/20 transition'}
                                            >
                                                Versions
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* MODAL: Mod Details & Version Selector */}
                {previewModId && (
                    <Modal
                        visible={!!previewModId}
                        onDismissed={() => setPreviewModId(null)}
                        showSpinnerOverlay={actionLoading === 'modal_install'}
                    >
                        {modalLoading || !previewDetails ? (
                            <div className={'py-16 text-center'}>
                                <Spinner size={'large'} centered />
                                <p className={'text-xs text-indigo-400 font-mono mt-3 animate-pulse'}>
                                    Loading Project &amp; Version Tree...
                                </p>
                            </div>
                        ) : (
                            <div className={'flex flex-col gap-5 max-h-[80vh] overflow-y-auto pr-1'}>
                                {/* Header Card */}
                                <div className={'relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-[#0a0f1d] p-5 shadow-2xl'}>
                                    <div className={'flex flex-col sm:flex-row items-center sm:items-start gap-4'}>
                                        <img
                                            src={previewDetails.iconUrl || 'https://cdn.modrinth.com/assets/favicon.ico'}
                                            alt={previewDetails.title}
                                            className={'h-16 w-16 rounded-2xl object-contain bg-neutral-900 p-1 border border-neutral-800 shadow-md shrink-0'}
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = 'https://cdn.modrinth.com/assets/favicon.ico';
                                            }}
                                        />
                                        <div className={'flex-1 text-center sm:text-left min-w-0'}>
                                            <div className={'flex flex-wrap items-center justify-center sm:justify-start gap-2'}>
                                                <h2 className={'text-xl font-black text-white'}>{previewDetails.title}</h2>
                                                {previewDetails.serverSide === 'unsupported' ? (
                                                    <span className={'rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold'}>
                                                        ⚠️ Client Only
                                                    </span>
                                                ) : (
                                                    <span className={'rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold'}>
                                                        🖥️ Server Compatible
                                                    </span>
                                                )}
                                            </div>
                                            <p className={'text-xs text-neutral-400 font-mono mt-0.5'}>
                                                by {previewDetails.author || 'Community Author'} • {previewDetails.downloads.toLocaleString()} downloads
                                            </p>
                                            <p className={'text-xs text-neutral-300 mt-2 leading-relaxed'}>
                                                {previewDetails.description}
                                            </p>

                                            {/* External Links */}
                                            <div className={'flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-3 text-xs'}>
                                                {previewDetails.sourceUrl && (
                                                    <a
                                                        href={previewDetails.sourceUrl}
                                                        target={'_blank'}
                                                        rel={'noreferrer'}
                                                        className={'text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold'}
                                                    >
                                                        <span>Source Code</span>
                                                        <ExternalLinkIcon className={'h-3.5 w-3.5'} />
                                                    </a>
                                                )}
                                                {previewDetails.wikiUrl && (
                                                    <a
                                                        href={previewDetails.wikiUrl}
                                                        target={'_blank'}
                                                        rel={'noreferrer'}
                                                        className={'text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold'}
                                                    >
                                                        <span>Wiki / Docs</span>
                                                        <ExternalLinkIcon className={'h-3.5 w-3.5'} />
                                                    </a>
                                                )}
                                                {previewDetails.discordUrl && (
                                                    <a
                                                        href={previewDetails.discordUrl}
                                                        target={'_blank'}
                                                        rel={'noreferrer'}
                                                        className={'text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold'}
                                                    >
                                                        <span>Discord</span>
                                                        <ExternalLinkIcon className={'h-3.5 w-3.5'} />
                                                    </a>
                                                )}
                                                <a
                                                    href={
                                                        previewDetails.source === 'curseforge' || (!previewDetails.source && /^\d+$/.test(previewDetails.id))
                                                            ? `https://www.curseforge.com/minecraft/mc-mods/${previewDetails.slug}`
                                                            : `https://modrinth.com/mod/${previewDetails.slug}`
                                                    }
                                                    target={'_blank'}
                                                    rel={'noreferrer'}
                                                    className={
                                                        previewDetails.source === 'curseforge' || (!previewDetails.source && /^\d+$/.test(previewDetails.id))
                                                            ? 'text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold'
                                                            : 'text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold'
                                                    }
                                                >
                                                    <span>
                                                        {previewDetails.source === 'curseforge' || (!previewDetails.source && /^\d+$/.test(previewDetails.id))
                                                            ? 'CurseForge Page'
                                                            : 'Modrinth Page'}
                                                    </span>
                                                    <ExternalLinkIcon className={'h-3.5 w-3.5'} />
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Modal Tabs */}
                                <div className={'flex items-center gap-2 border-b border-neutral-800 pb-2 text-xs font-bold'}>
                                    <button
                                        type={'button'}
                                        onClick={() => setModalTab('overview')}
                                        className={classNames('px-3.5 py-1.5 rounded-xl transition', {
                                            'bg-indigo-600 text-white shadow': modalTab === 'overview',
                                            'text-neutral-400 hover:text-white': modalTab !== 'overview',
                                        })}
                                    >
                                        Overview &amp; Loaders
                                    </button>
                                    <button
                                        type={'button'}
                                        onClick={() => setModalTab('versions')}
                                        className={classNames('px-3.5 py-1.5 rounded-xl transition', {
                                            'bg-indigo-600 text-white shadow': modalTab === 'versions',
                                            'text-neutral-400 hover:text-white': modalTab !== 'versions',
                                        })}
                                    >
                                        Available Versions ({previewVersions.length})
                                    </button>
                                </div>

                                {/* Overview Tab */}
                                {modalTab === 'overview' && (
                                    <div className={'flex flex-col gap-4 text-xs'}>
                                        <div className={'grid grid-cols-1 sm:grid-cols-2 gap-3'}>
                                            <div className={'rounded-xl bg-neutral-900/80 p-3.5 border border-neutral-800'}>
                                                <span className={'text-[10px] uppercase font-bold text-neutral-400 block mb-2'}>
                                                    Supported Mod Loaders
                                                </span>
                                                <div className={'flex flex-wrap gap-1.5'}>
                                                    {previewDetails.loaders.map((l) => (
                                                        <span
                                                            key={l}
                                                            className={'px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-700 text-white font-bold capitalize'}
                                                        >
                                                            {l}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className={'rounded-xl bg-neutral-900/80 p-3.5 border border-neutral-800'}>
                                                <span className={'text-[10px] uppercase font-bold text-neutral-400 block mb-2'}>
                                                    Categories &amp; Tags
                                                </span>
                                                <div className={'flex flex-wrap gap-1.5'}>
                                                    {previewDetails.categories.map((c) => (
                                                        <span
                                                            key={c}
                                                            className={'px-2.5 py-1 rounded-lg bg-indigo-950/50 border border-indigo-500/30 text-indigo-300 font-semibold capitalize'}
                                                        >
                                                            {c}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {previewDetails.body && (
                                            <div className={'rounded-xl bg-neutral-900/60 p-4 border border-neutral-800 text-neutral-300 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto'}>
                                                {previewDetails.body}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Versions Tab */}
                                {modalTab === 'versions' && (
                                    <div className={'flex flex-col gap-3'}>
                                        <div className={'flex items-center justify-between gap-3'}>
                                            <Input
                                                placeholder={'Filter versions (e.g. 1.21.1)...'}
                                                value={versionFilter}
                                                onChange={(e) => setVersionFilter(e.target.value)}
                                            />
                                        </div>

                                        <div className={'flex flex-col gap-2 max-h-72 overflow-y-auto pr-1'}>
                                            {previewVersions
                                                .filter(
                                                    (v) =>
                                                        v.name.toLowerCase().includes(versionFilter.toLowerCase()) ||
                                                        v.versionNumber.toLowerCase().includes(versionFilter.toLowerCase()) ||
                                                        v.gameVersions.some((gv) => gv.includes(versionFilter))
                                                )
                                                .map((v) => {
                                                    const download = getBestModDownload(v);
                                                    const isExpanded = !!expandedChangelogs[v.id];

                                                    return (
                                                        <div
                                                            key={v.id}
                                                            className={'flex flex-col rounded-xl border border-neutral-800 bg-neutral-900/70 p-3 text-xs gap-2'}
                                                        >
                                                            <div className={'flex items-center justify-between gap-3'}>
                                                                <div className={'min-w-0'}>
                                                                    <div className={'flex items-center gap-2'}>
                                                                        <span className={'font-bold text-white truncate'}>{v.name}</span>
                                                                        <span className={classNames('px-2 py-0.2 rounded text-[10px] font-bold uppercase', {
                                                                            'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30': v.versionType === 'release',
                                                                            'bg-amber-500/15 text-amber-400 border border-amber-500/30': v.versionType === 'beta',
                                                                            'bg-red-500/15 text-red-400 border border-red-500/30': v.versionType === 'alpha',
                                                                        })}>
                                                                            {v.versionType}
                                                                        </span>
                                                                    </div>
                                                                    <div className={'flex flex-wrap items-center gap-2 text-[11px] text-neutral-400 font-mono mt-1'}>
                                                                        <span>v{v.versionNumber}</span>
                                                                        <span>•</span>
                                                                        <span>MC: {v.gameVersions.slice(0, 3).join(', ')}</span>
                                                                        <span>•</span>
                                                                        <span className={'capitalize'}>{v.loaders.join(', ')}</span>
                                                                    </div>
                                                                </div>

                                                                <button
                                                                    type={'button'}
                                                                    onClick={() => handleInstallVersion(v, previewDetails.title)}
                                                                    disabled={actionLoading === v.id || !download}
                                                                    className={'flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2 text-xs font-bold text-white shadow transition shrink-0'}
                                                                >
                                                                    {actionLoading === v.id ? (
                                                                        <Spinner size={'small'} />
                                                                    ) : (
                                                                        <CloudDownloadIcon className={'h-4 w-4'} />
                                                                    )}
                                                                    Install {download?.filename ? `(${bytesToString(download.size || 0)})` : ''}
                                                                </button>
                                                            </div>

                                                            {v.changelog && (
                                                                <div>
                                                                    <button
                                                                        type={'button'}
                                                                        onClick={() => setExpandedChangelogs((prev) => ({ ...prev, [v.id]: !prev[v.id] }))}
                                                                        className={'text-[10px] text-neutral-400 hover:text-white flex items-center gap-1 mt-1'}
                                                                    >
                                                                        {isExpanded ? <ChevronDownIcon className={'h-3 w-3'} /> : <ChevronRightIcon className={'h-3 w-3'} />}
                                                                        {isExpanded ? 'Hide Changelog' : 'View Changelog'}
                                                                    </button>
                                                                    {isExpanded && (
                                                                        <p className={'mt-1.5 p-2 rounded bg-neutral-950 text-neutral-300 text-[11px] font-mono whitespace-pre-wrap'}>
                                                                            {v.changelog}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </Modal>
                )}
            </div>
        </ServerContentBlock>
    );
};
