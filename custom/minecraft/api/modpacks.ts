import http from '@/api/http';
import loadDirectory, { FileObject } from '@/api/server/files/loadDirectory';
import deleteFiles from '@/api/server/files/deleteFiles';
import axios from 'axios';

export interface OnlineModpack {
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
    color?: number;
}

export interface ModpackVersionFile {
    filename: string;
    url: string;
    size: number;
    primary: boolean;
    fileType?: string; // 'required-resource-pack' | undefined
}

export interface ModpackVersion {
    id: string;
    name: string;
    versionNumber: string;
    gameVersions: string[];
    loaders: string[];
    versionType: 'release' | 'beta' | 'alpha';
    datePublished: string;
    downloads: number;
    changelog?: string;
    files: ModpackVersionFile[];
}

export interface ModpackDetails {
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
    color?: number;
}

export type ModpackLoader = 'all' | 'fabric' | 'forge' | 'neoforge' | 'quilt';

/**
 * Search Modrinth for modpacks with optional loader, version filters
 */
export const searchModrinthModpacks = async (
    query = '',
    loader?: string,
    gameVersion?: string,
    sortBy: 'downloads' | 'follows' | 'updated' | 'newest' = 'downloads'
): Promise<OnlineModpack[]> => {
    try {
        const facets: string[][] = [['project_type:modpack']];

        if (loader && loader !== 'all') {
            facets.push([`categories:${loader.toLowerCase()}`]);
        }

        if (gameVersion && gameVersion !== 'all') {
            facets.push([`versions:${gameVersion}`]);
        }

        // Filter to modpacks that have server-side support
        facets.push(['server_side:required', 'server_side:optional']);

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
        const res = await axios.get(url, { timeout: 10000 });
        const hits = res.data?.hits || [];

        return hits.map((hit: any) => {
            const categories = Array.isArray(hit.categories) ? hit.categories : [];
            const detectedLoaders = categories.filter((c: string) =>
                ['fabric', 'forge', 'neoforge', 'quilt'].includes(c)
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
                sourceUrl: `https://modrinth.com/modpack/${hit.slug || hit.project_id}`,
                color: hit.color,
            };
        });
    } catch (e) {
        console.error('Error searching Modrinth modpacks:', e);
        return [];
    }
};

/**
 * Fetch detailed info for a modpack by its ID or slug
 */
export const getModpackDetails = async (projectId: string): Promise<ModpackDetails | null> => {
    try {
        const res = await axios.get(`https://api.modrinth.com/v2/project/${projectId}`, { timeout: 10000 });
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
            color: data.color,
        };
    } catch (e) {
        console.error('Error getting modpack details:', e);
        return null;
    }
};

/**
 * Fetch available versions of a modpack with optional loader and MC version filtering
 */
export const getModpackVersions = async (
    projectId: string,
    loader?: string,
    gameVersion?: string
): Promise<ModpackVersion[]> => {
    try {
        const params = new URLSearchParams();
        if (loader && loader !== 'all') {
            params.set('loaders', JSON.stringify([loader.toLowerCase()]));
        }
        if (gameVersion && gameVersion !== 'all') {
            params.set('game_versions', JSON.stringify([gameVersion]));
        }

        const queryStr = params.toString() ? `?${params.toString()}` : '';
        const res = await axios.get(`https://api.modrinth.com/v2/project/${projectId}/version${queryStr}`, { timeout: 10000 });
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
                fileType: f.file_type,
            })),
        }));
    } catch (e) {
        console.error('Error getting modpack versions:', e);
        return [];
    }
};

/**
 * Find the best server-pack download for a modpack version.
 * Modrinth modpacks have .mrpack files; we look for those.
 */
export const getBestModpackDownload = (version: ModpackVersion): { url: string; filename: string; size: number } | null => {
    const files = version.files || [];

    // Prefer primary .mrpack file
    const mrpack =
        files.find((f) => f.primary && f.filename?.endsWith('.mrpack')) ||
        files.find((f) => f.filename?.endsWith('.mrpack')) ||
        files.find((f) => f.primary) ||
        files[0];

    if (!mrpack || !mrpack.url) return null;
    return {
        url: mrpack.url,
        filename: mrpack.filename,
        size: mrpack.size || 0,
    };
};

/**
 * Download a modpack file into the server root using Pterodactyl pull endpoint
 */
export const pullModpack = async (uuid: string, url: string, filename?: string): Promise<void> => {
    await http.post(`/api/client/servers/${uuid}/files/pull`, {
        url,
        directory: '/',
        filename: filename || null,
        use_header: true,
    });
};

/**
 * Get the list of files in server root to detect current modpack state
 */
export const getServerRootFiles = async (uuid: string): Promise<FileObject[]> => {
    try {
        return await loadDirectory(uuid, '/');
    } catch {
        return [];
    }
};

/**
 * Delete files from the server root (cleanup before modpack install)
 */
export const deleteServerFiles = async (uuid: string, directory: string, files: string[]): Promise<void> => {
    await deleteFiles(uuid, directory, files);
};

/**
 * Fetch trending/popular modpacks from Modrinth (curated popular modpacks)
 */
export const fetchTrendingModpacks = async (loader?: string): Promise<OnlineModpack[]> => {
    try {
        const facets: string[][] = [['project_type:modpack'], ['server_side:required', 'server_side:optional']];

        if (loader && loader !== 'all') {
            facets.push([`categories:${loader.toLowerCase()}`]);
        }

        const params = new URLSearchParams({
            limit: '24',
            facets: JSON.stringify(facets),
            index: 'follows',
        });

        const url = `https://api.modrinth.com/v2/search?${params.toString()}`;
        const res = await axios.get(url, { timeout: 10000 });
        const hits = res.data?.hits || [];

        return hits.map((hit: any) => {
            const categories = Array.isArray(hit.categories) ? hit.categories : [];
            const detectedLoaders = categories.filter((c: string) =>
                ['fabric', 'forge', 'neoforge', 'quilt'].includes(c)
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
                sourceUrl: `https://modrinth.com/modpack/${hit.slug || hit.project_id}`,
                color: hit.color,
            };
        });
    } catch (e) {
        console.error('Error fetching trending modpacks:', e);
        return [];
    }
};

/**
 * Format large numbers with k/M suffixes
 */
export const formatDownloads = (n: number): string => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return String(n);
};
