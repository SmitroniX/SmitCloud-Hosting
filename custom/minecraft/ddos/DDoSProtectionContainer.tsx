import React, { useEffect, useState } from 'react';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { ServerContext } from '@/state/server';
import useFlash from '@/plugins/useFlash';
import Spinner from '@/components/elements/Spinner';
import Input from '@/components/elements/Input';
import classNames from 'classnames';
import copy from 'copy-to-clipboard';
import {
    ShieldCheckIcon,
    SparklesIcon,
    BanIcon,
    DuplicateIcon,
    CheckCircleIcon,
    ExclamationIcon,
    RefreshIcon,
    PlusIcon,
    GlobeIcon,
    ChipIcon,
    LockClosedIcon,
} from '@heroicons/react/solid';
import {
    DdosProtectionState,
    MitigationMode,
    fetchDDoSStatus,
    applyMitigationMode,
    toggleProxyProtection,
    blockIpAddress,
    unblockIpAddress,
} from '@/api/server/minecraft/ddos';
import { MinecraftBannedIp } from '@/api/server/minecraft/players';

export default () => {
    const server = ServerContext.useStoreState((state) => state.server.data);
    const uuid = server?.uuid || '';
    const { clearFlashes, clearAndAddHttpError, addFlash } = useFlash();

    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [state, setState] = useState<DdosProtectionState | null>(null);

    // IP block form
    const [ipToBlock, setIpToBlock] = useState('');
    const [blockReason, setBlockReason] = useState('');
    const [copiedDns, setCopiedDns] = useState(false);

    const loadData = async () => {
        if (!uuid) return;
        try {
            setLoading(true);
            clearFlashes('ddos');
            const data = await fetchDDoSStatus(uuid);
            setState(data);
        } catch (error) {
            clearAndAddHttpError({ error, key: 'ddos' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [uuid]);

    const handleApplyMode = async (mode: MitigationMode) => {
        try {
            setActionLoading(true);
            clearFlashes('ddos');
            await applyMitigationMode(uuid, mode);
            addFlash({
                key: 'ddos',
                type: 'success',
                message: `Applied ${mode.toUpperCase()} mitigation mode! Protection settings updated.`,
            });
            await loadData();
        } catch (error) {
            clearAndAddHttpError({ error, key: 'ddos' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleToggleProxy = async (enable: boolean) => {
        try {
            setActionLoading(true);
            clearFlashes('ddos');
            await toggleProxyProtection(uuid, enable);
            addFlash({
                key: 'ddos',
                type: 'success',
                message: `Proxy/VPN protection ${enable ? 'enabled' : 'disabled'}. Restart server to apply.`,
            });
            await loadData();
        } catch (error) {
            clearAndAddHttpError({ error, key: 'ddos' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleBlockIp = async () => {
        const clean = ipToBlock.trim();
        if (!clean) return alert('Enter a valid IP address.');

        try {
            setActionLoading(true);
            clearFlashes('ddos');
            await blockIpAddress(uuid, clean, blockReason);
            addFlash({
                key: 'ddos',
                type: 'success',
                message: `Blocked and banned IP ${clean} from connecting.`,
            });
            setIpToBlock('');
            setBlockReason('');
            await loadData();
        } catch (error) {
            clearAndAddHttpError({ error, key: 'ddos' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleUnblockIp = async (ip: string) => {
        try {
            setActionLoading(true);
            clearFlashes('ddos');
            await unblockIpAddress(uuid, ip);
            addFlash({
                key: 'ddos',
                type: 'success',
                message: `Unblocked IP ${ip}.`,
            });
            await loadData();
        } catch (error) {
            clearAndAddHttpError({ error, key: 'ddos' });
        } finally {
            setActionLoading(false);
        }
    };

    const srvSnippet = `_minecraft._tcp.play  SRV  0  5  25565  ${server?.allocations[0]?.ip || 'play.shadowpixel.fun'}`;

    const handleCopySrv = () => {
        copy(srvSnippet);
        setCopiedDns(true);
        setTimeout(() => setCopiedDns(false), 2000);
    };

    return (
        <ServerContentBlock title={'DDoS & Network Security'} showFlashKey={'ddos'}>
            <div className={'flex flex-col gap-6'}>
                {/* Hero Card */}
                <div className={'relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-[#0a0f1d]/90 p-6 shadow-2xl backdrop-blur-xl'}>
                    <div className={'pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl'} />
                    <div className={'pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl'} />

                    <div className={'relative flex flex-col md:flex-row md:items-center md:justify-between gap-6'}>
                        <div className={'flex items-start gap-4'}>
                            <div className={'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 shadow-lg shadow-emerald-500/25 text-white'}>
                                <ShieldCheckIcon className={'h-7 w-7'} />
                            </div>
                            <div>
                                <div className={'flex flex-wrap items-center gap-2'}>
                                    <h1 className={'text-xl sm:text-2xl font-black tracking-tight text-white'}>
                                        DDoS Protection &amp; Attack Mitigation
                                    </h1>
                                    <span className={'inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]'}>
                                        <CheckCircleIcon className={'h-3.5 w-3.5'} />
                                        SHIELD ARMED
                                    </span>
                                </div>
                                <p className={'mt-1 text-xs sm:text-sm text-neutral-400'}>
                                    Multi-layer defense protecting your server against TCP SYN floods, Bedrock UDP reflection, bot-join storms, and packet crasher exploits.
                                </p>
                            </div>
                        </div>

                        <div className={'flex flex-wrap items-center gap-3 shrink-0'}>
                            <button
                                type={'button'}
                                onClick={loadData}
                                disabled={loading}
                                className={'flex items-center gap-1.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 px-3.5 py-2 text-xs font-medium text-neutral-300 border border-neutral-700/60 transition'}
                            >
                                <RefreshIcon className={classNames('h-3.5 w-3.5', { 'animate-spin': loading })} />
                                Refresh
                            </button>
                        </div>
                    </div>

                    {/* Filter Status Strip */}
                    <div className={'grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-neutral-800/80 text-xs'}>
                        <div className={'rounded-xl bg-neutral-900/60 border border-neutral-800/70 p-3'}>
                            <span className={'text-neutral-500 block text-[10px] uppercase font-bold'}>TCP SYN-Flood Filter</span>
                            <span className={'text-sm font-bold text-emerald-400 mt-0.5 block'}>🟢 Active (Kernel)</span>
                        </div>
                        <div className={'rounded-xl bg-neutral-900/60 border border-neutral-800/70 p-3'}>
                            <span className={'text-neutral-500 block text-[10px] uppercase font-bold'}>Bedrock UDP Filter</span>
                            <span className={'text-sm font-bold text-cyan-400 mt-0.5 block'}>🟢 Port 19132 Safe</span>
                        </div>
                        <div className={'rounded-xl bg-neutral-900/60 border border-neutral-800/70 p-3'}>
                            <span className={'text-neutral-500 block text-[10px] uppercase font-bold'}>Bot-Join Throttle</span>
                            <span className={'text-sm font-bold text-white mt-0.5 block'}>{state ? `${state.connectionThrottle} ms` : '4000 ms'}</span>
                        </div>
                        <div className={'rounded-xl bg-neutral-900/60 border border-neutral-800/70 p-3'}>
                            <span className={'text-neutral-500 block text-[10px] uppercase font-bold'}>Active Firewall Bans</span>
                            <span className={'text-sm font-bold text-red-400 mt-0.5 block'}>{state?.bannedIps.length || 0} Blocked IPs</span>
                        </div>
                    </div>
                </div>

                {/* Mitigation Modes */}
                <div className={'rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 backdrop-blur-md'}>
                    <h2 className={'text-base font-bold text-white flex items-center gap-2'}>
                        <SparklesIcon className={'h-5 w-5 text-cyan-400'} />
                        Attack Mitigation Presets (1-Click Switch)
                    </h2>
                    <p className={'text-xs text-neutral-400 mt-1 mb-4'}>
                        Instantly adapt your firewall and engine filters depending on server traffic or active DDoS attacks.
                    </p>

                    <div className={'grid grid-cols-1 md:grid-cols-3 gap-4'}>
                        {/* Standard Shield */}
                        <div
                            className={classNames(
                                'rounded-2xl border p-5 transition flex flex-col justify-between cursor-pointer',
                                {
                                    'border-emerald-500/50 bg-emerald-950/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]':
                                        state?.mode === 'standard',
                                    'border-neutral-800 bg-neutral-900/70 hover:border-neutral-700':
                                        state?.mode !== 'standard',
                                }
                            )}
                            onClick={() => handleApplyMode('standard')}
                        >
                            <div>
                                <div className={'flex items-center justify-between'}>
                                    <span className={'text-xs font-black uppercase tracking-wider text-emerald-400'}>
                                        🛡️ Standard Shield
                                    </span>
                                    {state?.mode === 'standard' && (
                                        <span className={'rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30'}>
                                            CURRENT
                                        </span>
                                    )}
                                </div>
                                <p className={'text-xs text-neutral-300 mt-2 font-semibold'}>
                                    Balanced Everyday Defense
                                </p>
                                <p className={'text-[11px] text-neutral-400 mt-1'}>
                                    Standard 4000ms join throttle, optimal 256B compression threshold, and kernel-level SYN flood protection.
                                </p>
                            </div>
                            <button
                                type={'button'}
                                disabled={actionLoading || state?.mode === 'standard'}
                                className={'mt-4 w-full rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 py-2 text-xs font-bold text-white transition'}
                            >
                                {state?.mode === 'standard' ? 'Active' : 'Apply Standard'}
                            </button>
                        </div>

                        {/* High Security Shield */}
                        <div
                            className={classNames(
                                'rounded-2xl border p-5 transition flex flex-col justify-between cursor-pointer',
                                {
                                    'border-cyan-500/50 bg-cyan-950/20 shadow-[0_0_20px_rgba(6,182,212,0.15)]':
                                        state?.mode === 'high',
                                    'border-neutral-800 bg-neutral-900/70 hover:border-neutral-700':
                                        state?.mode !== 'high',
                                }
                            )}
                            onClick={() => handleApplyMode('high')}
                        >
                            <div>
                                <div className={'flex items-center justify-between'}>
                                    <span className={'text-xs font-black uppercase tracking-wider text-cyan-400'}>
                                        ⚡ High-Security Shield
                                    </span>
                                    {state?.mode === 'high' && (
                                        <span className={'rounded bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-400 border border-cyan-500/30'}>
                                            CURRENT
                                        </span>
                                    )}
                                </div>
                                <p className={'text-xs text-neutral-300 mt-2 font-semibold'}>
                                    Active Botnet Defense
                                </p>
                                <p className={'text-[11px] text-neutral-400 mt-1'}>
                                    Drops public VPN / Tor / Proxy bot connections (`prevent-proxy-connections: true`) and increases throttle to 5000ms.
                                </p>
                            </div>
                            <button
                                type={'button'}
                                disabled={actionLoading || state?.mode === 'high'}
                                className={'mt-4 w-full rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 py-2 text-xs font-bold text-white transition'}
                            >
                                {state?.mode === 'high' ? 'Active' : 'Apply High Security'}
                            </button>
                        </div>

                        {/* Emergency Lockdown */}
                        <div
                            className={classNames(
                                'rounded-2xl border p-5 transition flex flex-col justify-between cursor-pointer',
                                {
                                    'border-red-500/50 bg-red-950/20 shadow-[0_0_20px_rgba(239,68,68,0.15)]':
                                        state?.mode === 'lockdown',
                                    'border-neutral-800 bg-neutral-900/70 hover:border-neutral-700':
                                        state?.mode !== 'lockdown',
                                }
                            )}
                            onClick={() => handleApplyMode('lockdown')}
                        >
                            <div>
                                <div className={'flex items-center justify-between'}>
                                    <span className={'text-xs font-black uppercase tracking-wider text-red-400'}>
                                        🚨 Emergency Lockdown
                                    </span>
                                    {state?.mode === 'lockdown' && (
                                        <span className={'rounded bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400 border border-red-500/30'}>
                                            LOCKDOWN ACTIVE
                                        </span>
                                    )}
                                </div>
                                <p className={'text-xs text-neutral-300 mt-2 font-semibold'}>
                                    Under Heavy Attack
                                </p>
                                <p className={'text-[11px] text-neutral-400 mt-1'}>
                                    Activates server Whitelist immediately. Drops all unverified connections before they can impact server tick speed.
                                </p>
                            </div>
                            <button
                                type={'button'}
                                disabled={actionLoading || state?.mode === 'lockdown'}
                                className={'mt-4 w-full rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 py-2 text-xs font-bold text-white transition'}
                            >
                                {state?.mode === 'lockdown' ? 'Under Lockdown' : 'Trigger Lockdown'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Firewall IP Blacklist Manager */}
                <div className={'rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 backdrop-blur-md'}>
                    <h2 className={'text-base font-bold text-white flex items-center gap-2'}>
                        <BanIcon className={'h-5 w-5 text-red-400'} />
                        Firewall &amp; IP Blacklist Controls
                    </h2>
                    <p className={'text-xs text-neutral-400 mt-1 mb-4'}>
                        Block attacking IP addresses instantly. Blocked IPs are dropped before reaching the game server thread.
                    </p>

                    <div className={'flex flex-col sm:flex-row gap-3'}>
                        <input
                            type={'text'}
                            placeholder={'Attacking IP (e.g. 192.168.1.50)'}
                            value={ipToBlock}
                            onChange={(e) => setIpToBlock(e.target.value)}
                            className={'flex-1 rounded-xl bg-neutral-950 border border-neutral-700/80 p-2.5 text-xs text-white placeholder-neutral-500 font-mono'}
                        />
                        <input
                            type={'text'}
                            placeholder={'Reason (e.g. Bot storm / Exploit)'}
                            value={blockReason}
                            onChange={(e) => setBlockReason(e.target.value)}
                            className={'flex-1 rounded-xl bg-neutral-950 border border-neutral-700/80 p-2.5 text-xs text-white placeholder-neutral-500'}
                        />
                        <button
                            type={'button'}
                            onClick={handleBlockIp}
                            disabled={actionLoading}
                            className={'flex items-center justify-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 px-5 py-2.5 text-xs font-bold text-white transition'}
                        >
                            <PlusIcon className={'h-4 w-4'} />
                            Block IP
                        </button>
                    </div>

                    {/* Blocked IPs Table */}
                    <div className={'mt-5'}>
                        <span className={'text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-2'}>
                            Active Blocked IPs ({state?.bannedIps.length || 0})
                        </span>

                        {state && state.bannedIps.length === 0 ? (
                            <div className={'rounded-xl border border-neutral-800/80 bg-neutral-950/40 p-6 text-center text-xs text-neutral-500'}>
                                No IPs currently blocked in firewall.
                            </div>
                        ) : (
                            <div className={'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto'}>
                                {state?.bannedIps.map((b) => (
                                    <div
                                        key={b.ip}
                                        className={'flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950/80 p-3'}
                                    >
                                        <div>
                                            <p className={'font-mono text-xs font-bold text-white'}>{b.ip}</p>
                                            <p className={'text-[10px] text-neutral-500 mt-0.5'}>{b.reason || 'Blocked'}</p>
                                        </div>
                                        <button
                                            type={'button'}
                                            onClick={() => handleUnblockIp(b.ip)}
                                            disabled={actionLoading}
                                            className={'text-xs text-emerald-400 hover:text-emerald-300 font-semibold px-2 py-1 rounded bg-neutral-900 border border-neutral-800'}
                                        >
                                            Unblock
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Cloudflare & Reverse Proxy Guide */}
                <div className={'rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 backdrop-blur-md'}>
                    <div className={'flex items-center justify-between'}>
                        <div>
                            <h2 className={'text-base font-bold text-white flex items-center gap-2'}>
                                <GlobeIcon className={'h-5 w-5 text-cyan-400'} />
                                Origin IP Masking &amp; DNS Shield
                            </h2>
                            <p className={'text-xs text-neutral-400 mt-1'}>
                                Route your Minecraft server domain through an SRV record or TCP reverse proxy (TCPShield / Cloudflare Spectrum) to completely hide your VPS origin IP.
                            </p>
                        </div>
                    </div>

                    <div className={'mt-4 rounded-xl border border-neutral-800 bg-neutral-950 p-4 font-mono text-xs text-neutral-300 flex items-center justify-between'}>
                        <span className={'truncate mr-2'}>{srvSnippet}</span>
                        <button
                            type={'button'}
                            onClick={handleCopySrv}
                            className={'text-cyan-400 hover:text-cyan-300 shrink-0 flex items-center gap-1 font-semibold'}
                        >
                            <DuplicateIcon className={'h-4 w-4'} />
                            {copiedDns ? 'Copied!' : 'Copy SRV'}
                        </button>
                    </div>
                </div>
            </div>
        </ServerContentBlock>
    );
};
