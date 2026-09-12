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
    category: string;
    downloadUrl: string;
    icon: string;
}

export const PRESET_DATAPACKS: PresetDatapack[] = [
    {
        id: 'multiplayer-sleep',
        name: 'Multiplayer Sleep',
        description: 'Allows night to be skipped when only one player sleeps in a bed instead of requiring all players.',
        category: 'Quality of Life',
        downloadUrl: 'https://cdn.jsdelivr.net/gh/misode/misode.github.io@master/datapacks/multiplayer_sleep.zip',
        icon: '🛏️',
    },
    {
        id: 'armor-statues',
        name: 'Armor Statues (Custom Poses)',
        description: 'Adds a book to pose and adjust armor stands with custom limbs, visibility, and gravity.',
        category: 'Building',
        downloadUrl: 'https://cdn.jsdelivr.net/gh/misode/misode.github.io@master/datapacks/armor_statues.zip',
        icon: '🗿',
    },
    {
        id: 'double-shulker-shells',
        name: 'Double Shulker Shells',
        description: 'Guarantees that Shulkers in End Cities always drop 2 shulker shells upon death.',
        category: 'Survival',
        downloadUrl: 'https://cdn.jsdelivr.net/gh/misode/misode.github.io@master/datapacks/double_shulker_shells.zip',
        icon: '🐚',
    },
    {
        id: 'fast-leaf-decay',
        name: 'Fast Leaf Decay',
        description: 'Leaves decay rapidly within a few seconds after cutting down a tree trunk.',
        category: 'Quality of Life',
        downloadUrl: 'https://cdn.jsdelivr.net/gh/misode/misode.github.io@master/datapacks/fast_leaf_decay.zip',
        icon: '🍃',
    },
    {
        id: 'player-head-drops',
        name: 'Player Head Drops',
        description: 'Players drop their custom skin head when slain by another player in PvP.',
        category: 'Fun & PvP',
        downloadUrl: 'https://cdn.jsdelivr.net/gh/misode/misode.github.io@master/datapacks/player_head_drops.zip',
        icon: '👤',
    },
    {
        id: 'graves',
        name: 'Grave Chests on Death',
        description: 'Spawns a protected grave upon player death storing their items so they don\'t despawn.',
        category: 'Survival',
        downloadUrl: 'https://cdn.jsdelivr.net/gh/misode/misode.github.io@master/datapacks/graves.zip',
        icon: '⚰️',
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
