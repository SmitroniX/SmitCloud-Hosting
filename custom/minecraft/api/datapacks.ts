import loadDirectory, { FileObject } from '@/api/server/files/loadDirectory';
import deleteFiles from '@/api/server/files/deleteFiles';
import renameFiles from '@/api/server/files/renameFiles';
import createDirectory from '@/api/server/files/createDirectory';
import getFileUploadUrl from '@/api/server/files/getFileUploadUrl';
import getFileContents from '@/api/server/files/getFileContents';
import http from '@/api/http';
import axios from 'axios';

export interface InstalledDatapack {
    name: string;
    filename: string;
    size: number;
    modifiedAt: Date;
    isEnabled: boolean;
    isFolder: boolean;
}

export interface PresetDatapack {
    id: string;
    name: string;
    description: string;
    category: 'World Generation' | 'Quality of Life' | 'Building' | 'Survival' | 'Utility' | 'Fun & PvP';
    downloadUrl: string;
    icon: string;
}

export const PRESET_DATAPACKS: PresetDatapack[] = [
    // World Generation
    {
        id: 'terralith',
        name: 'Terralith 2.6 (100+ Biomes Overhaul)',
        description: 'Breathtaking overworld terrain generation overhaul with almost 100 new biomes. Pure vanilla blocks!',
        category: 'World Generation',
        downloadUrl: 'https://hosting.smitronix.dev/downloads/datapacks/terralith.zip',
        icon: '🏔️',
    },
    {
        id: 'incendium',
        name: 'Incendium 5.5 (Nether Overhaul)',
        description: 'Complete Nether overhaul featuring 8 new custom biomes, colossal Nether castles, and fiery dungeons.',
        category: 'World Generation',
        downloadUrl: 'https://hosting.smitronix.dev/downloads/datapacks/incendium.zip',
        icon: '🔥',
    },
    {
        id: 'nullscape',
        name: 'Nullscape 1.2 (The End Overhaul)',
        description: 'Radical End dimension overhaul raising world height to 384 blocks with void spires, crystals, and floating reefs.',
        category: 'World Generation',
        downloadUrl: 'https://hosting.smitronix.dev/downloads/datapacks/nullscape.zip',
        icon: '🌌',
    },
    {
        id: 'towns_and_towers',
        name: 'Towns & Towers (Villages & Outposts)',
        description: 'Extensive overhaul of villages, pillager outposts, and oceanic ships matching each biome architecture.',
        category: 'World Generation',
        downloadUrl: 'https://hosting.smitronix.dev/downloads/datapacks/towns_and_towers.zip',
        icon: '🏰',
    },

    // Quality of Life
    {
        id: 'multiplayer_sleep',
        name: 'Multiplayer Sleep',
        description: 'Allows night to be skipped when only one player sleeps in a bed instead of requiring all online players.',
        category: 'Quality of Life',
        downloadUrl: 'https://hosting.smitronix.dev/downloads/datapacks/multiplayer_sleep.zip',
        icon: '🛏️',
    },
    {
        id: 'fast_leaf_decay',
        name: 'Fast Leaf Decay',
        description: 'Leaves decay rapidly within a few seconds after cutting down a tree trunk.',
        category: 'Quality of Life',
        downloadUrl: 'https://hosting.smitronix.dev/downloads/datapacks/fast_leaf_decay.zip',
        icon: '🍃',
    },
    {
        id: 'timber_treecapitator',
        name: 'Timber / TreeCapitator',
        description: 'Fell whole trees in one chop! Cuts down connected log blocks automatically with durability balance.',
        category: 'Quality of Life',
        downloadUrl: 'https://hosting.smitronix.dev/downloads/datapacks/timber_treecapitator.zip',
        icon: '🪓',
    },
    {
        id: 'coordinates_hud',
        name: 'Coordinates & Compass HUD',
        description: 'Real-time actionbar HUD showing coordinates (X Y Z), facing direction, and current biome.',
        category: 'Quality of Life',
        downloadUrl: 'https://hosting.smitronix.dev/downloads/datapacks/coordinates_hud.zip',
        icon: '🧭',
    },
    {
        id: 'silence_mobs',
        name: 'Silence Mobs',
        description: 'Silence noisy farm animals or villager trading halls by renaming them "silence" with a Name Tag.',
        category: 'Quality of Life',
        downloadUrl: 'https://hosting.smitronix.dev/downloads/datapacks/silence_mobs.zip',
        icon: '🤫',
    },
    {
        id: 'afk_display',
        name: 'AFK Display Indicator',
        description: 'Grays out idle player names and adds [AFK] prefix in TabList when they haven\'t moved for 5 minutes.',
        category: 'Quality of Life',
        downloadUrl: 'https://hosting.smitronix.dev/downloads/datapacks/afk_display.zip',
        icon: '💤',
    },
    {
        id: 'unlock_all_recipes',
        name: 'Unlock All Recipes',
        description: 'Instantly unlocks all vanilla crafting book recipes for players the moment they join the world.',
        category: 'Quality of Life',
        downloadUrl: 'https://hosting.smitronix.dev/downloads/datapacks/unlock_all_recipes.zip',
        icon: '📖',
    },

    // Building & Aesthetics
    {
        id: 'armor_statues',
        name: 'Armor Statues (Custom Poses)',
        description: 'Adds a handy configuration book to pose, bend limbs, lock, and hide armor stand bases.',
        category: 'Building',
        downloadUrl: 'https://hosting.smitronix.dev/downloads/datapacks/armor_statues.zip',
        icon: '🗿',
    },
    {
        id: 'double_shulker_shells',
        name: 'Double Shulker Shells',
        description: 'Guarantees that Shulkers in End Cities always drop 2 shulker shells upon death.',
        category: 'Survival',
        downloadUrl: 'https://hosting.smitronix.dev/downloads/datapacks/double_shulker_shells.zip',
        icon: '🐚',
    },

    // Survival & Protection
    {
        id: 'graves',
        name: 'Grave Chests on Death',
        description: 'Spawns a protected death grave storing all player inventory items safely until retrieved.',
        category: 'Survival',
        downloadUrl: 'https://hosting.smitronix.dev/downloads/datapacks/graves.zip',
        icon: '⚰️',
    },
    {
        id: 'anti_creeper_grief',
        name: 'Anti-Creeper Grief',
        description: 'Creeper explosions damage players and mobs, but never blow up or destroy terrain and build blocks.',
        category: 'Survival',
        downloadUrl: 'https://hosting.smitronix.dev/downloads/datapacks/anti_creeper_grief.zip',
        icon: '🧨',
    },
    {
        id: 'anti_enderman_grief',
        name: 'Anti-Enderman Grief',
        description: 'Prevents Endermen from picking up and stealing grass, dirt, sand, and build blocks from your world.',
        category: 'Survival',
        downloadUrl: 'https://hosting.smitronix.dev/downloads/datapacks/anti_enderman_grief.zip',
        icon: '👾',
    },
    {
        id: 'anti_ghast_grief',
        name: 'Anti-Ghast Grief',
        description: 'Ghast fireballs damage entities, but do not destroy or break Netherrack, stone, or bridge blocks.',
        category: 'Survival',
        downloadUrl: 'https://hosting.smitronix.dev/downloads/datapacks/anti_ghast_grief.zip',
        icon: '👻',
    },

    // Utility
    {
        id: 'cauldron_concrete',
        name: 'Cauldron Concrete Hardener',
        description: 'Drop or place concrete powder into a water cauldron to instantly convert it into solid concrete blocks.',
        category: 'Utility',
        downloadUrl: 'https://hosting.smitronix.dev/downloads/datapacks/cauldron_concrete.zip',
        icon: '🧪',
    },
    {
        id: 'universal_dyeing',
        name: 'Universal Dyeing',
        description: 'Re-dye any colored wool, bed, glass, or terracotta directly without needing white base items.',
        category: 'Utility',
        downloadUrl: 'https://hosting.smitronix.dev/downloads/datapacks/universal_dyeing.zip',
        icon: '🎨',
    },
    {
        id: 'back_to_blocks',
        name: 'Back to Blocks',
        description: 'Craft slabs and stairs back into full blocks so excess cut stone and wood never goes to waste.',
        category: 'Utility',
        downloadUrl: 'https://hosting.smitronix.dev/downloads/datapacks/back_to_blocks.zip',
        icon: '🧱',
    },

    // Fun & PvP
    {
        id: 'player_head_drops',
        name: 'Player Head Drops (PvP)',
        description: 'Players drop their custom skin head when slain by another player in PvP combat.',
        category: 'Fun & PvP',
        downloadUrl: 'https://hosting.smitronix.dev/downloads/datapacks/player_head_drops.zip',
        icon: '👤',
    },
    {
        id: 'more_mob_heads',
        name: 'More Mob Heads',
        description: 'Adds a rare drop chance for all vanilla mobs (Zombies, Skeletons, Creepers, Animals) to drop heads.',
        category: 'Fun & PvP',
        downloadUrl: 'https://hosting.smitronix.dev/downloads/datapacks/more_mob_heads.zip',
        icon: '🧟',
    },
];

