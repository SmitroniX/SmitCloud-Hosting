import http from '@/api/http';
import loadDirectory, { FileObject } from '@/api/server/files/loadDirectory';
import getFileContents from '@/api/server/files/getFileContents';
import saveFileContents from '@/api/server/files/saveFileContents';
import deleteFiles from '@/api/server/files/deleteFiles';
import renameFiles from '@/api/server/files/renameFiles';
import compressFiles from '@/api/server/files/compressFiles';
import decompressFiles from '@/api/server/files/decompressFiles';

export interface WorldDatapack {
    name: string;
    filename: string;
    isEnabled: boolean;
    size: number;
}

export interface MinecraftWorld {
    name: string;
    isActive: boolean;
    size: number;
    modifiedAt: Date;
    hasNether: boolean;
    hasEnd: boolean;
    datapackCount: number;
}

export const getActiveWorldName = async (uuid: string): Promise<string> => {
    try {
        const content = await getFileContents(uuid, '/server.properties');
        const match = content.match(/^level-name=(.+)$/m);
        return match && match[1] ? match[1].trim() : 'world';
    } catch {
        return 'world';
    }
};

export const fetchWorlds = async (uuid: string): Promise<{ activeWorld: string; worlds: MinecraftWorld[] }> => {
    const activeWorld = await getActiveWorldName(uuid);
    let rootFiles: FileObject[] = [];

    try {
        rootFiles = await loadDirectory(uuid, '/');
    } catch {
        return { activeWorld, worlds: [] };
    }

    const directories = rootFiles.filter((f) => !f.isFile);
    const worldsMap = new Map<string, MinecraftWorld>();

    for (const dir of directories) {
        // Exclude common non-world folders
        const lower = dir.name.toLowerCase();
        if (
            [
                'plugins',
                'mods',
                'config',
                'logs',
                'crash-reports',
                'libraries',
                'cache',
                '.cache',
                '.git',
                'versions',
            ].includes(lower)
        ) {
            continue;
        }

        // Check if this is a nether or end sub-folder for Paper/Spigot (e.g. world_nether, world_the_end)
        let baseWorldName = dir.name;
        let isNether = false;
        let isEnd = false;

        if (dir.name.endsWith('_nether')) {
            baseWorldName = dir.name.replace(/_nether$/, '');
            isNether = true;
        } else if (dir.name.endsWith('_the_end')) {
            baseWorldName = dir.name.replace(/_the_end$/, '');
            isEnd = true;
        }

        // Verify if it's a world by inspecting for level.dat or session.lock or known active world
        let isConfirmedWorld = false;
        let datapackCount = 0;

        try {
            const sub = await loadDirectory(uuid, `/${dir.name}`);
            const hasLevelDat = sub.some((f) => f.name === 'level.dat' || f.name === 'session.lock' || f.name === 'region');
            if (hasLevelDat || dir.name === activeWorld || isNether || isEnd) {
                isConfirmedWorld = true;
            }

            // Check datapacks if not nether/end
            if (!isNether && !isEnd) {
                const dpDir = sub.find((f) => !f.isFile && f.name === 'datapacks');
                if (dpDir) {
                    try {
                        const dpFiles = await loadDirectory(uuid, `/${dir.name}/datapacks`);
                        datapackCount = dpFiles.filter(
                            (f) => f.name.endsWith('.zip') || f.name.endsWith('.zip.disabled') || !f.isFile
                        ).length;
                    } catch {
                        // ignore
                    }
                }
            }
        } catch {
            if (dir.name === activeWorld) {
                isConfirmedWorld = true;
            }
        }

        if (isConfirmedWorld) {
            if (!worldsMap.has(baseWorldName)) {
                worldsMap.set(baseWorldName, {
                    name: baseWorldName,
                    isActive: baseWorldName === activeWorld,
                    size: dir.size,
                    modifiedAt: dir.modifiedAt,
                    hasNether: isNether,
                    hasEnd: isEnd,
                    datapackCount,
                });
            } else {
                const existing = worldsMap.get(baseWorldName)!;
                if (isNether) existing.hasNether = true;
                if (isEnd) existing.hasEnd = true;
                if (datapackCount > 0) existing.datapackCount = datapackCount;
                existing.size += dir.size;
            }
        }
    }

    // Ensure active world is in the list even if folder check was empty
    if (!worldsMap.has(activeWorld)) {
        worldsMap.set(activeWorld, {
            name: activeWorld,
            isActive: true,
            size: 0,
            modifiedAt: new Date(),
            hasNether: false,
            hasEnd: false,
            datapackCount: 0,
        });
    }

    return {
        activeWorld,
        worlds: Array.from(worldsMap.values()).sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0)),
    };
};

