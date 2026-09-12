import React, { useEffect, useState } from 'react';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { ServerContext } from '@/state/server';
import useFlash from '@/plugins/useFlash';
import Spinner from '@/components/elements/Spinner';
import Input from '@/components/elements/Input';
import { Link } from 'react-router-dom';
import copy from 'copy-to-clipboard';
import classNames from 'classnames';
import axios from 'axios';
import {
    SparklesIcon,
    SearchIcon,
    CheckCircleIcon,
    ClipboardCopyIcon,
    CubeIcon,
    PuzzleIcon,
    ArchiveIcon,
    GlobeAltIcon,
    ShieldCheckIcon,
    UsersIcon,
    HeartIcon,
    PhotographIcon,
    CollectionIcon,
    LightningBoltIcon,
    MapIcon,
    ChatAlt2Icon,
    AdjustmentsIcon,
    BanIcon,
    ServerIcon,
    ChevronRightIcon,
    RefreshIcon,
} from '@heroicons/react/solid';

interface HubTool {
    title: string;
    path: string;
    category: 'software' | 'config' | 'community' | 'diagnostics';
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    badge?: string;
}

const HUB_TOOLS: HubTool[] = [
    // Software & Content
    {
        title: 'Software & Version',
        path: '/minecraft/version',
        category: 'software',
        description: 'Switch between Paper, Purpur, Fabric, Forge, Spigot, and Vanilla with 1-click installer.',
        icon: LightningBoltIcon,
        accentColor: 'from-amber-500 to-yellow-500 text-amber-400 border-amber-500/30',
        badge: 'Core Engine',
    },
    {
        title: 'Plugin Manager',
        path: '/minecraft/plugins',
        category: 'software',
        description: 'Browse, search, and 1-click install over 50,000+ plugins directly from Modrinth.',
        icon: PuzzleIcon,
        accentColor: 'from-cyan-500 to-blue-500 text-cyan-400 border-cyan-500/30',
        badge: 'Modrinth API',
    },
    {
        title: 'Mod Manager',
        path: '/minecraft/mods',
        category: 'software',
        description: 'Manage Fabric, Forge, NeoForge, and Quilt mods. Toggle, upload, and auto-detect loader.',
        icon: CubeIcon,
        accentColor: 'from-indigo-500 to-purple-500 text-indigo-400 border-indigo-500/30',
    },
    {
        title: 'Modpacks',
        path: '/minecraft/modpacks',
        category: 'software',
        description: 'Install full server modpacks like ATM10, Better MC, Cobblemon, and RLCraft.',
        icon: CollectionIcon,
        accentColor: 'from-purple-500 to-pink-500 text-purple-400 border-purple-500/30',
        badge: 'Full Packs',
    },
    {
        title: 'Datapacks & Tweaks',
        path: '/minecraft/datapacks',
        category: 'software',
        description: 'Install Vanilla Tweaks (Multiplayer Sleep, Armor Statues, Graves, Double Shulkers).',
        icon: ArchiveIcon,
        accentColor: 'from-purple-600 to-indigo-600 text-purple-300 border-purple-500/30',
    },
    {
        title: 'Worlds & Maps',
        path: '/minecraft/worlds',
        category: 'software',
        description: 'Manage Nether, End, and custom dimensions. 1-click import popular custom maps.',
        icon: GlobeAltIcon,
        accentColor: 'from-emerald-500 to-teal-500 text-emerald-400 border-emerald-500/30',
    },

    // Configuration & Networking
    {
        title: 'Server Properties',
        path: '/minecraft/properties',
        category: 'config',
        description: 'Visual editor for server.properties: PvP, difficulty, gamemode, render distance, and seed.',
        icon: AdjustmentsIcon,
        accentColor: 'from-blue-500 to-cyan-500 text-blue-400 border-blue-500/30',
    },
    {
        title: 'MOTD & Icon Studio',
        path: '/minecraft/motd',
        category: 'config',
        description: 'Custom 2-line MOTD with color palette and automatic 64x64 PNG server-icon resizer.',
        icon: PhotographIcon,
        accentColor: 'from-amber-500 to-orange-500 text-amber-400 border-amber-500/30',
        badge: 'Live Preview',
    },
    {
        title: 'Custom Domains',
        path: '/minecraft/domain',
        category: 'config',
        description: 'Connect custom domains and SRV records without needing to expose server ports.',
        icon: GlobeAltIcon,
        accentColor: 'from-teal-500 to-emerald-500 text-teal-400 border-teal-500/30',
    },
    {
        title: 'Bedrock Crossplay',
        path: '/minecraft/geyser',
        category: 'config',
        description: 'Enable GeyserMC & Floodgate so iOS, Android, Xbox, and PS players can join your Java server.',
        icon: ServerIcon,
        accentColor: 'from-green-500 to-emerald-500 text-green-400 border-green-500/30',
        badge: 'GeyserMC',
    },
    {
        title: '3D Live Web Map',
        path: '/minecraft/map',
        category: 'config',
        description: '1-Click install BlueMap or Dynmap with an embedded in-panel 3D world viewer.',
        icon: MapIcon,
        accentColor: 'from-teal-600 to-cyan-600 text-teal-300 border-teal-500/30',
        badge: 'BlueMap',
    },

    // Players & Community
    {
        title: 'Player Manager',
        path: '/minecraft/players',
        category: 'community',
        description: 'View active and offline players, inspect 27-slot NBT inventory, coordinates, and health.',
        icon: UsersIcon,
        accentColor: 'from-blue-500 to-indigo-500 text-blue-400 border-blue-500/30',
        badge: 'NBT Inspector',
    },
    {
        title: 'Moderation & Whitelist',
        path: '/minecraft/moderation',
        category: 'community',
        description: 'Visual whitelist manager, Operator levels (1-4), and Player/IP ban lists with skins.',
        icon: BanIcon,
        accentColor: 'from-rose-500 to-red-500 text-rose-400 border-rose-500/30',
    },
    {
        title: 'Discord & Alerts',
        path: '/minecraft/discord',
        category: 'community',
        description: 'Rich Discord webhooks, live mockup preview, and 1-click DiscordSRV 2-way chat bot.',
        icon: ChatAlt2Icon,
        accentColor: 'from-indigo-600 to-purple-600 text-indigo-400 border-indigo-500/30',
        badge: 'DiscordSRV',
    },

    // Diagnostics & Performance
    {
        title: 'Health & TPS Monitor',
        path: '/minecraft/health',
        category: 'diagnostics',
        description: 'Real-time 20.0 TPS gauge, RAM usage meter, player count sparklines, and performance tips.',
        icon: HeartIcon,
        accentColor: 'from-emerald-500 to-cyan-500 text-emerald-400 border-emerald-500/30',
        badge: 'Live Gauges',
    },
    {
        title: 'Crash Doctor',
        path: '/minecraft/doctor',
        category: 'diagnostics',
        description: 'AI-style log scanner for latest.log: diagnoses Java mismatches, OOM, and corrupted chunks.',
        icon: ShieldCheckIcon,
        accentColor: 'from-rose-600 to-pink-600 text-rose-400 border-rose-500/30',
        badge: 'Auto-Diagnosis',
    },
    {
        title: 'JVM Optimizer',
        path: '/minecraft/optimizer',
        category: 'diagnostics',
        description: 'Apply Aikar\'s Flags to eliminate GC stutter freezes, and tune simulation distances.',
        icon: LightningBoltIcon,
        accentColor: 'from-cyan-500 to-blue-600 text-cyan-400 border-cyan-500/30',
        badge: 'Aikar\'s Flags',
    },
    {
        title: 'DDoS Shield',
        path: '/minecraft/ddos',
        category: 'diagnostics',
        description: 'Anti-bot connection limits, rate limiting, and automated packet filtering protection.',
        icon: ShieldCheckIcon,
        accentColor: 'from-red-500 to-rose-600 text-red-400 border-red-500/30',
        badge: 'L4/L7 Defense',
    },
];

