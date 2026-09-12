import http from '@/api/http';
import loadDirectory, { FileObject } from '@/api/server/files/loadDirectory';
import deleteFiles from '@/api/server/files/deleteFiles';
import renameFiles from '@/api/server/files/renameFiles';
import createDirectory from '@/api/server/files/createDirectory';
import getFileUploadUrl from '@/api/server/files/getFileUploadUrl';
import axios from 'axios';

export interface InstalledPlugin {
    name: string;
    filename: string;
    size: number;
    modifiedAt: Date;
    isEnabled: boolean;
}

export interface OnlinePlugin {
    id: string;
    title: string;
    description: string;
    author?: string;
    iconUrl?: string;
    downloads: number;
    source: 'modrinth' | 'spiget';
    sourceUrl?: string;
}

export interface PluginVersionFile {
    filename: string;
    url: string;
    size: number;
    primary: boolean;
}

export interface PluginVersion {
    id: string;
    name: string;
    versionNumber: string;
    gameVersions: string[];
    loaders: string[];
    versionType: 'release' | 'beta' | 'alpha';
    datePublished: string;
    downloads: number;
    changelog?: string;
    files: PluginVersionFile[];
}

export interface PluginDetails {
    id: string;
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
    sourceUrl?: string;
    issuesUrl?: string;
    wikiUrl?: string;
    discordUrl?: string;
    donationUrls?: { id: string; platform: string; url: string }[];
    license?: string;
}

export const fetchInstalledPlugins = async (uuid: string): Promise<InstalledPlugin[]> => {
    try {
        const files: FileObject[] = await loadDirectory(uuid, '/plugins');
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

export const togglePlugin = async (uuid: string, filename: string, enable: boolean): Promise<void> => {
    const to = enable ? filename.replace(/\.disabled$/, '') : `${filename}.disabled`;
    await renameFiles(uuid, '/plugins', [{ from: filename, to }]);
};

export const deletePlugin = async (uuid: string, filename: string): Promise<void> => {
    await deleteFiles(uuid, '/plugins', [filename]);
};

export const createPluginsFolder = async (uuid: string): Promise<void> => {
    await createDirectory(uuid, '/', 'plugins');
};

export const pullPlugin = async (uuid: string, url: string, filename?: string): Promise<void> => {
    await http.post(`/api/client/servers/${uuid}/files/pull`, {
        url,
        directory: '/plugins',
        filename: filename || null,
        use_header: true,
    });
};

export const searchModrinth = async (query = ''): Promise<OnlinePlugin[]> => {
    try {
        const q = query.trim();
        const url = q
            ? `https://api.modrinth.com/v2/search?query=${encodeURIComponent(q)}&facets=[["project_type:plugin"]]&limit=20`
            : `https://api.modrinth.com/v2/search?facets=[["project_type:plugin"]]&index=downloads&limit=20`;

        const res = await axios.get(url, { timeout: 8000 });
        const hits = res.data?.hits || [];

        return hits.map((hit: any) => ({
            id: hit.project_id,
            title: hit.title,
            description: hit.description,
            author: hit.author,
            iconUrl: hit.icon_url,
            downloads: hit.downloads || 0,
            source: 'modrinth' as const,
            sourceUrl: `https://modrinth.com/plugin/${hit.slug || hit.project_id}`,
        }));
    } catch (e) {
        console.error('Error searching Modrinth:', e);
        return [];
    }
};

export const getPluginDetails = async (projectId: string): Promise<PluginDetails | null> => {
    try {
        const res = await axios.get(`https://api.modrinth.com/v2/project/${projectId}`, { timeout: 8000 });
        const data = res.data;
        if (!data) return null;

        return {
            id: data.id,
            title: data.title,
            description: data.description,
            body: data.body,
            iconUrl: data.icon_url,
            downloads: data.downloads || 0,
            followers: data.followers || 0,
            categories: data.categories || [],
            loaders: data.loaders || [],
            gameVersions: data.game_versions || [],
            sourceUrl: data.source_url,
            issuesUrl: data.issues_url,
            wikiUrl: data.wiki_url,
            discordUrl: data.discord_url,
            donationUrls: data.donation_urls || [],
            license: data.license?.name,
        };
    } catch (e) {
        console.error('Error getting plugin details:', e);
        return null;
    }
};

export const getPluginVersions = async (projectId: string): Promise<PluginVersion[]> => {
    try {
        const res = await axios.get(`https://api.modrinth.com/v2/project/${projectId}/version`, { timeout: 8000 });
        const versions = res.data || [];

        return versions.map((v: any) => ({
            id: v.id,
            name: v.name,
            versionNumber: v.version_number,
            gameVersions: v.game_versions || [],
            loaders: v.loaders || [],
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
        console.error('Error getting plugin versions:', e);
        return [];
    }
};

export const getModrinthDownload = async (
    projectId: string
): Promise<{ url: string; filename: string } | null> => {
    try {
        const versions = await getPluginVersions(projectId);
        if (!versions.length) return null;

        for (const version of versions) {
            const files = version.files || [];
            const jarFile =
                files.find((f) => f.primary && f.filename?.endsWith('.jar')) ||
                files.find((f) => f.filename?.endsWith('.jar'));
            if (jarFile) {
                return {
                    url: jarFile.url,
                    filename: jarFile.filename,
                };
            }
        }
        return null;
    } catch (e) {
        console.error('Error getting Modrinth download:', e);
        return null;
    }
};

export const searchSpiget = async (query = ''): Promise<OnlinePlugin[]> => {
    try {
        const q = query.trim();
        const url = q
            ? `https://api.spiget.org/v2/search/resources/${encodeURIComponent(q)}?size=20&sort=-downloads`
            : `https://api.spiget.org/v2/resources?size=20&sort=-downloads`;

        const res = await axios.get(url, { timeout: 8000 });
        const data = Array.isArray(res.data) ? res.data : [];

        return data.map((item: any) => ({
            id: String(item.id),
            title: item.name,
            description: item.tag || 'No description available',
            author: item.author?.name || 'SpigotMC Author',
            iconUrl: item.icon?.data ? `data:image/png;base64,${item.icon.data}` : undefined,
            downloads: item.downloads || 0,
            source: 'spiget' as const,
            sourceUrl: `https://www.spigotmc.org/resources/${item.id}`,
        }));
    } catch (e) {
        console.error('Error searching Spiget:', e);
        return [];
    }
};

export const uploadPluginFile = async (uuid: string, file: File): Promise<void> => {
    const uploadUrl = await getFileUploadUrl(uuid);
    const formData = new FormData();
    formData.append('files', file, file.name);

    await axios.post(`${uploadUrl}&directory=/plugins`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};