export const setActiveWorld = async (uuid: string, worldName: string): Promise<void> => {
    const content = await getFileContents(uuid, '/server.properties');
    let updated: string;
    if (content.match(/^level-name=.*$/m)) {
        updated = content.replace(/^level-name=.*$/m, `level-name=${worldName}`);
    } else {
        updated = `${content}\nlevel-name=${worldName}`;
    }
    await saveFileContents(uuid, '/server.properties', updated);
};

export const createNewWorld = async (
    uuid: string,
    worldName: string,
    seed?: string,
    generatorType?: string
): Promise<void> => {
    let content = await getFileContents(uuid, '/server.properties');
    if (content.match(/^level-name=.*$/m)) {
        content = content.replace(/^level-name=.*$/m, `level-name=${worldName}`);
    } else {
        content += `\nlevel-name=${worldName}`;
    }

    if (seed !== undefined && seed.trim().length > 0) {
        if (content.match(/^level-seed=.*$/m)) {
            content = content.replace(/^level-seed=.*$/m, `level-seed=${seed.trim()}`);
        } else {
            content += `\nlevel-seed=${seed.trim()}`;
        }
    }

    if (generatorType) {
        if (content.match(/^level-type=.*$/m)) {
            content = content.replace(/^level-type=.*$/m, `level-type=${generatorType}`);
        } else {
            content += `\nlevel-type=${generatorType}`;
        }
    }

    await saveFileContents(uuid, '/server.properties', content);
};

export const deleteWorld = async (uuid: string, worldName: string): Promise<void> => {
    const toDelete = [worldName, `${worldName}_nether`, `${worldName}_the_end`];
    await deleteFiles(uuid, '/', toDelete);
};

export const backupWorld = async (uuid: string, worldName: string): Promise<string> => {
    const foldersToArchive = [worldName];
    // Try to include nether and end if they exist
    try {
        const root = await loadDirectory(uuid, '/');
        if (root.some((f) => f.name === `${worldName}_nether`)) foldersToArchive.push(`${worldName}_nether`);
        if (root.some((f) => f.name === `${worldName}_the_end`)) foldersToArchive.push(`${worldName}_the_end`);
    } catch {
        // fallback
    }

    const archive = await compressFiles(uuid, '/', foldersToArchive);
    return archive.name;
};

export const importWorldFromUrl = async (uuid: string, url: string, targetName: string): Promise<void> => {
    const filename = `temp_world_${Date.now()}.zip`;
    await http.post(`/api/client/servers/${uuid}/files/pull`, {
        url,
        directory: '/',
        filename,
        use_header: true,
    });

    // Decompress archive in root
    await decompressFiles(uuid, '/', filename);
    // Remove temporary zip
    try {
        await deleteFiles(uuid, '/', [filename]);
    } catch {
        // ignore
    }
};

export const fetchDatapacks = async (uuid: string, worldName: string): Promise<WorldDatapack[]> => {
    try {
        const files = await loadDirectory(uuid, `/${worldName}/datapacks`);
        return files.map((f) => ({
            name: f.name.replace(/\.disabled$/, '').replace(/\.zip$/, ''),
            filename: f.name,
            isEnabled: !f.name.endsWith('.disabled'),
            size: f.size,
        }));
    } catch {
        return [];
    }
};

export const toggleDatapack = async (
    uuid: string,
    worldName: string,
    filename: string,
    enable: boolean
): Promise<void> => {
    const to = enable ? filename.replace(/\.disabled$/, '') : `${filename}.disabled`;
    await renameFiles(uuid, `/${worldName}/datapacks`, [{ from: filename, to }]);
};

export const deleteDatapack = async (uuid: string, worldName: string, filename: string): Promise<void> => {
    await deleteFiles(uuid, `/${worldName}/datapacks`, [filename]);
};
