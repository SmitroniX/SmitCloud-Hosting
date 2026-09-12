import http from '@/api/http';
import loadDirectory, { FileObject } from '@/api/server/files/loadDirectory';
import deleteFiles from '@/api/server/files/deleteFiles';
import renameFiles from '@/api/server/files/renameFiles';
import createDirectory from '@/api/server/files/createDirectory';
import getFileUploadUrl from '@/api/server/files/getFileUploadUrl';
import axios from 'axios';

export interface InstalledMod {
    name: string;
    filename: string;
    size: number;
    modifiedAt: Date;
    isEnabled: boolean;
}

export interface OnlineMod {
    id: string;
    slug: string;
    title: string;
    description: string;
    author?: string;
    iconUrl?: string;
    downloads: number;
    follows: number;
    categories: string[];
    loaders: string[];
    gameVersions: string[];
    serverSide?: 'required' | 'optional' | 'unsupported';
    clientSide?: 'required' | 'optional' | 'unsupported';
    sourceUrl?: string;
}

export interface ModVersionFile {
    filename: string;
    url: string;
    size: number;
    primary: boolean;
}

export interface ModVersion {
    id: string;
    name: string;
    versionNumber: string;
    gameVersions: string[];
    loaders: string[];
    versionType: 'release' | 'beta' | 'alpha';
    datePublished: string;
    downloads: number;
    changelog?: string;
    files: ModVersionFile[];
}

export interface ModDetails {
    id: string;
    slug: string;
    title: string;
    description: string;
    body?: string;
    author?: string;
    iconUrl?: string;
    downloads: number;
    followers?: number;
    categories: string[];
    loaders: string[];
    gameVersions: string[];
    serverSide?: 'required' | 'optional' | 'unsupported';
    clientSide?: 'required' | 'optional' | 'unsupported';
    gallery?: string[];
    sourceUrl?: string;
    issuesUrl?: string;
    wikiUrl?: string;
    discordUrl?: string;
    donationUrls?: { id: string; platform: string; url: string }[];
    license?: string;
}

export type ModLoader = 'all' | 'fabric' | 'forge' | 'neoforge' | 'quilt';

/**
 * Fetch all installed .jar / .jar.disabled mods in /mods
 */
export const fetchInstalledMods = async (uuid: string): Promise<InstalledMod[]> => {
    try {
        const files: FileObject[] = await loadDirectory(uuid, '/mods');
        const jarFiles = files.filter(
            (f) => f.isFile && (f.name.endsWith('.jar') || f.name.endsWith('.jar.disabled'))
        );

        return jarFiles.map((f) => {
            const isEnabled = !f.name.endsWith('.disabled');
            const cleanName = f.name.replace(/\.disabled$/, '').replace(/\.jar$/, '');
            return {
                name: cleanName,
                filename: f.name,
                size: f.size,
                modifiedAt: f.modifiedAt,
                isEnabled,
            };
        });
    } catch {
        return [];
    }
};

/**
 * Toggle mod between enabled (.jar) and disabled (.jar.disabled)
 */
export const toggleMod = async (uuid: string, filename: string, enable: boolean): Promise<void> => {
    const to = enable ? filename.replace(/\.disabled$/, '') : `${filename}.disabled`;
    await renameFiles(uuid, '/mods', [{ from: filename, to }]);
};

/**
 * Delete a mod from /mods
 */
export const deleteMod = async (uuid: string, filename: string): Promise<void> => {
    await deleteFiles(uuid, '/mods', [filename]);
};

/**
 * Ensure the /mods folder exists
 */
export const createModsFolder = async (uuid: string): Promise<void> => {
    await createDirectory(uuid, '/', 'mods');
};

/**
 * Download a mod directly into /mods using Pterodactyl pull endpoint
 */
export const pullMod = async (uuid: string, url: string, filename?: string): Promise<void> => {
    await http.post(`/api/client/servers/${uuid}/files/pull`, {
        url,
        directory: '/mods',
        filename: filename || null,
        use_header: true,
    });
};

/**
 * Search Modrinth for Minecraft mods with optional loader, version, and server-side filters
 */
export const searchModrinthMods = async (
    query = '',
    loader?: string,
    gameVersion?: string,
    serverOnly = false,
    sortBy: 'downloads' | 'follows' | 'updated' | 'newest' = 'downloads'
): Promise<OnlineMod[]> => {
    try {
        const facets: string[][] = [['project_type:mod']];

        if (loader && loader !== 'all') {
            facets.push([`categories:${loader.toLowerCase()}`]);
        }

        if (gameVersion && gameVersion !== 'all') {
            facets.push([`versions:${gameVersion}`]);
        }

        if (serverOnly) {
            facets.push(['server_side:required', 'server_side:optional']);
        }

        let indexParam = 'downloads';
        if (sortBy === 'follows') indexParam = 'follows';
        if (sortBy === 'updated') indexParam = 'updated';
        if (sortBy === 'newest') indexParam = 'newest';

        const params = new URLSearchParams({
            limit: '24',
            facets: JSON.stringify(facets),
            index: indexParam,
        });

        if (query.trim()) {
            params.set('query', query.trim());
        }

        const url = `https://api.modrinth.com/v2/search?${params.toString()}`;
        const res = await axios.get(url, { timeout: 8000 });
        const hits = res.data?.hits || [];

        return hits.map((hit: any) => {
            const categories = Array.isArray(hit.categories) ? hit.categories : [];
            const detectedLoaders = categories.filter((c: string) =>
                ['fabric', 'forge', 'neoforge', 'quilt', 'liteloader'].includes(c)
            );

            return {
                id: hit.project_id,
                slug: hit.slug || hit.project_id,
                title: hit.title,
                description: hit.description,
                author: hit.author,
                iconUrl: hit.icon_url,
                downloads: hit.downloads || 0,
                follows: hit.follows || 0,
                categories,
                loaders: detectedLoaders,
                gameVersions: Array.isArray(hit.versions) ? hit.versions : [],
                serverSide: hit.server_side,
                clientSide: hit.client_side,
                sourceUrl: `https://modrinth.com/mod/${hit.slug || hit.project_id}`,
            };
        });
    } catch (e) {
        console.error('Error searching Modrinth mods:', e);
        return [];
    }
};

