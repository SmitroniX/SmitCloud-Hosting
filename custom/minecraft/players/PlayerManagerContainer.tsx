import React, { useEffect, useState } from 'react';
import { ServerContext } from '@/state/server';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import useFlash from '@/plugins/useFlash';
import Spinner from '@/components/elements/Spinner';
import Input from '@/components/elements/Input';
import classNames from 'classnames';
import copy from 'copy-to-clipboard';
import {
    UserGroupIcon,
    ShieldCheckIcon,
    SparklesIcon,
    RefreshIcon,
    TrashIcon,
    CheckCircleIcon,
    BanIcon,
    EyeIcon,
    DuplicateIcon,
    PlusIcon,
} from '@heroicons/react/solid';
import {
    MinecraftPlayer,
    MinecraftBannedIp,
    CachedPlayer,
    LiveServerStatus,
    getUserCache,
    getWhitelist,
    getOperators,
    getBannedPlayers,
    getBannedIps,
    getLiveServerStatus,
    sendServerCommand,
    fetchPlayerProfile,
} from '@/api/server/minecraft/players';
import { PlayerProfileData } from '@/api/server/minecraft/nbtParser';
import PlayerProfileModal from '@/components/server/minecraft/players/PlayerProfileModal';

type FilterTab = 'all' | 'online' | 'offline' | 'ops' | 'whitelist' | 'banned';

