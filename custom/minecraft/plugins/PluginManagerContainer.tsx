import React, { useEffect, useRef, useState } from 'react';
import { ServerContext } from '@/state/server';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import FlashMessageRender from '@/components/FlashMessageRender';
import useFlash from '@/plugins/useFlash';
import Spinner from '@/components/elements/Spinner';
import Button from '@/components/elements/Button';
import Input from '@/components/elements/Input';
import GreyRowBox from '@/components/elements/GreyRowBox';
import TitledGreyBox from '@/components/elements/TitledGreyBox';
import { bytesToString } from '@/lib/formatters';
import tw from 'twin.macro';
import {
    InstalledPlugin,
    OnlinePlugin,
    fetchInstalledPlugins,
    togglePlugin,
    deletePlugin,
    createPluginsFolder,
    pullPlugin,
    searchModrinth,
    getModrinthDownload,
    uploadPluginFile,
} from '@/api/server/minecraft/plugins';
import { sendServerCommand } from '@/api/server/minecraft/players';

type Tab = 'installed' | 'search' | 'popular';

interface PopularPluginDef {
    name: string;
    description: string;
    category: string;
    searchQuery: string;
}

const POPULAR_PLUGINS: PopularPluginDef[] = [
    {
        name: 'EssentialsX',
        description: 'Essential commands, economy, teleportation, player kits, homes, and spawns.',
        category: 'Essentials',
        searchQuery: 'essentialsx',
    },
    {
        name: 'LuckPerms',
        description: 'Advanced permissions management with web editor, groups, and prefix support.',
        category: 'Permissions',
        searchQuery: 'luckperms',
    },
    {
        name: 'ViaVersion',
        description: 'Allows newer Minecraft client versions to connect to your server seamlessly.',
        category: 'Compatibility',
        searchQuery: 'viaversion',
    },
    {
        name: 'WorldEdit',
        description: 'Fast, powerful in-game Minecraft world editor and builder tool.',
        category: 'Building',
        searchQuery: 'worldedit',
    },
    {
        name: 'Vault',
        description: 'Standard permissions & economy bridge required by nearly all Minecraft plugins.',
        category: 'Core / Library',
        searchQuery: 'vault',
    },
    {
        name: 'Geyser',
        description: 'Enables Minecraft Bedrock Edition players to join your Java Edition server.',
        category: 'Crossplay',
        searchQuery: 'geyser',
    },
    {
        name: 'Chunky',
        description: 'Fast, asynchronous chunk pre-generator that drastically reduces world exploration lag.',
        category: 'Performance',
        searchQuery: 'chunky',
    },
    {
        name: 'SkinsRestorer',
        description: 'Restores player skins for offline, hybrid, and proxied Minecraft servers.',
        category: 'Cosmetics',
        searchQuery: 'skinsrestorer',
    },
    {
        name: 'Simple Voice Chat',
        description: 'Proximity voice chat with 3D directional audio and push-to-talk inside Minecraft.',
        category: 'Voice Chat',
        searchQuery: 'simple voice chat',
    },
    {
        name: 'Multiverse-Core',
        description: 'Multi-world manager: import, create, and manage multiple world dimensions.',
        category: 'Worlds',
        searchQuery: 'multiverse core',
    },
    {
        name: 'ClearLag',
        description: 'Reduces entity lag spikes by cleaning ground items and limiting mob counts.',
        category: 'Performance',
        searchQuery: 'clearlag',
    },
    {
        name: 'TAB',
        description: 'Complete tablist, nametag, bossbar, and scoreboard formatting suite.',
        category: 'Interface',
        searchQuery: 'tab',
    },
];

