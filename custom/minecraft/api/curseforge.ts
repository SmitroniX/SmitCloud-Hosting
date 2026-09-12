import axios from 'axios';
import { OnlineMod, ModVersion, ModDetails } from '@/api/server/minecraft/mods';
import { OnlineModpack, ModpackVersion, ModpackDetails } from '@/api/server/minecraft/modpacks';

export const CURSEFORGE_API_KEY = '$2a$10$bL4bIL5pUWqfcO7KQtnMReakwtfHbNKh6v1uTpKlzhwoueEJQnPnm';
export const CURSEFORGE_BASE_URL = 'https://api.curseforge.com/v1';
export const MINECRAFT_GAME_ID = 432;

export const CF_CLASS_MODS = 6;
export const CF_CLASS_MODPACKS = 4471;
export const CF_CLASS_DATAPACKS = 6945;

export const CF_LOADER_MAP: Record<string, number> = {
    all: 0,
    forge: 1,
    cauldron: 2,
    liteloader: 3,
    fabric: 4,
    quilt: 5,
    neoforge: 6,
};

const cfClient = axios.create({
    baseURL: CURSEFORGE_BASE_URL,
    headers: {
        Accept: 'application/json',
        'x-api-key': CURSEFORGE_API_KEY,
    },
    timeout: 12000,
});

export const resolveCurseForgeDownloadUrl = (file: { id: number; fileName: string; downloadUrl?: string | null }): string => {
    if (file.downloadUrl && file.downloadUrl.trim().length > 0) {
        return file.downloadUrl;
    }
    const part1 = Math.floor(file.id / 1000);
    const part2 = file.id % 1000;
    return `https://edge.forgecdn.net/files/${part1}/${part2}/${encodeURIComponent(file.fileName)}`;
};

/**
 * Search CurseForge for Minecraft mods
 */
export const searchCurseForgeMods = async (
    query = '',
    loader?: string,
    gameVersion?: string,
    sortBy: 'downloads' | 'follows' | 'updated' | 'newest' = 'downloads',
    pageSize = 24
): Promise<OnlineMod[]> => {
    try {
        let sortField = 6; // TotalDownloads
        if (sortBy === 'follows') sortField = 2; // Popularity
        if (sortBy === 'updated') sortField = 3; // LastUpdated
        if (sortBy === 'newest') sortField = 1; // Featured

        const params: Record<string, any> = {
            gameId: MINECRAFT_GAME_ID,
            classId: CF_CLASS_MODS,
            pageSize,
            sortField,
            sortOrder: 'desc',
        };

        if (query.trim()) {
            params.searchFilter = query.trim();
        }

        if (loader && loader !== 'all' && CF_LOADER_MAP[loader.toLowerCase()]) {
            params.modLoaderType = CF_LOADER_MAP[loader.toLowerCase()];
        }

        if (gameVersion && gameVersion !== 'all') {
            params.gameVersion = gameVersion;
        }

        const res = await cfClient.get('/mods/search', { params });
        const items = res.data?.data || [];

        return items.map((item: any) => {
            const categories = Array.isArray(item.categories) ? item.categories.map((c: any) => c.name) : [];
            const detectedLoaders = (item.latestFilesIndexes || [])
                .map((f: any) => {
                    const t = f.modLoader;
                    if (t === 1) return 'forge';
                    if (t === 4) return 'fabric';
                    if (t === 5) return 'quilt';
                    if (t === 6) return 'neoforge';
                    return null;
                })
                .filter(Boolean)
                .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);

            const gameVersions = (item.latestFilesIndexes || [])
                .map((f: any) => f.gameVersion)
                .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);

            return {
                id: `cf-${item.id}`,
                slug: item.slug || String(item.id),
                title: item.name,
                description: item.summary || '',
                author: item.authors?.[0]?.name || 'CurseForge Creator',
                iconUrl: item.logo?.url || item.logo?.thumbnailUrl,
                downloads: item.downloadCount || 0,
                follows: item.thumbsUpCount || 0,
                categories,
                loaders: detectedLoaders.length > 0 ? detectedLoaders : ['forge', 'fabric'],
                gameVersions: gameVersions.slice(0, 8),
                serverSide: 'optional',
                clientSide: 'optional',
                sourceUrl: item.links?.websiteUrl || `https://www.curseforge.com/minecraft/mc-mods/${item.slug}`,
            };
        });
    } catch (e) {
        console.error('Error searching CurseForge mods:', e);
        return [];
    }
};

/**
 * Search CurseForge for Minecraft modpacks
 */