export default () => {
    const server = ServerContext.useStoreState((state) => state.server.data!);
    const { clearFlashes } = useFlash();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [publicStatus, setPublicStatus] = useState<any>(null);
    const [loadingStatus, setLoadingStatus] = useState(true);
    const [copiedIp, setCopiedIp] = useState(false);
    const [copiedBedrock, setCopiedBedrock] = useState(false);

    const primaryAllocation = server.allocations?.[0];
    const serverAddress = primaryAllocation?.alias || primaryAllocation?.ip || 'play.shadowpixel.fun';
    const serverPort = primaryAllocation?.port || 25565;

    useEffect(() => {
        clearFlashes('minecraft-hub');
        fetchLivePing();
    }, [server.uuid]);

    const fetchLivePing = async () => {
        try {
            setLoadingStatus(true);
            const res = await axios.get(`https://api.mcsrvstat.us/2/${encodeURIComponent(serverAddress)}:${serverPort}`, {
                timeout: 6000,
            });
            setPublicStatus(res.data);
        } catch {
            setPublicStatus(null);
        } finally {
            setLoadingStatus(false);
        }
    };

    const handleCopyIp = () => {
        copy(`${serverAddress}:${serverPort}`);
        setCopiedIp(true);
        setTimeout(() => setCopiedIp(false), 2000);
    };

    const handleCopyBedrock = () => {
        copy(`${serverAddress}:19132`);
        setCopiedBedrock(true);
        setTimeout(() => setCopiedBedrock(false), 2000);
    };

    const filteredTools = HUB_TOOLS.filter((t) => {
        const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
            !q ||
            t.title.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q) ||
            t.category.toLowerCase().includes(q);
        return matchesCategory && matchesSearch;
    });

    return (
        <ServerContentBlock title={'Minecraft Control Center'} showFlashKey={'minecraft-hub'}>
            <div className={'flex flex-col gap-6'}>
                {/* Hero Header Command Center */}
                <div className={'relative overflow-hidden rounded-3xl border border-cyan-500/25 bg-gradient-to-b from-[#0e1628] to-[#080d1a] p-6 sm:p-8 shadow-2xl backdrop-blur-xl'}>
                    <div className={'pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl'} />
                    <div className={'pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-indigo-500/15 blur-3xl'} />

                    <div className={'relative flex flex-col md:flex-row md:items-center md:justify-between gap-6'}>
                        <div className={'flex items-start gap-4 sm:gap-5'}>
                            <div className={'flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-xl shadow-cyan-500/30'}>
                                <span className={'text-3xl'}>🎮</span>
                            </div>
                            <div>
                                <div className={'flex flex-wrap items-center gap-2.5'}>
                                    <h1 className={'text-2xl sm:text-3xl font-black tracking-tight text-white'}>
                                        Minecraft Control Center
                                    </h1>
                                    {loadingStatus ? (
                                        <span className={'inline-flex items-center gap-1.5 rounded-full bg-cyan-500/15 px-3 py-0.5 text-xs font-bold text-cyan-400 border border-cyan-500/30'}>
                                            <Spinner size={'small'} />
                                            Checking Ping...
                                        </span>
                                    ) : publicStatus?.online ? (
                                        <span className={'inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3.5 py-1 text-xs font-black text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/20'}>
                                            <span className={'h-2 w-2 rounded-full bg-emerald-400 animate-ping'} />
                                            SERVER ONLINE
                                        </span>
                                    ) : (
                                        <span className={'inline-flex items-center gap-1.5 rounded-full bg-neutral-800 px-3 py-0.5 text-xs font-bold text-neutral-400 border border-neutral-700'}>
                                            STANDBY / OFFLINE
                                        </span>
                                    )}
                                </div>
                                <p className={'mt-1.5 text-xs sm:text-sm text-neutral-400 max-w-2xl leading-relaxed'}>
                                    Welcome to your unified Minecraft management suite. Access 18 specialized tools for modding, performance optimization, moderation, and community connectivity.
                                </p>
                            </div>
                        </div>

                        <div className={'flex flex-wrap items-center gap-2.5 shrink-0'}>
                            <button
                                type={'button'}
                                onClick={handleCopyIp}
                                className={'flex items-center gap-2 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700/80 px-4 py-2.5 text-xs font-mono font-bold text-cyan-300 transition shadow'}
                            >
                                <ClipboardCopyIcon className={'h-4 w-4'} />
                                {copiedIp ? 'Copied Java IP!' : `${serverAddress}:${serverPort}`}
                            </button>
                            <button
                                type={'button'}
                                onClick={handleCopyBedrock}
                                className={'flex items-center gap-2 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700/80 px-4 py-2.5 text-xs font-mono font-bold text-emerald-300 transition shadow'}
                            >
                                <ClipboardCopyIcon className={'h-4 w-4'} />
                                {copiedBedrock ? 'Copied Bedrock!' : 'Port 19132'}
                            </button>
                            <button
                                type={'button'}
                                onClick={fetchLivePing}
                                disabled={loadingStatus}
                                className={'p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition'}
                                title={'Refresh Ping'}
                            >
                                <RefreshIcon className={classNames('h-4 w-4', { 'animate-spin': loadingStatus })} />
                            </button>
                        </div>
                    </div>

                    {/* Quick Stat Cards */}
                    <div className={'grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-neutral-800/80 text-xs'}>
                        <div className={'rounded-2xl bg-neutral-950/60 border border-neutral-800/70 p-3.5 backdrop-blur-sm'}>
                            <span className={'text-neutral-500 block text-[10px] uppercase font-bold tracking-wider'}>Online Players</span>
                            <span className={'text-xl font-black text-white mt-0.5 block'}>
                                {publicStatus?.players ? `${publicStatus.players.online} / ${publicStatus.players.max}` : '0 / 50'}
                            </span>
                        </div>
                        <div className={'rounded-2xl bg-neutral-950/60 border border-neutral-800/70 p-3.5 backdrop-blur-sm'}>
                            <span className={'text-neutral-500 block text-[10px] uppercase font-bold tracking-wider'}>Software Version</span>
                            <span className={'text-xl font-black text-cyan-400 mt-0.5 block truncate'}>
                                {publicStatus?.version || 'Minecraft 1.21'}
                            </span>
                        </div>
                        <div className={'rounded-2xl bg-neutral-950/60 border border-neutral-800/70 p-3.5 backdrop-blur-sm'}>
                            <span className={'text-neutral-500 block text-[10px] uppercase font-bold tracking-wider'}>Active Tools</span>
                            <span className={'text-xl font-black text-indigo-400 mt-0.5 block'}>
                                18 Modules
                            </span>
                        </div>
                        <div className={'rounded-2xl bg-neutral-950/60 border border-neutral-800/70 p-3.5 backdrop-blur-sm'}>
                            <span className={'text-neutral-500 block text-[10px] uppercase font-bold tracking-wider'}>TPS &amp; Stability</span>
                            <span className={'text-xl font-black text-emerald-400 mt-0.5 block'}>
                                20.0 TPS
                            </span>
                        </div>
                    </div>
                </div>

                {/* Filter & Search Controls */}
                <div className={'flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3'}>
                    {/* Category Filter Pills */}
                    <div className={'flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-neutral-900/80 border border-neutral-800 text-xs font-semibold'}>
                        {[
                            { id: 'all', label: 'All Modules (18)' },
                            { id: 'software', label: '⚡ Software & Content (6)' },
                            { id: 'config', label: '⚙️ Configuration (5)' },
                            { id: 'community', label: '👥 Players & Community (3)' },
                            { id: 'diagnostics', label: '🛡️ Health & Security (4)' },
                        ].map((cat) => (
                            <button
                                key={cat.id}
                                type={'button'}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={classNames('px-3.5 py-1.5 rounded-xl transition', {
                                    'bg-cyan-500 text-black font-extrabold shadow': selectedCategory === cat.id,
                                    'text-neutral-400 hover:text-white hover:bg-neutral-800': selectedCategory !== cat.id,
                                })}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* Instant Search Bar */}
                    <div className={'relative w-full sm:w-80'}>
                        <SearchIcon className={'absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500'} />
                        <input
                            type={'text'}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={'Search any tool (mods, whitelist, tps)...'}
                            className={'w-full rounded-2xl bg-neutral-950 border border-neutral-800 pl-10 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:border-cyan-500 focus:outline-none transition'}
                        />
                    </div>
                </div>

                {/* Tools Grid */}
                <div className={'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'}>
                    {filteredTools.map((tool) => {
                        const Icon = tool.icon;
                        return (
                            <Link
                                key={tool.path}
                                to={`/server/${server.id}${tool.path}`}
                                className={'group flex flex-col rounded-2xl border border-neutral-800/80 bg-[#0a0f1d]/80 p-5 backdrop-blur-sm transition-all duration-200 hover:border-cyan-500/40 hover:shadow-xl hover:shadow-cyan-500/5 hover:-translate-y-0.5 justify-between'}
                            >
                                <div>
                                    <div className={'flex items-start justify-between gap-3 mb-3'}>
                                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr ${tool.accentColor} shadow-md`}>
                                            <Icon className={'h-6 w-6 text-white'} />
                                        </div>
                                        {tool.badge && (
                                            <span className={'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-neutral-900 text-neutral-300 border border-neutral-700/80'}>
                                                {tool.badge}
                                            </span>
                                        )}
                                    </div>

                                    <h3 className={'text-sm font-bold text-white group-hover:text-cyan-300 transition'}>
                                        {tool.title}
                                    </h3>
                                    <p className={'text-xs text-neutral-400 mt-1.5 leading-relaxed'}>
                                        {tool.description}
                                    </p>
                                </div>

                                <div className={'mt-4 pt-3 border-t border-neutral-800/70 flex items-center justify-between text-xs font-semibold text-cyan-400 group-hover:text-cyan-300'}>
                                    <span>Launch Module</span>
                                    <ChevronRightIcon className={'h-4 w-4 transform group-hover:translate-x-1 transition'} />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </ServerContentBlock>
    );
};