export const detectWorldFolder = async (uuid: string): Promise<string> => {
    try {
        const props = await getFileContents(uuid, '/server.properties');
        const match = props.match(/^level-name=(.*)$/m);
        if (match && match[1].trim()) {
            return match[1].trim();
        }
    } catch {
        // default fallback
    }
    return 'world';
};

export const fetchInstalledDatapacks = async (uuid: string): Promise<InstalledDatapack[]> => {
    const worldName = await detectWorldFolder(uuid);
    const path = `/${worldName}/datapacks`;

    try {
        const files: FileObject[] = await loadDirectory(uuid, path);
        return files
            .filter((f) => f.name.endsWith('.zip') || f.name.endsWith('.disabled') || (!f.isFile && f.name !== 'bukkit'))
            .map((f) => ({
                name: f.name.replace(/\.disabled$/, '').replace(/\.zip$/, ''),
                filename: f.name,
                size: f.size,
                modifiedAt: f.modifiedAt,
                isEnabled: !f.name.endsWith('.disabled'),
                isFolder: !f.isFile,
            }));
    } catch {
        return [];
    }
};

export const toggleDatapack = async (uuid: string, filename: string, enable: boolean): Promise<void> => {
    const worldName = await detectWorldFolder(uuid);
    const path = `/${worldName}/datapacks`;
    const to = enable ? filename.replace(/\.disabled$/, '') : `${filename}.disabled`;
    await renameFiles(uuid, path, [{ from: filename, to }]);
};