export const searchCurseForgeModpacks = async (
    query = '',
    loader?: string,
    gameVersion?: string,
    sortBy: 'downloads' | 'follows' | 'updated' | 'newest' = 'downloads',
    pageSize = 24
): Promise<OnlineModpack[]> => {
    try {
        let sortField = 6; // TotalDownloads
        if (sortBy === 'follows') sortField = 2; // Popularity
        if (sortBy === 'updated') sortField = 3; // LastUpdated
        if (sortBy === 'newest') sortField = 1;

        const params: Record<string, any> = {
            gameId: MINECRAFT_GAME_ID,
            classId: CF_CLASS_MODPACKS,
            pageSize,
            sortField,
            sortOrder: 'desc',
        };

        if (query.trim()) {
            params.searchFilter = query.trim();
        }

        if (loader && loader !== 'all' && CF_LOADER_MAP[loader.toLowerCase()]) {
            params.modLoaderType = CF_LOADER_MAP[loader.toLowerCase()];
        }

        if (gameVersion && gameVersion !== 'all') {
            params.gameVersion = gameVersion;
        }

        const res = await cfClient.get('/mods/search', { params });
        const items = res.data?.data || [];

        return items.map((item: any) => {
            const categories = Array.isArray(item.categories) ? item.categories.map((c: any) => c.name) : [];
            const detectedLoaders = (item.latestFilesIndexes || [])
                .map((f: any) => {
                    const t = f.modLoader;
                    if (t === 1) return 'forge';
                    if (t === 4) return 'fabric';
                    if (t === 5) return 'quilt';
                    if (t === 6) return 'neoforge';
                    return null;
                })
                .filter(Boolean)
                .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);

            const gameVersions = (item.latestFilesIndexes || [])
                .map((f: any) => f.gameVersion)
                .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);

            return {
                id: `cf-${item.id}`,
                slug: item.slug || String(item.id),
                title: item.name,
                description: item.summary || '',
                author: item.authors?.[0]?.name || 'CurseForge Creator',
                iconUrl: item.logo?.url || item.logo?.thumbnailUrl,
                downloads: item.downloadCount || 0,
                follows: item.thumbsUpCount || 0,
                categories,
                loaders: detectedLoaders.length > 0 ? detectedLoaders : ['forge'],
                gameVersions: gameVersions.slice(0, 8),
                serverSide: 'required',
                clientSide: 'required',
                sourceUrl: item.links?.websiteUrl || `https://www.curseforge.com/minecraft/modpacks/${item.slug}`,
            };
        });
    } catch (e) {
        console.error('Error searching CurseForge modpacks:', e);
        return [];
    }
};

/**
 * Fetch CurseForge mod details by ID
 */
export const getCurseForgeModDetails = async (rawId: string | number): Promise<ModDetails | null> => {
    try {
        const id = String(rawId).replace(/^cf-/, '');
        const [res, descRes] = await Promise.all([
            cfClient.get(`/mods/${id}`),
            cfClient.get(`/mods/${id}/description`).catch(() => ({ data: { data: '' } })),
        ]);

        const data = res.data?.data;
        if (!data) return null;

        const categories = Array.isArray(data.categories) ? data.categories.map((c: any) => c.name) : [];
        const detectedLoaders = (data.latestFilesIndexes || [])
            .map((f: any) => {
                const t = f.modLoader;
                if (t === 1) return 'forge';
                if (t === 4) return 'fabric';
                if (t === 5) return 'quilt';
                if (t === 6) return 'neoforge';
                return null;
            })
            .filter(Boolean)
            .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);

        const gameVersions = (data.latestFilesIndexes || [])
            .map((f: any) => f.gameVersion)
            .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);

        return {
            id: `cf-${data.id}`,
            slug: data.slug || String(data.id),
            title: data.name,
            description: data.summary || '',
            body: descRes.data?.data || data.summary || '',
            author: data.authors?.[0]?.name || 'CurseForge Creator',
            iconUrl: data.logo?.url || data.logo?.thumbnailUrl,
            downloads: data.downloadCount || 0,
            followers: data.thumbsUpCount || 0,
            categories,
            loaders: detectedLoaders.length > 0 ? detectedLoaders : ['forge', 'fabric'],
            gameVersions,
            serverSide: 'optional',
            clientSide: 'optional',
            gallery: Array.isArray(data.screenshots) ? data.screenshots.map((s: any) => s.url) : [],
            sourceUrl: data.links?.websiteUrl || `https://www.curseforge.com/minecraft/mc-mods/${data.slug}`,
            issuesUrl: data.links?.issuesUrl,
            wikiUrl: data.links?.wikiUrl,
        };
    } catch (e) {
        console.error('Error fetching CurseForge mod details:', e);
        return null;
    }
};

/**
 * Fetch CurseForge modpack details by ID
 */
