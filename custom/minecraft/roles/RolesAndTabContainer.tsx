import React, { useEffect, useState } from 'react';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { ServerContext } from '@/state/server';
import useFlash from '@/plugins/useFlash';
import Spinner from '@/components/elements/Spinner';
import Input from '@/components/elements/Input';
import classNames from 'classnames';
import {
    SparklesIcon,
    ShieldCheckIcon,
    CheckCircleIcon,
    ExclamationIcon,
    RefreshIcon,
    KeyIcon,
    UserGroupIcon,
    ViewListIcon,
    ExternalLinkIcon,
    CloudDownloadIcon,
    CheckIcon,
    TrashIcon,
} from '@heroicons/react/solid';
import { Dialog } from '@/components/elements/dialog';
import saveFileContents from '@/api/server/files/saveFileContents';
import {
    RolesAndTabStatus,
    TabSettings,
    DEFAULT_TAB_SETTINGS,
    checkRolesStatus,
    applyRolesAndTabSuite,
    assignPlayerRank,
    launchLuckPermsEditor,
    generateTabConfig,
    generateTabGroupsConfig,
    sendServerCommand,
    removeRolesAndTabSuite,
    resetRolesAndTabToDefault,
} from '@/api/server/minecraft/roles';

const ROLES_LIST = [
    { id: 'owner', name: 'Owner', weight: 100, color: 'text-red-500', prefix: '&8[&4&lOWNER&8] &4' },
    { id: 'admin', name: 'Admin', weight: 90, color: 'text-rose-400', prefix: '&8[&c&lADMIN&8] &c' },
    { id: 'mod', name: 'Mod', weight: 80, color: 'text-emerald-400', prefix: '&8[&2&lMOD&8] &a' },
    { id: 'helper', name: 'Helper', weight: 70, color: 'text-amber-400', prefix: '&8[&e&lHELPER&8] &e' },
    { id: 'mvpplus', name: 'MVP+', weight: 50, color: 'text-cyan-400', prefix: '&8[&b&lMVP&b+&8] &b' },
    { id: 'vip', name: 'VIP', weight: 30, color: 'text-green-400', prefix: '&8[&a&lVIP&8] &a' },
    { id: 'default', name: 'Member', weight: 10, color: 'text-neutral-400', prefix: '&8[&7Member&8] &7' },
];

