import getFileContents from '@/api/server/files/getFileContents';
import saveFileContents from '@/api/server/files/saveFileContents';

export interface JVMPreset {
    id: string;
    name: string;
    description: string;
    recommendedFor: string;
    flags: string[];
}

export const AIKAR_FLAGS = [
    '-XX:+UseG1GC',
    '-XX:+ParallelRefProcEnabled',
    '-XX:MaxGCPauseMillis=200',
    '-XX:+UnlockExperimentalVMOptions',
    '-XX:+DisableExplicitGC',
    '-XX:+AlwaysPreTouch',
    '-XX:G1NewSizePercent=30',
    '-XX:G1MaxNewSizePercent=40',
    '-XX:G1ReservePercent=20',
    '-XX:G1HeapWastePercent=5',
    '-XX:G1MixedGCCountTarget=4',
    '-XX:InitiatingHeapOccupancyPercent=15',
    '-XX:G1MixedGCLiveThresholdPercent=90',
    '-XX:G1RSetUpdatingPauseTimePercent=5',
    '-XX:SurvivorRatio=32',
    '-XX:+PerfDisableSharedMem',
    '-XX:MaxTenuringThreshold=1',
];

export const LOW_RAM_FLAGS = [
    '-XX:+UseG1GC',
    '-XX:+ParallelRefProcEnabled',
    '-XX:MaxGCPauseMillis=150',
    '-XX:+UnlockExperimentalVMOptions',
    '-XX:+DisableExplicitGC',
    '-XX:G1NewSizePercent=20',
    '-XX:G1MaxNewSizePercent=30',
    '-XX:G1ReservePercent=15',
    '-XX:+AlwaysPreTouch',
];

export const MODDED_FLAGS = [
    '-XX:+UseG1GC',
    '-XX:+ParallelRefProcEnabled',
    '-XX:MaxGCPauseMillis=250',
    '-XX:+UnlockExperimentalVMOptions',
    '-XX:+DisableExplicitGC',
    '-XX:+AlwaysPreTouch',
    '-XX:G1NewSizePercent=35',
    '-XX:G1MaxNewSizePercent=50',
    '-XX:G1ReservePercent=20',
    '-Dfml.readTimeout=180',
    '-Dfml.queryResult=confirm',
];

export interface OptimizerConfig {
    rawJvmArgs: string;
    activePreset: string;
    viewDistance: number;
    simulationDistance: number;
    networkCompression: number;
}

export const loadOptimizerConfig = async (uuid: string): Promise<OptimizerConfig> => {
    let rawJvmArgs = '';
    let viewDistance = 10;
    let simulationDistance = 10;
    let networkCompression = 256;

    try {
        rawJvmArgs = await getFileContents(uuid, '/user_jvm_args.txt');
    } catch {
        rawJvmArgs = AIKAR_FLAGS.join('\n');
    }

    try {
        const props = await getFileContents(uuid, '/server.properties');
        const vd = props.match(/^view-distance=(.*)$/m);
        if (vd) viewDistance = parseInt(vd[1], 10) || 10;

        const sd = props.match(/^simulation-distance=(.*)$/m);
        if (sd) simulationDistance = parseInt(sd[1], 10) || 10;

        const nc = props.match(/^network-compression-threshold=(.*)$/m);
        if (nc) networkCompression = parseInt(nc[1], 10) || 256;
    } catch {
        // use defaults
    }

    let activePreset = 'custom';
    if (rawJvmArgs.includes('MaxGCPauseMillis=200') && rawJvmArgs.includes('G1NewSizePercent=30')) {
        activePreset = 'aikar';
    } else if (rawJvmArgs.includes('MaxGCPauseMillis=150')) {
        activePreset = 'low_ram';
    } else if (rawJvmArgs.includes('Dfml.readTimeout=180')) {
        activePreset = 'modded';
    }

    return {
        rawJvmArgs,
        activePreset,
        viewDistance,
        simulationDistance,
        networkCompression,
    };
};

export const saveJvmArgs = async (uuid: string, argsContent: string): Promise<void> => {
    await saveFileContents(uuid, '/user_jvm_args.txt', argsContent);
};

export const applyPropertiesOptimizations = async (
    uuid: string,
    viewDistance: number,
    simulationDistance: number,
    networkCompression: number
): Promise<void> => {
    try {
        let props = await getFileContents(uuid, '/server.properties');

        if (/^view-distance=.*$/m.test(props)) {
            props = props.replace(/^view-distance=.*$/m, `view-distance=${viewDistance}`);
        } else {
            props += `\nview-distance=${viewDistance}\n`;
        }

        if (/^simulation-distance=.*$/m.test(props)) {
            props = props.replace(/^simulation-distance=.*$/m, `simulation-distance=${simulationDistance}`);
        } else {
            props += `\nsimulation-distance=${simulationDistance}\n`;
        }

        if (/^network-compression-threshold=.*$/m.test(props)) {
            props = props.replace(/^network-compression-threshold=.*$/m, `network-compression-threshold=${networkCompression}`);
        } else {
            props += `\nnetwork-compression-threshold=${networkCompression}\n`;
        }

        await saveFileContents(uuid, '/server.properties', props);
    } catch {
        // Create if missing
        await saveFileContents(
            uuid,
            '/server.properties',
            `view-distance=${viewDistance}\nsimulation-distance=${simulationDistance}\nnetwork-compression-threshold=${networkCompression}\n`
        );
    }
};