export const getCurseForgeModpackDetails = async (rawId: string | number): Promise<ModpackDetails | null> => {
    try {
        const id = String(rawId).replace(/^cf-/, '');
        const [res, descRes] = await Promise.all([
            cfClient.get(`/mods/${id}`),
            cfClient.get(`/mods/${id}/description`).catch(() => ({ data: { data: '' } })),
        ]);

        const data = res.data?.data;
        if (!data) return null;

        const categories = Array.isArray(data.categories) ? data.categories.map((c: any) => c.name) : [];
        const detectedLoaders = (data.latestFilesIndexes || [])
            .map((f: any) => {
                const t = f.modLoader;
                if (t === 1) return 'forge';
                if (t === 4) return 'fabric';
                if (t === 5) return 'quilt';
                if (t === 6) return 'neoforge';
                return null;
            })
            .filter(Boolean)
            .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);

        const gameVersions = (data.latestFilesIndexes || [])
            .map((f: any) => f.gameVersion)
            .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);

        return {
            id: `cf-${data.id}`,
            slug: data.slug || String(data.id),
            title: data.name,
            description: data.summary || '',
            body: descRes.data?.data || data.summary || '',
            author: data.authors?.[0]?.name || 'CurseForge Creator',
            iconUrl: data.logo?.url || data.logo?.thumbnailUrl,
            downloads: data.downloadCount || 0,
            followers: data.thumbsUpCount || 0,
            categories,
            loaders: detectedLoaders.length > 0 ? detectedLoaders : ['forge'],
            gameVersions,
            serverSide: 'required',
            clientSide: 'required',
            gallery: Array.isArray(data.screenshots) ? data.screenshots.map((s: any) => s.url) : [],
            sourceUrl: data.links?.websiteUrl || `https://www.curseforge.com/minecraft/modpacks/${data.slug}`,
            issuesUrl: data.links?.issuesUrl,
            wikiUrl: data.links?.wikiUrl,
        };
    } catch (e) {
        console.error('Error fetching CurseForge modpack details:', e);
        return null;
    }
};

/**
 * Fetch CurseForge mod files / versions
 */
export const getCurseForgeModFiles = async (
    rawId: string | number,
    gameVersion?: string,
    loader?: string
): Promise<ModVersion[]> => {
    try {
        const id = String(rawId).replace(/^cf-/, '');
        const params: Record<string, any> = {
            pageSize: 30,
        };

        if (gameVersion && gameVersion !== 'all') {
            params.gameVersion = gameVersion;
        }

        if (loader && loader !== 'all' && CF_LOADER_MAP[loader.toLowerCase()]) {
            params.modLoaderType = CF_LOADER_MAP[loader.toLowerCase()];
        }

        const res = await cfClient.get(`/mods/${id}/files`, { params });
        const files = res.data?.data || [];

        return files.map((f: any) => {
            const releaseType = f.releaseType === 1 ? 'release' : f.releaseType === 2 ? 'beta' : 'alpha';
            const dlUrl = resolveCurseForgeDownloadUrl(f);

            return {
                id: String(f.id),
                name: f.displayName || f.fileName,
                versionNumber: f.fileName.replace(/\.jar$/, '').replace(/\.zip$/, ''),
                gameVersions: Array.isArray(f.gameVersions) ? f.gameVersions : [],
                loaders: (f.gameVersions || [])
                    .filter((v: string) => ['Forge', 'Fabric', 'NeoForge', 'Quilt'].includes(v))
                    .map((v: string) => v.toLowerCase()),
                versionType: releaseType,
                datePublished: f.fileDate,
                downloads: f.downloadCount || 0,
                files: [
                    {
                        filename: f.fileName,
                        url: dlUrl,
                        size: f.fileLength || 0,
                        primary: true,
                    },
                ],
            };
        });
    } catch (e) {
        console.error('Error fetching CurseForge mod files:', e);
        return [];
    }
};

/**
 * Fetch CurseForge modpack files / versions
 */