export default () => {
    const server = ServerContext.useStoreState((state) => state.server.data!);
    const { clearFlashes, clearAndAddHttpError, addFlash } = useFlash();

    const [loading, setLoading] = useState(true);
    const [deploying, setDeploying] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [targetPlayer, setTargetPlayer] = useState('');
    const [selectedRole, setSelectedRole] = useState('admin');
    const [savingSettings, setSavingSettings] = useState(false);

    const [status, setStatus] = useState<RolesAndTabStatus>({
        hasLuckPerms: false,
        hasTab: false,
        hasVault: false,
        hasLpc: false,
        isConfigured: false,
    });

    const [settings, setSettings] = useState<TabSettings>(DEFAULT_TAB_SETTINGS);
    const [confirmReset, setConfirmReset] = useState(false);
    const [confirmRemove, setConfirmRemove] = useState(false);
    const [deleteConfigsOnRemove, setDeleteConfigsOnRemove] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, [server.uuid]);

    const loadData = async () => {
        try {
            setLoading(true);
            clearFlashes('roles-tab');
            const res = await checkRolesStatus(server.uuid);
            setStatus(res);
        } catch (error) {
            clearAndAddHttpError({ error, key: 'roles-tab' });
        } finally {
            setLoading(false);
        }
    };

    const handleDeploySuite = async () => {
        try {
            setDeploying(true);
            clearFlashes('roles-tab');
            await applyRolesAndTabSuite(server.uuid, settings);
            await loadData();
            addFlash({
                key: 'roles-tab',
                type: 'success',
                message: '👑 SmitCloud Roles & TabList Suite deployed & configured! Restart server to activate all hooks.',
            });
        } catch (error) {
            clearAndAddHttpError({ error, key: 'roles-tab' });
        } finally {
            setDeploying(false);
        }
    };

    const handleResetToDefault = async () => {
        try {
            setActionLoading(true);
            setConfirmReset(false);
            clearFlashes('roles-tab');
            await resetRolesAndTabToDefault(server.uuid);
            setSettings(DEFAULT_TAB_SETTINGS);
            await loadData();
            addFlash({
                key: 'roles-tab',
                type: 'success',
                message: '🔄 Restored all roles, weights, prefixes, and TabList settings to standard defaults!',
            });
        } catch (error) {
            clearAndAddHttpError({ error, key: 'roles-tab' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleRemoveSuite = async () => {
        try {
            setActionLoading(true);
            setConfirmRemove(false);
            clearFlashes('roles-tab');
            await removeRolesAndTabSuite(server.uuid, deleteConfigsOnRemove);
            await loadData();
            addFlash({
                key: 'roles-tab',
                type: 'success',
                message: '🗑️ Roles & TabList Suite removed successfully! Please restart your server to complete unloading.',
            });
        } catch (error) {
            clearAndAddHttpError({ error, key: 'roles-tab' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleAssignRank = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetPlayer.trim()) return;

        try {
            setAssigning(true);
            clearFlashes('roles-tab');
            await assignPlayerRank(server.uuid, targetPlayer.trim(), selectedRole);
            addFlash({
                key: 'roles-tab',
                type: 'success',
                message: `⭐ Player "${targetPlayer.trim()}" has been assigned the "${selectedRole.toUpperCase()}" rank!`,
            });
            setTargetPlayer('');
        } catch (error) {
            clearAndAddHttpError({ error, key: 'roles-tab' });
        } finally {
            setAssigning(false);
        }
    };

    const handleLaunchEditor = async () => {
        try {
            clearFlashes('roles-tab');
            await launchLuckPermsEditor(server.uuid);
            addFlash({
                key: 'roles-tab',
                type: 'info',
                message: '🌐 Generated LuckPerms editor session! Check server console for the interactive URL.',
            });
        } catch (error) {
            clearAndAddHttpError({ error, key: 'roles-tab' });
        }
    };

    const handleSaveTabSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSavingSettings(true);
            clearFlashes('roles-tab');
            const tabYaml = generateTabConfig(settings);
            await saveFileContents(server.uuid, '/plugins/TAB/config.yml', tabYaml);
            const groupsYaml = generateTabGroupsConfig();
            await saveFileContents(server.uuid, '/plugins/TAB/groups.yml', groupsYaml);
            await sendServerCommand(server.uuid, 'tab reload');
            addFlash({
                key: 'roles-tab',
                type: 'success',
                message: '🎨 TabList design saved and reloaded live in-game!',
            });
        } catch (error) {
            clearAndAddHttpError({ error, key: 'roles-tab' });
        } finally {
            setSavingSettings(false);
        }
    };

    return (
        <ServerContentBlock title={'Roles & TabList Studio'} showFlashKey={'roles-tab'}>
            <div className={'flex flex-col gap-6'}>
                {/* Hero Header */}
                <div className={'relative overflow-hidden rounded-3xl border border-purple-500/30 bg-gradient-to-b from-[#180e29] via-[#0d1322] to-[#080d1a] p-6 sm:p-8 shadow-2xl backdrop-blur-xl'}>
                    <div className={'pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-purple-500/15 blur-3xl'} />
                    <div className={'pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-amber-500/15 blur-3xl'} />

                    <div className={'relative flex flex-col md:flex-row md:items-center md:justify-between gap-6'}>
                        <div className={'flex items-start gap-4 sm:gap-5'}>
                            <div className={'flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-amber-500 text-white shadow-xl shadow-purple-500/30 font-black text-2xl'}>
                                👑
                            </div>
                            <div>
                                <div className={'flex flex-wrap items-center gap-2.5'}>
                                    <h1 className={'text-2xl sm:text-3xl font-black tracking-tight text-white'}>
                                        Roles &amp; TabList Studio
                                    </h1>
                                    <span className={'inline-flex items-center gap-1.5 rounded-full bg-purple-500/15 px-3 py-0.5 text-xs font-bold text-purple-400 border border-purple-500/30 shadow-sm'}>
                                        <SparklesIcon className={'h-3.5 w-3.5'} />
                                        LUCKPERMS + TAB ENGINE
                                    </span>
                                    {status.isConfigured ? (
                                        <span className={'inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/40'}>
                                            <CheckCircleIcon className={'h-3.5 w-3.5'} />
                                            Active &amp; Armed
                                        </span>
                                    ) : (
                                        <span className={'inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-3 py-0.5 text-xs font-bold text-amber-400 border border-amber-500/40'}>
                                            <ExclamationIcon className={'h-3.5 w-3.5'} />
                                            Setup Ready
                                        </span>
                                    )}
                                </div>
                                <p className={'mt-1.5 text-xs sm:text-sm text-neutral-300 max-w-2xl leading-relaxed'}>
                                    Enterprise permissions and visual hierarchy: 7 pre-configured ranks with inheritance, luxury chat formatting, and synchronized live TabList sorting.
                                </p>
                            </div>
                        </div>

                        <div className={'flex flex-wrap items-center gap-2.5 shrink-0'}>
                            <button
                                type={'button'}
                                onClick={handleDeploySuite}
                                disabled={deploying || actionLoading}
                                className={'flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white font-extrabold px-5 py-3 text-xs shadow-xl shadow-purple-500/25 transition disabled:opacity-50'}
                            >
                                <CloudDownloadIcon className={'h-4 w-4'} />
                                {deploying ? 'Deploying...' : '⚡ Auto-Configure'}
                            </button>
                            <button
                                type={'button'}
                                onClick={() => setConfirmReset(true)}
                                disabled={deploying || actionLoading}
                                className={'flex items-center gap-1.5 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold px-3.5 py-3 text-xs transition shadow-lg shadow-amber-500/10 disabled:opacity-50'}
                                title={'Reset roles hierarchy and TabList configuration to standard defaults'}
                            >
                                <RefreshIcon className={'h-4 w-4'} />
                                {actionLoading ? 'Resetting...' : 'Reset to Default'}
                            </button>
                            <button
                                type={'button'}
                                onClick={() => setConfirmRemove(true)}
                                disabled={deploying || actionLoading}
                                className={'flex items-center gap-1.5 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 font-bold px-3.5 py-3 text-xs transition shadow-lg shadow-rose-500/10 disabled:opacity-50'}
                                title={'Remove LuckPerms, TAB, Vault, and LPC plugin files'}
                            >
                                <TrashIcon className={'h-4 w-4'} />
                                {actionLoading ? 'Removing...' : 'Remove Suite'}
                            </button>
                            <button
                                type={'button'}
                                onClick={loadData}
                                disabled={loading || deploying || actionLoading}
                                className={'p-3 rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 transition'}
                                title={'Refresh Status'}
                            >
                                <RefreshIcon className={classNames('h-4 w-4', { 'animate-spin': loading || actionLoading })} />
                            </button>
                        </div>
                    </div>

                    {/* Live Engine Status Grid */}
                    <div className={'grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-neutral-800/80 text-xs'}>
                        <div className={'rounded-2xl bg-neutral-950/60 border border-neutral-800/70 p-3.5'}>
                            <span className={'text-neutral-500 block text-[10px] uppercase font-bold'}>Permission Engine</span>
                            <span className={classNames('text-sm font-black mt-0.5 block', status.hasLuckPerms ? 'text-emerald-400' : 'text-neutral-400')}>
                                {status.hasLuckPerms ? '🟢 LuckPerms Active' : '⚪ Not Installed'}
                            </span>
                        </div>
                        <div className={'rounded-2xl bg-neutral-950/60 border border-neutral-800/70 p-3.5'}>
                            <span className={'text-neutral-500 block text-[10px] uppercase font-bold'}>TabList &amp; Nametags</span>
                            <span className={classNames('text-sm font-black mt-0.5 block', status.hasTab ? 'text-emerald-400' : 'text-neutral-400')}>
                                {status.hasTab ? '🟢 TAB v6.1 Armed' : '⚪ Not Installed'}
                            </span>
                        </div>
                        <div className={'rounded-2xl bg-neutral-950/60 border border-neutral-800/70 p-3.5'}>
                            <span className={'text-neutral-500 block text-[10px] uppercase font-bold'}>Permissions Bridge</span>
                            <span className={classNames('text-sm font-black mt-0.5 block', status.hasVault ? 'text-emerald-400' : 'text-neutral-400')}>
                                {status.hasVault ? '🟢 Vault Hooked' : '⚪ Not Installed'}
                            </span>
                        </div>
                        <div className={'rounded-2xl bg-neutral-950/60 border border-neutral-800/70 p-3.5'}>
                            <span className={'text-neutral-500 block text-[10px] uppercase font-bold'}>Chat Formatter</span>
                            <span className={classNames('text-sm font-black mt-0.5 block', status.hasLpc ? 'text-emerald-400' : 'text-neutral-400')}>
                                {status.hasLpc ? '🟢 LPC Formatted' : '⚪ Not Installed'}
                            </span>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className={'py-16 text-center'}>
                        <Spinner size={'large'} centered />
                    </div>
                ) : (
                    <div className={'grid grid-cols-1 lg:grid-cols-12 gap-6'}>
                        {/* Left 7 cols: Live TabList Simulator & Hierarchy Map */}
                        <div className={'lg:col-span-7 flex flex-col gap-6'}>
                            {/* In-Game TabList Mockup */}
                            <div className={'rounded-3xl border border-neutral-800 bg-[#090e1a]/95 p-6 backdrop-blur-xl shadow-2xl'}>
                                <div className={'flex items-center justify-between mb-4'}>
                                    <h2 className={'text-sm font-bold text-white flex items-center gap-2'}>
                                        <ViewListIcon className={'h-4 w-4 text-purple-400'} />
                                        Live In-Game TabList Simulator (Preview)
                                    </h2>
                                    <span className={'text-[10px] font-bold text-neutral-400 uppercase tracking-widest bg-neutral-900 border border-neutral-800 px-2.5 py-1 rounded-full'}>
                                        Press [TAB] in-game
                                    </span>
                                </div>

                                {/* Minecraft Tab Box */}
                                <div className={'rounded-2xl border border-neutral-800/80 bg-neutral-950/90 p-5 font-mono text-xs shadow-inner'}>
                                    {/* Header */}
                                    <div className={'text-center border-b border-neutral-800/80 pb-3 mb-4 space-y-0.5'}>
                                        <div className={'text-[10px] text-neutral-600'}>--------------------------------------------------</div>
                                        <div className={'text-sm font-black tracking-wider text-cyan-400 drop-shadow'}>
                                            {settings.serverBrandingName.toUpperCase()} NETWORK <span className={'text-neutral-400'}>»</span> <span className={'text-neutral-200'}>{settings.headerSubtitle}</span>
                                        </div>
                                        <div className={'text-[11px] text-neutral-400'}>
                                            Welcome, <span className={'text-white font-bold'}>Player</span> | TPS: <span className={'text-emerald-400'}>20.0</span> | Ping: <span className={'text-cyan-400'}>24ms</span>
                                        </div>
                                        <div className={'text-[10px] text-neutral-600'}>--------------------------------------------------</div>
                                    </div>

                                    {/* Sorted Player List */}
                                    <div className={'space-y-1.5 px-2 py-1'}>
                                        <div className={'flex items-center justify-between p-1.5 rounded bg-red-950/20 border border-red-900/30'}>
                                            <div className={'flex items-center gap-2'}>
                                                <span className={'font-bold text-red-500'}>[OWNER]</span>
                                                <span className={'text-red-400 font-bold'}>Smitronix</span>
                                            </div>
                                            <span className={'text-[10px] text-emerald-400 font-semibold'}>18ms</span>
                                        </div>

                                        <div className={'flex items-center justify-between p-1.5 rounded bg-neutral-900/40 border border-neutral-800/40'}>
                                            <div className={'flex items-center gap-2'}>
                                                <span className={'font-bold text-rose-400'}>[ADMIN]</span>
                                                <span className={'text-white'}>AlexDev</span>
                                            </div>
                                            <span className={'text-[10px] text-emerald-400 font-semibold'}>26ms</span>
                                        </div>

                                        <div className={'flex items-center justify-between p-1.5 rounded bg-neutral-900/40 border border-neutral-800/40'}>
                                            <div className={'flex items-center gap-2'}>
                                                <span className={'font-bold text-emerald-400'}>[MOD]</span>
                                                <span className={'text-white'}>Marcus</span>
                                            </div>
                                            <span className={'text-[10px] text-emerald-400 font-semibold'}>32ms</span>
                                        </div>

                                        <div className={'flex items-center justify-between p-1.5 rounded bg-neutral-900/40 border border-neutral-800/40'}>
                                            <div className={'flex items-center gap-2'}>
                                                <span className={'font-bold text-amber-400'}>[HELPER]</span>
                                                <span className={'text-white'}>SarahSupport</span>
                                            </div>
                                            <span className={'text-[10px] text-emerald-400 font-semibold'}>45ms</span>
                                        </div>

                                        <div className={'flex items-center justify-between p-1.5 rounded bg-neutral-900/40 border border-neutral-800/40'}>
                                            <div className={'flex items-center gap-2'}>
                                                <span className={'font-bold text-cyan-400'}>[MVP+]</span>
                                                <span className={'text-white'}>DragonRider</span>
                                            </div>
                                            <span className={'text-[10px] text-emerald-400 font-semibold'}>22ms</span>
                                        </div>

                                        <div className={'flex items-center justify-between p-1.5 rounded bg-neutral-900/40 border border-neutral-800/40'}>
                                            <div className={'flex items-center gap-2'}>
                                                <span className={'font-bold text-green-400'}>[VIP]</span>
                                                <span className={'text-white'}>CraftyPro</span>
                                            </div>
                                            <span className={'text-[10px] text-emerald-400 font-semibold'}>38ms</span>
                                        </div>

                                        <div className={'flex items-center justify-between p-1.5 rounded bg-neutral-900/40 border border-neutral-800/40'}>
                                            <div className={'flex items-center gap-2'}>
                                                <span className={'font-bold text-neutral-400'}>[Member]</span>
                                                <span className={'text-neutral-300'}>CasualGamer</span>
                                            </div>
                                            <span className={'text-[10px] text-emerald-400 font-semibold'}>52ms</span>
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className={'text-center border-t border-neutral-800/80 pt-3 mt-4 space-y-0.5'}>
                                        <div className={'text-[10px] text-neutral-600'}>--------------------------------------------------</div>
                                        <div className={'text-[11px] text-neutral-300'}>
                                            Players: <span className={'text-emerald-400'}>7/100</span> | World: <span className={'text-amber-400'}>world</span>
                                        </div>
                                        <div className={'text-[11px] text-neutral-400'}>
                                            <span className={'text-pink-400 font-bold'}>STORE:</span> {settings.storeLink} | <span className={'text-indigo-400 font-bold'}>DISCORD:</span> {settings.discordLink}
                                        </div>
                                        <div className={'text-[10px] text-amber-400 font-medium'}>
                                            Official Mojang Java &amp; Bedrock (Xbox) Supported
                                        </div>
                                        <div className={'text-[10px] text-neutral-600'}>--------------------------------------------------</div>
                                    </div>
                                </div>
                            </div>

                            {/* Rank Hierarchy Map */}
                            <div className={'rounded-3xl border border-neutral-800 bg-[#090e1a]/95 p-6 backdrop-blur-xl'}>
                                <h2 className={'text-sm font-bold text-white flex items-center gap-2 mb-4'}>
                                    <ShieldCheckIcon className={'h-4 w-4 text-emerald-400'} />
                                    Active Rank Hierarchy &amp; Weights
                                </h2>

                                <div className={'grid grid-cols-1 sm:grid-cols-2 gap-3'}>
                                    {ROLES_LIST.map((role) => (
                                        <div key={role.id} className={'flex items-center justify-between p-3 rounded-2xl bg-neutral-900/60 border border-neutral-800'}>
                                            <div className={'flex items-center gap-2.5'}>
                                                <span className={classNames('text-xs font-black', role.color)}>
                                                    {role.name}
                                                </span>
                                                <code className={'text-[10px] text-neutral-400 bg-neutral-950 px-2 py-0.5 rounded'}>
                                                    {role.prefix}
                                                </code>
                                            </div>
                                            <span className={'text-[10px] font-bold text-neutral-500'}>
                                                Weight {role.weight}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right 5 cols: Management Actions */}
                        <div className={'lg:col-span-5 flex flex-col gap-6'}>
                            {/* Quick Rank Assigner */}
                            <div className={'rounded-3xl border border-neutral-800 bg-[#090e1a]/95 p-6 backdrop-blur-xl shadow-xl'}>
                                <h2 className={'text-sm font-bold text-white flex items-center gap-2 mb-1.5'}>
                                    <UserGroupIcon className={'h-4 w-4 text-amber-400'} />
                                    Instant Player Rank Assigner
                                </h2>
                                <p className={'text-xs text-neutral-400 mb-4'}>
                                    Assign a player to any role instantly without remembering complex LuckPerms console commands.
                                </p>

                                <form onSubmit={handleAssignRank} className={'space-y-4'}>
                                    <div>
                                        <label className={'block text-xs font-semibold text-neutral-300 mb-1'}>
                                            Player Username
                                        </label>
                                        <Input
                                            type={'text'}
                                            placeholder={'e.g. Steve'}
                                            value={targetPlayer}
                                            onChange={(e) => setTargetPlayer(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className={'block text-xs font-semibold text-neutral-300 mb-1'}>
                                            Select Rank
                                        </label>
                                        <select
                                            value={selectedRole}
                                            onChange={(e) => setSelectedRole(e.target.value)}
                                            className={'w-full rounded-xl bg-neutral-900 border border-neutral-700 text-white text-xs px-3.5 py-2.5 focus:border-amber-500 focus:outline-none transition'}
                                        >
                                            {ROLES_LIST.map((r) => (
                                                <option key={r.id} value={r.id}>
                                                    {r.name} (Weight {r.weight})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <button
                                        type={'submit'}
                                        disabled={assigning || !targetPlayer.trim()}
                                        className={'w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-extrabold px-4 py-2.5 text-xs shadow-lg shadow-amber-500/20 transition disabled:opacity-50'}
                                    >
                                        <CheckIcon className={'h-4 w-4'} />
                                        {assigning ? 'Assigning Rank...' : `Assign ${selectedRole.toUpperCase()} to ${targetPlayer || 'Player'}`}
                                    </button>
                                </form>
                            </div>

                            {/* LuckPerms Web GUI Box */}
                            <div className={'rounded-3xl border border-neutral-800 bg-gradient-to-b from-[#140b24] to-[#0a0f1d] p-6 backdrop-blur-xl shadow-xl'}>
                                <div className={'flex items-center gap-3 mb-2'}>
                                    <div className={'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 font-black'}>
                                        🌐
                                    </div>
                                    <div>
                                        <h3 className={'text-sm font-bold text-white'}>LuckPerms Web GUI Editor</h3>
                                        <p className={'text-xs text-neutral-400'}>
                                            Visual node editor with search &amp; tree view
                                        </p>
                                    </div>
                                </div>
                                <p className={'text-xs text-neutral-300 leading-relaxed mb-4'}>
                                    LuckPerms provides a cloud-hosted graphical interface. Clicking below executes <code className={'text-purple-300'}>/lp editor</code> on your server to generate an interactive session.
                                </p>
                                <button
                                    type={'button'}
                                    onClick={handleLaunchEditor}
                                    className={'w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold px-4 py-2.5 text-xs shadow-lg shadow-purple-500/20 transition'}
                                >
                                    <ExternalLinkIcon className={'h-4 w-4'} />
                                    Generate LuckPerms Web Editor Link
                                </button>
                            </div>

                            {/* Header & Footer Customizer */}
                            <div className={'rounded-3xl border border-neutral-800 bg-[#090e1a]/95 p-6 backdrop-blur-xl shadow-xl'}>
                                <h2 className={'text-sm font-bold text-white flex items-center gap-2 mb-1.5'}>
                                    <ViewListIcon className={'h-4 w-4 text-cyan-400'} />
                                    TabList Header &amp; Footer Settings
                                </h2>
                                <p className={'text-xs text-neutral-400 mb-4'}>
                                    Customize the text shown at the top and bottom of the in-game Tab menu.
                                </p>

                                <form onSubmit={handleSaveTabSettings} className={'space-y-3.5'}>
                                    <div>
                                        <label className={'block text-[11px] font-semibold text-neutral-300 mb-1'}>
                                            Server Branding Title
                                        </label>
                                        <Input
                                            type={'text'}
                                            value={settings.serverBrandingName}
                                            onChange={(e) => setSettings({ ...settings, serverBrandingName: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className={'block text-[11px] font-semibold text-neutral-300 mb-1'}>
                                            Header Subtitle
                                        </label>
                                        <Input
                                            type={'text'}
                                            value={settings.headerSubtitle}
                                            onChange={(e) => setSettings({ ...settings, headerSubtitle: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className={'block text-[11px] font-semibold text-neutral-300 mb-1'}>
                                            Store URL
                                        </label>
                                        <Input
                                            type={'text'}
                                            value={settings.storeLink}
                                            onChange={(e) => setSettings({ ...settings, storeLink: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className={'block text-[11px] font-semibold text-neutral-300 mb-1'}>
                                            Discord Invite
                                        </label>
                                        <Input
                                            type={'text'}
                                            value={settings.discordLink}
                                            onChange={(e) => setSettings({ ...settings, discordLink: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className={'flex items-center gap-2 pt-1'}>
                                        <button
                                            type={'submit'}
                                            disabled={savingSettings}
                                            className={'flex-1 flex items-center justify-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold px-4 py-2.5 text-xs shadow-lg shadow-cyan-500/20 transition disabled:opacity-50'}
                                        >
                                            <CheckIcon className={'h-4 w-4'} />
                                            {savingSettings ? 'Saving & Reloading...' : 'Save & Reload Live'}
                                        </button>
                                        <button
                                            type={'button'}
                                            onClick={() => setSettings(DEFAULT_TAB_SETTINGS)}
                                            className={'flex items-center justify-center gap-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 font-bold px-3.5 py-2.5 text-xs transition'}
                                            title={'Reset input fields back to default branding'}
                                        >
                                            <RefreshIcon className={'h-4 w-4'} />
                                            Reset Inputs
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* Reset to Default Confirmation Dialog */}
                <Dialog.Confirm
                    open={confirmReset}
                    onClose={() => setConfirmReset(false)}
                    title={'Reset Roles & TabList to Default?'}
                    confirm={'Reset to Defaults'}
                    onConfirmed={handleResetToDefault}
                >
                    <div className={'text-xs sm:text-sm text-neutral-300 space-y-2.5'}>
                        <p>
                            Are you sure you want to reset the Roles &amp; TabList configuration to standard defaults?
                        </p>
                        <ul className={'list-disc pl-5 space-y-1 text-xs text-neutral-400'}>
                            <li>Re-configures the 7-tier rank hierarchy (Owner, Admin, Mod, Helper, MVP+, VIP, Member).</li>
                            <li>Re-applies default prefix tags, weight order, and permission nodes.</li>
                            <li>Restores default luxury SmitCloud TabList header/footer layout and LPC chat format.</li>
                        </ul>
                    </div>
                </Dialog.Confirm>

                {/* Remove Suite Confirmation Dialog */}
                <Dialog.Confirm
                    open={confirmRemove}
                    onClose={() => setConfirmRemove(false)}
                    title={'Remove Roles & TabList Suite?'}
                    confirm={'Yes, Remove Suite'}
                    onConfirmed={handleRemoveSuite}
                >
                    <div className={'text-xs sm:text-sm text-neutral-300 space-y-3'}>
                        <p>
                            This will uninstall and remove the Roles &amp; TabList suite from your server.
                        </p>
                        <ul className={'list-disc pl-5 space-y-1 text-xs text-neutral-400'}>
                            <li>Deletes LuckPerms-Bukkit.jar, TAB-Bukkit.jar, Vault.jar, and LPC.jar.</li>
                            <li>Unregisters custom LuckPerms groups via console.</li>
                        </ul>
                        <label className={'flex items-center gap-2.5 pt-1 text-xs font-semibold text-neutral-200 cursor-pointer'}>
                            <input
                                type={'checkbox'}
                                checked={deleteConfigsOnRemove}
                                onChange={(e) => setDeleteConfigsOnRemove(e.target.checked)}
                                className={'rounded border-neutral-700 bg-neutral-900 text-purple-600 focus:ring-0'}
                            />
                            <span>Also delete configuration folders (/plugins/TAB, /plugins/LPC, /plugins/LuckPerms)</span>
                        </label>
                        <p className={'text-[11px] text-amber-400/90 font-medium'}>
                            ⚠️ Note: Please restart your Minecraft server to completely unload the plugins from memory.
                        </p>
                    </div>
                </Dialog.Confirm>
            </div>
        </ServerContentBlock>
    );
};
