import React, { useEffect, useState } from 'react';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { ServerContext } from '@/state/server';
import useFlash from '@/plugins/useFlash';
import Spinner from '@/components/elements/Spinner';
import Modal from '@/components/elements/Modal';
import classNames from 'classnames';
import {
    HeartIcon,
    ExclamationIcon,
    CheckCircleIcon,
    RefreshIcon,
    DocumentTextIcon,
    InformationCircleIcon,
    SparklesIcon,
    ShieldCheckIcon,
    XIcon,
} from '@heroicons/react/solid';
import {
    DoctorReport,
    DiagnosticIssue,
    CrashReportSummary,
    analyzeServerLogs,
    fetchCrashReportContent,
} from '@/api/server/minecraft/doctor';

export default () => {
    const server = ServerContext.useStoreState((state) => state.server.data!);
    const { clearFlashes, clearAndAddHttpError } = useFlash();

    const [loading, setLoading] = useState(true);
    const [report, setReport] = useState<DoctorReport | null>(null);

    // Modal for crash report inspection
    const [viewingReport, setViewingReport] = useState<string | null>(null);
    const [reportContent, setReportContent] = useState<string>('');
    const [loadingReportContent, setLoadingReportContent] = useState(false);

    useEffect(() => {
        runDoctor();
    }, [server.uuid]);

    const runDoctor = async () => {
        try {
            setLoading(true);
            clearFlashes('doctor');
            const data = await analyzeServerLogs(server.uuid);
            setReport(data);
        } catch (error) {
            clearAndAddHttpError({ error, key: 'doctor' });
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCrashReport = async (filename: string) => {
        try {
            setViewingReport(filename);
            setLoadingReportContent(true);
            const content = await fetchCrashReportContent(server.uuid, filename);
            setReportContent(content);
        } catch (error) {
            setReportContent('Failed to load crash report content.');
        } finally {
            setLoadingReportContent(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
        if (score >= 70) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
        return 'text-rose-500 border-rose-500/30 bg-rose-500/10';
    };

    return (
        <ServerContentBlock title={'Log Analyzer & Crash Doctor'} showFlashKey={'doctor'}>
            <div className={'flex flex-col gap-6'}>
                {/* Header Banner */}
                <div className={'relative overflow-hidden rounded-2xl border border-rose-500/25 bg-[#0a0f1d]/90 p-6 shadow-2xl backdrop-blur-xl'}>
                    <div className={'pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-rose-500/10 blur-3xl'} />
                    <div className={'pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl'} />

                    <div className={'relative flex flex-col md:flex-row md:items-center md:justify-between gap-6'}>
                        <div className={'flex items-start gap-4'}>
                            <div className={'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-600 to-pink-500 shadow-lg shadow-rose-500/25 text-white'}>
                                <HeartIcon className={'h-7 w-7'} />
                            </div>
                            <div>
                                <div className={'flex flex-wrap items-center gap-2'}>
                                    <h1 className={'text-xl sm:text-2xl font-black tracking-tight text-white'}>
                                        Log Analyzer &amp; Crash Doctor
                                    </h1>
                                    <span className={'inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-3 py-0.5 text-xs font-bold text-rose-400 border border-rose-500/30'}>
                                        <SparklesIcon className={'h-3.5 w-3.5'} />
                                        SMART DIAGNOSTICS
                                    </span>
                                </div>
                                <p className={'mt-1 text-xs sm:text-sm text-neutral-400'}>
                                    Automatically scans your console logs and crash reports to detect Java mismatches, missing mod dependencies, OOM errors, and corrupted chunks.
                                </p>
                            </div>
                        </div>

                        <div className={'flex items-center gap-3 shrink-0'}>
                            <button
                                type={'button'}
                                onClick={runDoctor}
                                disabled={loading}
                                className={'flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 py-2.5 px-5 text-xs font-bold text-white shadow-lg shadow-rose-600/25 transition'}
                            >
                                <RefreshIcon className={classNames('h-3.5 w-3.5', { 'animate-spin': loading })} />
                                {loading ? 'Scanning Logs...' : 'Re-Analyze Server Logs'}
                            </button>
                        </div>
                    </div>

                    {/* Score Strip */}
                    {report && (
                        <div className={'grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-neutral-800/80 text-xs'}>
                            <div className={'rounded-xl bg-neutral-900/60 border border-neutral-800/70 p-3'}>
                                <span className={'text-neutral-500 block text-[10px] uppercase font-bold'}>Health Score</span>
                                <span className={classNames('text-xl font-black mt-0.5 block', getScoreColor(report.serverHealthScore))}>
                                    {report.serverHealthScore}/100
                                </span>
                            </div>
                            <div className={'rounded-xl bg-neutral-900/60 border border-neutral-800/70 p-3'}>
                                <span className={'text-neutral-500 block text-[10px] uppercase font-bold'}>Issues Found</span>
                                <span className={'text-xl font-black text-white mt-0.5 block'}>
                                    {report.issues.length}
                                </span>
                            </div>
                            <div className={'rounded-xl bg-neutral-900/60 border border-neutral-800/70 p-3'}>
                                <span className={'text-neutral-500 block text-[10px] uppercase font-bold'}>Crash Reports</span>
                                <span className={'text-xl font-black text-rose-400 mt-0.5 block'}>
                                    {report.crashReports.length}
                                </span>
                            </div>
                            <div className={'rounded-xl bg-neutral-900/60 border border-neutral-800/70 p-3'}>
                                <span className={'text-neutral-500 block text-[10px] uppercase font-bold'}>Lines Analyzed</span>
                                <span className={'text-xl font-black text-cyan-400 mt-0.5 block'}>
                                    {report.totalLinesAnalyzed.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className={'py-16 text-center'}>
                        <Spinner size={'large'} centered />
                        <p className={'text-xs text-neutral-400 font-mono mt-3'}>Running diagnostic scan on latest.log...</p>
                    </div>
                ) : (
                    <div className={'grid grid-cols-1 lg:grid-cols-12 gap-6'}>
                        {/* Left 8 cols: Diagnostic Issues */}
                        <div className={'lg:col-span-8 flex flex-col gap-4'}>
                            <h2 className={'text-base font-bold text-white flex items-center gap-2'}>
                                <ShieldCheckIcon className={'h-5 w-5 text-rose-400'} />
                                Diagnostic Findings &amp; Recommended Fixes
                            </h2>

                            {report?.issues.length === 0 ? (
                                <div className={'rounded-2xl border border-dashed border-neutral-800 bg-[#0a0f1d]/50 p-12 text-center'}>
                                    <CheckCircleIcon className={'mx-auto h-12 w-12 text-emerald-400'} />
                                    <h3 className={'mt-3 text-base font-bold text-white'}>No Critical Issues Detected!</h3>
                                    <p className={'mt-1 text-xs text-neutral-400 max-w-md mx-auto'}>
                                        Your server logs look healthy. No Java version mismatches, memory exhaustion, or known crash loops were detected in latest.log.
                                    </p>
                                </div>
                            ) : (
                                report?.issues.map((iss) => (
                                    <div
                                        key={iss.id}
                                        className={classNames('rounded-2xl border p-5 bg-[#0a0f1d]/80 backdrop-blur-md transition', {
                                            'border-rose-500/40': iss.severity === 'critical',
                                            'border-amber-500/40': iss.severity === 'warning',
                                            'border-blue-500/40': iss.severity === 'info',
                                        })}
                                    >
                                        <div className={'flex items-start justify-between gap-3'}>
                                            <div className={'flex items-start gap-3'}>
                                                <div className={classNames('p-2 rounded-xl mt-0.5', {
                                                    'bg-rose-500/15 text-rose-400': iss.severity === 'critical',
                                                    'bg-amber-500/15 text-amber-400': iss.severity === 'warning',
                                                    'bg-blue-500/15 text-blue-400': iss.severity === 'info',
                                                })}>
                                                    <ExclamationIcon className={'h-5 w-5'} />
                                                </div>
                                                <div>
                                                    <div className={'flex items-center gap-2'}>
                                                        <h3 className={'text-sm font-bold text-white'}>{iss.title}</h3>
                                                        <span className={classNames('px-2 py-0.5 rounded text-[10px] font-bold uppercase', {
                                                            'bg-rose-500/15 text-rose-400 border border-rose-500/30': iss.severity === 'critical',
                                                            'bg-amber-500/15 text-amber-400 border border-amber-500/30': iss.severity === 'warning',
                                                            'bg-blue-500/15 text-blue-400 border border-blue-500/30': iss.severity === 'info',
                                                        })}>
                                                            {iss.severity}
                                                        </span>
                                                    </div>
                                                    <p className={'text-xs text-neutral-300 mt-1 leading-relaxed'}>
                                                        {iss.description}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Matched Log Lines */}
                                        {iss.matchedLines.length > 0 && (
                                            <div className={'mt-3 rounded-lg bg-neutral-950 p-2.5 font-mono text-[11px] text-rose-300 border border-neutral-800/80 overflow-x-auto'}>
                                                {iss.matchedLines.map((l, idx) => (
                                                    <div key={idx} className={'truncate'}>{l}</div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Recommended Solution */}
                                        <div className={'mt-3 pt-3 border-t border-neutral-800/80 flex items-start gap-2 text-xs text-emerald-400'}>
                                            <CheckCircleIcon className={'h-4 w-4 shrink-0 mt-0.5'} />
                                            <div>
                                                <strong className={'text-white'}>Recommended Solution: </strong>
                                                <span>{iss.solution}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Right 4 cols: Crash Reports & Quick Guide */}
                        <div className={'lg:col-span-4 flex flex-col gap-6'}>
                            {/* Recent Crash Reports */}
                            <div className={'rounded-2xl border border-neutral-800 bg-[#0a0f1d]/80 p-5 backdrop-blur-md'}>
                                <h3 className={'text-base font-bold text-white flex items-center gap-2 mb-3'}>
                                    <DocumentTextIcon className={'h-5 w-5 text-rose-400'} />
                                    Recent Crash Reports
                                </h3>

                                {report?.crashReports.length === 0 ? (
                                    <p className={'text-xs text-neutral-500'}>No crash reports found in /crash-reports.</p>
                                ) : (
                                    <div className={'flex flex-col gap-2'}>
                                        {report?.crashReports.map((cr) => (
                                            <div
                                                key={cr.filename}
                                                onClick={() => handleOpenCrashReport(cr.filename)}
                                                className={'p-3 rounded-xl border border-neutral-800 bg-neutral-900/60 hover:border-rose-500/40 hover:bg-neutral-800/80 cursor-pointer transition flex items-center justify-between'}
                                            >
                                                <div className={'min-w-0 flex-1'}>
                                                    <p className={'text-xs font-bold text-white truncate'}>{cr.filename}</p>
                                                    <p className={'text-[10px] text-neutral-500 mt-0.5'}>
                                                        {new Date(cr.modifiedAt).toLocaleString()}
                                                    </p>
                                                </div>
                                                <button
                                                    type={'button'}
                                                    className={'text-xs text-rose-400 hover:text-rose-300 font-semibold'}
                                                >
                                                    View
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Crash Prevention Tips */}
                            <div className={'rounded-2xl border border-neutral-800 bg-[#0a0f1d]/80 p-5 backdrop-blur-md text-xs text-neutral-400'}>
                                <h4 className={'font-bold text-white mb-2'}>💡 Pro Debugging Tips</h4>
                                <ul className={'list-disc list-inside space-y-1.5 text-[11px]'}>
                                    <li>Always verify Java version: Minecraft 1.20.5+ requires <strong>Java 21</strong>.</li>
                                    <li>If the server crashes immediately after adding a mod, check for missing dependencies in the <strong>📦 Mods</strong> tab.</li>
                                    <li>For lag freezes, set <code className={'text-rose-300'}>max-tick-time=-1</code> in server.properties.</li>
                                    <li>Use <strong>Aikar&apos;s Flags</strong> in the Optimizer tab to eliminate GC lag spikes.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {/* Crash Report Content Modal */}
                <Modal visible={!!viewingReport} onDismissed={() => setViewingReport(null)}>
                    <div className={'w-full max-w-3xl rounded-2xl border border-neutral-800 bg-[#0a0f1d] p-5 shadow-2xl flex flex-col'} style={{ maxHeight: '85vh' }}>
                        <div className={'flex items-center justify-between pb-3 border-b border-neutral-800'}>
                            <h3 className={'text-sm font-bold text-white font-mono truncate'}>{viewingReport}</h3>
                            <button
                                type={'button'}
                                onClick={() => setViewingReport(null)}
                                className={'p-1 rounded-lg bg-neutral-800 text-neutral-400 hover:text-white'}
                            >
                                <XIcon className={'h-4 w-4'} />
                            </button>
                        </div>

                        <div className={'flex-1 overflow-y-auto my-4 p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-300'}>
                            {loadingReportContent ? (
                                <div className={'py-12 text-center'}>
                                    <Spinner size={'large'} centered />
                                </div>
                            ) : (
                                <pre className={'whitespace-pre-wrap leading-relaxed'}>{reportContent}</pre>
                            )}
                        </div>
                    </div>
                </Modal>
            </div>
        </ServerContentBlock>
    );
};
