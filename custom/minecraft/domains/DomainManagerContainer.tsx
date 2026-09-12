import React, { useEffect, useState } from 'react';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { ServerContext } from '@/state/server';
import useFlash from '@/plugins/useFlash';
import Spinner from '@/components/elements/Spinner';
import copy from 'copy-to-clipboard';
import classNames from 'classnames';
import {
    CheckCircleIcon,
    CheckIcon,
    DeviceMobileIcon,
    DuplicateIcon,
    ExclamationCircleIcon,
    GlobeAltIcon,
    InformationCircleIcon,
    LightningBoltIcon,
    PlusIcon,
    RefreshIcon,
    SparklesIcon,
    StarIcon,
    TrashIcon,
} from '@heroicons/react/solid';
import {
    addCustomDomain,
    CustomDomain,
    deleteCustomDomain,
    getCustomDomains,
    saveCustomDomains,
    setPrimaryCustomDomain,
    verifyDomainDns,
} from '@/api/server/minecraft/domains';
import DnsInstructionsModal from '@/components/server/minecraft/domains/DnsInstructionsModal';

const AVAILABLE_HOST_DOMAINS = ['shadowpixel.fun'];

export default () => {
    const server = ServerContext.useStoreState((state) => state.server.data);
    const uuid = server?.uuid || '';
    const allocations = server?.allocations || [];

    const defaultAllocation = allocations.find((a) => a.isDefault) || allocations[0];
    const targetHost = defaultAllocation?.alias || defaultAllocation?.ip || 'play.shadowpixel.fun';
    const javaPort = defaultAllocation?.port || 25565;

    const bedrockAllocation =
        allocations.find((a) => a.port === 19132) ||
        allocations.find((a) => {
            const n = (a.notes || '').toLowerCase();
            return n.includes('bedrock') || n.includes('geyser');
        }) ||
        allocations.find((a) => a.port >= 19130 && a.port <= 19145 && a.id !== defaultAllocation?.id);

    const bedrockPort = bedrockAllocation?.port;

    const { clearFlashes, clearAndAddHttpError, addFlash } = useFlash();

    const [loading, setLoading] = useState(true);
    const [domains, setDomains] = useState<CustomDomain[]>([]);
    const [activeModalDomain, setActiveModalDomain] = useState<CustomDomain | null>(null);
    const [verifyingId, setVerifyingId] = useState<string | null>(null);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    // Form states
    const [customInput, setCustomInput] = useState('');
    const [submittingCustom, setSubmittingCustom] = useState(false);

    const [subdomainPrefix, setSubdomainPrefix] = useState('');
    const [subdomainSuffix, setSubdomainSuffix] = useState(AVAILABLE_HOST_DOMAINS[0]);
    const [submittingSub, setSubmittingSub] = useState(false);

    const loadDomains = async () => {
        try {
            setLoading(true);
            const list = await getCustomDomains(uuid);
            setDomains(list);
        } catch (err) {
            clearAndAddHttpError({ error: err, key: 'domains' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        clearFlashes('domains');
        loadDomains();
    }, [uuid]);

    const handleCopy = (text: string, label: string) => {
        copy(text);
        setCopiedField(label);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleAddCustom = async (e: React.FormEvent) => {
        e.preventDefault();
        clearFlashes('domains');

        const clean = customInput.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
        if (!clean || !clean.includes('.')) {
            addFlash({
                key: 'domains',
                type: 'error',
                message: 'Please enter a valid domain name (e.g. play.yourdomain.com or myguild.net)',
            });
            return;
        }

        setSubmittingCustom(true);
        try {
            const created = await addCustomDomain(uuid, {
                domain: clean,
                type: 'custom',
                targetHost,
                targetPort: javaPort,
                bedrockPort,
            });

            setCustomInput('');
            addFlash({
                key: 'domains',
                type: 'success',
                message: `✅ Domain "${clean}" added! Please configure the DNS records shown below.`,
            });

            // Open instructions modal automatically so user sees DNS setup immediately
            setActiveModalDomain(created);
            await loadDomains();

            // Background DNS check
            runDnsVerification(created);
        } catch (err: any) {
            addFlash({
                key: 'domains',
                type: 'error',
                message: err?.message || 'Failed to add custom domain.',
            });
        } finally {
            setSubmittingCustom(false);
        }
    };

    const handleAddSubdomain = async (e: React.FormEvent) => {
        e.preventDefault();
        clearFlashes('domains');

        const cleanPrefix = subdomainPrefix.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
        if (!cleanPrefix || cleanPrefix.length < 3) {
            addFlash({
                key: 'domains',
                type: 'error',
                message: 'Subdomain prefix must be at least 3 alphanumeric characters.',
            });
            return;
        }

        const fullDomain = `${cleanPrefix}.${subdomainSuffix}`;
        setSubmittingSub(true);
        try {
            const created = await addCustomDomain(uuid, {
                domain: fullDomain,
                type: 'subdomain',
                targetHost,
                targetPort: javaPort,
                bedrockPort,
            });

            // Mark free subdomains as verified immediately
            created.status = 'verified';
            created.statusMessage = 'Active host subdomain';
            const updated = (await getCustomDomains(uuid)).map((d) => (d.id === created.id ? created : d));
            await saveCustomDomains(uuid, updated);

            setSubdomainPrefix('');
            addFlash({
                key: 'domains',
                type: 'success',
                message: `🎉 Free subdomain "${fullDomain}" created and activated!`,
            });
            await loadDomains();
        } catch (err: any) {
            addFlash({
                key: 'domains',
                type: 'error',
                message: err?.message || 'Failed to create subdomain.',
            });
        } finally {
            setSubmittingSub(false);
        }
    };

    const runDnsVerification = async (domain: CustomDomain) => {
        setVerifyingId(domain.id);
        try {
            const result = await verifyDomainDns(domain.domain, domain.targetHost, domain.targetPort);
            const currentList = await getCustomDomains(uuid);
            const updated = currentList.map((d) => {
                if (d.id === domain.id) {
                    return {
                        ...d,
                        status: result.status,
                        statusMessage: result.message,
                        dnsDetails: result.dnsDetails,
                        lastChecked: new Date().toISOString(),
                    };
                }
                return d;
            });
            await saveCustomDomains(uuid, updated);
            setDomains(updated);

            if (result.verified) {
                addFlash({
                    key: 'domains',
                    type: 'success',
                    message: `✅ DNS check for ${domain.domain}: ${result.message}`,
                });
            } else {
                addFlash({
                    key: 'domains',
                    type: 'warning',
                    message: `⏳ DNS check for ${domain.domain}: ${result.message}`,
                });
            }
        } catch {
            addFlash({
                key: 'domains',
                type: 'error',
                message: `Could not verify DNS for ${domain.domain}.`,
            });
        } finally {
            setVerifyingId(null);
        }
    };

    const handleDelete = async (domain: CustomDomain) => {
        if (!confirm(`Are you sure you want to remove domain "${domain.domain}"?`)) return;

        try {
            await deleteCustomDomain(uuid, domain.id);
            addFlash({
                key: 'domains',
                type: 'success',
                message: `Domain "${domain.domain}" removed.`,
            });
            await loadDomains();
        } catch (err: any) {
            addFlash({
                key: 'domains',
                type: 'error',
                message: err?.message || 'Failed to remove domain.',
            });
        }
    };

    const handleSetPrimary = async (domainId: string) => {
        try {
            await setPrimaryCustomDomain(uuid, domainId);
            addFlash({
                key: 'domains',
                type: 'success',
                message: 'Primary server domain updated!',
            });
            await loadDomains();
        } catch (err: any) {
            addFlash({
                key: 'domains',
                type: 'error',
                message: err?.message || 'Failed to set primary domain.',
            });
        }
    };

    return (
        <ServerContentBlock title={'Custom Domains'}>
            <div className={'space-y-6'}>
                {/* Hero Header Card */}
                <div
                    className={
                        'rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-[#0a1224] via-[#0d1a33] to-[#0a1224] p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden'
                    }
                >
                    <div className={'absolute -right-20 -top-20 w-64 h-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none'} />
                    <div className={'absolute -left-20 -bottom-20 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none'} />

                    <div className={'flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10'}>
                        <div>
                            <div className={'flex items-center gap-2'}>
                                <span className={'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'}>
                                    Domain Manager
                                </span>
                                <span className={'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}>
                                    SRV Zero-Port Routing
                                </span>
                            </div>
                            <h2 className={'text-xl font-extrabold text-white tracking-tight mt-1.5 flex items-center gap-2'}>
                                🌐 Custom Domains & Subdomains
                            </h2>
                            <p className={'text-xs text-neutral-400 mt-1 max-w-2xl'}>
                                Connect your own brand domain (e.g.{' '}
                                <span className={'font-mono text-cyan-300'}>play.yourdomain.com</span>) or claim a free
                                host subdomain. Includes real-time DNS resolver, SRV record generator, and Cloudflare instructions.
                            </p>
                        </div>

                        <div className={'flex items-center gap-2 self-start md:self-auto'}>
                            <button
                                type={'button'}
                                onClick={loadDomains}
                                disabled={loading}
                                className={'flex items-center gap-1.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 px-3 py-2 text-xs font-medium text-neutral-300 border border-neutral-700/60 transition shadow'}
                            >
                                <RefreshIcon className={classNames('w-4 h-4', { 'animate-spin': loading })} />
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>

                {/* Two Action Cards: BYOD Custom Domain & Free Host Subdomain */}
                <div className={'grid grid-cols-1 md:grid-cols-2 gap-5'}>
                    {/* Option 1: Add Custom Domain */}
                    <div className={'rounded-2xl border border-white/10 bg-[#0d172a]/90 p-5 shadow-xl backdrop-blur-md flex flex-col justify-between'}>
                        <div>
                            <div className={'flex items-center gap-2.5 mb-3'}>
                                <div className={'w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30'}>
                                    <GlobeAltIcon className={'w-5 h-5'} />
                                </div>
                                <div>
                                    <h3 className={'text-sm font-bold text-white'}>Bring Your Own Domain</h3>
                                    <span className={'text-[11px] text-neutral-400'}>Cloudflare, Namecheap, GoDaddy, Porkbun</span>
                                </div>
                            </div>
                            <p className={'text-xs text-neutral-300 mb-4'}>
                                Enter any domain or subdomain you own. We will generate the exact CNAME and Minecraft SRV records needed for seamless zero-port joining.
                            </p>
                            <form onSubmit={handleAddCustom} className={'space-y-3'}>
                                <div>
                                    <label className={'block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1'}>
                                        Custom Domain / Hostname
                                    </label>
                                    <input
                                        type={'text'}
                                        placeholder={'e.g. play.shadowsmp.com or mc.epicguild.org'}
                                        value={customInput}
                                        onChange={(e) => setCustomInput(e.currentTarget.value)}
                                        className={'w-full rounded-xl bg-black/40 border border-white/10 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 px-3.5 py-2 text-xs font-mono text-white placeholder-neutral-500 outline-none transition'}
                                    />
                                </div>
                                <button
                                    type={'submit'}
                                    disabled={submittingCustom || !customInput.trim()}
                                    className={'w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white shadow-lg shadow-cyan-600/20 transition'}
                                >
                                    <PlusIcon className={'w-4 h-4'} />
                                    {submittingCustom ? 'Adding Domain...' : 'Add Custom Domain & View DNS'}
                                </button>
                            </form>
                        </div>
                        <div className={'mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-neutral-400'}>
                            <span>Target Node: <strong className={'font-mono text-cyan-300'}>{targetHost}</strong></span>
                            <span>Port: <strong className={'font-mono text-white'}>{javaPort}</strong></span>
                        </div>
                    </div>

                    {/* Option 2: Free Host Subdomain */}
                    <div className={'rounded-2xl border border-white/10 bg-[#0d1f1c]/90 p-5 shadow-xl backdrop-blur-md flex flex-col justify-between'}>
                        <div>
                            <div className={'flex items-center gap-2.5 mb-3'}>
                                <div className={'w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30'}>
                                    <SparklesIcon className={'w-5 h-5'} />
                                </div>
                                <div>
                                    <h3 className={'text-sm font-bold text-white'}>Free Host Subdomain</h3>
                                    <span className={'text-[11px] text-emerald-400 font-medium'}>Instant • Zero DNS Setup Required</span>
                                </div>
                            </div>
                            <p className={'text-xs text-neutral-300 mb-4'}>
                                Don&apos;t own a custom domain? Claim a memorable free subdomain under our high-speed network. Active instantly!
                            </p>
                            <form onSubmit={handleAddSubdomain} className={'space-y-3'}>
                                <div>
                                    <label className={'block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1'}>
                                        Choose Subdomain Name
                                    </label>
                                    <div className={'flex rounded-xl overflow-hidden border border-white/10 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 bg-black/40'}>
                                        <input
                                            type={'text'}
                                            placeholder={'e.g. hypersmp'}
                                            value={subdomainPrefix}
                                            onChange={(e) => setSubdomainPrefix(e.currentTarget.value)}
                                            className={'flex-1 bg-transparent px-3.5 py-2 text-xs font-mono text-white placeholder-neutral-500 outline-none'}
                                        />
                                        {AVAILABLE_HOST_DOMAINS.length > 1 ? (
                                            <select
                                                value={subdomainSuffix}
                                                onChange={(e) => setSubdomainSuffix(e.currentTarget.value)}
                                                className={'bg-neutral-800 text-emerald-300 font-mono text-xs px-3 border-l border-white/10 outline-none cursor-pointer'}
                                            >
                                                {AVAILABLE_HOST_DOMAINS.map((domain) => (
                                                    <option key={domain} value={domain}>
                                                        .{domain}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span className={'bg-neutral-800/90 text-emerald-300 font-mono text-xs px-3.5 py-2 flex items-center border-l border-white/10 select-none font-bold'}>
                                                .{AVAILABLE_HOST_DOMAINS[0]}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    type={'submit'}
                                    disabled={submittingSub || !subdomainPrefix.trim()}
                                    className={'w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white shadow-lg shadow-emerald-600/20 transition'}
                                >
                                    <LightningBoltIcon className={'w-4 h-4'} />
                                    {submittingSub ? 'Creating Subdomain...' : 'Claim Free Subdomain'}
                                </button>
                            </form>
                        </div>
                        <div className={'mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-neutral-400'}>
                            <span>Subdomain Preview: <strong className={'font-mono text-emerald-300'}>{subdomainPrefix ? `${subdomainPrefix}.${subdomainSuffix}` : `yourname.${subdomainSuffix}`}</strong></span>
                            <span className={'text-emerald-400 font-medium'}>Active Instantly</span>
                        </div>
                    </div>
                </div>

                {/* Registered Domains Table / List */}
                <div className={'rounded-2xl border border-white/10 bg-[#0d1628]/90 p-5 shadow-xl backdrop-blur-md'}>
                    <div className={'flex items-center justify-between mb-4'}>
                        <div>
                            <h3 className={'text-base font-bold text-white flex items-center gap-2'}>
                                <GlobeAltIcon className={'w-5 h-5 text-cyan-400'} />
                                Active Server Domains ({domains.length})
                            </h3>
                            <p className={'text-xs text-neutral-400'}>
                                Domains currently registered for this server. The primary domain is highlighted as your public join address.
                            </p>
                        </div>
                    </div>

                    {loading ? (
                        <div className={'py-12 flex justify-center'}>
                            <Spinner size={'large'} />
                        </div>
                    ) : domains.length === 0 ? (
                        <div className={'py-12 px-4 text-center rounded-xl bg-black/20 border border-white/5'}>
                            <GlobeAltIcon className={'w-12 h-12 text-neutral-600 mx-auto mb-3'} />
                            <h4 className={'text-sm font-bold text-neutral-300'}>No custom domains added yet</h4>
                            <p className={'text-xs text-neutral-500 mt-1 max-w-md mx-auto'}>
                                Add your custom domain above or claim a free host subdomain to give your players a clean, memorable join address!
                            </p>
                        </div>
                    ) : (
                        <div className={'space-y-3'}>
                            {domains.map((dom) => (
                                <div
                                    key={dom.id}
                                    className={classNames(
                                        'rounded-xl border p-4 transition-all duration-150',
                                        dom.isPrimary
                                            ? 'border-cyan-500/40 bg-cyan-950/20 shadow-lg shadow-cyan-950/30'
                                            : 'border-white/5 bg-black/30 hover:border-white/10'
                                    )}
                                >
                                    <div className={'flex flex-col lg:flex-row lg:items-center justify-between gap-4'}>
                                        <div className={'flex items-start gap-3.5'}>
                                            <div
                                                className={classNames(
                                                    'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border',
                                                    dom.type === 'subdomain'
                                                        ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                                                        : 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400'
                                                )}
                                            >
                                                {dom.type === 'subdomain' ? (
                                                    <SparklesIcon className={'w-5 h-5'} />
                                                ) : (
                                                    <GlobeAltIcon className={'w-5 h-5'} />
                                                )}
                                            </div>

                                            <div>
                                                <div className={'flex flex-wrap items-center gap-2'}>
                                                    <span className={'text-base font-mono font-bold text-white'}>
                                                        {dom.domain}
                                                    </span>

                                                    {dom.isPrimary && (
                                                        <span className={'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'}>
                                                            <StarIcon className={'w-3 h-3'} /> Primary Domain
                                                        </span>
                                                    )}

                                                    <span
                                                        className={classNames(
                                                            'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold',
                                                            dom.type === 'subdomain'
                                                                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                                                : 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                                                        )}
                                                    >
                                                        {dom.type === 'subdomain' ? 'Free Subdomain' : 'Custom Domain'}
                                                    </span>

                                                    {/* Status Badge */}
                                                    {dom.status === 'verified' ? (
                                                        <span className={'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}>
                                                            <CheckCircleIcon className={'w-3 h-3'} /> DNS Active
                                                        </span>
                                                    ) : dom.status === 'pending' ? (
                                                        <span className={'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30'}>
                                                            <InformationCircleIcon className={'w-3 h-3'} /> Propagating...
                                                        </span>
                                                    ) : dom.status === 'failed' ? (
                                                        <span className={'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30'}>
                                                            <ExclamationCircleIcon className={'w-3 h-3'} /> DNS Incomplete
                                                        </span>
                                                    ) : (
                                                        <span className={'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-700/40 text-neutral-400'}>
                                                            Unchecked
                                                        </span>
                                                    )}
                                                </div>

                                                <div className={'flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-400 mt-1.5'}>
                                                    <span>Routes to: <strong className={'font-mono text-neutral-200'}>{dom.targetHost}:{dom.targetPort}</strong></span>
                                                    {dom.bedrockPort && (
                                                        <span>Bedrock: <strong className={'font-mono text-emerald-300'}>{dom.bedrockPort}</strong></span>
                                                    )}
                                                    {dom.lastChecked && (
                                                        <span className={'text-[11px] text-neutral-500'}>
                                                            Checked: {new Date(dom.lastChecked).toLocaleTimeString()}
                                                        </span>
                                                    )}
                                                </div>

                                                {dom.statusMessage && (
                                                    <p className={'text-[11px] text-neutral-400 mt-1'}>
                                                        {dom.statusMessage}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action buttons */}
                                        <div className={'flex flex-wrap items-center gap-2 shrink-0'}>
                                            <button
                                                type={'button'}
                                                onClick={() => handleCopy(dom.domain, dom.id)}
                                                className={'flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition border border-white/5'}
                                                title={'Copy join address'}
                                            >
                                                {copiedField === dom.id ? (
                                                    <>
                                                        <CheckIcon className={'w-3.5 h-3.5 text-emerald-400'} />
                                                        <span className={'text-emerald-400 text-[11px]'}>Copied</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <DuplicateIcon className={'w-3.5 h-3.5'} />
                                                        <span>Copy</span>
                                                    </>
                                                )}
                                            </button>

                                            <button
                                                type={'button'}
                                                onClick={() => runDnsVerification(dom)}
                                                disabled={verifyingId === dom.id}
                                                className={'flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-200 text-xs font-semibold transition border border-white/5'}
                                                title={'Query public DNS to check propagation'}
                                            >
                                                <RefreshIcon className={classNames('w-3.5 h-3.5 text-cyan-400', { 'animate-spin': verifyingId === dom.id })} />
                                                <span>{verifyingId === dom.id ? 'Checking...' : 'Check DNS'}</span>
                                            </button>

                                            {dom.type === 'custom' && (
                                                <button
                                                    type={'button'}
                                                    onClick={() => setActiveModalDomain(dom)}
                                                    className={'flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 text-xs font-semibold transition border border-cyan-500/30'}
                                                >
                                                    <InformationCircleIcon className={'w-3.5 h-3.5'} />
                                                    <span>DNS Records</span>
                                                </button>
                                            )}

                                            {!dom.isPrimary && (
                                                <button
                                                    type={'button'}
                                                    onClick={() => handleSetPrimary(dom.id)}
                                                    className={'flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition border border-white/5'}
                                                    title={'Set as primary connection domain'}
                                                >
                                                    <StarIcon className={'w-3.5 h-3.5 text-amber-400'} />
                                                    <span>Make Primary</span>
                                                </button>
                                            )}

                                            <button
                                                type={'button'}
                                                onClick={() => handleDelete(dom)}
                                                className={'p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition'}
                                                title={'Remove domain'}
                                            >
                                                <TrashIcon className={'w-4 h-4'} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Knowledge Base / FAQ Card */}
                <div className={'rounded-2xl border border-white/10 bg-[#0d1628]/60 p-5 shadow-xl backdrop-blur-md space-y-3 text-xs'}>
                    <h3 className={'text-sm font-bold text-white flex items-center gap-2'}>
                        <InformationCircleIcon className={'w-4 h-4 text-cyan-400'} />
                        Domain & DNS Setup Frequently Asked Questions
                    </h3>
                    <div className={'grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 text-neutral-300'}>
                        <div className={'rounded-xl bg-black/30 p-3.5 border border-white/5'}>
                            <h4 className={'font-bold text-cyan-300 text-xs'}>What is an SRV Record?</h4>
                            <p className={'text-[11px] text-neutral-400 mt-1 leading-relaxed'}>
                                An SRV record connects a domain name directly to a specific port (like port {javaPort}). Players only type your domain without having to add &quot;:{javaPort}&quot; at the end.
                            </p>
                        </div>
                        <div className={'rounded-xl bg-black/30 p-3.5 border border-white/5'}>
                            <h4 className={'font-bold text-amber-300 text-xs'}>Cloudflare Grey Cloud (DNS Only)</h4>
                            <p className={'text-[11px] text-neutral-400 mt-1 leading-relaxed'}>
                                Cloudflare&apos;s orange-cloud proxy only supports web HTTP/HTTPS. When configuring your Minecraft records in Cloudflare, make sure the cloud icon is <strong>Grey (DNS Only)</strong>.
                            </p>
                        </div>
                        <div className={'rounded-xl bg-black/30 p-3.5 border border-white/5'}>
                            <h4 className={'font-bold text-emerald-300 text-xs'}>How Bedrock Players Connect</h4>
                            <p className={'text-[11px] text-neutral-400 mt-1 leading-relaxed'}>
                                Bedrock players (iOS, Android, Windows Bedrock, Xbox) enter your domain in <strong>Server Address</strong> and your Bedrock UDP port (<strong>{bedrockPort || 19132}</strong>) in the <strong>Port</strong> box.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* DNS Instructions Modal */}
            {activeModalDomain && (
                <DnsInstructionsModal
                    domain={activeModalDomain}
                    onClose={() => setActiveModalDomain(null)}
                />
            )}
        </ServerContentBlock>
    );
};