export const getCurseForgeModpackFiles = async (
    rawId: string | number,
    gameVersion?: string,
    loader?: string
): Promise<ModpackVersion[]> => {
    try {
        const id = String(rawId).replace(/^cf-/, '');
        const params: Record<string, any> = {
            pageSize: 25,
        };

        if (gameVersion && gameVersion !== 'all') {
            params.gameVersion = gameVersion;
        }

        if (loader && loader !== 'all' && CF_LOADER_MAP[loader.toLowerCase()]) {
            params.modLoaderType = CF_LOADER_MAP[loader.toLowerCase()];
        }

        const res = await cfClient.get(`/mods/${id}/files`, { params });
        const files = res.data?.data || [];

        return files.map((f: any) => {
            const releaseType = f.releaseType === 1 ? 'release' : f.releaseType === 2 ? 'beta' : 'alpha';
            const dlUrl = resolveCurseForgeDownloadUrl(f);

            return {
                id: String(f.id),
                name: f.displayName || f.fileName,
                versionNumber: f.fileName.replace(/\.zip$/, '').replace(/\.mrpack$/, ''),
                gameVersions: Array.isArray(f.gameVersions) ? f.gameVersions : [],
                loaders: (f.gameVersions || [])
                    .filter((v: string) => ['Forge', 'Fabric', 'NeoForge', 'Quilt'].includes(v))
                    .map((v: string) => v.toLowerCase()),
                versionType: releaseType,
                datePublished: f.fileDate,
                downloads: f.downloadCount || 0,
                files: [
                    {
                        filename: f.fileName,
                        url: dlUrl,
                        size: f.fileLength || 0,
                        primary: true,
                    },
                ],
            };
        });
    } catch (e) {
        console.error('Error fetching CurseForge modpack files:', e);
        return [];
    }
};

export interface OnlineDatapack {
    id: string;
    title: string;
    description: string;
    author: string;
    iconUrl?: string;
    downloads: number;
    downloadUrl?: string;
    filename?: string;
    categories: string[];
    gameVersions: string[];
    source: 'curseforge' | 'modrinth';
    sourceUrl: string;
}

/**
 * Search CurseForge for Minecraft Data Packs (classId = 6945)
 */
export const searchCurseForgeDatapacks = async (
    query = '',
    gameVersion?: string,
    pageSize = 24
): Promise<OnlineDatapack[]> => {
    try {
        const params: Record<string, any> = {
            gameId: MINECRAFT_GAME_ID,
            classId: CF_CLASS_DATAPACKS,
            pageSize,
            sortField: 6, // TotalDownloads
            sortOrder: 'desc',
        };

        if (query.trim()) {
            params.searchFilter = query.trim();
        }

        if (gameVersion && gameVersion !== 'all') {
            params.gameVersion = gameVersion;
        }

        const res = await cfClient.get('/mods/search', { params });
        const items = res.data?.data || [];

        return items.map((item: any) => {
            const categories = Array.isArray(item.categories) ? item.categories.map((c: any) => c.name) : [];
            const latestFile = item.latestFiles?.[0];
            const dlUrl = latestFile ? resolveCurseForgeDownloadUrl(latestFile) : undefined;

            return {
                id: `cf-dp-${item.id}`,
                title: item.name,
                description: item.summary || '',
                author: item.authors?.[0]?.name || 'CurseForge Creator',
                iconUrl: item.logo?.url || item.logo?.thumbnailUrl,
                downloads: item.downloadCount || 0,
                downloadUrl: dlUrl,
                filename: latestFile?.fileName || `${item.slug || item.id}.zip`,
                categories,
                gameVersions: (item.latestFilesIndexes || []).map((f: any) => f.gameVersion).slice(0, 5),
                source: 'curseforge',
                sourceUrl: item.links?.websiteUrl || `https://www.curseforge.com/minecraft/data-packs/${item.slug}`,
            };
        });
    } catch (e) {
        console.error('Error searching CurseForge datapacks:', e);
        return [];
    }
};

/**
 * Search Modrinth for Minecraft Data Packs
 */
export const searchModrinthDatapacks = async (
    query = '',
    gameVersion?: string,
    pageSize = 24
): Promise<OnlineDatapack[]> => {
    try {
        const facets: string[][] = [['project_type:datapack']];

        if (gameVersion && gameVersion !== 'all') {
            facets.push([`versions:${gameVersion}`]);
        }

        const params = new URLSearchParams({
            limit: String(pageSize),
            facets: JSON.stringify(facets),
            index: 'downloads',
        });

        if (query.trim()) {
            params.set('query', query.trim());
        }

        const res = await axios.get(`https://api.modrinth.com/v2/search?${params.toString()}`, { timeout: 10000 });
        const hits = res.data?.hits || [];

        return hits.map((hit: any) => ({
            id: `mr-dp-${hit.project_id}`,
            title: hit.title,
            description: hit.description || '',
            author: hit.author || 'Modrinth Creator',
            iconUrl: hit.icon_url,
            downloads: hit.downloads || 0,
            categories: Array.isArray(hit.categories) ? hit.categories : [],
            gameVersions: Array.isArray(hit.versions) ? hit.versions.slice(0, 5) : [],
            source: 'modrinth',
            sourceUrl: `https://modrinth.com/datapack/${hit.slug || hit.project_id}`,
        }));
    } catch (e) {
        console.error('Error searching Modrinth datapacks:', e);
        return [];
    }
};
