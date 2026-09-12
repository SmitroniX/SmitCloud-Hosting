import React, { useEffect, useState } from 'react';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { ServerContext } from '@/state/server';
import useFlash from '@/plugins/useFlash';
import Spinner from '@/components/elements/Spinner';
import Input from '@/components/elements/Input';
import classNames from 'classnames';
import {
    ShieldCheckIcon,
    UserAddIcon,
    TrashIcon,
    CheckCircleIcon,
    RefreshIcon,
    BanIcon,
    KeyIcon,
    UsersIcon,
    SparklesIcon,
} from '@heroicons/react/solid';
import {
    ModerationData,
    WhitelistEntry,
    OpEntry,
    BannedPlayerEntry,
    BannedIpEntry,
    fetchModerationData,
    toggleWhitelist,
    saveWhitelist,
    saveOps,
    saveBannedPlayers,
    saveBannedIps,
    resolvePlayerUuid,
} from '@/api/server/minecraft/moderation';

type ModTab = 'whitelist' | 'ops' | 'banned_players' | 'banned_ips';

export default () => {
    const server = ServerContext.useStoreState((state) => state.server.data!);
    const { clearFlashes, clearAndAddHttpError, addFlash } = useFlash();

    const [activeTab, setActiveTab] = useState<ModTab>('whitelist');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const [data, setData] = useState<ModerationData>({
        whitelistEnabled: false,
        whitelist: [],
        ops: [],
        bannedPlayers: [],
        bannedIps: [],
    });

    // Inputs
    const [newUsername, setNewUsername] = useState('');
    const [newOpLevel, setNewOpLevel] = useState<number>(4);
    const [banReason, setBanReason] = useState('Banned by an administrator.');
    const [newIp, setNewIp] = useState('');

    useEffect(() => {
        loadData();
    }, [server.uuid]);

    const loadData = async () => {
        try {
            setLoading(true);
            clearFlashes('moderation');
            const modData = await fetchModerationData(server.uuid);
            setData(modData);
        } catch (error) {
            clearAndAddHttpError({ error, key: 'moderation' });
        } finally {
            setLoading(false);
        }
    };

    const handleToggleWhitelist = async () => {
        try {
            setActionLoading(true);
            clearFlashes('moderation');
            const next = !data.whitelistEnabled;
            await toggleWhitelist(server.uuid, next);
            setData((prev) => ({ ...prev, whitelistEnabled: next }));
            addFlash({
                key: 'moderation',
                type: 'success',
                message: `✅ Whitelist is now ${next ? 'enabled' : 'disabled'} in server.properties!`,
            });
        } catch (error) {
            clearAndAddHttpError({ error, key: 'moderation' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleAddWhitelist = async () => {
        if (!newUsername.trim()) return;
        try {
            setActionLoading(true);
            clearFlashes('moderation');
            const resolved = await resolvePlayerUuid(newUsername.trim());
            const uuid = resolved ? resolved.uuid : `custom-${Date.now()}`;
            const name = resolved ? resolved.name : newUsername.trim();

            if (data.whitelist.some((w) => w.name.toLowerCase() === name.toLowerCase())) {
                alert('Player is already in the whitelist.');
                return;
            }

            const updated = [...data.whitelist, { uuid, name }];
            await saveWhitelist(server.uuid, updated);
            setData((prev) => ({ ...prev, whitelist: updated }));
            setNewUsername('');
            addFlash({
                key: 'moderation',
                type: 'success',
                message: `✅ Added ${name} to whitelist!`,
            });
        } catch (error) {
            clearAndAddHttpError({ error, key: 'moderation' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleRemoveWhitelist = async (entry: WhitelistEntry) => {
        try {
            setActionLoading(true);
            clearFlashes('moderation');
            const updated = data.whitelist.filter((w) => w.uuid !== entry.uuid);
            await saveWhitelist(server.uuid, updated);
            setData((prev) => ({ ...prev, whitelist: updated }));
            addFlash({
                key: 'moderation',
                type: 'success',
                message: `Removed ${entry.name} from whitelist.`,
            });
        } catch (error) {
            clearAndAddHttpError({ error, key: 'moderation' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleAddOp = async () => {
        if (!newUsername.trim()) return;
        try {
            setActionLoading(true);
            clearFlashes('moderation');
            const resolved = await resolvePlayerUuid(newUsername.trim());
            const uuid = resolved ? resolved.uuid : `custom-${Date.now()}`;
            const name = resolved ? resolved.name : newUsername.trim();

            const filtered = data.ops.filter((o) => o.name.toLowerCase() !== name.toLowerCase());
            const updated = [...filtered, { uuid, name, level: newOpLevel, bypassesPlayerLimit: false }];
            await saveOps(server.uuid, updated);
            setData((prev) => ({ ...prev, ops: updated }));
            setNewUsername('');
            addFlash({
                key: 'moderation',
                type: 'success',
                message: `✅ Granted OP (Level ${newOpLevel}) to ${name}!`,
            });
        } catch (error) {
            clearAndAddHttpError({ error, key: 'moderation' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleRemoveOp = async (entry: OpEntry) => {
        try {
            setActionLoading(true);
            clearFlashes('moderation');
            const updated = data.ops.filter((o) => o.uuid !== entry.uuid);
            await saveOps(server.uuid, updated);
            setData((prev) => ({ ...prev, ops: updated }));
            addFlash({
                key: 'moderation',
                type: 'success',
                message: `Revoked operator privileges from ${entry.name}.`,
            });
        } catch (error) {
            clearAndAddHttpError({ error, key: 'moderation' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleBanPlayer = async () => {
        if (!newUsername.trim()) return;
        try {
            setActionLoading(true);
            clearFlashes('moderation');
            const resolved = await resolvePlayerUuid(newUsername.trim());
            const uuid = resolved ? resolved.uuid : `custom-${Date.now()}`;
            const name = resolved ? resolved.name : newUsername.trim();

            const updated = [
                ...data.bannedPlayers.filter((b) => b.name.toLowerCase() !== name.toLowerCase()),
                {
                    uuid,
                    name,
                    created: new Date().toISOString(),
                    source: 'SmitCloud Panel',
                    expires: 'forever',
                    reason: banReason.trim() || 'Banned by an operator.',
                },
            ];

            await saveBannedPlayers(server.uuid, updated);
            setData((prev) => ({ ...prev, bannedPlayers: updated }));
            setNewUsername('');
            addFlash({
                key: 'moderation',
                type: 'success',
                message: `⛔ Banned ${name} from the server!`,
            });
        } catch (error) {
            clearAndAddHttpError({ error, key: 'moderation' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleUnbanPlayer = async (entry: BannedPlayerEntry) => {
        try {
            setActionLoading(true);
            clearFlashes('moderation');
            const updated = data.bannedPlayers.filter((b) => b.uuid !== entry.uuid);
            await saveBannedPlayers(server.uuid, updated);
            setData((prev) => ({ ...prev, bannedPlayers: updated }));
            addFlash({
                key: 'moderation',
                type: 'success',
                message: `Unbanned ${entry.name}.`,
            });
        } catch (error) {
            clearAndAddHttpError({ error, key: 'moderation' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleBanIp = async () => {
        if (!newIp.trim()) return;
        try {
            setActionLoading(true);
            clearFlashes('moderation');
            const updated = [
                ...data.bannedIps.filter((b) => b.ip !== newIp.trim()),
                {
                    ip: newIp.trim(),
                    created: new Date().toISOString(),
                    source: 'SmitCloud Panel',
                    expires: 'forever',
                    reason: banReason.trim() || 'IP Banned by administrator.',
                },
            ];
            await saveBannedIps(server.uuid, updated);
            setData((prev) => ({ ...prev, bannedIps: updated }));
            setNewIp('');
            addFlash({
                key: 'moderation',
                type: 'success',
                message: `⛔ Banned IP ${newIp.trim()}!`,
            });
        } catch (error) {
            clearAndAddHttpError({ error, key: 'moderation' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleUnbanIp = async (entry: BannedIpEntry) => {
        try {
            setActionLoading(true);
            clearFlashes('moderation');
            const updated = data.bannedIps.filter((b) => b.ip !== entry.ip);
            await saveBannedIps(server.uuid, updated);
            setData((prev) => ({ ...prev, bannedIps: updated }));
            addFlash({
                key: 'moderation',
                type: 'success',
                message: `Unbanned IP ${entry.ip}.`,
            });
        } catch (error) {
            clearAndAddHttpError({ error, key: 'moderation' });
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <ServerContentBlock title={'Whitelist & Moderation Manager'} showFlashKey={'moderation'}>
            <div className={'flex flex-col gap-6'}>
                {/* Header Banner */}
                <div className={'relative overflow-hidden rounded-2xl border border-blue-500/25 bg-[#0a0f1d]/90 p-6 shadow-2xl backdrop-blur-xl'}>
                    <div className={'pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl'} />
                    <div className={'pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl'} />

                    <div className={'relative flex flex-col md:flex-row md:items-center md:justify-between gap-6'}>
                        <div className={'flex items-start gap-4'}>
                            <div className={'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/25 text-white'}>
                                <ShieldCheckIcon className={'h-7 w-7'} />
                            </div>
                            <div>
                                <div className={'flex flex-wrap items-center gap-2'}>
                                    <h1 className={'text-xl sm:text-2xl font-black tracking-tight text-white'}>
                                        Moderation &amp; Whitelist Hub
                                    </h1>
                                    <span className={'inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 px-3 py-0.5 text-xs font-bold text-blue-400 border border-blue-500/30'}>
                                        <SparklesIcon className={'h-3.5 w-3.5'} />
                                        PERMISSIONS &amp; ACCESS
                                    </span>
                                </div>
                                <p className={'mt-1 text-xs sm:text-sm text-neutral-400'}>
                                    Manage your whitelist, operators (ops.json), banned players, and IP bans visually without typing console commands.
                                </p>
                            </div>
                        </div>

                        <div className={'flex items-center gap-3 shrink-0'}>
                            <button
                                type={'button'}
                                onClick={handleToggleWhitelist}
                                disabled={actionLoading}
                                className={classNames('px-4 py-2 rounded-xl text-xs font-bold transition shadow', {
                                    'bg-emerald-600 hover:bg-emerald-500 text-white': !data.whitelistEnabled,
                                    'bg-amber-600 hover:bg-amber-500 text-white': data.whitelistEnabled,
                                })}
                            >
                                {data.whitelistEnabled ? 'Disable Whitelist' : 'Enable Whitelist'}
                            </button>
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

                    {/* Stats Strip */}
                    <div className={'grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-neutral-800/80 text-xs'}>
                        <div className={'rounded-xl bg-neutral-900/60 border border-neutral-800/70 p-3'}>
                            <span className={'text-neutral-500 block text-[10px] uppercase font-bold'}>Whitelist Status</span>
                            <span className={classNames('text-sm font-black mt-0.5 block', data.whitelistEnabled ? 'text-emerald-400' : 'text-neutral-400')}>
                                {data.whitelistEnabled ? '🟢 Enforced' : '⚪ Open / Disabled'}
                            </span>
                        </div>
                        <div className={'rounded-xl bg-neutral-900/60 border border-neutral-800/70 p-3'}>
                            <span className={'text-neutral-500 block text-[10px] uppercase font-bold'}>Whitelisted</span>
                            <span className={'text-sm font-black text-white mt-0.5 block'}>{data.whitelist.length} players</span>
                        </div>
                        <div className={'rounded-xl bg-neutral-900/60 border border-neutral-800/70 p-3'}>
                            <span className={'text-neutral-500 block text-[10px] uppercase font-bold'}>Operators (OP)</span>
                            <span className={'text-sm font-black text-blue-400 mt-0.5 block'}>{data.ops.length} operators</span>
                        </div>
                        <div className={'rounded-xl bg-neutral-900/60 border border-neutral-800/70 p-3'}>
                            <span className={'text-neutral-500 block text-[10px] uppercase font-bold'}>Total Bans</span>
                            <span className={'text-sm font-black text-rose-400 mt-0.5 block'}>
                                {data.bannedPlayers.length + data.bannedIps.length} entries
                            </span>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className={'flex flex-wrap items-center gap-2 border-b border-neutral-800 pb-3 text-sm font-semibold'}>
                    <button
                        type={'button'}
                        onClick={() => setActiveTab('whitelist')}
                        className={classNames('flex items-center gap-2 px-4 py-2 rounded-xl transition', {
                            'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25': activeTab === 'whitelist',
                            'text-neutral-400 hover:text-white hover:bg-neutral-800': activeTab !== 'whitelist',
                        })}
                    >
                        <UsersIcon className={'h-4 w-4'} />
                        Whitelist ({data.whitelist.length})
                    </button>
                    <button
                        type={'button'}
                        onClick={() => setActiveTab('ops')}
                        className={classNames('flex items-center gap-2 px-4 py-2 rounded-xl transition', {
                            'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25': activeTab === 'ops',
                            'text-neutral-400 hover:text-white hover:bg-neutral-800': activeTab !== 'ops',
                        })}
                    >
                        <KeyIcon className={'h-4 w-4 text-amber-400'} />
                        Operators ({data.ops.length})
                    </button>
                    <button
                        type={'button'}
                        onClick={() => setActiveTab('banned_players')}
                        className={classNames('flex items-center gap-2 px-4 py-2 rounded-xl transition', {
                            'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25': activeTab === 'banned_players',
                            'text-neutral-400 hover:text-white hover:bg-neutral-800': activeTab !== 'banned_players',
                        })}
                    >
                        <BanIcon className={'h-4 w-4 text-rose-400'} />
                        Banned Players ({data.bannedPlayers.length})
                    </button>
                    <button
                        type={'button'}
                        onClick={() => setActiveTab('banned_ips')}
                        className={classNames('flex items-center gap-2 px-4 py-2 rounded-xl transition', {
                            'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25': activeTab === 'banned_ips',
                            'text-neutral-400 hover:text-white hover:bg-neutral-800': activeTab !== 'banned_ips',
                        })}
                    >
                        <ShieldCheckIcon className={'h-4 w-4 text-purple-400'} />
                        IP Bans ({data.bannedIps.length})
                    </button>
                </div>

                {loading ? (
                    <div className={'py-16 text-center'}>
                        <Spinner size={'large'} centered />
                    </div>
                ) : (
                    <div className={'flex flex-col gap-5'}>
                        {/* TAB 1: Whitelist */}
                        {activeTab === 'whitelist' && (
                            <div className={'flex flex-col gap-4'}>
                                <div className={'flex flex-col sm:flex-row gap-3'}>
                                    <div className={'flex-1'}>
                                        <Input
                                            placeholder={'Enter Minecraft username (e.g. Steve)...'}
                                            value={newUsername}
                                            onChange={(e) => setNewUsername(e.target.value)}
                                        />
                                    </div>
                                    <button
                                        type={'button'}
                                        disabled={actionLoading || !newUsername.trim()}
                                        onClick={handleAddWhitelist}
                                        className={'flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-5 py-2.5 text-xs font-bold text-white shadow transition'}
                                    >
                                        <UserAddIcon className={'h-4 w-4'} />
                                        Add to Whitelist
                                    </button>
                                </div>

                                <div className={'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3'}>
                                    {data.whitelist.map((w) => (
                                        <div
                                            key={w.uuid}
                                            className={'flex items-center justify-between p-3 rounded-xl border border-neutral-800 bg-[#0a0f1d]/80 backdrop-blur-sm'}
                                        >
                                            <div className={'flex items-center gap-3 min-w-0'}>
                                                <img
                                                    src={`https://mc-heads.net/avatar/${encodeURIComponent(w.name)}/40.png`}
                                                    alt={w.name}
                                                    className={'h-8 w-8 rounded bg-neutral-800 shrink-0'}
                                                    onError={(e: any) => {
                                                        e.target.src = 'https://mc-heads.net/avatar/Steve/40.png';
                                                    }}
                                                />
                                                <div className={'min-w-0'}>
                                                    <p className={'text-xs font-bold text-white truncate'}>{w.name}</p>
                                                    <p className={'text-[10px] font-mono text-neutral-500 truncate'}>{w.uuid}</p>
                                                </div>
                                            </div>
                                            <button
                                                type={'button'}
                                                onClick={() => handleRemoveWhitelist(w)}
                                                className={'p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition'}
                                                title={'Remove from Whitelist'}
                                            >
                                                <TrashIcon className={'h-3.5 w-3.5'} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* TAB 2: Operators */}
                        {activeTab === 'ops' && (
                            <div className={'flex flex-col gap-4'}>
                                <div className={'flex flex-col sm:flex-row gap-3'}>
                                    <div className={'flex-1'}>
                                        <Input
                                            placeholder={'Enter username for Operator status...'}
                                            value={newUsername}
                                            onChange={(e) => setNewUsername(e.target.value)}
                                        />
                                    </div>
                                    <select
                                        value={newOpLevel}
                                        onChange={(e) => setNewOpLevel(parseInt(e.target.value, 10))}
                                        className={'rounded-xl bg-neutral-900 border border-neutral-700 px-3 py-2 text-xs text-white'}
                                    >
                                        <option value={4}>Level 4 — Server Administrator (Full Stop / Reload)</option>
                                        <option value={3}>Level 3 — Moderator (Ban / Kick / Op others)</option>
                                        <option value={2}>Level 2 — Game Master (Gamemode / Give / Teleport)</option>
                                        <option value={1}>Level 1 — Spawn Protection Bypass</option>
                                    </select>
                                    <button
                                        type={'button'}
                                        disabled={actionLoading || !newUsername.trim()}
                                        onClick={handleAddOp}
                                        className={'flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 px-5 py-2.5 text-xs font-bold text-white shadow transition'}
                                    >
                                        <KeyIcon className={'h-4 w-4'} />
                                        Grant OP
                                    </button>
                                </div>

                                <div className={'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3'}>
                                    {data.ops.map((o) => (
                                        <div
                                            key={o.uuid}
                                            className={'flex items-center justify-between p-3 rounded-xl border border-neutral-800 bg-[#0a0f1d]/80 backdrop-blur-sm'}
                                        >
                                            <div className={'flex items-center gap-3 min-w-0'}>
                                                <img
                                                    src={`https://mc-heads.net/avatar/${encodeURIComponent(o.name)}/40.png`}
                                                    alt={o.name}
                                                    className={'h-8 w-8 rounded bg-neutral-800 shrink-0'}
                                                    onError={(e: any) => {
                                                        e.target.src = 'https://mc-heads.net/avatar/Steve/40.png';
                                                    }}
                                                />
                                                <div className={'min-w-0'}>
                                                    <div className={'flex items-center gap-2'}>
                                                        <p className={'text-xs font-bold text-white truncate'}>{o.name}</p>
                                                        <span className={'px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30'}>
                                                            LVL {o.level}
                                                        </span>
                                                    </div>
                                                    <p className={'text-[10px] font-mono text-neutral-500 truncate'}>{o.uuid}</p>
                                                </div>
                                            </div>
                                            <button
                                                type={'button'}
                                                onClick={() => handleRemoveOp(o)}
                                                className={'p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition'}
                                                title={'Revoke Operator'}
                                            >
                                                <TrashIcon className={'h-3.5 w-3.5'} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* TAB 3: Banned Players */}
                        {activeTab === 'banned_players' && (
                            <div className={'flex flex-col gap-4'}>
                                <div className={'grid grid-cols-1 sm:grid-cols-12 gap-3'}>
                                    <div className={'sm:col-span-5'}>
                                        <Input
                                            placeholder={'Player username to ban...'}
                                            value={newUsername}
                                            onChange={(e) => setNewUsername(e.target.value)}
                                        />
                                    </div>
                                    <div className={'sm:col-span-5'}>
                                        <Input
                                            placeholder={'Ban reason...'}
                                            value={banReason}
                                            onChange={(e) => setBanReason(e.target.value)}
                                        />
                                    </div>
                                    <div className={'sm:col-span-2'}>
                                        <button
                                            type={'button'}
                                            disabled={actionLoading || !newUsername.trim()}
                                            onClick={handleBanPlayer}
                                            className={'w-full flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 py-2.5 text-xs font-bold text-white shadow transition'}
                                        >
                                            <BanIcon className={'h-4 w-4'} />
                                            Ban Player
                                        </button>
                                    </div>
                                </div>

                                <div className={'flex flex-col gap-2.5'}>
                                    {data.bannedPlayers.map((b) => (
                                        <div
                                            key={b.uuid}
                                            className={'flex items-center justify-between p-3.5 rounded-xl border border-neutral-800 bg-[#0a0f1d]/80 backdrop-blur-sm'}
                                        >
                                            <div className={'flex items-center gap-3 min-w-0'}>
                                                <img
                                                    src={`https://mc-heads.net/avatar/${encodeURIComponent(b.name)}/40.png`}
                                                    alt={b.name}
                                                    className={'h-9 w-9 rounded bg-neutral-800 shrink-0 opacity-70'}
                                                    onError={(e: any) => {
                                                        e.target.src = 'https://mc-heads.net/avatar/Steve/40.png';
                                                    }}
                                                />
                                                <div className={'min-w-0'}>
                                                    <div className={'flex items-center gap-2'}>
                                                        <p className={'text-xs font-bold text-rose-300'}>{b.name}</p>
                                                        <span className={'text-[10px] text-neutral-500'}>
                                                            {new Date(b.created).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <p className={'text-xs text-neutral-400 mt-0.5'}>
                                                        Reason: <span className={'text-white'}>{b.reason}</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                type={'button'}
                                                onClick={() => handleUnbanPlayer(b)}
                                                className={'px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-bold border border-emerald-500/30 transition'}
                                            >
                                                Unban
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* TAB 4: Banned IPs */}
                        {activeTab === 'banned_ips' && (
                            <div className={'flex flex-col gap-4'}>
                                <div className={'grid grid-cols-1 sm:grid-cols-12 gap-3'}>
                                    <div className={'sm:col-span-5'}>
                                        <Input
                                            placeholder={'IPv4 address (e.g. 192.168.1.1)...'}
                                            value={newIp}
                                            onChange={(e) => setNewIp(e.target.value)}
                                        />
                                    </div>
                                    <div className={'sm:col-span-5'}>
                                        <Input
                                            placeholder={'Ban reason...'}
                                            value={banReason}
                                            onChange={(e) => setBanReason(e.target.value)}
                                        />
                                    </div>
                                    <div className={'sm:col-span-2'}>
                                        <button
                                            type={'button'}
                                            disabled={actionLoading || !newIp.trim()}
                                            onClick={handleBanIp}
                                            className={'w-full flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 py-2.5 text-xs font-bold text-white shadow transition'}
                                        >
                                            <ShieldCheckIcon className={'h-4 w-4'} />
                                            Ban IP
                                        </button>
                                    </div>
                                </div>

                                <div className={'flex flex-col gap-2.5'}>
                                    {data.bannedIps.map((b) => (
                                        <div
                                            key={b.ip}
                                            className={'flex items-center justify-between p-3.5 rounded-xl border border-neutral-800 bg-[#0a0f1d]/80 backdrop-blur-sm'}
                                        >
                                            <div>
                                                <p className={'text-xs font-mono font-bold text-rose-300'}>{b.ip}</p>
                                                <p className={'text-xs text-neutral-400 mt-0.5'}>
                                                    Reason: <span className={'text-white'}>{b.reason}</span>
                                                </p>
                                            </div>
                                            <button
                                                type={'button'}
                                                onClick={() => handleUnbanIp(b)}
                                                className={'px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-bold border border-emerald-500/30 transition'}
                                            >
                                                Unban IP
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </ServerContentBlock>
    );
};
