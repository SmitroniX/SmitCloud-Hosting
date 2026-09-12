import http from '@/api/http';
import getFileContents from '@/api/server/files/getFileContents';
import saveFileContents from '@/api/server/files/saveFileContents';
import { Allocation } from '@/api/server/getServer';
import createServerAllocation from '@/api/server/network/createServerAllocation';
import setServerAllocationNotes from '@/api/server/network/setServerAllocationNotes';

export type PortRoleType = 'java' | 'bedrock' | 'voice' | 'map' | 'custom';

export interface PortRoleInfo {
    role: PortRoleType;
    label: string;
    protocol: 'TCP' | 'UDP' | 'TCP/UDP';
    badgeColor: string;
    textColor: string;
    bgColor: string;
    borderColor: string;
    icon: string;
    description: string;
}

/**
 * Identify the role of a given allocation based on port number, notes, and default flag.
 */
export const detectPortRole = (allocation: Allocation): PortRoleInfo => {
    const port = allocation.port;
    const notes = (allocation.notes || '').toLowerCase();

    // Bedrock Edition check
    if (
        port === 19132 ||
        (port >= 19130 && port <= 19145) ||
        notes.includes('bedrock') ||
        notes.includes('geyser') ||
        notes.includes('pocket')
    ) {
        return {
            role: 'bedrock',
            label: 'Bedrock Edition',
            protocol: 'UDP',
            badgeColor: 'emerald',
            textColor: 'text-emerald-400',
            bgColor: 'bg-emerald-500/15',
            borderColor: 'border-emerald-500/30',
            icon: '📱',
            description: 'GeyserMC Bedrock crossplay UDP port (Mobile / Console / Windows)',
        };
    }

    // Java Primary check
    if (allocation.isDefault || port === 25565 || notes.includes('java') || notes.includes('primary')) {
        return {
            role: 'java',
            label: allocation.isDefault ? 'Java Primary' : 'Java Secondary',
            protocol: 'TCP',
            badgeColor: 'blue',
            textColor: 'text-blue-400',
            bgColor: 'bg-blue-500/15',
            borderColor: 'border-blue-500/30',
            icon: '☕',
            description: 'Minecraft Java Edition TCP connection port',
        };
    }

    // Voice Chat check
    if (port === 24454 || notes.includes('voice') || notes.includes('plasmo') || notes.includes('svc')) {
        return {
            role: 'voice',
            label: 'Voice Chat',
            protocol: 'UDP',
            badgeColor: 'purple',
            textColor: 'text-purple-400',
            bgColor: 'bg-purple-500/15',
            borderColor: 'border-purple-500/30',
            icon: '🎙️',
            description: 'Simple Voice Chat / Plasmo Voice UDP voice channel',
        };
    }

    // Web Map check
    if (port === 8123 || port === 8100 || notes.includes('map') || notes.includes('dynmap') || notes.includes('bluemap')) {
        return {
            role: 'map',
            label: 'Web Map',
            protocol: 'TCP',
            badgeColor: 'amber',
            textColor: 'text-amber-400',
            bgColor: 'bg-amber-500/15',
            borderColor: 'border-amber-500/30',
            icon: '🗺️',
            description: 'Dynmap / BlueMap / Squaremap live web view port',
        };
    }

    // Custom / Generic port
    return {
        role: 'custom',
        label: 'Custom Port',
        protocol: 'TCP/UDP',
        badgeColor: 'gray',
        textColor: 'text-neutral-400',
        bgColor: 'bg-neutral-700/40',
        borderColor: 'border-neutral-600/40',
        icon: '⚡',
        description: 'Assigned service allocation',
    };
};

/**
 * Synchronize server-port in server.properties with the primary Java allocation port.
 */
export const syncJavaPortToProperties = async (uuid: string, port: number): Promise<boolean> => {
    try {
        const raw = await getFileContents(uuid, 'server.properties');
        let updated = raw;

        if (updated.includes('server-port=')) {
            updated = updated.replace(/^server-port=.*$/m, `server-port=${port}`);
        } else {
            updated += `\nserver-port=${port}`;
        }

        if (updated.includes('query.port=')) {
            updated = updated.replace(/^query.port=.*$/m, `query.port=${port}`);
        }

        await saveFileContents(uuid, 'server.properties', updated);
        return true;
    } catch {
        return false;
    }
};

