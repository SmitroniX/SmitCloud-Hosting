import React, { useEffect, useState } from 'react';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { ServerContext } from '@/state/server';
import useFlash from '@/plugins/useFlash';
import Spinner from '@/components/elements/Spinner';
import Input from '@/components/elements/Input';
import classNames from 'classnames';
import {
    MapIcon,
    ExternalLinkIcon,
    RefreshIcon,
    CloudDownloadIcon,
    SparklesIcon,
    AdjustmentsIcon,
} from '@heroicons/react/solid';
import {
    MapPluginStatus,
    checkMapStatus,
    installBlueMap,
    installDynmap,
    configureMapPort,
} from '@/api/server/minecraft/map';

export default () => {
    const server = ServerContext.useStoreState((state) => state.server.data!);
    const { clearFlashes, clearAndAddHttpError, addFlash } = useFlash();

    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [status, setStatus] = useState<MapPluginStatus>({
        hasBlueMap: false,
        hasDynmap: false,
        configuredPort: 8100,
        mapType: 'none',
        webUrl: '',
    });

    const [customPort, setCustomPort] = useState<number>(8100);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        loadData();
    }, [server.uuid]);

    const loadData = async () => {
        try {
            setLoading(true);
            clearFlashes('map');
            const res = await checkMapStatus(server.uuid, server.allocations?.[0]?.alias || server.allocations?.[0]?.ip || 'play.shadowpixel.fun');
            setStatus(res);
            setCustomPort(res.configuredPort);
        } catch (error) {
            clearAndAddHttpError({ error, key: 'map' });
        } finally {
            setLoading(false);
        }
    };

    const handleInstall = async (type: 'bluemap' | 'dynmap') => {
        try {
            setActionLoading(type);
            clearFlashes('map');
            if (type === 'bluemap') await installBlueMap(server.uuid);
            if (type === 'dynmap') await installDynmap(server.uuid);
            await loadData();
            addFlash({
                key: 'map',
                type: 'success',
                message: `✅ Installed ${type === 'bluemap' ? 'BlueMap' : 'Dynmap'} to /plugins! Restart your server to begin initial world rendering.`,
            });
        } catch (error) {
            clearAndAddHttpError({ error, key: 'map' });
        } finally {
            setActionLoading(null);
        }
    };

    const handleSavePort = async () => {
        if (status.mapType === 'none') return;
        try {
            setActionLoading('port');
            clearFlashes('map');
            await configureMapPort(server.uuid, status.mapType, customPort);
            await loadData();
            addFlash({
                key: 'map',
                type: 'success',
                message: `✅ Web map port updated to ${customPort}! Restart your server to apply.`,
            });
        } catch (error) {
            clearAndAddHttpError({ error, key: 'map' });
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <ServerContentBlock title={'3D Live Web Map'} showFlashKey={'map'}>
            <div className={'flex flex-col gap-6'}>
                {/* Header Card */}
                <div className={'relative overflow-hidden rounded-2xl border border-teal-500/25 bg-[#0a0f1d]/90 p-6 shadow-2xl backdrop-blur-xl'}>
                    <div className={'pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-teal-500/10 blur-3xl'} />
                    <div className={'pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl'} />

                    <div className={'relative flex flex-col md:flex-row md:items-center md:justify-between gap-6'}>
                        <div className={'flex items-start gap-4'}>
                            <div className={'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-600 shadow-lg shadow-teal-500/25 text-white'}>
                                <MapIcon className={'h-7 w-7'} />
                            </div>
                            <div>
                                <div className={'flex flex-wrap items-center gap-2'}>
                                    <h1 className={'text-xl sm:text-2xl font-black tracking-tight text-white'}>
                                        3D Live Web Map
                                    </h1>
                                    <span className={'inline-flex items-center gap-1.5 rounded-full bg-teal-500/15 px-3 py-0.5 text-xs font-bold text-teal-400 border border-teal-500/30'}>
                                        <SparklesIcon className={'h-3.5 w-3.5'} />
                                        BLUEMAP &amp; DYNMAP
                                    </span>
                                    {status.mapType !== 'none' && (
                                        <span className={'inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/30 capitalize'}>
                                            ● {status.mapType} Active
                                        </span>
                                    )}
                                </div>
                                <p className={'mt-1 text-xs sm:text-sm text-neutral-400'}>
                                    Explore your Minecraft worlds in full 3D right inside your browser with live player positions and chunk renders.
                                </p>
                            </div>
                        </div>

                        <div className={'flex flex-wrap items-center gap-3 shrink-0'}>
                            {status.mapType !== 'none' && (
                                <a
                                    href={status.webUrl}
                                    target={'_blank'}
                                    rel={'noopener noreferrer'}
                                    className={'flex items-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 px-4 py-2 text-xs font-bold text-white shadow transition'}
                                >
                                    <ExternalLinkIcon className={'h-4 w-4'} />
                                    Open in New Tab
                                </a>
                            )}
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
                </div>

                {loading ? (
                    <div className={'py-16 text-center'}>
                        <Spinner size={'large'} centered />
                    </div>
                ) : status.mapType === 'none' ? (
                    /* Installation Prompt */
                    <div className={'rounded-2xl border border-dashed border-neutral-800 bg-[#0a0f1d]/50 p-12 text-center'}>
                        <MapIcon className={'mx-auto h-12 w-12 text-neutral-600'} />
                        <h3 className={'mt-3 text-base font-bold text-white'}>No Web Map Plugin Installed</h3>
                        <p className={'mt-1 text-xs text-neutral-400 max-w-md mx-auto leading-relaxed'}>
                            Install BlueMap (modern 3D renderer) or Dynmap (classic 2D/3D map) to view your world and player positions in real time.
                        </p>

                        <div className={'mt-6 flex flex-wrap items-center justify-center gap-4'}>
                            <button
                                type={'button'}
                                disabled={actionLoading !== null}
                                onClick={() => handleInstall('bluemap')}
                                className={'flex items-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-500 py-3 px-6 text-xs font-bold text-white shadow-lg shadow-teal-600/25 transition'}
                            >
                                <CloudDownloadIcon className={'h-4 w-4'} />
                                {actionLoading === 'bluemap' ? 'Installing BlueMap...' : 'Install BlueMap 3D (Recommended)'}
                            </button>
                            <button
                                type={'button'}
                                disabled={actionLoading !== null}
                                onClick={() => handleInstall('dynmap')}
                                className={'flex items-center gap-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 py-3 px-6 text-xs font-bold text-neutral-200 border border-neutral-700 transition'}
                            >
                                <CloudDownloadIcon className={'h-4 w-4'} />
                                {actionLoading === 'dynmap' ? 'Installing Dynmap...' : 'Install Dynmap Classic'}
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Live Embedded Viewer */
                    <div className={'flex flex-col gap-4'}>
                        {/* Port settings bar */}
                        <div className={'flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-neutral-800 bg-[#0a0f1d]/80 text-xs'}>
                            <div className={'flex items-center gap-3'}>
                                <span className={'text-neutral-400 font-semibold'}>Webserver Port:</span>
                                <div className={'w-28'}>
                                    <Input
                                        type={'number'}
                                        value={customPort}
                                        onChange={(e) => setCustomPort(parseInt(e.target.value, 10))}
                                    />
                                </div>
                                <button
                                    type={'button'}
                                    disabled={actionLoading === 'port'}
                                    onClick={handleSavePort}
                                    className={'rounded-lg bg-teal-600 hover:bg-teal-500 px-3 py-1.5 text-xs font-bold text-white transition'}
                                >
                                    {actionLoading === 'port' ? 'Saving...' : 'Update Port'}
                                </button>
                            </div>

                            <div className={'text-neutral-400 text-[11px]'}>
                                Make sure this port is allocated in the <strong className={'text-white'}>Network</strong> tab.
                            </div>
                        </div>

                        {/* Iframe Viewport */}
                        <div className={'relative rounded-2xl border border-neutral-800 overflow-hidden bg-black shadow-2xl'} style={{ height: '700px' }}>
                            <iframe
                                src={status.webUrl}
                                title={'Minecraft Live Map'}
                                className={'w-full h-full border-0'}
                                sandbox={'allow-scripts allow-same-origin allow-popups'}
                            />
                        </div>
                    </div>
                )}
            </div>
        </ServerContentBlock>
    );
};
