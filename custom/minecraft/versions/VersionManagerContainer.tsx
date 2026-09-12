import React, { useEffect, useState } from 'react';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { ServerContext } from '@/state/server';
import useFlash from '@/plugins/useFlash';
import Spinner from '@/components/elements/Spinner';
import Button from '@/components/elements/Button';
import classNames from 'classnames';
import {
    CheckCircleIcon,
    DownloadIcon,
    ExclamationIcon,
    FireIcon,
    RefreshIcon,
    SparklesIcon,
} from '@heroicons/react/solid';
import {
    fetchArclightVersions,
    fetchPaperVersions,
    fetchPurpurVersions,
    getPaperDownloadUrl,
    SoftwareType,
    switchServerSoftware,
    VersionItem,
} from '@/api/server/minecraft/versions';

export default () => {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const { clearFlashes, clearAndAddHttpError, addFlash } = useFlash();

    const [activeSoftware, setActiveSoftware] = useState<SoftwareType>('arclight');
    const [loading, setLoading] = useState(true);
    const [switching, setSwitching] = useState<string | null>(null);
    const [backup, setBackup] = useState(true);
    const [versions, setVersions] = useState<VersionItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const loadVersions = async (software: SoftwareType) => {
        try {
            setLoading(true);
            let list: VersionItem[] = [];
            if (software === 'arclight') {
                list = await fetchArclightVersions();
            } else if (software === 'purpur') {
                list = await fetchPurpurVersions();
            } else {
                list = await fetchPaperVersions();
            }
            setVersions(list);
        } catch (error) {
            clearAndAddHttpError({ error, key: 'versions' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        clearFlashes('versions');
        loadVersions(activeSoftware);
    }, [activeSoftware]);

    const handleInstall = async (item: VersionItem) => {
        const confirmMsg = `Are you sure you want to install ${item.name}? This will replace server.jar. You will need to restart the server.`;
        if (!confirm(confirmMsg)) return;

        try {
            clearFlashes('versions');
            setSwitching(item.name);

            let url = item.downloadUrl;
            if (activeSoftware === 'paper') {
                url = await getPaperDownloadUrl(item.version);
            }

            await switchServerSoftware(uuid, url, backup);

            addFlash({
                key: 'versions',
                type: 'success',
                message: `Successfully pulled ${item.name}! Restart your server to boot with the new software.`,
            });
        } catch (error) {
            clearAndAddHttpError({ error, key: 'versions' });
        } finally {
            setSwitching(null);
        }
    };

    const filteredVersions = versions.filter((v) =>
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.version.includes(searchQuery)
    );

    return (
        <ServerContentBlock title={'Server Software & Version'} showFlashKey={'versions'}>
            <div className={'flex flex-col gap-6'}>
                {/* Header card */}
                <div
                    className={
                        'relative overflow-hidden rounded-2xl border border-cyan-500/25 bg-[#0a0f1d]/90 p-6 shadow-2xl backdrop-blur-xl'
                    }
                >
                    <div className={'flex flex-col md:flex-row md:items-center justify-between gap-4'}>
                        <div className={'flex items-start space-x-4'}>
                            <div
                                className={
                                    'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/30 shadow-[0_0_20px_rgba(56,189,248,0.25)]'
                                }
                            >
                                <FireIcon className={'h-8 w-8 text-cyan-400'} />
                            </div>
                            <div>
                                <h1 className={'text-xl sm:text-2xl font-bold font-header text-white'}>
                                    Server Software & Version Switcher
                                </h1>
                                <p className={'text-sm text-neutral-400 mt-1 max-w-2xl'}>
                                    Switch your server engine between <strong>Arclight</strong> (hybrid Mods + Plugins),{' '}
                                    <strong>Paper</strong>, and <strong>Purpur</strong> in a single click.
                                </p>
                            </div>
                        </div>

                        <div className={'flex items-center gap-3'}>
                            <label className={'flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none'}>
                                <input
                                    type={'checkbox'}
                                    checked={backup}
                                    onChange={(e) => setBackup(e.target.checked)}
                                    className={'w-4 h-4 rounded border-gray-700 text-cyan-500 bg-slate-900'}
                                />
                                Backup server.jar
                            </label>
                            <Button.Text
                                onClick={() => loadVersions(activeSoftware)}
                                disabled={loading}
                                className={'flex items-center gap-1.5 text-xs'}
                            >
                                <RefreshIcon className={classNames('w-4 h-4', { 'animate-spin': loading })} />
                                Refresh
                            </Button.Text>
                        </div>
                    </div>

                    {/* Software Tabs */}
                    <div className={'mt-6 flex flex-wrap items-center gap-2'}>
                        {[
                            {
                                id: 'arclight' as SoftwareType,
                                name: 'Arclight (Forge/NeoForge/Fabric + Plugins)',
                                badge: 'Hybrid Mods+Plugins',
                                badgeColor: 'text-amber-300 border-amber-500/40 bg-amber-500/10',
                            },
                            {
                                id: 'purpur' as SoftwareType,
                                name: 'Purpur (High Performance)',
                                badge: 'Recommended',
                                badgeColor: 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10',
                            },
                            {
                                id: 'paper' as SoftwareType,
                                name: 'Paper (Stable Vanilla+)',
                                badge: 'Standard',
                                badgeColor: 'text-gray-300 border-white/20 bg-white/5',
                            },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                type={'button'}
                                onClick={() => setActiveSoftware(tab.id)}
                                className={classNames(
                                    'flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm border transition-all duration-150',
                                    activeSoftware === tab.id
                                        ? 'bg-cyan-500/20 text-white border-cyan-500/50 shadow-[0_0_15px_rgba(56,189,248,0.25)]'
                                        : 'bg-white/5 text-gray-400 border-white/10 hover:text-white hover:bg-white/10'
                                )}
                            >
                                <span>{tab.name}</span>
                                <span className={classNames('px-2 py-0.5 rounded text-[10px] font-bold border uppercase', tab.badgeColor)}>
                                    {tab.badge}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Arclight Info Banner */}
                {activeSoftware === 'arclight' && (
                    <div className={'rounded-2xl border border-amber-500/30 bg-amber-950/20 p-5 shadow-lg flex items-start gap-4'}>
                        <SparklesIcon className={'w-6 h-6 text-amber-400 shrink-0 mt-0.5'} />
                        <div className={'text-xs sm:text-sm text-amber-200/90'}>
                            <strong>Why choose Arclight?</strong> Arclight allows you to run <strong>Minecraft Mods</strong> (Forge, NeoForge, or Fabric) and <strong>Bukkit/Spigot Plugins</strong> (like EssentialsX, LuckPerms, GeyserMC, WorldEdit) simultaneously on the exact same server!
                        </div>
                    </div>
                )}

                {/* Search & Versions Grid */}
                <div className={'flex flex-col gap-4'}>
                    <div className={'flex items-center justify-between'}>
                        <h2 className={'text-base font-bold text-white'}>
                            Available Versions ({filteredVersions.length})
                        </h2>
                        <input
                            type={'text'}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={'Filter version (e.g. 1.20.4)...'}
                            className={'bg-slate-900/80 border border-white/10 rounded-xl px-3.5 py-1.5 text-xs text-white placeholder-gray-500 w-60'}
                        />
                    </div>

                    {loading ? (
                        <div className={'p-12 flex justify-center'}>
                            <Spinner size={'large'} />
                        </div>
                    ) : filteredVersions.length === 0 ? (
                        <div className={'rounded-2xl border border-white/10 bg-[#0a0f1d]/50 p-12 text-center text-neutral-400 text-sm'}>
                            No matching versions found.
                        </div>
                    ) : (
                        <div className={'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'}>
                            {filteredVersions.map((item) => (
                                <div
                                    key={item.downloadUrl || item.name}
                                    className={'flex flex-col justify-between rounded-xl border border-white/10 bg-[#0a0f1d]/80 p-4 hover:border-cyan-500/30 transition duration-150'}
                                >
                                    <div>
                                        <div className={'flex items-center justify-between gap-2'}>
                                            <span className={'text-sm font-bold text-white font-mono'}>
                                                {item.name}
                                            </span>
                                            {item.subType && (
                                                <span className={'px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'}>
                                                    {item.subType}
                                                </span>
                                            )}
                                        </div>
                                        <div className={'text-xs text-neutral-400 mt-1 flex items-center gap-2'}>
                                            <span>MC {item.version}</span>
                                            {item.isStable && (
                                                <span className={'text-emerald-400 text-[10px] flex items-center gap-0.5'}>
                                                    <CheckCircleIcon className={'w-3 h-3'} /> Stable
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className={'mt-4 pt-3 border-t border-white/5 flex items-center justify-between'}>
                                        <span className={'text-[11px] text-gray-500 font-mono'}>
                                            server.jar
                                        </span>
                                        <Button
                                            onClick={() => handleInstall(item)}
                                            disabled={!!switching}
                                            className={'text-xs font-bold px-3 py-1.5'}
                                        >
                                            <DownloadIcon className={'w-3.5 h-3.5 mr-1'} />
                                            {switching === item.name ? 'Installing...' : 'Install'}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </ServerContentBlock>
    );
};
