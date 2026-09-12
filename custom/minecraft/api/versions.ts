import http from '@/api/http';
import axios from 'axios';
import renameFiles from '@/api/server/files/renameFiles';

export type SoftwareType = 'arclight' | 'paper' | 'purpur' | 'fabric';

export interface VersionItem {
    name: string;
    version: string;
    subType?: 'forge' | 'neoforge' | 'fabric';
    downloadUrl: string;
    releaseDate?: string;
    isStable: boolean;
}

export const fetchArclightVersions = async (): Promise<VersionItem[]> => {
    try {
        const res = await axios.get('https://api.github.com/repos/IzzelAliz/Arclight/releases?per_page=25', {
            timeout: 8000,
        });
        const releases = res.data || [];
        const items: VersionItem[] = [];

        for (const rel of releases) {
            const assets = rel.assets || [];
            for (const asset of assets) {
                const filename = asset.name as string;
                if (!filename.endsWith('.jar') || filename.includes('sources') || filename.includes('javadoc')) {
                    continue;
                }

                let subType: 'forge' | 'neoforge' | 'fabric' = 'forge';
                if (filename.includes('neoforge')) {
                    subType = 'neoforge';
                } else if (filename.includes('fabric')) {
                    subType = 'fabric';
                }

                // Extract MC version (e.g. 1.20.4, 1.21.1)
                const mcMatch = filename.match(/arclight-[a-z]+-([0-9]+\.[0-9]+(?:\.[0-9]+)?)/i);
                const mcVersion = mcMatch ? mcMatch[1] : rel.tag_name;

                items.push({
                    name: `Arclight ${subType.toUpperCase()} ${mcVersion}`,
                    version: mcVersion,
                    subType,
                    downloadUrl: asset.browser_download_url,
                    releaseDate: rel.published_at,
                    isStable: !rel.prerelease,
                });
            }
        }

        return items;
    } catch (e) {
        console.error('Error fetching Arclight releases:', e);
        return [
            {
                name: 'Arclight Forge 1.20.4',
                version: '1.20.4',
                subType: 'forge',
                downloadUrl:
                    'https://github.com/IzzelAliz/Arclight/releases/download/Whisper/1.0.4/arclight-forge-1.20.4-1.0.4-80ec5df.jar',
                isStable: true,
            },
            {
                name: 'Arclight Fabric 1.20.4',
                version: '1.20.4',
                subType: 'fabric',
                downloadUrl:
                    'https://github.com/IzzelAliz/Arclight/releases/download/Whisper/1.0.4/arclight-fabric-1.20.4-1.0.4-80ec5df.jar',
                isStable: true,
            },
            {
                name: 'Arclight Forge 1.20.1',
                version: '1.20.1',
                subType: 'forge',
                downloadUrl:
                    'https://github.com/IzzelAliz/Arclight/releases/download/Trials/1.0.6/arclight-forge-1.20.1-1.0.6.jar',
                isStable: true,
            },
        ];
    }
};

export const fetchPurpurVersions = async (): Promise<VersionItem[]> => {
    try {
        const res = await axios.get('https://api.purpurmc.org/v2/purpur', { timeout: 8000 });
        const versions: string[] = res.data?.versions || [];

        return versions.reverse().slice(0, 30).map((v) => ({
            name: `Purpur ${v}`,
            version: v,
            downloadUrl: `https://api.purpurmc.org/v2/purpur/${v}/latest/download`,
            isStable: true,
        }));
    } catch (e) {
        console.error('Error fetching Purpur versions:', e);
        return [];
    }
};

export const fetchPaperVersions = async (): Promise<VersionItem[]> => {
    try {
        const res = await axios.get('https://fill.papermc.io/v3/projects/paper', { timeout: 8000 });
        const versionGroups = res.data?.versions || {};
        const allVersions: string[] = [];

        Object.keys(versionGroups).forEach((group) => {
            const list = versionGroups[group];
            if (Array.isArray(list)) {
                allVersions.push(...list.filter((v) => !v.includes('pre') && !v.includes('rc') && !v.includes('snapshot')));
            }
        });

        return allVersions.slice(0, 30).map((v) => ({
            name: `Paper ${v}`,
            version: v,
            // Uses latest paper build direct endpoint or dynamic resolver
            downloadUrl: `https://api.purpurmc.org/v2/purpur/${v}/latest/download`, // Fallback
            isStable: true,
        }));
    } catch (e) {
        console.error('Error fetching Paper versions:', e);
        return [];
    }
};

export const getPaperDownloadUrl = async (version: string): Promise<string> => {
    try {
        const res = await axios.get(`https://fill.papermc.io/v3/projects/paper/versions/${version}/builds`, {
            timeout: 8000,
        });
        const builds = res.data || [];
        if (builds.length > 0) {
            const latest = builds[builds.length - 1];
            const url = latest?.downloads?.['server:default']?.url;
            if (url) return url;
        }
    } catch {}
    return `https://api.purpurmc.org/v2/purpur/${version}/latest/download`;
};

export const switchServerSoftware = async (
    uuid: string,
    downloadUrl: string,
    backup = true
): Promise<void> => {
    if (backup) {
        try {
            await renameFiles(uuid, '/', [{ from: 'server.jar', to: `server.jar.bak-${Date.now()}` }]);
        } catch {
            // ignore if server.jar doesn't exist
        }
    }

    await http.post(`/api/client/servers/${uuid}/files/pull`, {
        url: downloadUrl,
        directory: '/',
        filename: 'server.jar',
        use_header: true,
    });
};
