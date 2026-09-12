import React, { useEffect, useState } from 'react';
import { ServerContext } from '@/state/server';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import useFlash from '@/plugins/useFlash';
import Spinner from '@/components/elements/Spinner';
import Modal from '@/components/elements/Modal';
import { bytesToString } from '@/lib/formatters';
import classNames from 'classnames';
import {
    CubeIcon,
    SparklesIcon,
    SearchIcon,
    CloudDownloadIcon,
    RefreshIcon,
    CheckCircleIcon,
    ExternalLinkIcon,
    ChevronDownIcon,
    XIcon,
    ShieldCheckIcon,
    InformationCircleIcon,
    AdjustmentsIcon,
    LightningBoltIcon,
    CollectionIcon,
    FireIcon,
    GlobeAltIcon,
    StarIcon,
} from '@heroicons/react/solid';
import {
    OnlineModpack,
    ModpackDetails,
    ModpackVersion,
    ModpackLoader,
    searchOnlineModpacks,
    fetchModpackDetailsUnified,
    fetchModpackVersionsUnified,
    getBestModpackDownload,
    pullModpack,
    fetchTrendingModpacks,
    formatDownloads,
} from '@/api/server/minecraft/modpacks';

type Tab = 'browse' | 'trending' | 'featured';
type ModalTab = 'overview' | 'versions';

const MC_VERSIONS = [
    'all',
    '1.21.5',
    '1.21.4',
    '1.21.3',
    '1.21.2',
    '1.21.1',
    '1.21',
    '1.20.6',
    '1.20.4',
    '1.20.2',
    '1.20.1',
    '1.20',
    '1.19.4',
    '1.19.2',
    '1.18.2',
    '1.16.5',
    '1.12.2',
];

interface FeaturedModpackDef {
    name: string;
    slug: string;
    description: string;
    category: string;
    loaders: string[];
}

const FEATURED_MODPACKS: FeaturedModpackDef[] = [
    {
        name: 'All the Mods 10',
        slug: 'all-the-mods-10',
        description: 'One of the most popular kitchen-sink modpacks with 400+ mods for NeoForge.',
        category: 'Kitchen Sink',
        loaders: ['NeoForge'],
    },
    {
        name: 'Better MC',
        slug: 'better-mc-forge-bmc4',
        description: 'Enhanced vanilla Minecraft experience with new biomes, structures, dimensions, and improved gameplay.',
        category: 'Adventure',
        loaders: ['Forge', 'Fabric'],
    },
    {
        name: 'Cobblemon',
        slug: 'cobblemon-modpack',
        description: 'Pokémon-inspired modpack: catch, battle, and train creatures in a seamless Minecraft world.',
        category: 'Adventure',
        loaders: ['Fabric', 'Forge'],
    },
    {
        name: 'Create: Arcanum',
        slug: 'create-arcanum',
        description: 'Combine Create\'s mechanical engineering with magical Arcanum additions for an incredible experience.',
        category: 'Technology',
        loaders: ['Forge'],
    },
    {
        name: 'Fabulously Optimized',
        slug: 'fabulously-optimized',
        description: 'Performance-focused modpack that makes Minecraft run blazingly fast with visual enhancements.',
        category: 'Performance',
        loaders: ['Fabric', 'Quilt'],
    },
    {
        name: 'Prominence II',
        slug: 'prominence-2-rpg',
        description: 'RPG-focused modpack with quests, dungeons, bosses, skills, and an immersive progression system.',
        category: 'RPG',
        loaders: ['Fabric'],
    },
    {
        name: 'Adrenaline',
        slug: 'adrenaline',
        description: 'Extreme performance modpack that optimizes every aspect of Minecraft for maximum FPS and smooth gameplay.',
        category: 'Performance',
        loaders: ['Fabric', 'Quilt'],
    },
    {
        name: 'RLCraft',
        slug: 'rlcraft',
        description: 'Brutal hardcore survival modpack with realistic mechanics, deadly mobs, and unforgiving gameplay.',
        category: 'Survival',
        loaders: ['Forge'],
    },
    {
        name: 'Vault Hunters',
        slug: 'vault-hunters-3rd-edition',
        description: 'RPG-style dungeon crawling with random vaults, unique loot, and character progression.',
        category: 'RPG',
        loaders: ['Forge'],
    },
    {
        name: 'Simply Optimized',
        slug: 'simply-optimized',
        description: 'Clean, minimal optimization modpack for dramatically improved performance with zero bloat.',
        category: 'Performance',
        loaders: ['Fabric'],
    },
    {
        name: 'All of Fabric 7',
        slug: 'aof-7',
        description: 'Massive Fabric-based kitchen sink modpack with tech, magic, exploration, and optimization.',
        category: 'Kitchen Sink',
        loaders: ['Fabric'],
    },
    {
        name: 'Medieval MC',
        slug: 'medieval-mc-forge',
        description: 'Medieval-themed modpack featuring castles, villages, quests, dragons, and a rich RPG experience.',
        category: 'Adventure',
        loaders: ['Forge', 'Fabric'],
    },
];

const categoryColors: { [key: string]: string } = {
    'Kitchen Sink': 'text-purple-400 bg-purple-500/15 border-purple-500/30',
    'Adventure': 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
    'Technology': 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30',
    'Performance': 'text-green-400 bg-green-500/15 border-green-500/30',
    'RPG': 'text-amber-400 bg-amber-500/15 border-amber-500/30',
    'Survival': 'text-red-400 bg-red-500/15 border-red-500/30',
};

const loaderColors: { [key: string]: string } = {
    fabric: 'text-yellow-300 bg-yellow-500/10 border-yellow-500/20',
    forge: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    neoforge: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    quilt: 'text-purple-300 bg-purple-500/10 border-purple-500/20',
};

