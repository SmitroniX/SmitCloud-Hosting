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

export const getModrinthDownload = async (
    projectId: string
): Promise<{ url: string; filename: string } | null> => {
    try {
        const res = await axios.get(`https://api.modrinth.com/v2/project/${projectId}/version`, { timeout: 8000 });
        const versions = res.data || [];
        if (!versions.length) return null;

        // Take primary file from latest version
        for (const version of versions) {
            const files = version.files || [];
            const jarFile = files.find((f: any) => f.primary && f.filename?.endsWith('.jar')) || files.find((f: any) => f.filename?.endsWith('.jar'));
            if (jarFile) {
                return {
                    url: jarFile.url,
                    filename: jarFile.filename,
                };
            }
        }
        return null;
    } catch (e) {
        console.error('Error getting Modrinth version:', e);
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