export default () => {
    const server = ServerContext.useStoreState((state) => state.server.data);
    const uuid = server?.uuid || '';
    const allocations = server?.allocations || [];
    const defaultAlloc = allocations.find((a) => a.isDefault) || allocations[0];
    const host = defaultAlloc?.alias || defaultAlloc?.ip || 'play.shadowpixel.fun';
    const port = defaultAlloc?.port || 25565;

    const { clearFlashes, clearAndAddHttpError, addFlash } = useFlash();

    const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Raw datasets
    const [cachedPlayers, setCachedPlayers] = useState<CachedPlayer[]>([]);
    const [whitelist, setWhitelist] = useState<MinecraftPlayer[]>([]);
    const [operators, setOperators] = useState<MinecraftPlayer[]>([]);
    const [bannedPlayers, setBannedPlayers] = useState<MinecraftPlayer[]>([]);
    const [bannedIps, setBannedIps] = useState<MinecraftBannedIp[]>([]);
    const [liveStatus, setLiveStatus] = useState<LiveServerStatus>({
        online: false,
        onlinePlayers: 0,
        maxPlayers: 20,
        playerList: [],
    });

    // Profile modal state
    const [profileModalVisible, setProfileModalVisible] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState<PlayerProfileData | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(false);

    // Quick add forms
    const [addUsername, setAddUsername] = useState('');
    const [banReason, setBanReason] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const loadAllData = async () => {
        if (!uuid) return;
        try {
            setLoading(true);
            clearFlashes('players');

            const [cache, wl, ops, bans, ips, live] = await Promise.all([
                getUserCache(uuid),
                getWhitelist(uuid),
                getOperators(uuid),
                getBannedPlayers(uuid),
                getBannedIps(uuid),
                getLiveServerStatus(host, port),
            ]);

            setCachedPlayers(cache);
            setWhitelist(wl);
            setOperators(ops);
            setBannedPlayers(bans);
            setBannedIps(ips);
            setLiveStatus(live);
        } catch (error) {
            clearAndAddHttpError({ error, key: 'players' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAllData();
    }, [uuid]);

    // Build unified player list
    const opUuids = new Set(operators.map((p) => p.uuid));
    const opNames = new Set(operators.map((p) => p.name.toLowerCase()));
    const wlUuids = new Set(whitelist.map((p) => p.uuid));
    const wlNames = new Set(whitelist.map((p) => p.name.toLowerCase()));
    const banUuids = new Set(bannedPlayers.map((p) => p.uuid));
    const banNames = new Set(bannedPlayers.map((p) => p.name.toLowerCase()));
    const onlineUuids = new Set(liveStatus.playerList.map((p) => p.uuid).filter(Boolean));
    const onlineNames = new Set(liveStatus.playerList.map((p) => p.name.toLowerCase()));

    // Merge cached players with whitelisted, ops, bans, and live status
    const playersMap = new Map<string, MinecraftPlayer>();

    cachedPlayers.forEach((cp) => {
        const isOnline = onlineUuids.has(cp.uuid) || onlineNames.has(cp.name.toLowerCase());
        playersMap.set(cp.uuid, {
            uuid: cp.uuid,
            name: cp.name,
            isOnline,
            isOp: opUuids.has(cp.uuid) || opNames.has(cp.name.toLowerCase()),
            isWhitelisted: wlUuids.has(cp.uuid) || wlNames.has(cp.name.toLowerCase()),
            isBanned: banUuids.has(cp.uuid) || banNames.has(cp.name.toLowerCase()),
        });
    });

    // Also include any live online players not yet in cache
    liveStatus.playerList.forEach((lp) => {
        const key = lp.uuid || lp.name;
        if (!playersMap.has(key)) {
            playersMap.set(key, {
                uuid: lp.uuid,
                name: lp.name,
                isOnline: true,
                isOp: (lp.uuid && opUuids.has(lp.uuid)) || opNames.has(lp.name.toLowerCase()),
                isWhitelisted: (lp.uuid && wlUuids.has(lp.uuid)) || wlNames.has(lp.name.toLowerCase()),
                isBanned: (lp.uuid && banUuids.has(lp.uuid)) || banNames.has(lp.name.toLowerCase()),
            });
        } else {
            playersMap.get(key)!.isOnline = true;
        }
    });

    // Also include any operators not yet in cache
    operators.forEach((op) => {
        const key = op.uuid || op.name;
        if (!playersMap.has(key)) {
            playersMap.set(key, { ...op, isOp: true });
        }
    });

    // Also include whitelisted not yet in cache
    whitelist.forEach((wl) => {
        const key = wl.uuid || wl.name;
        if (!playersMap.has(key)) {
            playersMap.set(key, { ...wl, isWhitelisted: true });
        }
    });

    // Also include banned
    bannedPlayers.forEach((bp) => {
        const key = bp.uuid || bp.name;
        if (!playersMap.has(key)) {
            playersMap.set(key, { ...bp, isBanned: true });
        }
    });

    const allPlayersList = Array.from(playersMap.values());

    // Filter players based on tab
    const filteredPlayers = allPlayersList.filter((p) => {
        const matchesSearch =
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.uuid && p.uuid.toLowerCase().includes(searchQuery.toLowerCase()));

        if (!matchesSearch) return false;

        switch (activeFilter) {
            case 'online':
                return !!p.isOnline;
            case 'offline':
                return !p.isOnline;
            case 'ops':
                return !!p.isOp;
            case 'whitelist':
                return !!p.isWhitelisted;
            case 'banned':
                return !!p.isBanned;
            default:
                return true;
        }
    });

    const handleInspect = async (player: MinecraftPlayer) => {
        const playerUuid = player.uuid || player.name;
        setSelectedProfile(null);
        setLoadingProfile(true);
        setProfileModalVisible(true);

        try {
            const profile = await fetchPlayerProfile(uuid, playerUuid, player.name, !!player.isOnline);
            setSelectedProfile(profile);
        } catch {
            // fallback profile
            setSelectedProfile({
                uuid: playerUuid,
                name: player.name,
                isOnline: !!player.isOnline,
                dimension: 'minecraft:overworld',
                pos: [0, 64, 0],
                rotation: [0, 0],
                health: 20,
                maxHealth: 20,
                foodLevel: 20,
                foodSaturationLevel: 5,
                xpLevel: 0,
                xpProgress: 0,
                gameMode: 0,
                inventory: [],
                enderItems: [],
            });
        } finally {
            setLoadingProfile(false);
        }
    };

    const handleCommand = async (cmd: string, successMessage: string) => {
        try {
            setActionLoading(cmd);
            await sendServerCommand(uuid, cmd);
            addFlash({
                key: 'players',
                type: 'success',
                message: successMessage,
            });
            await loadAllData();
        } catch (error) {
            clearAndAddHttpError({ error, key: 'players' });
        } finally {
            setActionLoading(null);
        }
    };

    const handleToggleOp = (player: MinecraftPlayer) => {
        if (player.isOp) {
            handleCommand(`deop ${player.name}`, `Revoked operator status from ${player.name}.`);
        } else {
            handleCommand(`op ${player.name}`, `Granted operator status to ${player.name}!`);
        }
    };

    const handleToggleWhitelist = (player: MinecraftPlayer) => {
        if (player.isWhitelisted) {
            handleCommand(`whitelist remove ${player.name}`, `Removed ${player.name} from whitelist.`);
        } else {
            handleCommand(`whitelist add ${player.name}`, `Added ${player.name} to whitelist!`);
        }
    };

    const handleBanPlayer = (player: MinecraftPlayer) => {
        const reason = prompt(`Enter ban reason for ${player.name}:`, 'Rule violation');
        if (reason === null) return;
        handleCommand(`ban ${player.name} ${reason}`, `Banned ${player.name} from the server.`);
    };

    const handlePardonPlayer = (player: MinecraftPlayer) => {
        handleCommand(`pardon ${player.name}`, `Pardoned ${player.name}.`);
    };

    const handleAddManualPlayer = (actionType: 'whitelist' | 'op' | 'ban') => {
        const clean = addUsername.trim();
        if (!clean) return alert('Please enter a valid player username.');

        if (actionType === 'whitelist') {
            handleCommand(`whitelist add ${clean}`, `Added ${clean} to whitelist.`);
        } else if (actionType === 'op') {
            handleCommand(`op ${clean}`, `Promoted ${clean} to Operator.`);
        } else {
            handleCommand(`ban ${clean} ${banReason || 'Banned by Administrator'}`, `Banned ${clean}.`);
        }
        setAddUsername('');
        setBanReason('');
    };

    return (
        <ServerContentBlock title={'Player Manager'} showFlashKey={'players'}>
            <div className={'flex flex-col gap-6'}>
                {/* Hero Header Card */}
                <div className={'relative overflow-hidden rounded-2xl border border-cyan-500/25 bg-[#0a0f1d]/90 p-6 shadow-2xl backdrop-blur-xl'}>
                    <div className={'pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl'} />
                    <div className={'pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl'} />

                    <div className={'relative flex flex-col md:flex-row md:items-center md:justify-between gap-6'}>
                        <div className={'flex items-start gap-4'}>
                            <div className={'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-500 shadow-lg shadow-cyan-500/25 text-white'}>
                                <UserGroupIcon className={'h-7 w-7'} />
                            </div>
                            <div>
                                <div className={'flex flex-wrap items-center gap-2'}>
                                    <h1 className={'text-xl sm:text-2xl font-black tracking-tight text-white'}>
                                        Player Manager &amp; Inventory Inspector
                                    </h1>
                                    <span className={'inline-flex items-center gap-1.5 rounded-full bg-cyan-500/15 px-3 py-0.5 text-xs font-bold text-cyan-400 border border-cyan-500/30'}>
                                        <SparklesIcon className={'h-3.5 w-3.5'} />
                                        NBT INSPECTOR ACTIVE
                                    </span>
                                </div>
                                <p className={'mt-1 text-xs sm:text-sm text-neutral-400'}>
                                    View active &amp; offline players, inspect live coordinates, armor, and inventory items, and execute real-time administrative commands.
                                </p>
                            </div>
                        </div>

                        <div className={'flex flex-wrap items-center gap-3 shrink-0'}>
                            <div className={'flex items-center gap-2 rounded-xl bg-neutral-900/90 border border-neutral-800 px-3.5 py-2 text-xs'}>
                                <span className={classNames('h-2.5 w-2.5 rounded-full', {
                                    'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]': liveStatus.online,
                                    'bg-red-500': !liveStatus.online,
                                })} />
                                <span className={'font-bold text-white'}>
                                    {liveStatus.online ? `${liveStatus.onlinePlayers} / ${liveStatus.maxPlayers} Online` : 'Server Offline'}
                                </span>
                            </div>

                            <button
                                type={'button'}
                                onClick={loadAllData}
                                disabled={loading}
                                className={'flex items-center gap-1.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 px-3.5 py-2 text-xs font-medium text-neutral-300 border border-neutral-700/60 transition'}
                            >
                                <RefreshIcon className={classNames('h-3.5 w-3.5', { 'animate-spin': loading })} />
                                Refresh
                            </button>
                        </div>
                    </div>

                    {/* Quick Stats Counter Strip */}
                    <div className={'grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-5 border-t border-neutral-800/80 text-xs'}>
                        <div className={'rounded-xl bg-neutral-900/60 border border-neutral-800/70 p-3'}>
                            <span className={'text-neutral-500 block text-[10px] uppercase font-bold'}>Online Now</span>
                            <span className={'text-xl font-black text-emerald-400 mt-0.5 block'}>{liveStatus.online ? liveStatus.onlinePlayers : 0}</span>
                        </div>
                        <div className={'rounded-xl bg-neutral-900/60 border border-neutral-800/70 p-3'}>
                            <span className={'text-neutral-500 block text-[10px] uppercase font-bold'}>Registered Players</span>
                            <span className={'text-xl font-black text-white mt-0.5 block'}>{cachedPlayers.length}</span>
                        </div>
                        <div className={'rounded-xl bg-neutral-900/60 border border-neutral-800/70 p-3'}>
                            <span className={'text-neutral-500 block text-[10px] uppercase font-bold'}>Server Operators</span>
                            <span className={'text-xl font-black text-cyan-400 mt-0.5 block'}>{operators.length}</span>
                        </div>
                        <div className={'rounded-xl bg-neutral-900/60 border border-neutral-800/70 p-3'}>
                            <span className={'text-neutral-500 block text-[10px] uppercase font-bold'}>Whitelisted</span>
                            <span className={'text-xl font-black text-emerald-400 mt-0.5 block'}>{whitelist.length}</span>
                        </div>
                        <div className={'rounded-xl bg-neutral-900/60 border border-neutral-800/70 p-3'}>
                            <span className={'text-neutral-500 block text-[10px] uppercase font-bold'}>Banned Entries</span>
                            <span className={'text-xl font-black text-red-400 mt-0.5 block'}>{bannedPlayers.length + bannedIps.length}</span>
                        </div>
                    </div>
                </div>

                {/* Toolbar: Filter Tabs & Search */}
                <div className={'flex flex-col sm:flex-row sm:items-center justify-between gap-4'}>
                    <div className={'flex flex-wrap items-center gap-1.5'}>
                        {[
                            { id: 'all' as FilterTab, label: 'All Players', count: allPlayersList.length },
                            { id: 'online' as FilterTab, label: '🟢 Online', count: allPlayersList.filter((p) => p.isOnline).length },
                            { id: 'offline' as FilterTab, label: '⚪ Offline', count: allPlayersList.filter((p) => !p.isOnline).length },
                            { id: 'ops' as FilterTab, label: '⭐ Operators', count: operators.length },
                            { id: 'whitelist' as FilterTab, label: '📋 Whitelist', count: whitelist.length },
                            { id: 'banned' as FilterTab, label: '🚫 Banned', count: bannedPlayers.length + bannedIps.length },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                type={'button'}
                                onClick={() => setActiveFilter(tab.id)}
                                className={classNames('px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5', {
                                    'bg-cyan-600 text-white shadow-md shadow-cyan-600/20 font-bold': activeFilter === tab.id,
                                    'bg-neutral-900/60 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800': activeFilter !== tab.id,
                                })}
                            >
                                <span>{tab.label}</span>
                                <span className={'rounded-md bg-neutral-800/80 px-1.5 py-0.2 text-[10px]'}>{tab.count}</span>
                            </button>
                        ))}
                    </div>

                    <div className={'w-full sm:w-64'}>
                        <Input
                            placeholder={'Search username or UUID...'}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Quick Add Player / Whitelist / OP Drawer */}
                <div className={'rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4 backdrop-blur-md'}>
                    <div className={'flex flex-col sm:flex-row sm:items-center gap-3'}>
                        <input
                            type={'text'}
                            placeholder={'Enter Minecraft player username (e.g. Steve)'}
                            value={addUsername}
                            onChange={(e) => setAddUsername(e.target.value)}
                            className={'flex-1 rounded-xl bg-neutral-950 border border-neutral-700/80 p-2 text-xs text-white placeholder-neutral-500'}
                        />
                        <div className={'flex flex-wrap items-center gap-2'}>
                            <button
                                type={'button'}
                                onClick={() => handleAddManualPlayer('whitelist')}
                                className={'flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-xs font-bold text-white transition'}
                            >
                                <PlusIcon className={'h-3.5 w-3.5'} />
                                + Whitelist
                            </button>
                            <button
                                type={'button'}
                                onClick={() => handleAddManualPlayer('op')}
                                className={'flex items-center gap-1 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-3 py-2 text-xs font-bold text-white transition'}
                            >
                                <ShieldCheckIcon className={'h-3.5 w-3.5'} />
                                + Operator (OP)
                            </button>
                            <button
                                type={'button'}
                                onClick={() => handleAddManualPlayer('ban')}
                                className={'flex items-center gap-1 rounded-xl bg-red-600 hover:bg-red-500 px-3 py-2 text-xs font-bold text-white transition'}
                            >
                                <BanIcon className={'h-3.5 w-3.5'} />
                                + Ban
                            </button>
                        </div>
                    </div>
                </div>

                {/* Player Grid */}
                {loading ? (
                    <div className={'py-16 flex justify-center'}>
                        <Spinner size={'large'} centered />
                    </div>
                ) : filteredPlayers.length === 0 ? (
                    <div className={'rounded-2xl border border-neutral-800 bg-neutral-900/40 p-12 text-center text-neutral-400 text-sm'}>
                        No players matching the selected filter.
                    </div>
                ) : (
                    <div className={'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'}>
                        {filteredPlayers.map((player) => (
                            <div
                                key={player.uuid || player.name}
                                className={'group relative rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4 transition duration-200 hover:border-cyan-500/40 hover:bg-neutral-900/90 backdrop-blur-md flex flex-col justify-between shadow-lg'}
                            >
                                <div>
                                    <div className={'flex items-start gap-3'}>
                                        {/* Player Avatar */}
                                        <div className={'relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-neutral-950 border border-neutral-800 shadow-md'}>
                                            <img
                                                src={`https://mc-heads.net/avatar/${player.uuid || player.name}/48`}
                                                alt={player.name}
                                                className={'h-10 w-10 rounded-lg object-contain'}
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = `https://minotar.net/avatar/${player.name}/48.png`;
                                                }}
                                            />
                                            {/* Online status indicator */}
                                            <span
                                                className={classNames('absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-neutral-900', {
                                                    'bg-emerald-400 animate-pulse': player.isOnline,
                                                    'bg-neutral-600': !player.isOnline,
                                                })}
                                                title={player.isOnline ? 'Online' : 'Offline'}
                                            />
                                        </div>

                                        <div className={'min-w-0 flex-1'}>
                                            <div className={'flex items-center gap-1.5'}>
                                                <h3 className={'truncate font-bold text-white text-sm'}>
                                                    {player.name}
                                                </h3>
                                                {player.name.startsWith('.') || player.name.startsWith('*') ? (
                                                    <span className={'rounded bg-blue-500/20 px-1 py-0.2 text-[9px] font-bold text-blue-400 border border-blue-500/30'}>
                                                        BEDROCK
                                                    </span>
                                                ) : null}
                                            </div>

                                            <p className={'truncate text-[10px] text-neutral-500 font-mono mt-0.5'}>
                                                {player.uuid || 'Offline Account'}
                                            </p>

                                            {/* Badges */}
                                            <div className={'mt-2 flex flex-wrap gap-1 text-[10px]'}>
                                                {player.isOp && (
                                                    <span className={'rounded bg-cyan-500/15 px-1.5 py-0.5 font-bold text-cyan-400 border border-cyan-500/25'}>
                                                        ⭐ OP
                                                    </span>
                                                )}
                                                {player.isWhitelisted && (
                                                    <span className={'rounded bg-emerald-500/15 px-1.5 py-0.5 font-bold text-emerald-400 border border-emerald-500/25'}>
                                                        📋 Whitelist
                                                    </span>
                                                )}
                                                {player.isBanned && (
                                                    <span className={'rounded bg-red-500/15 px-1.5 py-0.5 font-bold text-red-400 border border-red-500/25'}>
                                                        🚫 Banned
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions Footer */}
                                <div className={'mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between gap-2'}>
                                    <button
                                        type={'button'}
                                        onClick={() => handleInspect(player)}
                                        className={'flex items-center gap-1 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-cyan-600/20 transition'}
                                    >
                                        <EyeIcon className={'h-3.5 w-3.5'} />
                                        Inspect Profile
                                    </button>

                                    <div className={'flex items-center gap-1.5'}>
                                        {/* Toggle OP */}
                                        <button
                                            type={'button'}
                                            onClick={() => handleToggleOp(player)}
                                            title={player.isOp ? 'De-OP' : 'Make Operator'}
                                            className={classNames('p-1.5 rounded-lg text-xs transition', {
                                                'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30': player.isOp,
                                                'bg-neutral-800 text-neutral-400 hover:text-white': !player.isOp,
                                            })}
                                        >
                                            <ShieldCheckIcon className={'h-4 w-4'} />
                                        </button>

                                        {/* Toggle Whitelist */}
                                        <button
                                            type={'button'}
                                            onClick={() => handleToggleWhitelist(player)}
                                            title={player.isWhitelisted ? 'Remove from Whitelist' : 'Add to Whitelist'}
                                            className={classNames('p-1.5 rounded-lg text-xs transition', {
                                                'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30': player.isWhitelisted,
                                                'bg-neutral-800 text-neutral-400 hover:text-white': !player.isWhitelisted,
                                            })}
                                        >
                                            <CheckCircleIcon className={'h-4 w-4'} />
                                        </button>

                                        {/* Ban / Pardon */}
                                        {player.isBanned ? (
                                            <button
                                                type={'button'}
                                                onClick={() => handlePardonPlayer(player)}
                                                title={'Pardon / Unban'}
                                                className={'p-1.5 rounded-lg bg-red-950/40 text-emerald-400 hover:bg-emerald-950/40 transition'}
                                            >
                                                Unban
                                            </button>
                                        ) : (
                                            <button
                                                type={'button'}
                                                onClick={() => handleBanPlayer(player)}
                                                title={'Ban Player'}
                                                className={'p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-950/30 transition'}
                                            >
                                                <BanIcon className={'h-4 w-4'} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Banned IPs list if in banned tab */}
                {activeFilter === 'banned' && bannedIps.length > 0 && (
                    <div className={'rounded-2xl border border-red-900/40 bg-red-950/10 p-5 mt-4'}>
                        <h2 className={'text-sm font-bold text-red-400 flex items-center gap-2 mb-3'}>
                            <BanIcon className={'h-4 w-4'} />
                            Banned IP Addresses ({bannedIps.length})
                        </h2>
                        <div className={'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2'}>
                            {bannedIps.map((ip) => (
                                <div
                                    key={ip.ip}
                                    className={'flex items-center justify-between rounded-xl border border-red-900/30 bg-neutral-900/90 p-2.5'}
                                >
                                    <div>
                                        <p className={'font-mono text-xs text-white font-bold'}>{ip.ip}</p>
                                        <p className={'text-[10px] text-neutral-500'}>{ip.reason || 'Banned IP'}</p>
                                    </div>
                                    <button
                                        type={'button'}
                                        onClick={() => handleCommand(`pardon-ip ${ip.ip}`, `Unbanned IP ${ip.ip}`)}
                                        className={'text-xs text-emerald-400 hover:text-emerald-300 font-semibold'}
                                    >
                                        Unban
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Interactive Player Profile & Inventory Modal */}
            <PlayerProfileModal
                visible={profileModalVisible}
                onDismiss={() => setProfileModalVisible(false)}
                serverUuid={uuid}
                profile={selectedProfile}
                loading={loadingProfile}
                onActionSuccess={(msg) => {
                    addFlash({ key: 'players', type: 'success', message: msg });
                }}
            />
        </ServerContentBlock>
    );
};