export default () => {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const { clearFlashes, clearAndAddHttpError, addFlash } = useFlash();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [activeTab, setActiveTab] = useState<Tab>('installed');
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Installed plugins
    const [installedPlugins, setInstalledPlugins] = useState<InstalledPlugin[]>([]);
    const [installedFilter, setInstalledFilter] = useState('');

    // Online search
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<OnlinePlugin[]>([]);
    const [hasSearched, setHasSearched] = useState(false);

    useEffect(() => {
        loadInstalled();
    }, []);

    useEffect(() => {
        if (activeTab === 'search' && !hasSearched) {
            handleSearch('minecraft plugin');
        }
    }, [activeTab]);

    const loadInstalled = () => {
        setLoading(true);
        clearFlashes('plugins');
        fetchInstalledPlugins(uuid)
            .then(setInstalledPlugins)
            .catch((error) => clearAndAddHttpError({ key: 'plugins', error }))
            .finally(() => setLoading(false));
    };

    const handleToggle = (plugin: InstalledPlugin) => {
        setActionLoading(plugin.filename);
        clearFlashes('plugins');
        togglePlugin(uuid, plugin.filename, !plugin.isEnabled)
            .then(() => {
                addFlash({
                    key: 'plugins',
                    type: 'success',
                    title: 'Plugin Updated',
                    message: `${plugin.name} is now ${!plugin.isEnabled ? 'enabled' : 'disabled'}. Restart server to apply.`,
                });
                loadInstalled();
            })
            .catch((error) => clearAndAddHttpError({ key: 'plugins', error }))
            .finally(() => setActionLoading(null));
    };

    const handleDelete = (plugin: InstalledPlugin) => {
        if (!confirm(`Are you sure you want to delete ${plugin.name} (${plugin.filename})?`)) {
            return;
        }

        setActionLoading(plugin.filename);
        clearFlashes('plugins');
        deletePlugin(uuid, plugin.filename)
            .then(() => {
                addFlash({
                    key: 'plugins',
                    type: 'success',
                    title: 'Plugin Deleted',
                    message: `Removed ${plugin.name} from server.`,
                });
                loadInstalled();
            })
            .catch((error) => clearAndAddHttpError({ key: 'plugins', error }))
            .finally(() => setActionLoading(null));
    };

    const handleCreateFolder = () => {
        setActionLoading('create-folder');
        createPluginsFolder(uuid)
            .then(() => {
                addFlash({
                    key: 'plugins',
                    type: 'success',
                    title: 'Directory Created',
                    message: 'Created /plugins folder successfully.',
                });
                loadInstalled();
            })
            .catch((error) => clearAndAddHttpError({ key: 'plugins', error }))
            .finally(() => setActionLoading(null));
    };

    const handleSearch = (query: string) => {
        setLoading(true);
        clearFlashes('plugins');
        setHasSearched(true);
        searchModrinth(query)
            .then(setSearchResults)
            .catch((error) => clearAndAddHttpError({ key: 'plugins', error }))
            .finally(() => setLoading(false));
    };

    const handleInstallOnline = (plugin: OnlinePlugin) => {
        setActionLoading(plugin.id);
        clearFlashes('plugins');

        getModrinthDownload(plugin.id)
            .then((dl) => {
                if (!dl) {
                    throw new Error(`Could not find a valid .jar file for ${plugin.title}.`);
                }
                return pullPlugin(uuid, dl.url, dl.filename).then(() => dl.filename);
            })
            .then((filename) => {
                addFlash({
                    key: 'plugins',
                    type: 'success',
                    title: 'Download Started',
                    message: `Installing ${plugin.title} (${filename}). It will appear in your plugins directory in a few moments!`,
                });
                setTimeout(() => loadInstalled(), 2500);
            })
            .catch((error) => clearAndAddHttpError({ key: 'plugins', error }))
            .finally(() => setActionLoading(null));
    };

    const handleInstallPopular = (pop: PopularPluginDef) => {
        setActionLoading(pop.name);
        clearFlashes('plugins');

        searchModrinth(pop.searchQuery)
            .then((hits) => {
                const bestMatch = hits[0];
                if (!bestMatch) {
                    throw new Error(`Plugin ${pop.name} was not found in the repository.`);
                }
                return getModrinthDownload(bestMatch.id);
            })
            .then((dl) => {
                if (!dl) {
                    throw new Error(`No .jar download found for ${pop.name}.`);
                }
                return pullPlugin(uuid, dl.url, dl.filename).then(() => dl.filename);
            })
            .then((filename) => {
                addFlash({
                    key: 'plugins',
                    type: 'success',
                    title: 'Plugin Installing',
                    message: `Downloading ${pop.name} (${filename}). Restart your server after download completes to load it!`,
                });
                setTimeout(() => loadInstalled(), 2500);
            })
            .catch((error) => clearAndAddHttpError({ key: 'plugins', error }))
            .finally(() => setActionLoading(null));
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.jar')) {
            addFlash({
                key: 'plugins',
                type: 'error',
                title: 'Invalid File',
                message: 'Only Minecraft .jar plugin files can be uploaded.',
            });
            return;
        }

        setActionLoading('uploading');
        clearFlashes('plugins');

        uploadPluginFile(uuid, file)
            .then(() => {
                addFlash({
                    key: 'plugins',
                    type: 'success',
                    title: 'Upload Successful',
                    message: `Uploaded ${file.name} to /plugins.`,
                });
                loadInstalled();
            })
            .catch((error) => clearAndAddHttpError({ key: 'plugins', error }))
            .finally(() => {
                setActionLoading(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
            });
    };

    const handleReloadPlugins = () => {
        setActionLoading('reloading');
        clearFlashes('plugins');
        sendServerCommand(uuid, 'reload confirm')
            .then(() => {
                addFlash({
                    key: 'plugins',
                    type: 'success',
                    title: 'Reload Triggered',
                    message: 'Sent reload command to server.',
                });
            })
            .catch((error) => clearAndAddHttpError({ key: 'plugins', error }))
            .finally(() => setActionLoading(null));
    };

    const isPluginInstalled = (title: string): boolean => {
        const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '');
        return installedPlugins.some((p) => {
            const cleanName = p.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            return cleanName.includes(cleanTitle) || cleanTitle.includes(cleanName);
        });
    };

    const filteredInstalled = installedPlugins.filter((p) =>
        p.name.toLowerCase().includes(installedFilter.toLowerCase())
    );

    const activeCount = installedPlugins.filter((p) => p.isEnabled).length;
    const disabledCount = installedPlugins.filter((p) => !p.isEnabled).length;

    return (
        <ServerContentBlock title={'Minecraft Plugin Manager'}>
            <FlashMessageRender byKey={'plugins'} css={tw`mb-4`} />

            {/* Header / Stats Bar */}
            <div css={tw`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-neutral-800 p-5 rounded-xl border border-neutral-700 shadow-md mb-6`}>
                <div css={tw`flex items-center gap-4`}>
                    <div css={tw`w-12 h-12 rounded-xl bg-cyan-600 bg-opacity-20 border border-cyan-500 border-opacity-30 flex items-center justify-center text-cyan-400`}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" css={tw`w-6 h-6`}>
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                        </svg>
                    </div>
                    <div>
                        <h2 css={tw`text-xl font-bold text-white tracking-tight`}>Minecraft Plugin Manager</h2>
                        <p css={tw`text-xs text-neutral-400 mt-0.5`}>
                            Discover, install, and manage Bukkit/Spigot/Paper plugins for your server.
                        </p>
                    </div>
                </div>

                <div css={tw`flex flex-wrap items-center gap-2 self-stretch md:self-auto`}>
                    <span css={tw`text-xs px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-300 font-medium`}>
                        Installed: <strong css={tw`text-white`}>{installedPlugins.length}</strong>
                    </span>
                    <span css={tw`text-xs px-3 py-1.5 rounded-lg bg-green-500 bg-opacity-10 border border-green-500 border-opacity-30 text-green-400 font-medium`}>
                        Active: <strong>{activeCount}</strong>
                    </span>
                    {disabledCount > 0 && (
                        <span css={tw`text-xs px-3 py-1.5 rounded-lg bg-yellow-500 bg-opacity-10 border border-yellow-500 border-opacity-30 text-yellow-400 font-medium`}>
                            Disabled: <strong>{disabledCount}</strong>
                        </span>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".jar"
                        css={tw`hidden`}
                        onChange={handleFileUpload}
                    />
                    <Button
                        size={'small'}
                        isSecondary
                        disabled={actionLoading === 'uploading'}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {actionLoading === 'uploading' ? 'Uploading...' : 'Upload .jar'}
                    </Button>
                    <Button
                        size={'small'}
                        isSecondary
                        disabled={actionLoading === 'reloading'}
                        onClick={handleReloadPlugins}
                    >
                        Reload
                    </Button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div css={tw`flex gap-2 border-b border-neutral-700 pb-3 mb-6`}>
                <button
                    type="button"
                    onClick={() => setActiveTab('installed')}
                    css={[
                        tw`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150`,
                        activeTab === 'installed'
                            ? tw`bg-cyan-600 text-white shadow-md`
                            : tw`bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700`,
                    ]}
                >
                    Installed Plugins ({installedPlugins.length})
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('search')}
                    css={[
                        tw`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150`,
                        activeTab === 'search'
                            ? tw`bg-cyan-600 text-white shadow-md`
                            : tw`bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700`,
                    ]}
                >
                    Browse & Search
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('popular')}
                    css={[
                        tw`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150`,
                        activeTab === 'popular'
                            ? tw`bg-cyan-600 text-white shadow-md`
                            : tw`bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700`,
                    ]}
                >
                    Top Essentials
                </button>
            </div>

            {/* Tab Content: Installed Plugins */}
            {activeTab === 'installed' && (
                <div>
                    <div css={tw`flex justify-between items-center mb-4 gap-4`}>
                        <div css={tw`relative w-full max-w-sm`}>
                            <Input
                                placeholder="Filter installed plugins..."
                                value={installedFilter}
                                onChange={(e) => setInstalledFilter(e.target.value)}
                            />
                        </div>
                        <Button size={'small'} isSecondary onClick={loadInstalled} disabled={loading}>
                            Refresh List
                        </Button>
                    </div>

                    {loading ? (
                        <div css={tw`py-12`}>
                            <Spinner size={'large'} centered />
                        </div>
                    ) : filteredInstalled.length === 0 ? (
                        <TitledGreyBox title={'Plugins Directory'} css={tw`text-center py-10`}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" css={tw`w-16 h-16 mx-auto mb-3 text-neutral-500`}>
                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                                <line x1="12" y1="22.08" x2="12" y2="12" />
                            </svg>
                            <h3 css={tw`text-lg font-bold text-white mb-1`}>No Plugins Found</h3>
                            <p css={tw`text-sm text-neutral-400 max-w-md mx-auto mb-6`}>
                                There are currently no .jar files inside your server&apos;s <code>/plugins</code> directory.
                            </p>
                            <div css={tw`flex justify-center gap-3`}>
                                <Button size={'small'} onClick={() => setActiveTab('popular')}>
                                    Explore Top Plugins
                                </Button>
                                <Button size={'small'} isSecondary onClick={handleCreateFolder} disabled={actionLoading === 'create-folder'}>
                                    {actionLoading === 'create-folder' ? 'Creating...' : 'Ensure /plugins Exists'}
                                </Button>
                            </div>
                        </TitledGreyBox>
                    ) : (
                        <div css={tw`space-y-3`}>
                            {filteredInstalled.map((p) => (
                                <GreyRowBox key={p.filename} css={tw`flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3`}>
                                    <div css={tw`flex items-center gap-3 min-w-0`}>
                                        <div css={[
                                            tw`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-sm`,
                                            p.isEnabled
                                                ? tw`bg-green-500 bg-opacity-20 text-green-400 border border-green-500 border-opacity-30`
                                                : tw`bg-yellow-500 bg-opacity-20 text-yellow-400 border border-yellow-500 border-opacity-30`,
                                        ]}>
                                            JAR
                                        </div>
                                        <div css={tw`min-w-0`}>
                                            <div css={tw`flex items-center gap-2`}>
                                                <h4 css={tw`text-base font-semibold text-white truncate`}>{p.name}</h4>
                                                <span css={[
                                                    tw`text-[10px] uppercase font-bold px-2 py-0.5 rounded`,
                                                    p.isEnabled
                                                        ? tw`bg-green-500 bg-opacity-10 text-green-400 border border-green-500 border-opacity-20`
                                                        : tw`bg-yellow-500 bg-opacity-10 text-yellow-400 border border-yellow-500 border-opacity-20`,
                                                ]}>
                                                    {p.isEnabled ? 'Enabled' : 'Disabled'}
                                                </span>
                                            </div>
                                            <p css={tw`text-xs text-neutral-400 truncate mt-0.5`}>
                                                {p.filename} &bull; {bytesToString(p.size)}
                                            </p>
                                        </div>
                                    </div>

                                    <div css={tw`flex items-center gap-2 self-end sm:self-auto`}>
                                        <Button
                                            size={'small'}
                                            isSecondary
                                            disabled={actionLoading === p.filename}
                                            onClick={() => handleToggle(p)}
                                        >
                                            {p.isEnabled ? 'Disable' : 'Enable'}
                                        </Button>
                                        <Button
                                            size={'small'}
                                            color={'red'}
                                            disabled={actionLoading === p.filename}
                                            onClick={() => handleDelete(p)}
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </GreyRowBox>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Tab Content: Search Online */}
            {activeTab === 'search' && (
                <div>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleSearch(searchQuery);
                        }}
                        css={tw`flex gap-3 mb-6`}
                    >
                        <div css={tw`flex-1`}>
                            <Input
                                placeholder="Search by plugin name or keywords (e.g. essentials, permissions, voice chat)..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button type={'submit'} disabled={loading}>
                            {loading ? 'Searching...' : 'Search'}
                        </Button>
                    </form>

                    {loading ? (
                        <div css={tw`py-12`}>
                            <Spinner size={'large'} centered />
                        </div>
                    ) : searchResults.length === 0 ? (
                        <div css={tw`text-center py-10 text-neutral-400`}>
                            No plugins found matching your query. Try a different search term.
                        </div>
                    ) : (
                        <div css={tw`grid grid-cols-1 md:grid-cols-2 gap-4`}>
                            {searchResults.map((plugin) => {
                                const installed = isPluginInstalled(plugin.title);
                                const isInstalling = actionLoading === plugin.id;

                                return (
                                    <div
                                        key={plugin.id}
                                        css={tw`bg-neutral-800 border border-neutral-700 rounded-xl p-5 flex flex-col justify-between hover:border-neutral-500 transition-all duration-150`}
                                    >
                                        <div>
                                            <div css={tw`flex items-start justify-between gap-3 mb-2`}>
                                                <div css={tw`flex items-center gap-3`}>
                                                    {plugin.iconUrl ? (
                                                        <img
                                                            src={plugin.iconUrl}
                                                            alt={plugin.title}
                                                            css={tw`w-10 h-10 rounded-lg object-contain bg-neutral-900 p-1`}
                                                        />
                                                    ) : (
                                                        <div css={tw`w-10 h-10 rounded-lg bg-neutral-700 flex items-center justify-center text-cyan-400 font-bold`}>
                                                            PL
                                                        </div>
                                                    )}
                                                    <div>
                                                        <h4 css={tw`text-base font-bold text-white leading-tight`}>{plugin.title}</h4>
                                                        {plugin.author && (
                                                            <p css={tw`text-xs text-neutral-400`}>by {plugin.author}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                {installed && (
                                                    <span css={tw`text-[11px] font-bold px-2 py-0.5 rounded bg-green-500 bg-opacity-20 text-green-400 border border-green-500 border-opacity-30`}>
                                                        Installed
                                                    </span>
                                                )}
                                            </div>
                                            <p css={tw`text-xs text-neutral-300 line-clamp-3 mb-4 leading-relaxed`}>
                                                {plugin.description}
                                            </p>
                                        </div>

                                        <div css={tw`flex items-center justify-between pt-3 border-t border-neutral-700/60 mt-2`}>
                                            <span css={tw`text-xs text-neutral-400`}>
                                                {plugin.downloads.toLocaleString()} downloads
                                            </span>
                                            <Button
                                                size={'small'}
                                                disabled={isInstalling}
                                                isSecondary={installed}
                                                onClick={() => handleInstallOnline(plugin)}
                                            >
                                                {isInstalling ? 'Installing...' : installed ? 'Reinstall' : 'Install Plugin'}
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Tab Content: Top Essentials */}
            {activeTab === 'popular' && (
                <div>
                    <p css={tw`text-sm text-neutral-400 mb-6`}>
                        Curated collection of the most essential, widely-used plugins for Minecraft servers. Click install to automatically pull the latest release into your <code>/plugins</code> directory.
                    </p>

                    <div css={tw`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`}>
                        {POPULAR_PLUGINS.map((pop) => {
                            const installed = isPluginInstalled(pop.name);
                            const isInstalling = actionLoading === pop.name;

                            return (
                                <div
                                    key={pop.name}
                                    css={tw`bg-neutral-800 border border-neutral-700 rounded-xl p-5 flex flex-col justify-between hover:border-cyan-500 hover:border-opacity-50 transition-all duration-150 shadow-md`}
                                >
                                    <div>
                                        <div css={tw`flex items-start justify-between gap-2 mb-2`}>
                                            <h4 css={tw`text-base font-bold text-white`}>{pop.name}</h4>
                                            <span css={tw`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-cyan-600 bg-opacity-20 text-cyan-400 border border-cyan-500 border-opacity-30`}>
                                                {pop.category}
                                            </span>
                                        </div>
                                        <p css={tw`text-xs text-neutral-300 line-clamp-3 mb-4 leading-relaxed`}>
                                            {pop.description}
                                        </p>
                                    </div>

                                    <div css={tw`pt-3 border-t border-neutral-700 flex justify-between items-center`}>
                                        {installed ? (
                                            <span css={tw`text-xs font-semibold text-green-400 flex items-center gap-1`}>
                                                <span>✓</span> Installed
                                            </span>
                                        ) : (
                                            <span css={tw`text-xs text-neutral-400`}>Ready to install</span>
                                        )}
                                        <Button
                                            size={'small'}
                                            isSecondary={installed}
                                            disabled={isInstalling}
                                            onClick={() => handleInstallPopular(pop)}
                                        >
                                            {isInstalling ? 'Installing...' : installed ? 'Update / Reinstall' : 'Install'}
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </ServerContentBlock>
    );
};