/**
 * Synchronize bedrock port into Geyser's config.yml if installed.
 */
export const syncBedrockPortToGeyser = async (uuid: string, port: number): Promise<boolean> => {
    const candidatePaths = [
        'plugins/Geyser-Spigot/config.yml',
        'plugins/Geyser-Paper/config.yml',
        'plugins/geyser/config.yml',
        'config.yml',
    ];

    for (const path of candidatePaths) {
        try {
            const raw = await getFileContents(uuid, path);
            let updated = raw;

            // Replace port under bedrock:
            // Matches "port: <digits>"
            const bedrockSectionRegex = /(bedrock:\s*\n(?:[^\n]*\n)*?\s*port:\s*)\d+/i;
            if (bedrockSectionRegex.test(updated)) {
                updated = updated.replace(bedrockSectionRegex, `$1${port}`);
            } else {
                updated = updated.replace(/^(\s*port:\s*)\d+/m, `$1${port}`);
            }

            // Also update broadcast-port if present
            updated = updated.replace(/^(\s*broadcast-port:\s*)\d+/m, `$1${port}`);

            await saveFileContents(uuid, path, updated);
            return true;
        } catch {
            // Check next path
            continue;
        }
    }

    return false;
};

/**
 * Synchronize both Java and Bedrock ports to their respective configuration files.
 */
export const syncAllPortsToConfigs = async (
    uuid: string,
    javaPort?: number,
    bedrockPort?: number
): Promise<{ javaSynced: boolean; bedrockSynced: boolean; message: string }> => {
    let javaSynced = false;
    let bedrockSynced = false;

    if (javaPort) {
        javaSynced = await syncJavaPortToProperties(uuid, javaPort);
    }

    if (bedrockPort) {
        bedrockSynced = await syncBedrockPortToGeyser(uuid, bedrockPort);
    }

    const msgs: string[] = [];
    if (javaSynced) msgs.push(`Java port (${javaPort}) synced to server.properties`);
    if (bedrockSynced) msgs.push(`Bedrock port (${bedrockPort}) synced to Geyser config.yml`);

    if (msgs.length === 0) {
        return {
            javaSynced: false,
            bedrockSynced: false,
            message: 'No config files found to update. Ensure server.properties or Geyser is installed.',
        };
    }

    return {
        javaSynced,
        bedrockSynced,
        message: msgs.join(' • '),
    };
};

/**
 * Auto-assign a Bedrock port from existing allocations or by requesting a new one.
 */
export const autoAssignBedrockAllocation = async (
    uuid: string,
    currentAllocations: Allocation[]
): Promise<Allocation> => {
    // 1. Check if server already has a bedrock allocation
    const existingBedrock = currentAllocations.find(
        (a) =>
            a.port === 19132 ||
            (a.notes && a.notes.toLowerCase().includes('bedrock')) ||
            (a.notes && a.notes.toLowerCase().includes('geyser'))
    );
    if (existingBedrock) {
        // Just sync and return
        await syncBedrockPortToGeyser(uuid, existingBedrock.port);
        return existingBedrock;
    }

    // 2. Check if there is an unassigned secondary allocation that can be repurposed
    const nonDefault = currentAllocations.find((a) => !a.isDefault && (!a.notes || a.notes.trim() === ''));
    if (nonDefault) {
        const updated = await setServerAllocationNotes(uuid, nonDefault.id, 'Bedrock / Geyser (UDP)');
        await syncBedrockPortToGeyser(uuid, nonDefault.port);
        return updated;
    }

    // 3. Create a new allocation from node pool
    const newAllocation = await createServerAllocation(uuid);
    const updated = await setServerAllocationNotes(uuid, newAllocation.id, 'Bedrock / Geyser (UDP)');
    await syncBedrockPortToGeyser(uuid, updated.port);
    return updated;
};
