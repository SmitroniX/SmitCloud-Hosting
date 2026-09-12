import React, { useEffect, useState } from 'react';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { ServerContext } from '@/state/server';
import useFlash from '@/plugins/useFlash';
import Spinner from '@/components/elements/Spinner';
import Button from '@/components/elements/Button';
import Input from '@/components/elements/Input';
import Modal from '@/components/elements/Modal';
import { bytesToString } from '@/lib/formatters';
import classNames from 'classnames';
import {
    GlobeIcon,
    PlusIcon,
    DownloadIcon,
    RefreshIcon,
    TrashIcon,
    CheckCircleIcon,
    SparklesIcon,
    FolderIcon,
    ShieldCheckIcon,
    CloudDownloadIcon,
} from '@heroicons/react/solid';
import {
    MinecraftWorld,
    WorldDatapack,
    fetchWorlds,
    setActiveWorld,
    createNewWorld,
    deleteWorld,
    backupWorld,
    importWorldFromUrl,
    fetchDatapacks,
    toggleDatapack,
    deleteDatapack,
} from '@/api/server/minecraft/worlds';

export default () => {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const { clearFlashes, clearAndAddHttpError, addFlash } = useFlash();

    const [loading, setLoading] = useState(true);
    const [worlds, setWorlds] = useState<MinecraftWorld[]>([]);
    const [activeWorldName, setActiveWorldName] = useState('world');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newWorldName, setNewWorldName] = useState('');
    const [newWorldSeed, setNewWorldSeed] = useState('');
    const [newWorldType, setNewWorldType] = useState('default');

    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importUrl, setImportUrl] = useState('');

    const [isDatapacksModalOpen, setIsDatapacksModalOpen] = useState(false);
    const [selectedWorldForDatapacks, setSelectedWorldForDatapacks] = useState<string | null>(null);
    const [datapacks, setDatapacks] = useState<WorldDatapack[]>([]);
    const [loadingDatapacks, setLoadingDatapacks] = useState(false);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await fetchWorlds(uuid);
            setWorlds(data.worlds);
            setActiveWorldName(data.activeWorld);
        } catch (error) {
            clearAndAddHttpError({ error, key: 'worlds' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        clearFlashes('worlds');
        loadData();
    }, []);

    const handleSetActive = async (worldName: string) => {
        try {
            clearFlashes('worlds');
            setActionLoading(`activate-${worldName}`);
            await setActiveWorld(uuid, worldName);
            setActiveWorldName(worldName);
            await loadData();
            addFlash({
                key: 'worlds',
                type: 'success',
                message: `Active world set to "${worldName}". Restart the server to load this world!`,
            });
        } catch (error) {
            clearAndAddHttpError({ error, key: 'worlds' });
        } finally {
            setActionLoading(null);
        }
    };

    const handleCreateWorld = async () => {
        const cleanName = newWorldName.trim();
        if (!cleanName) {
            alert('Please specify a world name.');
            return;
        }

        try {
            clearFlashes('worlds');
            setActionLoading('create');
            await createNewWorld(uuid, cleanName, newWorldSeed, newWorldType);
            setIsCreateModalOpen(false);
            setNewWorldName('');
            setNewWorldSeed('');
            await loadData();
            addFlash({
                key: 'worlds',
                type: 'success',
                message: `Created world "${cleanName}"! Restart your server to generate it.`,
            });
        } catch (error) {
            clearAndAddHttpError({ error, key: 'worlds' });
        } finally {
            setActionLoading(null);
        }
    };

    const handleImportWorld = async () => {
        const cleanUrl = importUrl.trim();
        if (!cleanUrl) {
            alert('Please provide a direct download URL (.zip).');
            return;
        }

        try {
            clearFlashes('worlds');
            setActionLoading('import');
            await importWorldFromUrl(uuid, cleanUrl, 'imported_world');
            setIsImportModalOpen(false);
            setImportUrl('');
            await loadData();
            addFlash({
                key: 'worlds',
                type: 'success',
                message: 'World imported successfully! Check your world list.',
            });
        } catch (error) {
            clearAndAddHttpError({ error, key: 'worlds' });
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (worldName: string) => {
        const confirmMsg = `WARNING: Are you completely sure you want to delete "${worldName}"? This action CANNOT be undone and will delete the dimension folders.`;
        if (!confirm(confirmMsg)) return;

        try {
            clearFlashes('worlds');
            setActionLoading(`delete-${worldName}`);
            await deleteWorld(uuid, worldName);
            await loadData();
            addFlash({
                key: 'worlds',
                type: 'success',
                message: `World "${worldName}" was deleted successfully.`,
            });
        } catch (error) {
            clearAndAddHttpError({ error, key: 'worlds' });
        } finally {
            setActionLoading(null);
        }
    };

    const handleBackup = async (worldName: string) => {
        try {
            clearFlashes('worlds');
            setActionLoading(`backup-${worldName}`);
            const archiveName = await backupWorld(uuid, worldName);
            addFlash({
                key: 'worlds',
                type: 'success',
                message: `World "${worldName}" backed up to archive: ${archiveName}. Check your File Manager.`,
            });
        } catch (error) {
            clearAndAddHttpError({ error, key: 'worlds' });
        } finally {
            setActionLoading(null);
        }
    };

    const openDatapacks = async (worldName: string) => {
        setSelectedWorldForDatapacks(worldName);
        setIsDatapacksModalOpen(true);
        try {
            setLoadingDatapacks(true);
            const dpList = await fetchDatapacks(uuid, worldName);
            setDatapacks(dpList);
        } catch (error) {
            clearAndAddHttpError({ error, key: 'worlds' });
        } finally {
            setLoadingDatapacks(false);
        }
    };

    const handleToggleDatapack = async (dp: WorldDatapack) => {
        if (!selectedWorldForDatapacks) return;
        try {
            await toggleDatapack(uuid, selectedWorldForDatapacks, dp.filename, !dp.isEnabled);
            const updated = await fetchDatapacks(uuid, selectedWorldForDatapacks);
            setDatapacks(updated);
        } catch (error) {
            clearAndAddHttpError({ error, key: 'worlds' });
        }
    };

    const handleDeleteDatapack = async (dp: WorldDatapack) => {
        if (!selectedWorldForDatapacks) return;
        if (!confirm(`Delete datapack "${dp.name}"?`)) return;
        try {
            await deleteDatapack(uuid, selectedWorldForDatapacks, dp.filename);
            const updated = await fetchDatapacks(uuid, selectedWorldForDatapacks);
            setDatapacks(updated);
        } catch (error) {
            clearAndAddHttpError({ error, key: 'worlds' });
        }
    };

    const activeWorldData = worlds.find((w) => w.isActive) || worlds[0];

    return (
        <ServerContentBlock title={'World & Map Manager'} showFlashKey={'worlds'}>
            <div className={'flex flex-col gap-6'}>
                {/* Active World Hero Banner */}
                <div className={'relative overflow-hidden rounded-2xl border border-cyan-500/25 bg-[#0a0f1d]/90 p-6 shadow-2xl backdrop-blur-xl'}>
                    <div className={'pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl'} />
                    <div className={'pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl'} />

                    <div className={'relative flex flex-col md:flex-row md:items-center md:justify-between gap-6'}>
                        <div className={'flex items-start gap-4'}>
                            <div className={'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/25 text-white'}>
                                <GlobeIcon className={'h-7 w-7'} />
                            </div>
                            <div>
                                <div className={'flex flex-wrap items-center gap-2'}>
                                    <h1 className={'text-xl sm:text-2xl font-black tracking-tight text-white'}>
                                        {activeWorldData ? activeWorldData.name : activeWorldName}
                                    </h1>
                                    <span className={'inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]'}>
                                        <CheckCircleIcon className={'h-3.5 w-3.5'} />
                                        CURRENT ACTIVE WORLD
                                    </span>
                                </div>
                                <p className={'mt-1 text-xs sm:text-sm text-neutral-400'}>
                                    This world is loaded by default upon server startup. Dimensions and datapacks sync automatically.
                                </p>
                                <div className={'mt-3 flex flex-wrap gap-2 text-xs'}>
                                    <span className={'rounded-lg bg-neutral-800/80 px-2.5 py-1 text-neutral-300 border border-neutral-700/50 flex items-center gap-1.5'}>
                                        🌲 Overworld
                                    </span>
                                    <span className={classNames('rounded-lg px-2.5 py-1 border flex items-center gap-1.5', {
                                        'bg-red-950/40 text-red-300 border-red-800/40': activeWorldData?.hasNether,
                                        'bg-neutral-800/40 text-neutral-500 border-neutral-800': !activeWorldData?.hasNether,
                                    })}>
                                        🔥 Nether {activeWorldData?.hasNether ? '✓' : ''}
                                    </span>
                                    <span className={classNames('rounded-lg px-2.5 py-1 border flex items-center gap-1.5', {
                                        'bg-purple-950/40 text-purple-300 border-purple-800/40': activeWorldData?.hasEnd,
                                        'bg-neutral-800/40 text-neutral-500 border-neutral-800': !activeWorldData?.hasEnd,
                                    })}>
                                        🌌 The End {activeWorldData?.hasEnd ? '✓' : ''}
                                    </span>
                                    {activeWorldData && activeWorldData.datapackCount > 0 && (
                                        <span className={'rounded-lg bg-cyan-950/40 text-cyan-300 border border-cyan-800/40 px-2.5 py-1 flex items-center gap-1.5'}>
                                            📦 {activeWorldData.datapackCount} Datapacks
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className={'flex flex-wrap items-center gap-3 shrink-0'}>
                            {activeWorldData && (
                                <button
                                    type={'button'}
                                    disabled={actionLoading === `backup-${activeWorldData.name}`}
                                    onClick={() => handleBackup(activeWorldData.name)}
                                    className={'flex items-center gap-1.5 rounded-xl bg-neutral-800/90 hover:bg-neutral-700 px-4 py-2.5 text-xs font-semibold text-neutral-200 border border-neutral-700 transition'}
                                >
                                    <DownloadIcon className={'h-4 w-4 text-cyan-400'} />
                                    {actionLoading === `backup-${activeWorldData.name}` ? 'Backing Up...' : 'Quick Backup (.tar.gz)'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Toolbar */}
                <div className={'flex flex-wrap items-center justify-between gap-4'}>
                    <div className={'flex flex-wrap items-center gap-2'}>
                        <button
                            type={'button'}
                            onClick={() => setIsCreateModalOpen(true)}
                            className={'flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-cyan-600/20 transition'}
                        >
                            <PlusIcon className={'h-4 w-4'} />
                            Create New World
                        </button>
                        <button
                            type={'button'}
                            onClick={() => setIsImportModalOpen(true)}
                            className={'flex items-center gap-1.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 px-4 py-2 text-xs font-semibold text-neutral-200 border border-neutral-700/60 transition'}
                        >
                            <CloudDownloadIcon className={'h-4 w-4 text-cyan-400'} />
                            Import from URL (.zip)
                        </button>
                    </div>

                    <button
                        type={'button'}
                        onClick={loadData}
                        disabled={loading}
                        className={'flex items-center gap-1.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 px-3 py-2 text-xs font-medium text-neutral-300 border border-neutral-700/60 transition'}
                    >
                        <RefreshIcon className={classNames('h-3.5 w-3.5', { 'animate-spin': loading })} />
                        Refresh
                    </button>
                </div>

                {/* Worlds List */}
                {loading ? (
                    <div className={'flex justify-center py-16'}>
                        <Spinner size={'large'} centered />
                    </div>
                ) : worlds.length === 0 ? (
                    <div className={'rounded-xl border border-neutral-800 bg-neutral-900/60 p-12 text-center text-neutral-400'}>
                        No world directories found. Start your server once to generate a default world.
                    </div>
                ) : (
                    <div className={'grid grid-cols-1 md:grid-cols-2 gap-4'}>
                        {worlds.map((w) => (
                            <div
                                key={w.name}
                                className={classNames(
                                    'group relative rounded-2xl border p-5 transition duration-200 flex flex-col justify-between backdrop-blur-md',
                                    {
                                        'border-cyan-500/40 bg-cyan-950/10 shadow-[0_0_24px_rgba(6,182,212,0.12)]': w.isActive,
                                        'border-neutral-800/80 bg-neutral-900/60 hover:border-neutral-700': !w.isActive,
                                    }
                                )}
                            >
                                <div>
                                    <div className={'flex items-start justify-between gap-3'}>
                                        <div className={'flex items-center gap-3 min-w-0'}>
                                            <div className={classNames('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-bold shadow-md', {
                                                'bg-gradient-to-tr from-cyan-500 to-blue-600 text-white': w.isActive,
                                                'bg-neutral-800 text-neutral-400': !w.isActive,
                                            })}>
                                                <FolderIcon className={'h-5 w-5'} />
                                            </div>
                                            <div className={'min-w-0'}>
                                                <div className={'flex items-center gap-2'}>
                                                    <span className={'truncate font-bold text-white text-base'}>
                                                        {w.name}
                                                    </span>
                                                    {w.isActive && (
                                                        <span className={'rounded bg-cyan-500/20 px-2 py-0.5 text-[10px] font-extrabold uppercase text-cyan-400 border border-cyan-500/30'}>
                                                            ACTIVE
                                                        </span>
                                                    )}
                                                </div>
                                                <p className={'text-xs text-neutral-400 mt-0.5'}>
                                                    Size: {w.size > 0 ? bytesToString(w.size) : 'Calculated on load'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Dimensions and Datapacks */}
                                    <div className={'mt-4 flex flex-wrap gap-2 text-xs'}>
                                        <span className={'rounded-md bg-neutral-800/80 px-2 py-0.5 text-neutral-300 text-[11px]'}>
                                            🌲 Overworld
                                        </span>
                                        {w.hasNether && (
                                            <span className={'rounded-md bg-red-950/50 px-2 py-0.5 text-red-300 text-[11px] border border-red-800/30'}>
                                                🔥 Nether
                                            </span>
                                        )}
                                        {w.hasEnd && (
                                            <span className={'rounded-md bg-purple-950/50 px-2 py-0.5 text-purple-300 text-[11px] border border-purple-800/30'}>
                                                🌌 The End
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className={'mt-5 pt-4 border-t border-neutral-800/80 flex flex-wrap items-center justify-between gap-2'}>
                                    <div className={'flex items-center gap-2'}>
                                        {!w.isActive ? (
                                            <button
                                                type={'button'}
                                                disabled={actionLoading === `activate-${w.name}`}
                                                onClick={() => handleSetActive(w.name)}
                                                className={'rounded-xl bg-cyan-600 hover:bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-white transition'}
                                            >
                                                {actionLoading === `activate-${w.name}` ? 'Setting...' : 'Set Active'}
                                            </button>
                                        ) : (
                                            <span className={'text-xs font-bold text-emerald-400 flex items-center gap-1'}>
                                                <CheckCircleIcon className={'h-4 w-4'} /> Current World
                                            </span>
                                        )}
                                        <button
                                            type={'button'}
                                            onClick={() => openDatapacks(w.name)}
                                            className={'rounded-xl bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-300 transition'}
                                        >
                                            Datapacks ({w.datapackCount})
                                        </button>
                                    </div>

                                    <div className={'flex items-center gap-1.5'}>
                                        <button
                                            type={'button'}
                                            title={'Backup Archive'}
                                            disabled={actionLoading === `backup-${w.name}`}
                                            onClick={() => handleBackup(w.name)}
                                            className={'p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition'}
                                        >
                                            <DownloadIcon className={'h-4 w-4'} />
                                        </button>
                                        {!w.isActive && (
                                            <button
                                                type={'button'}
                                                title={'Delete World'}
                                                disabled={actionLoading === `delete-${w.name}`}
                                                onClick={() => handleDelete(w.name)}
                                                className={'p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-950/40 transition'}
                                            >
                                                <TrashIcon className={'h-4 w-4'} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create World Modal */}
            <Modal
                visible={isCreateModalOpen}
                onDismissed={() => setIsCreateModalOpen(false)}
                showSpinnerOverlay={actionLoading === 'create'}
            >
                <div className={'flex flex-col gap-4'}>
                    <h2 className={'text-lg font-bold text-white flex items-center gap-2'}>
                        <GlobeIcon className={'h-5 w-5 text-cyan-400'} />
                        Create New Minecraft World
                    </h2>
                    <p className={'text-xs text-neutral-400'}>
                        Enter a unique world name. This will update <code>level-name</code> in <code>server.properties</code>. Upon server restart, the new world will generate automatically.
                    </p>

                    <div>
                        <label className={'block text-xs font-medium text-neutral-300 mb-1'}>World Folder Name</label>
                        <Input
                            placeholder={'e.g. survival_s2 or hardcore'}
                            value={newWorldName}
                            onChange={(e) => setNewWorldName(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className={'block text-xs font-medium text-neutral-300 mb-1'}>Seed (Optional)</label>
                        <Input
                            placeholder={'e.g. 1234567890 or leave blank for random'}
                            value={newWorldSeed}
                            onChange={(e) => setNewWorldSeed(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className={'block text-xs font-medium text-neutral-300 mb-1'}>World Type</label>
                        <select
                            value={newWorldType}
                            onChange={(e) => setNewWorldType(e.target.value)}
                            className={'w-full rounded-lg border border-neutral-700 bg-neutral-800 p-2.5 text-xs text-white'}
                        >
                            <option value={'minecraft:normal'}>Default (Normal)</option>
                            <option value={'minecraft:flat'}>Superflat</option>
                            <option value={'minecraft:large_biomes'}>Large Biomes</option>
                            <option value={'minecraft:amplified'}>Amplified</option>
                        </select>
                    </div>

                    <div className={'mt-4 flex justify-end gap-3'}>
                        <Button isSecondary onClick={() => setIsCreateModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateWorld}>
                            Create World
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Import World Modal */}
            <Modal
                visible={isImportModalOpen}
                onDismissed={() => setIsImportModalOpen(false)}
                showSpinnerOverlay={actionLoading === 'import'}
            >
                <div className={'flex flex-col gap-4'}>
                    <h2 className={'text-lg font-bold text-white flex items-center gap-2'}>
                        <CloudDownloadIcon className={'h-5 w-5 text-cyan-400'} />
                        Import World Archive (.zip)
                    </h2>
                    <p className={'text-xs text-neutral-400'}>
                        Paste a direct URL to a world .zip or .tar.gz archive (e.g. from CurseForge, MediaFire, Google Drive, or PlanetMinecraft). The server will pull and extract it directly into the root directory.
                    </p>

                    <div>
                        <label className={'block text-xs font-medium text-neutral-300 mb-1'}>Direct Download URL</label>
                        <Input
                            placeholder={'https://example.com/worlds/custom_map.zip'}
                            value={importUrl}
                            onChange={(e) => setImportUrl(e.target.value)}
                        />
                    </div>

                    <div className={'mt-4 flex justify-end gap-3'}>
                        <Button isSecondary onClick={() => setIsImportModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleImportWorld}>
                            Start Import
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Datapacks Modal */}
            <Modal
                visible={isDatapacksModalOpen}
                onDismissed={() => setIsDatapacksModalOpen(false)}
            >
                <div className={'flex flex-col gap-4'}>
                    <h2 className={'text-lg font-bold text-white flex items-center gap-2'}>
                        <SparklesIcon className={'h-5 w-5 text-cyan-400'} />
                        Datapacks for &quot;{selectedWorldForDatapacks}&quot;
                    </h2>
                    <p className={'text-xs text-neutral-400'}>
                        Enable, disable, or remove datapacks inside <code>/{selectedWorldForDatapacks}/datapacks</code>.
                    </p>

                    {loadingDatapacks ? (
                        <div className={'py-8 flex justify-center'}>
                            <Spinner centered />
                        </div>
                    ) : datapacks.length === 0 ? (
                        <div className={'rounded-lg border border-neutral-800 bg-neutral-900/60 p-6 text-center text-xs text-neutral-400'}>
                            No datapacks found in this world. Upload .zip datapacks into <code>/{selectedWorldForDatapacks}/datapacks</code> via the File Manager.
                        </div>
                    ) : (
                        <div className={'flex flex-col gap-2 max-h-80 overflow-y-auto'}>
                            {datapacks.map((dp) => (
                                <div
                                    key={dp.filename}
                                    className={'flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/80 p-3'}
                                >
                                    <div>
                                        <p className={'text-xs font-semibold text-white'}>{dp.name}</p>
                                        <p className={'text-[10px] text-neutral-400 mt-0.5'}>
                                            {dp.size > 0 ? bytesToString(dp.size) : 'Folder'} • {dp.isEnabled ? 'Enabled' : 'Disabled'}
                                        </p>
                                    </div>
                                    <div className={'flex items-center gap-2'}>
                                        <button
                                            type={'button'}
                                            onClick={() => handleToggleDatapack(dp)}
                                            className={classNames('rounded-lg px-2.5 py-1 text-xs font-semibold transition', {
                                                'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30': dp.isEnabled,
                                                'bg-neutral-800 text-neutral-400': !dp.isEnabled,
                                            })}
                                        >
                                            {dp.isEnabled ? 'Enabled' : 'Disabled'}
                                        </button>
                                        <button
                                            type={'button'}
                                            onClick={() => handleDeleteDatapack(dp)}
                                            className={'p-1.5 text-neutral-400 hover:text-red-400 transition'}
                                        >
                                            <TrashIcon className={'h-4 w-4'} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className={'mt-4 flex justify-end'}>
                        <Button isSecondary onClick={() => setIsDatapacksModalOpen(false)}>
                            Close
                        </Button>
                    </div>
                </div>
            </Modal>
        </ServerContentBlock>
    );
};
