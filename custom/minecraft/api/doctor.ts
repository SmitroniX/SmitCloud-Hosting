import getFileContents from '@/api/server/files/getFileContents';
import loadDirectory, { FileObject } from '@/api/server/files/loadDirectory';

export interface DiagnosticIssue {
    id: string;
    severity: 'critical' | 'warning' | 'info';
    title: string;
    description: string;
    solution: string;
    category: 'java' | 'memory' | 'mods' | 'network' | 'world' | 'watchdog' | 'general';
    matchedLines: string[];
}

export interface CrashReportSummary {
    filename: string;
    modifiedAt: Date;
    size: number;
}

export interface DoctorReport {
    timestamp: Date;
    hasLog: boolean;
    issues: DiagnosticIssue[];
    crashReports: CrashReportSummary[];
    totalLinesAnalyzed: number;
    serverHealthScore: number; // 0 - 100
}

export const analyzeServerLogs = async (uuid: string): Promise<DoctorReport> => {
    let logContent = '';
    let hasLog = false;
    let crashReports: CrashReportSummary[] = [];

    try {
        logContent = await getFileContents(uuid, '/logs/latest.log');
        hasLog = true;
    } catch {
        try {
            logContent = await getFileContents(uuid, '/latest.log');
            hasLog = true;
        } catch {
            hasLog = false;
        }
    }

    try {
        const crashFiles: FileObject[] = await loadDirectory(uuid, '/crash-reports');
        crashReports = crashFiles
            .filter((f) => f.isFile && f.name.endsWith('.txt'))
            .map((f) => ({
                filename: f.name,
                modifiedAt: f.modifiedAt,
                size: f.size,
            }))
            .sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime())
            .slice(0, 5);
    } catch {
        crashReports = [];
    }

    const issues: DiagnosticIssue[] = [];
    const lines = logContent ? logContent.split('\n') : [];

    if (hasLog && lines.length > 0) {
        // Rule 1: Java Version Mismatch
        const javaMismatchLines = lines.filter((l) =>
            l.includes('has been compiled by a more recent version of the Java Runtime') ||
            l.includes('class file version') && l.includes('this version of the Java Runtime only recognizes class file versions up to')
        );
        if (javaMismatchLines.length > 0) {
            issues.push({
                id: 'java-version-mismatch',
                severity: 'critical',
                title: 'Java Version Mismatch',
                description: 'The server or one of its mods/plugins requires a newer Java version than the one currently running.',
                solution: 'Go to the Startup tab and update your Java Docker Image (e.g. switch to Java 21 for Minecraft 1.20.5+).',
                category: 'java',
                matchedLines: javaMismatchLines.slice(0, 3),
            });
        }

        // Rule 2: Out of Memory Error
        const oomLines = lines.filter((l) =>
            l.includes('java.lang.OutOfMemoryError') ||
            l.includes('Java heap space') ||
            l.includes('GC overhead limit exceeded')
        );
        if (oomLines.length > 0) {
            issues.push({
                id: 'out-of-memory',
                severity: 'critical',
                title: 'Out of Memory (OOM Crash)',
                description: 'The Minecraft server ran out of allocated RAM (Heap Space) and crashed.',
                solution: 'Increase server RAM allocation or reduce view-distance in server.properties. Use the Optimizer tab to apply Aikar\'s Flags.',
                category: 'memory',
                matchedLines: oomLines.slice(0, 3),
            });
        }

        // Rule 3: Port Bind Exception
        const bindLines = lines.filter((l) =>
            l.includes('FAILED TO BIND TO PORT') ||
            l.includes('Address already in use') ||
            l.includes('java.net.BindException')
        );
        if (bindLines.length > 0) {
            issues.push({
                id: 'port-bind-error',
                severity: 'critical',
                title: 'Port Already in Use (Bind Exception)',
                description: 'Another process is already using the configured server port, or server.properties has an invalid server-ip.',
                solution: 'Ensure server-ip= in server.properties is left blank (0.0.0.0) and that server-port matches your primary Network allocation.',
                category: 'network',
                matchedLines: bindLines.slice(0, 3),
            });
        }

        // Rule 4: Missing Mod Dependencies
        const missingModLines = lines.filter((l) =>
            l.includes('ModResolutionException') ||
            l.includes('MissingMandatoryDependenciesException') ||
            l.includes('requires') && (l.includes('fabric') || l.includes('forge') || l.includes('neoforge')) && l.includes('which is missing')
        );
        if (missingModLines.length > 0) {
            issues.push({
                id: 'missing-mod-dependencies',
                severity: 'critical',
                title: 'Missing Mod Dependencies',
                description: 'One or more mods failed to load because required library mods (such as Fabric API, Cloth Config, or Architectury) are missing.',
                solution: 'Check the error message in the console and install the missing dependencies via the 📦 Mods tab.',
                category: 'mods',
                matchedLines: missingModLines.slice(0, 3),
            });
        }

        // Rule 5: Corrupted Chunks or World Errors
        const worldLines = lines.filter((l) =>
            l.includes('RegionFileFormatException') ||
            l.includes('ChunkNotFoundException') ||
            l.includes('Failed to save chunk') ||
            l.includes('Corrupted chunk')
        );
        if (worldLines.length > 0) {
            issues.push({
                id: 'corrupted-chunk',
                severity: 'warning',
                title: 'Corrupted World Chunk Detected',
                description: 'A region chunk file in your world directory is corrupted or unreadable.',
                solution: 'Restore your world from a backup, or use an NBT chunk pruner / MCA Selector to delete the offending region file.',
                category: 'world',
                matchedLines: worldLines.slice(0, 3),
            });
        }

        // Rule 6: Server Watchdog Timeout
        const watchdogLines = lines.filter((l) =>
            l.includes('A single server tick took') ||
            l.includes('ServerWatchdog') ||
            l.includes('Considering it to be dead, the server will shutdown')
        );
        if (watchdogLines.length > 0) {
            issues.push({
                id: 'watchdog-timeout',
                severity: 'warning',
                title: 'Watchdog Freeze / Lag Spike Crash',
                description: 'The server froze for longer than max-tick-time (usually 60 seconds) and was terminated by the watchdog thread.',
                solution: 'In server.properties, set max-tick-time=-1 to disable watchdog shutdowns during heavy chunk generation or dimension loads.',
                category: 'watchdog',
                matchedLines: watchdogLines.slice(0, 3),
            });
        }

        // Rule 7: Mixin Crash in Mods
        const mixinLines = lines.filter((l) =>
            l.includes('org.spongepowered.asm.mixin.transformer.throwables.MixinTransformerError') ||
            l.includes('MixinApplyError')
        );
        if (mixinLines.length > 0) {
            issues.push({
                id: 'mixin-conflict',
                severity: 'critical',
                title: 'Mod Mixin Conflict',
                description: 'Two or more installed mods are modifying the same Minecraft bytecode and conflicting with each other.',
                solution: 'Temporarily disable recently added mods one by one in the 📦 Mods tab to isolate the incompatible mod.',
                category: 'mods',
                matchedLines: mixinLines.slice(0, 3),
            });
        }
    }

    // Compute Health Score
    let score = 100;
    for (const iss of issues) {
        if (iss.severity === 'critical') score -= 30;
        if (iss.severity === 'warning') score -= 15;
        if (iss.severity === 'info') score -= 5;
    }
    if (score < 0) score = 0;

    return {
        timestamp: new Date(),
        hasLog,
        issues,
        crashReports,
        totalLinesAnalyzed: lines.length,
        serverHealthScore: score,
    };
};

export const fetchCrashReportContent = async (uuid: string, filename: string): Promise<string> => {
    return await getFileContents(uuid, `/crash-reports/${filename}`);
};