export const deleteDatapack = async (uuid: string, filename: string): Promise<void> => {
    const worldName = await detectWorldFolder(uuid);
    const path = `/${worldName}/datapacks`;
    await deleteFiles(uuid, path, [filename]);
};

export const installPresetDatapack = async (uuid: string, preset: PresetDatapack): Promise<void> => {
    const worldName = await detectWorldFolder(uuid);
    const path = `/${worldName}/datapacks`;

    // Ensure directory exists
    try {
        await createDirectory(uuid, `/${worldName}`, 'datapacks');
    } catch {
        // already exists
    }

    await http.post(`/api/client/servers/${uuid}/files/pull`, {
        url: preset.downloadUrl,
        directory: path,
        filename: `${preset.id}.zip`,
        use_header: true,
    });
};

export const uploadDatapackFile = async (uuid: string, file: File): Promise<void> => {
    const worldName = await detectWorldFolder(uuid);
    const path = `/${worldName}/datapacks`;
    const uploadUrl = await getFileUploadUrl(uuid);

    const formData = new FormData();
    formData.append('files', file, file.name);

    await axios.post(`${uploadUrl}&directory=${encodeURIComponent(path)}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

export const pullDatapack = async (uuid: string, url: string, filename: string): Promise<void> => {
    const worldName = await detectWorldFolder(uuid);
    const path = `/${worldName}/datapacks`;

    try {
        await createDirectory(uuid, `/${worldName}`, 'datapacks');
    } catch {
        // already exists
    }

    await http.post(`/api/client/servers/${uuid}/files/pull`, {
        url,
        directory: path,
        filename: filename.endsWith('.zip') ? filename : `${filename}.zip`,
        use_header: true,
    });
};

export type { OnlineDatapack } from '@/api/server/minecraft/curseforge';

export const searchOnlineDatapacks = async (
    query = '',
    gameVersion?: string,
    provider: 'all' | 'curseforge' | 'modrinth' = 'curseforge'
): Promise<import('@/api/server/minecraft/curseforge').OnlineDatapack[]> => {
    const { searchCurseForgeDatapacks, searchModrinthDatapacks } = await import('@/api/server/minecraft/curseforge');

    if (provider === 'curseforge') {
        return searchCurseForgeDatapacks(query, gameVersion);
    }
    if (provider === 'modrinth') {
        return searchModrinthDatapacks(query, gameVersion);
    }

    const [cf, mr] = await Promise.all([
        searchCurseForgeDatapacks(query, gameVersion, 16),
        searchModrinthDatapacks(query, gameVersion, 16),
    ]);
    return [...cf, ...mr];
};

export const installOnlineDatapack = async (
    uuid: string,
    dp: import('@/api/server/minecraft/curseforge').OnlineDatapack
): Promise<void> => {
    let dlUrl = dp.downloadUrl;
    let filename = dp.filename || `${dp.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.zip`;
    if (!filename.endsWith('.zip')) filename += '.zip';

    if (!dlUrl && dp.source === 'modrinth') {
        // Fetch latest version from Modrinth
        const projectId = dp.id.replace(/^mr-dp-/, '');
        const res = await axios.get(`https://api.modrinth.com/v2/project/${projectId}/version`, { timeout: 10000 });
        const versions = res.data || [];
        if (versions.length > 0) {
            const primaryFile = versions[0].files?.find((f: any) => f.primary) || versions[0].files?.[0];
            if (primaryFile) {
                dlUrl = primaryFile.url;
                filename = primaryFile.filename || filename;
            }
        }
    }

    if (!dlUrl) {
        throw new Error('Could not resolve download URL for this datapack.');
    }

    await pullDatapack(uuid, dlUrl, filename);
};