/**
 * Fetch detailed info for a mod by its ID or slug
 */
export const getModDetails = async (projectId: string): Promise<ModDetails | null> => {
    try {
        const res = await axios.get(`https://api.modrinth.com/v2/project/${projectId}`, { timeout: 8000 });
        const data = res.data;
        if (!data) return null;

        const categories = Array.isArray(data.categories) ? data.categories : [];
        const detectedLoaders = (Array.isArray(data.loaders) ? data.loaders : []).filter((l: string) =>
            ['fabric', 'forge', 'neoforge', 'quilt'].includes(l)
        );

        return {
            id: data.id,
            slug: data.slug || data.id,
            title: data.title,
            description: data.description,
            body: data.body,
            author: data.author,
            iconUrl: data.icon_url,
            downloads: data.downloads || 0,
            followers: data.followers || 0,
            categories,
            loaders: detectedLoaders.length > 0 ? detectedLoaders : categories.filter((c: string) => ['fabric', 'forge', 'neoforge', 'quilt'].includes(c)),
            gameVersions: Array.isArray(data.game_versions) ? data.game_versions : [],
            serverSide: data.server_side,
            clientSide: data.client_side,
            gallery: Array.isArray(data.gallery) ? data.gallery.map((g: any) => g.url || g) : [],
            sourceUrl: data.source_url,
            issuesUrl: data.issues_url,
            wikiUrl: data.wiki_url,
            discordUrl: data.discord_url,
            donationUrls: data.donation_urls || [],
            license: data.license?.name,
        };
    } catch (e) {
        console.error('Error getting mod details:', e);
        return null;
    }
};

/**
 * Fetch available versions of a mod with optional loader and Minecraft version filtering
 */
export const getModVersions = async (
    projectId: string,
    loader?: string,
    gameVersion?: string
): Promise<ModVersion[]> => {
    try {
        const params = new URLSearchParams();
        if (loader && loader !== 'all') {
            params.set('loaders', JSON.stringify([loader.toLowerCase()]));
        }
        if (gameVersion && gameVersion !== 'all') {
            params.set('game_versions', JSON.stringify([gameVersion]));
        }

        const queryStr = params.toString() ? `?${params.toString()}` : '';
        const res = await axios.get(`https://api.modrinth.com/v2/project/${projectId}/version${queryStr}`, { timeout: 8000 });
        const versions = Array.isArray(res.data) ? res.data : [];

        return versions.map((v: any) => ({
            id: v.id,
            name: v.name,
            versionNumber: v.version_number,
            gameVersions: Array.isArray(v.game_versions) ? v.game_versions : [],
            loaders: Array.isArray(v.loaders) ? v.loaders : [],
            versionType: (v.version_type || 'release') as 'release' | 'beta' | 'alpha',
            datePublished: v.date_published,
            downloads: v.downloads || 0,
            changelog: v.changelog,
            files: (v.files || []).map((f: any) => ({
                filename: f.filename,
                url: f.url,
                size: f.size || 0,
                primary: !!f.primary,
            })),
        }));
    } catch (e) {
        console.error('Error getting mod versions:', e);
        return [];
    }
};

/**
 * Find the best primary download URL and filename for a mod version
 */
export const getBestModDownload = (version: ModVersion): { url: string; filename: string; size: number } | null => {
    const files = version.files || [];
    const jarFile =
        files.find((f) => f.primary && f.filename?.endsWith('.jar')) ||
        files.find((f) => f.filename?.endsWith('.jar')) ||
        files[0];

    if (!jarFile || !jarFile.url) return null;
    return {
        url: jarFile.url,
        filename: jarFile.filename,
        size: jarFile.size || 0,
    };
};

/**
 * Upload a local .jar mod file directly to /mods
 */
export const uploadModFile = async (uuid: string, file: File): Promise<void> => {
    const uploadUrl = await getFileUploadUrl(uuid);
    const formData = new FormData();
    formData.append('files', file, file.name);

    await axios.post(`${uploadUrl}&directory=/mods`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

/**
 * Auto-detect server mod loader (Fabric, Forge, NeoForge, Quilt) by inspecting root directory
 */
export const detectServerLoader = async (uuid: string): Promise<ModLoader> => {
    try {
        const rootFiles = await loadDirectory(uuid, '/');
        const names = rootFiles.map((f) => f.name.toLowerCase());

        if (names.some((n) => n.includes('fabric'))) return 'fabric';
        if (names.some((n) => n.includes('neoforge'))) return 'neoforge';
        if (names.some((n) => n.includes('forge') || n.includes('arclight') || n === 'user_jvm_args.txt')) return 'forge';
        if (names.some((n) => n.includes('quilt'))) return 'quilt';

        return 'all';
    } catch {
        return 'all';
    }
};