export default () => {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const { clearFlashes, clearAndAddHttpError, addFlash } = useFlash();

    const [activeTab, setActiveTab] = useState<Tab>('browse');
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Search state
    const [modpackProvider, setModpackProvider] = useState<'curseforge' | 'modrinth' | 'all'>('curseforge');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLoader, setSelectedLoader] = useState<string>('all');
    const [selectedVersion, setSelectedVersion] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'downloads' | 'follows' | 'updated' | 'newest'>('downloads');
    const [searchResults, setSearchResults] = useState<OnlineModpack[]>([]);
    const [hasSearched, setHasSearched] = useState(false);

    // Trending
    const [trendingPacks, setTrendingPacks] = useState<OnlineModpack[]>([]);
    const [trendingLoaded, setTrendingLoaded] = useState(false);

    // Modal preview
    const [previewId, setPreviewId] = useState<string | null>(null);
    const [previewDetails, setPreviewDetails] = useState<ModpackDetails | null>(null);
    const [previewVersions, setPreviewVersions] = useState<ModpackVersion[]>([]);
    const [modalTab, setModalTab] = useState<ModalTab>('overview');
    const [modalLoading, setModalLoading] = useState(false);
    const [expandedChangelogs, setExpandedChangelogs] = useState<{ [id: string]: boolean }>({});
    const [versionFilter, setVersionFilter] = useState('');

    // Featured lookup results
    const [featuredResults, setFeaturedResults] = useState<{ [slug: string]: OnlineModpack | null }>({});
    const [featuredLoading, setFeaturedLoading] = useState(false);

    // Initial load
    useEffect(() => {
        if (!uuid) return;
        loadFeatured();
    }, [uuid]);

    // Live search
    useEffect(() => {
        if (activeTab !== 'browse') return;
        const timer = setTimeout(() => {
            executeSearch();
        }, 350);
        return () => clearTimeout(timer);
    }, [searchQuery, selectedLoader, selectedVersion, sortBy, modpackProvider, activeTab]);

    const executeSearch = async () => {
        try {
            setLoading(true);
            clearFlashes('modpacks');
            const results = await searchOnlineModpacks(searchQuery, selectedLoader, selectedVersion, sortBy, modpackProvider);
            setSearchResults(results);
            setHasSearched(true);
        } catch (error) {
            clearAndAddHttpError({ error, key: 'modpacks' });
        } finally {
            setLoading(false);
        }
    };

    const loadTrending = async () => {
        if (trendingLoaded) return;
        try {
            setLoading(true);
            const packs = await fetchTrendingModpacks(selectedLoader !== 'all' ? selectedLoader : undefined);
            setTrendingPacks(packs);
            setTrendingLoaded(true);
        } catch (error) {
            clearAndAddHttpError({ error, key: 'modpacks' });
        } finally {
            setLoading(false);
        }
    };

    const loadFeatured = async () => {
        setFeaturedLoading(true);
        const results: { [slug: string]: OnlineModpack | null } = {};

        // Batch fetch featured modpacks
        await Promise.all(
            FEATURED_MODPACKS.map(async (fp) => {
                try {
                    const detail = await fetchModpackDetailsUnified(fp.slug);
                    if (detail) {
                        results[fp.slug] = {
                            id: detail.id,
                            slug: detail.slug,
                            title: detail.title,
                            description: detail.description,
                            author: detail.author,
                            iconUrl: detail.iconUrl,
                            downloads: detail.downloads,
                            follows: detail.followers || 0,
                            categories: detail.categories,
                            loaders: detail.loaders,
                            gameVersions: detail.gameVersions,
                            serverSide: detail.serverSide,
                            clientSide: detail.clientSide,
                            sourceUrl: `https://modrinth.com/modpack/${detail.slug}`,
                            color: detail.color,
                        };
                    } else {
                        results[fp.slug] = null;
                    }
                } catch {
                    results[fp.slug] = null;
                }
            })
        );

        setFeaturedResults(results);
        setFeaturedLoading(false);
    };

    const openPreview = async (projectId: string, source?: 'modrinth' | 'curseforge') => {
        setPreviewId(projectId);
        setPreviewDetails(null);
        setPreviewVersions([]);
        setModalTab('overview');
        setModalLoading(true);

        try {
            const [details, versions] = await Promise.all([
                fetchModpackDetailsUnified(projectId, source),
                fetchModpackVersionsUnified(
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

    const handleInstallVersion = async (version: ModpackVersion, packTitle?: string) => {
        const download = getBestModpackDownload(version);
        if (!download) {
            alert('No valid modpack file found for this version.');
            return;
        }

        if (
            !confirm(
                `⚠️ Install "${packTitle || 'Modpack'}" (${version.name})?\n\n` +
                    `This will download ${download.filename} (${bytesToString(download.size)}) into your server root.\n\n` +
                    `Note: You may need to configure your server startup command and Java version after installation. ` +
                    `Make sure to backup your world before installing a modpack.`
            )
        ) {
            return;
        }

        try {
            setActionLoading(version.id);
            await pullModpack(uuid, download.url, download.filename);
            addFlash({
                key: 'modpacks',
                type: 'success',
                message: `✅ Downloaded "${packTitle || 'Modpack'}" (${download.filename}) to your server! You may need to extract it and configure your startup settings.`,
            });
        } catch (error) {
            clearAndAddHttpError({ error, key: 'modpacks' });
        } finally {
            setActionLoading(null);
        }
    };

    const handleQuickInstall = async (modpack: OnlineModpack) => {
        try {
            setActionLoading(modpack.id);
            const versions = await fetchModpackVersionsUnified(
                modpack.id,
                selectedLoader !== 'all' ? selectedLoader : undefined,
                selectedVersion !== 'all' ? selectedVersion : undefined,
                modpack.source
            );

            if (!versions.length) {
                alert(`No compatible server versions found for "${modpack.title}" with the selected filters.`);
                return;
            }

            const latest = versions[0];
            await handleInstallVersion(latest, modpack.title);
        } catch (error) {
            clearAndAddHttpError({ error, key: 'modpacks' });
        } finally {
            setActionLoading(null);
        }
    };

    // Simple markdown-like rendering for modpack bodies
    const renderBody = (body: string) => {
        const lines = body.split('\n');
        return (
            <div className={'prose prose-invert prose-sm max-w-none text-neutral-300'}>
                {lines.map((line, i) => {
                    if (line.startsWith('# ')) return <h1 key={i} className={'text-xl font-black text-white mt-4 mb-2'}>{line.slice(2)}</h1>;
                    if (line.startsWith('## ')) return <h2 key={i} className={'text-lg font-bold text-white mt-3 mb-1.5'}>{line.slice(3)}</h2>;
                    if (line.startsWith('### ')) return <h3 key={i} className={'text-base font-bold text-white mt-2 mb-1'}>{line.slice(4)}</h3>;
                    if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className={'ml-4 text-neutral-300 text-xs'}>{line.slice(2)}</li>;
                    if (line.startsWith('> ')) return <blockquote key={i} className={'border-l-2 border-indigo-500 pl-3 italic text-neutral-400 text-xs my-1'}>{line.slice(2)}</blockquote>;
                    if (line.startsWith('---')) return <hr key={i} className={'border-neutral-800 my-3'} />;
                    if (line.trim() === '') return <div key={i} className={'h-2'} />;

                    // Handle inline images
                    const imgMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
                    if (imgMatch) {
                        return (
                            <img
                                key={i}
                                src={imgMatch[2]}
                                alt={imgMatch[1]}
                                className={'rounded-lg max-w-full h-auto my-2 border border-neutral-800'}
                            />
                        );
                    }

                    return <p key={i} className={'text-xs text-neutral-300 leading-relaxed'}>{line}</p>;
                })}
            </div>
        );
    };

    const renderModpackCard = (modpack: OnlineModpack, isCompact = false) => (
        <div
            key={modpack.id}
            className={classNames(
                'group relative flex flex-col rounded-2xl border border-neutral-800 bg-[#0a0f1d]/80 backdrop-blur-sm overflow-hidden transition-all duration-200 hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/5',
                { 'min-h-[220px]': !isCompact }
            )}
        >
            {/* Header with icon */}
            <div className={'flex items-start gap-3 p-4 pb-2'}>
                {modpack.iconUrl ? (
                    <img
                        src={modpack.iconUrl}
                        alt={modpack.title}
                        className={'h-12 w-12 shrink-0 rounded-xl border border-neutral-800 bg-neutral-900 object-cover shadow-md'}
                        onError={(e: any) => {
                            e.target.src = '';
                            e.target.className = 'h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600';
                        }}
                    />
                ) : (
                    <div className={'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-md'}>
                        <CollectionIcon className={'h-6 w-6'} />
                    </div>
                )}

                <div className={'min-w-0 flex-1'}>
                    <div className={'flex items-center justify-between gap-1'}>
                        <h4
                            className={'text-sm font-bold text-white truncate cursor-pointer hover:text-purple-300 transition'}
                            onClick={() => openPreview(modpack.slug || modpack.id, modpack.source)}
                            title={modpack.title}
                        >
                            {modpack.title}
                        </h4>
                        {modpack.source === 'curseforge' ? (
                            <span className={'px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[9px] font-black uppercase flex items-center gap-0.5 shrink-0'}>
                                <FireIcon className={'h-2.5 w-2.5 text-amber-400'} /> CF
                            </span>
                        ) : (
                            <span className={'px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[9px] font-black uppercase flex items-center gap-1 shrink-0'}>
                                <span className={'h-1.5 w-1.5 rounded-full bg-purple-400'} /> MR
                            </span>
                        )}
                    </div>
                    {modpack.author && (
                        <p className={'text-[11px] text-neutral-500 truncate'}>
                            by {modpack.author}
                        </p>
                    )}
                </div>
            </div>

            {/* Description */}
            <div className={'px-4 flex-1'}>
                <p className={'text-[11px] text-neutral-400 line-clamp-2 leading-relaxed'}>
                    {modpack.description}
                </p>
            </div>

            {/* Tags */}
            <div className={'flex flex-wrap gap-1 px-4 mt-2'}>
                {modpack.loaders.slice(0, 3).map((loader) => (
                    <span
                        key={loader}
                        className={classNames(
                            'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border capitalize',
                            loaderColors[loader.toLowerCase()] || 'text-neutral-400 bg-neutral-800 border-neutral-700'
                        )}
                    >
                        {loader}
                    </span>
                ))}
                {modpack.gameVersions?.length > 0 && (
                    <span className={'px-1.5 py-0.5 rounded text-[9px] font-medium text-neutral-400 bg-neutral-800 border border-neutral-700'}>
                        {modpack.gameVersions[0]}
                        {modpack.gameVersions.length > 1 ? ` +${modpack.gameVersions.length - 1}` : ''}
                    </span>
                )}
            </div>

            {/* Stats row & actions */}
            <div className={'flex items-center justify-between gap-2 p-4 pt-3 mt-auto'}>
                <div className={'flex items-center gap-3 text-[10px] text-neutral-500'}>
                    <span className={'flex items-center gap-1'}>
                        <CloudDownloadIcon className={'h-3 w-3'} />
                        {formatDownloads(modpack.downloads)}
                    </span>
                    <span className={'flex items-center gap-1'}>
                        <StarIcon className={'h-3 w-3'} />
                        {formatDownloads(modpack.follows)}
                    </span>
                </div>

                <div className={'flex items-center gap-2'}>
                    <button
                        type={'button'}
                        onClick={() => openPreview(modpack.slug || modpack.id, modpack.source)}
                        className={'px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[10px] font-semibold text-neutral-300 border border-neutral-700/60 transition'}
                    >
                        Preview
                    </button>
                    <button
                        type={'button'}
                        onClick={() => handleQuickInstall(modpack)}
                        disabled={actionLoading === modpack.id}
                        className={'flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-[10px] font-bold text-white shadow-md shadow-purple-600/20 transition disabled:opacity-50'}
                    >
                        {actionLoading === modpack.id ? (
                            <Spinner size={'small'} />
                        ) : (
                            <CloudDownloadIcon className={'h-3 w-3'} />
                        )}
                        Install
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <ServerContentBlock title={'Modpack Manager'} showFlashKey={'modpacks'}>
            <div className={'flex flex-col gap-6'}>
                {/* Hero Header Card */}
                <div className={'relative overflow-hidden rounded-2xl border border-purple-500/25 bg-[#0a0f1d]/90 p-6 shadow-2xl backdrop-blur-xl'}>
                    <div className={'pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-purple-500/10 blur-3xl'} />
                    <div className={'pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl'} />

                    <div className={'relative flex flex-col md:flex-row md:items-center md:justify-between gap-6'}>
                        <div className={'flex items-start gap-4'}>
                            <div className={'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 shadow-lg shadow-purple-500/25 text-white'}>
                                <CollectionIcon className={'h-7 w-7'} />
                            </div>
                            <div>
                                <div className={'flex flex-wrap items-center gap-2'}>
                                    <h1 className={'text-xl sm:text-2xl font-black tracking-tight text-white'}>
                                        Server Modpacks
                                    </h1>
                                    <span className={'inline-flex items-center gap-1.5 rounded-full bg-purple-500/15 px-3 py-0.5 text-xs font-bold text-purple-400 border border-purple-500/30'}>
                                        <SparklesIcon className={'h-3.5 w-3.5 text-amber-400'} />
                                        CURSEFORGE &amp; MODRINTH
                                    </span>
                                </div>
                                <p className={'mt-1 text-xs sm:text-sm text-neutral-400'}>
                                    Browse, preview, and install complete server modpacks like ATM10, RLCraft, Better MC, and more directly from CurseForge &amp; Modrinth.
                                </p>
                            </div>
                        </div>

                        <div className={'flex flex-wrap items-center gap-3 shrink-0'}>
                            <button
                                type={'button'}
                                onClick={() => {
                                    setHasSearched(false);
                                    setTrendingLoaded(false);
                                    if (activeTab === 'browse') executeSearch();
                                    if (activeTab === 'trending') loadTrending();
                                    if (activeTab === 'featured') loadFeatured();
                                }}
                                disabled={loading}
                                className={'flex items-center gap-1.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 px-3.5 py-2 text-xs font-medium text-neutral-300 border border-neutral-700/60 transition'}
                            >
                                <RefreshIcon className={classNames('h-3.5 w-3.5', { 'animate-spin': loading })} />
                                Refresh
                            </button>
                        </div>
                    </div>

                    {/* Info Strip */}
                    <div className={'grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-neutral-800/80 text-xs'}>
                        <div className={'rounded-xl bg-neutral-900/60 border border-neutral-800/70 p-3'}>
                            <span className={'text-neutral-500 block text-[10px] uppercase font-bold'}>Repositories</span>
                            <span className={'text-sm font-black text-amber-400 mt-0.5 block'}>CurseForge &amp; Modrinth</span>
                        </div>
                        <div className={'rounded-xl bg-neutral-900/60 border border-neutral-800/70 p-3'}>
                            <span className={'text-neutral-500 block text-[10px] uppercase font-bold'}>File Formats</span>
                            <span className={'text-sm font-black text-white mt-0.5 block'}>.zip / .mrpack</span>
                        </div>
                        <div className={'rounded-xl bg-neutral-900/60 border border-neutral-800/70 p-3'}>
                            <span className={'text-neutral-500 block text-[10px] uppercase font-bold'}>Loader Filter</span>
                            <span className={'text-sm font-black text-indigo-400 mt-0.5 block capitalize'}>
                                {selectedLoader === 'all' ? 'Any Loader' : selectedLoader}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Primary Navigation Tabs */}
                <div className={'flex items-center gap-2 border-b border-neutral-800 pb-3 text-sm font-semibold'}>
                    <button
                        type={'button'}
                        onClick={() => {
                            setActiveTab('featured');
                        }}
                        className={classNames('flex items-center gap-2 px-4 py-2 rounded-xl transition', {
                            'bg-purple-600 text-white shadow-md shadow-purple-600/25 font-bold': activeTab === 'featured',
                            'text-neutral-400 hover:text-white hover:bg-neutral-800/80': activeTab !== 'featured',
                        })}
                    >
                        <FireIcon className={'h-4 w-4 text-amber-400'} />
                        Featured Modpacks
                    </button>
                    <button
                        type={'button'}
                        onClick={() => {
                            setActiveTab('browse');
                            if (!hasSearched) executeSearch();
                        }}
                        className={classNames('flex items-center gap-2 px-4 py-2 rounded-xl transition', {
                            'bg-purple-600 text-white shadow-md shadow-purple-600/25 font-bold': activeTab === 'browse',
                            'text-neutral-400 hover:text-white hover:bg-neutral-800/80': activeTab !== 'browse',
                        })}
                    >
                        <SearchIcon className={'h-4 w-4'} />
                        Browse &amp; Search
                    </button>
                    <button
                        type={'button'}
                        onClick={() => {
                            setActiveTab('trending');
                            loadTrending();
                        }}
                        className={classNames('flex items-center gap-2 px-4 py-2 rounded-xl transition', {
                            'bg-purple-600 text-white shadow-md shadow-purple-600/25 font-bold': activeTab === 'trending',
                            'text-neutral-400 hover:text-white hover:bg-neutral-800/80': activeTab !== 'trending',
                        })}
                    >
                        <LightningBoltIcon className={'h-4 w-4 text-yellow-400'} />
                        Trending
                    </button>
                </div>

                {/* TAB: Featured Modpacks */}
                {activeTab === 'featured' && (
                    <div className={'flex flex-col gap-5'}>
                        {/* Featured Info */}
                        <div className={'flex items-center gap-2 text-xs text-neutral-400'}>
                            <InformationCircleIcon className={'h-4 w-4 text-purple-400 shrink-0'} />
                            <span>
                                Hand-picked popular server modpacks. Click <strong className={'text-white'}>Preview</strong> for details or <strong className={'text-white'}>Install</strong> to download the latest server pack directly.
                            </span>
                        </div>

                        {featuredLoading ? (
                            <div className={'py-16 text-center'}>
                                <Spinner size={'large'} centered />
                                <p className={'text-xs text-neutral-400 font-mono mt-3'}>Loading featured modpacks from Modrinth...</p>
                            </div>
                        ) : (
                            <div className={'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'}>
                                {FEATURED_MODPACKS.map((fp) => {
                                    const online = featuredResults[fp.slug];
                                    if (online) return renderModpackCard(online);

                                    // Fallback for packs that couldn't be fetched
                                    return (
                                        <div
                                            key={fp.slug}
                                            className={'flex flex-col rounded-2xl border border-neutral-800 bg-[#0a0f1d]/80 p-4 min-h-[180px]'}
                                        >
                                            <div className={'flex items-start gap-3'}>
                                                <div className={'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-md'}>
                                                    <CollectionIcon className={'h-6 w-6'} />
                                                </div>
                                                <div className={'min-w-0'}>
                                                    <h4 className={'text-sm font-bold text-white truncate'}>{fp.name}</h4>
                                                    <div className={'flex flex-wrap gap-1 mt-1'}>
                                                        <span className={classNames('px-1.5 py-0.5 rounded text-[9px] font-bold border', categoryColors[fp.category] || 'text-neutral-400 bg-neutral-800 border-neutral-700')}>
                                                            {fp.category}
                                                        </span>
                                                        {fp.loaders.map((l) => (
                                                            <span
                                                                key={l}
                                                                className={classNames('px-1.5 py-0.5 rounded text-[9px] font-bold border capitalize', loaderColors[l.toLowerCase()] || 'text-neutral-400 bg-neutral-800 border-neutral-700')}
                                                            >
                                                                {l}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <p className={'text-[11px] text-neutral-400 mt-2 flex-1'}>{fp.description}</p>
                                            <div className={'flex items-center justify-end gap-2 mt-3 pt-2 border-t border-neutral-800/50'}>
                                                <a
                                                    href={`https://modrinth.com/modpack/${fp.slug}`}
                                                    target={'_blank'}
                                                    rel={'noopener noreferrer'}
                                                    className={'flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[10px] font-semibold text-neutral-300 border border-neutral-700/60 transition'}
                                                >
                                                    <ExternalLinkIcon className={'h-3 w-3'} />
                                                    Modrinth
                                                </a>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB: Browse & Search */}
                {activeTab === 'browse' && (
                    <div className={'flex flex-col gap-5'}>
                        {/* Search Bar & Filters */}
                        <div className={'flex flex-col gap-3 rounded-2xl border border-neutral-800 bg-[#0a0f1d]/90 p-4 shadow-lg'}>
                            {/* Provider Selection Tabs */}
                            <div className={'flex items-center gap-2 mb-0.5'}>
                                <button
                                    type={'button'}
                                    onClick={() => setModpackProvider('curseforge')}
                                    className={classNames('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border', {
                                        'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-500/50 shadow-md shadow-amber-500/10': modpackProvider === 'curseforge',
                                        'bg-neutral-900/60 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700': modpackProvider !== 'curseforge',
                                    })}
                                >
                                    <FireIcon className={'h-4 w-4 text-amber-400'} />
                                    <span>CurseForge</span>
                                    <span className={'ml-1 text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-mono'}>15k+</span>
                                </button>
                                <button
                                    type={'button'}
                                    onClick={() => setModpackProvider('modrinth')}
                                    className={classNames('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border', {
                                        'bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-300 border-purple-500/50 shadow-md shadow-purple-500/10': modpackProvider === 'modrinth',
                                        'bg-neutral-900/60 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700': modpackProvider !== 'modrinth',
                                    })}
                                >
                                    <span className={'h-2 w-2 rounded-full bg-purple-400'} />
                                    <span>Modrinth</span>
                                    <span className={'ml-1 text-[9px] px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 font-mono'}>5k+</span>
                                </button>
                                <button
                                    type={'button'}
                                    onClick={() => setModpackProvider('all')}
                                    className={classNames('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border', {
                                        'bg-gradient-to-r from-indigo-500/20 to-pink-500/20 text-indigo-300 border-indigo-500/50 shadow-md shadow-indigo-500/10': modpackProvider === 'all',
                                        'bg-neutral-900/60 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700': modpackProvider !== 'all',
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
                                        modpackProvider === 'curseforge'
                                            ? 'Search over 15,000+ modpacks on CurseForge (e.g. ATM10, RLCraft, Better MC, Pixelmon)...'
                                            : modpackProvider === 'modrinth'
                                            ? 'Search modpacks on Modrinth (e.g. Fabulously Optimized, Cobblemon, Adrenaline)...'
                                            : 'Search modpacks across both CurseForge & Modrinth...'
                                    }
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className={'w-full rounded-xl bg-neutral-950 border border-neutral-700/80 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-neutral-500 focus:border-purple-500 focus:outline-none transition'}
                                />
                            </div>

                            <div className={'grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs'}>
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

                                {/* MC Version Filter */}
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

                                {/* Sort By */}
                                <div className={'flex flex-col gap-1'}>
                                    <label className={'text-[10px] uppercase font-bold text-neutral-400'}>Sort By</label>
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value as any)}
                                        className={'rounded-xl bg-neutral-900 border border-neutral-700 px-3 py-2 text-xs text-white focus:outline-none'}
                                    >
                                        <option value={'downloads'}>Most Downloads</option>
                                        <option value={'follows'}>Most Followers</option>
                                        <option value={'updated'}>Recently Updated</option>
                                        <option value={'newest'}>Newest</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Results */}
                        {loading && !searchResults.length ? (
                            <div className={'py-16 text-center'}>
                                <Spinner size={'large'} centered />
                                <p className={'text-xs text-neutral-400 font-mono mt-3'}>
                                    Searching {modpackProvider === 'curseforge' ? 'CurseForge' : modpackProvider === 'modrinth' ? 'Modrinth' : 'CurseForge & Modrinth'} modpacks...
                                </p>
                            </div>
                        ) : searchResults.length === 0 && hasSearched ? (
                            <div className={'rounded-2xl border border-dashed border-neutral-800 bg-[#0a0f1d]/50 p-12 text-center'}>
                                <CollectionIcon className={'mx-auto h-12 w-12 text-neutral-600'} />
                                <h3 className={'mt-3 text-base font-bold text-white'}>No Modpacks Found</h3>
                                <p className={'mt-1 text-xs text-neutral-400'}>
                                    Try adjusting your search query, loader, or version filters.
                                </p>
                            </div>
                        ) : (
                            <div className={'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'}>
                                {searchResults.map((pack) => renderModpackCard(pack))}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB: Trending */}
                {activeTab === 'trending' && (
                    <div className={'flex flex-col gap-5'}>
                        <div className={'flex items-center gap-2 text-xs text-neutral-400'}>
                            <LightningBoltIcon className={'h-4 w-4 text-yellow-400 shrink-0'} />
                            <span>
                                Most followed server-compatible modpacks on Modrinth right now.
                            </span>
                        </div>

                        {loading && !trendingPacks.length ? (
                            <div className={'py-16 text-center'}>
                                <Spinner size={'large'} centered />
                                <p className={'text-xs text-neutral-400 font-mono mt-3'}>Loading trending modpacks...</p>
                            </div>
                        ) : trendingPacks.length === 0 ? (
                            <div className={'rounded-2xl border border-dashed border-neutral-800 bg-[#0a0f1d]/50 p-12 text-center'}>
                                <CollectionIcon className={'mx-auto h-12 w-12 text-neutral-600'} />
                                <h3 className={'mt-3 text-base font-bold text-white'}>No Trending Modpacks</h3>
                                <p className={'mt-1 text-xs text-neutral-400'}>Check back later or try the Browse tab.</p>
                            </div>
                        ) : (
                            <div className={'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'}>
                                {trendingPacks.map((pack) => renderModpackCard(pack))}
                            </div>
                        )}
                    </div>
                )}

                {/* Modpack Preview Modal */}
                <Modal
                    visible={!!previewId}
                    onDismissed={() => {
                        setPreviewId(null);
                        setPreviewDetails(null);
                        setPreviewVersions([]);
                        setExpandedChangelogs({});
                    }}
                >
                    <div
                        className={'w-full max-w-3xl rounded-2xl border border-neutral-800 bg-[#0a0f1d] shadow-2xl overflow-hidden'}
                        style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
                    >
                        {modalLoading ? (
                            <div className={'flex items-center justify-center py-24'}>
                                <Spinner size={'large'} />
                            </div>
                        ) : previewDetails ? (
                            <>
                                {/* Modal Header */}
                                <div className={'relative flex items-start gap-4 p-5 bg-gradient-to-r from-purple-900/30 to-indigo-900/20 border-b border-neutral-800'}>
                                    {previewDetails.iconUrl ? (
                                        <img
                                            src={previewDetails.iconUrl}
                                            alt={previewDetails.title}
                                            className={'h-16 w-16 shrink-0 rounded-xl border border-neutral-700 bg-neutral-900 object-cover shadow-lg'}
                                        />
                                    ) : (
                                        <div className={'flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 text-white shadow-lg'}>
                                            <CollectionIcon className={'h-8 w-8'} />
                                        </div>
                                    )}

                                    <div className={'min-w-0 flex-1'}>
                                        <h2 className={'text-lg font-black text-white truncate'}>{previewDetails.title}</h2>
                                        <p className={'text-xs text-neutral-400 mt-0.5 line-clamp-2'}>{previewDetails.description}</p>

                                        <div className={'flex flex-wrap items-center gap-2 mt-2'}>
                                            <span className={'text-[10px] text-neutral-400 flex items-center gap-1'}>
                                                <CloudDownloadIcon className={'h-3 w-3'} />
                                                {formatDownloads(previewDetails.downloads)} downloads
                                            </span>
                                            {previewDetails.followers !== undefined && (
                                                <span className={'text-[10px] text-neutral-400 flex items-center gap-1'}>
                                                    <StarIcon className={'h-3 w-3'} />
                                                    {formatDownloads(previewDetails.followers)} followers
                                                </span>
                                            )}
                                            {previewDetails.loaders.map((l) => (
                                                <span
                                                    key={l}
                                                    className={classNames('px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border capitalize', loaderColors[l.toLowerCase()] || 'text-neutral-400 bg-neutral-800 border-neutral-700')}
                                                >
                                                    {l}
                                                </span>
                                            ))}
                                            {previewDetails.license && (
                                                <span className={'px-1.5 py-0.5 rounded text-[9px] font-medium text-neutral-400 bg-neutral-800 border border-neutral-700'}>
                                                    {previewDetails.license}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Close button */}
                                    <button
                                        type={'button'}
                                        onClick={() => {
                                            setPreviewId(null);
                                            setPreviewDetails(null);
                                        }}
                                        className={'absolute right-3 top-3 p-1 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white transition'}
                                    >
                                        <XIcon className={'h-4 w-4'} />
                                    </button>
                                </div>

                                {/* Modal Tabs */}
                                <div className={'flex gap-1 px-5 pt-3 border-b border-neutral-800/50'}>
                                    <button
                                        type={'button'}
                                        onClick={() => setModalTab('overview')}
                                        className={classNames('px-4 py-2 text-xs font-bold rounded-t-lg transition', {
                                            'bg-purple-600/20 text-purple-300 border-b-2 border-purple-500': modalTab === 'overview',
                                            'text-neutral-400 hover:text-white': modalTab !== 'overview',
                                        })}
                                    >
                                        Overview
                                    </button>
                                    <button
                                        type={'button'}
                                        onClick={() => setModalTab('versions')}
                                        className={classNames('px-4 py-2 text-xs font-bold rounded-t-lg transition', {
                                            'bg-purple-600/20 text-purple-300 border-b-2 border-purple-500': modalTab === 'versions',
                                            'text-neutral-400 hover:text-white': modalTab !== 'versions',
                                        })}
                                    >
                                        Versions ({previewVersions.length})
                                    </button>
                                </div>

                                {/* Modal Content */}
                                <div className={'flex-1 overflow-y-auto p-5'} style={{ maxHeight: '55vh' }}>
                                    {modalTab === 'overview' && (
                                        <div>
                                            {/* Gallery */}
                                            {previewDetails.gallery && previewDetails.gallery.length > 0 && (
                                                <div className={'flex gap-2 overflow-x-auto pb-3 mb-4'}>
                                                    {previewDetails.gallery.slice(0, 6).map((img, i) => (
                                                        <img
                                                            key={i}
                                                            src={img}
                                                            alt={`Gallery ${i + 1}`}
                                                            className={'h-32 w-auto rounded-lg border border-neutral-800 object-cover shrink-0'}
                                                        />
                                                    ))}
                                                </div>
                                            )}

                                            {/* Quick Links */}
                                            <div className={'flex flex-wrap gap-2 mb-4'}>
                                                {previewDetails.sourceUrl && (
                                                    <a
                                                        href={
                                                            previewDetails.source === 'curseforge' || (!previewDetails.source && /^\d+$/.test(previewDetails.id))
                                                                ? `https://www.curseforge.com/minecraft/modpacks/${previewDetails.slug}`
                                                                : `https://modrinth.com/modpack/${previewDetails.slug}`
                                                        }
                                                        target={'_blank'}
                                                        rel={'noopener noreferrer'}
                                                        className={
                                                            previewDetails.source === 'curseforge' || (!previewDetails.source && /^\d+$/.test(previewDetails.id))
                                                                ? 'flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[10px] font-semibold text-amber-400 hover:bg-amber-500/20 transition'
                                                                : 'flex items-center gap-1 px-3 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30 text-[10px] font-semibold text-purple-400 hover:bg-purple-500/20 transition'
                                                        }
                                                    >
                                                        <GlobeAltIcon className={'h-3 w-3'} />
                                                        {previewDetails.source === 'curseforge' || (!previewDetails.source && /^\d+$/.test(previewDetails.id)) ? 'CurseForge Page' : 'Modrinth Page'}
                                                    </a>
                                                )}
                                                {previewDetails.discordUrl && (
                                                    <a
                                                        href={previewDetails.discordUrl}
                                                        target={'_blank'}
                                                        rel={'noopener noreferrer'}
                                                        className={'flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-[10px] font-semibold text-indigo-400 hover:bg-indigo-500/20 transition'}
                                                    >
                                                        Discord
                                                    </a>
                                                )}
                                                {previewDetails.wikiUrl && (
                                                    <a
                                                        href={previewDetails.wikiUrl}
                                                        target={'_blank'}
                                                        rel={'noopener noreferrer'}
                                                        className={'flex items-center gap-1 px-3 py-1 rounded-lg bg-neutral-500/10 border border-neutral-700 text-[10px] font-semibold text-neutral-400 hover:bg-neutral-500/20 transition'}
                                                    >
                                                        Wiki
                                                    </a>
                                                )}
                                            </div>

                                            {/* Body */}
                                            {previewDetails.body ? (
                                                renderBody(previewDetails.body)
                                            ) : (
                                                <p className={'text-sm text-neutral-400'}>{previewDetails.description}</p>
                                            )}
                                        </div>
                                    )}

                                    {modalTab === 'versions' && (
                                        <div className={'flex flex-col gap-3'}>
                                            {/* Version filter */}
                                            <input
                                                type={'text'}
                                                placeholder={'Filter versions...'}
                                                value={versionFilter}
                                                onChange={(e) => setVersionFilter(e.target.value)}
                                                className={'w-full rounded-xl bg-neutral-950 border border-neutral-700/80 px-4 py-2 text-xs text-white placeholder-neutral-500 focus:border-purple-500 focus:outline-none transition'}
                                            />

                                            {previewVersions
                                                .filter(
                                                    (v) =>
                                                        !versionFilter.trim() ||
                                                        v.name.toLowerCase().includes(versionFilter.toLowerCase()) ||
                                                        v.versionNumber.toLowerCase().includes(versionFilter.toLowerCase()) ||
                                                        v.gameVersions.some((gv) => gv.includes(versionFilter))
                                                )
                                                .map((version) => {
                                                    const download = getBestModpackDownload(version);
                                                    const isExpanded = expandedChangelogs[version.id];

                                                    return (
                                                        <div
                                                            key={version.id}
                                                            className={'rounded-xl border border-neutral-800 bg-neutral-900/50 p-4'}
                                                        >
                                                            <div className={'flex items-start justify-between gap-3'}>
                                                                <div className={'min-w-0'}>
                                                                    <div className={'flex items-center gap-2'}>
                                                                        <h4 className={'text-sm font-bold text-white truncate'}>
                                                                            {version.name}
                                                                        </h4>
                                                                        <span
                                                                            className={classNames('px-1.5 py-0.5 rounded text-[9px] font-bold uppercase', {
                                                                                'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30':
                                                                                    version.versionType === 'release',
                                                                                'bg-amber-500/15 text-amber-400 border border-amber-500/30':
                                                                                    version.versionType === 'beta',
                                                                                'bg-red-500/15 text-red-400 border border-red-500/30':
                                                                                    version.versionType === 'alpha',
                                                                            })}
                                                                        >
                                                                            {version.versionType}
                                                                        </span>
                                                                    </div>

                                                                    <div className={'flex flex-wrap items-center gap-2 mt-1 text-[10px] text-neutral-500'}>
                                                                        <span>{version.versionNumber}</span>
                                                                        <span>•</span>
                                                                        <span>
                                                                            {new Date(version.datePublished).toLocaleDateString()}
                                                                        </span>
                                                                        <span>•</span>
                                                                        <span>{formatDownloads(version.downloads)} downloads</span>
                                                                        {version.loaders.length > 0 && (
                                                                            <>
                                                                                <span>•</span>
                                                                                <span className={'capitalize'}>
                                                                                    {version.loaders.join(', ')}
                                                                                </span>
                                                                            </>
                                                                        )}
                                                                        {version.gameVersions.length > 0 && (
                                                                            <>
                                                                                <span>•</span>
                                                                                <span>MC {version.gameVersions.slice(0, 3).join(', ')}</span>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <button
                                                                    type={'button'}
                                                                    onClick={() =>
                                                                        handleInstallVersion(version, previewDetails?.title)
                                                                    }
                                                                    disabled={actionLoading === version.id}
                                                                    className={'flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white shadow-md shadow-purple-600/20 transition shrink-0 disabled:opacity-50'}
                                                                >
                                                                    {actionLoading === version.id ? (
                                                                        <Spinner size={'small'} />
                                                                    ) : (
                                                                        <CloudDownloadIcon className={'h-3.5 w-3.5'} />
                                                                    )}
                                                                    Install{download?.filename ? ` (${bytesToString(download.size)})` : ''}
                                                                </button>
                                                            </div>

                                                            {/* Changelog */}
                                                            {version.changelog && (
                                                                <div className={'mt-2'}>
                                                                    <button
                                                                        type={'button'}
                                                                        onClick={() =>
                                                                            setExpandedChangelogs((prev) => ({
                                                                                ...prev,
                                                                                [version.id]: !prev[version.id],
                                                                            }))
                                                                        }
                                                                        className={'flex items-center gap-1 text-[10px] text-neutral-400 hover:text-white transition'}
                                                                    >
                                                                        <ChevronDownIcon
                                                                            className={classNames('h-3 w-3 transition-transform', {
                                                                                'rotate-180': isExpanded,
                                                                            })}
                                                                        />
                                                                        {isExpanded ? 'Hide' : 'Show'} changelog
                                                                    </button>

                                                                    {isExpanded && (
                                                                        <div className={'mt-2 rounded-lg bg-neutral-950 border border-neutral-800 p-3 text-xs text-neutral-300 max-h-48 overflow-y-auto'}>
                                                                            <pre className={'whitespace-pre-wrap font-mono text-[11px]'}>
                                                                                {version.changelog}
                                                                            </pre>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}

                                            {previewVersions.length === 0 && (
                                                <div className={'py-8 text-center text-neutral-400 text-xs'}>
                                                    No versions available with the current filters.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className={'flex items-center justify-center py-24 text-neutral-400 text-sm'}>
                                Failed to load modpack details.
                            </div>
                        )}
                    </div>
                </Modal>

                {/* Bottom Info */}
                <div className={'rounded-2xl border border-neutral-800 bg-[#0a0f1d]/60 p-4'}>
                    <div className={'flex items-start gap-3'}>
                        <ShieldCheckIcon className={'h-5 w-5 text-purple-400 shrink-0 mt-0.5'} />
                        <div className={'text-xs text-neutral-400'}>
                            <p className={'font-bold text-white mb-1'}>Server Modpack Installation Tips</p>
                            <ul className={'list-disc list-inside space-y-1 text-[11px]'}>
                                <li>Modpack <code className={'text-purple-300'}>.mrpack</code> files are downloaded to your server root. Extract and configure as needed.</li>
                                <li><strong>Always backup your world</strong> before installing or changing modpacks.</li>
                                <li>Make sure your server&apos;s <strong>Java version</strong> and <strong>startup command</strong> match the modpack&apos;s requirements.</li>
                                <li>Some modpacks require specific <strong>RAM allocation</strong> — check the modpack&apos;s documentation.</li>
                                <li>Server-side modpacks work best with the correct mod loader pre-installed via the <strong>Software &amp; Version</strong> tab.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </ServerContentBlock>
    );
};
