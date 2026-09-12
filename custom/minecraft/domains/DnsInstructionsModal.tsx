import React, { useState } from 'react';
import copy from 'copy-to-clipboard';
import {
    CheckIcon,
    DuplicateIcon,
    ExclamationIcon,
    GlobeAltIcon,
    InformationCircleIcon,
    XIcon,
} from '@heroicons/react/solid';
import { CustomDomain } from '@/api/server/minecraft/domains';

interface Props {
    domain: CustomDomain;
    onClose: () => void;
}

const DnsInstructionsModal = ({ domain, onClose }: Props) => {
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const handleCopy = (text: string, label: string) => {
        copy(text);
        setCopiedField(label);
        setTimeout(() => setCopiedField(null), 2000);
    };

    // Parse domain parts
    // e.g. "play.example.com" -> host: "play", root: "example.com"
    const parts = domain.domain.split('.');
    const isSubdomain = parts.length > 2;
    const recordHost = isSubdomain ? parts[0] : '@';

    const srvName = isSubdomain ? `_minecraft._tcp.${parts[0]}` : '_minecraft._tcp';

    return (
        <div className={'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn'}>
            <div className={'w-full max-w-3xl rounded-2xl border border-white/10 bg-[#0d1628] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]'}>
                {/* Header */}
                <div className={'flex items-center justify-between px-6 py-4 border-b border-white/10 bg-neutral-900/60'}>
                    <div className={'flex items-center gap-3'}>
                        <div className={'w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30'}>
                            <GlobeAltIcon className={'w-6 h-6'} />
                        </div>
                        <div>
                            <h3 className={'text-base font-bold text-white flex items-center gap-2'}>
                                DNS Configuration for <span className={'text-cyan-300 font-mono'}>{domain.domain}</span>
                            </h3>
                            <p className={'text-xs text-neutral-400'}>
                                Add the following records in your domain registrar (Cloudflare, Namecheap, GoDaddy, etc.)
                            </p>
                        </div>
                    </div>
                    <button
                        type={'button'}
                        onClick={onClose}
                        className={'text-neutral-400 hover:text-white p-1 rounded-lg transition'}
                    >
                        <XIcon className={'w-5 h-5'} />
                    </button>
                </div>

                {/* Body */}
                <div className={'p-6 overflow-y-auto space-y-5 text-xs text-neutral-300'}>
                    {/* Cloudflare Warning Banner */}
                    <div className={'rounded-xl bg-amber-500/15 border border-amber-500/30 p-4 flex items-start gap-3'}>
                        <ExclamationIcon className={'w-5 h-5 text-amber-400 shrink-0 mt-0.5'} />
                        <div>
                            <h4 className={'font-bold text-amber-300 text-xs uppercase tracking-wide'}>
                                Important: Disable Cloudflare Orange-Cloud Proxy (Set to DNS Only)
                            </h4>
                            <p className={'text-[11px] text-amber-200/90 mt-1 leading-relaxed'}>
                                If your domain is hosted on Cloudflare, set the Proxy Status to <strong>DNS Only (Grey Cloud ☁️)</strong>. Cloudflare&apos;s orange-cloud proxy only supports HTTP/HTTPS web traffic and will reject Minecraft game packets.
                            </p>
                        </div>
                    </div>

                    {/* Record 1: CNAME Record */}
                    <div className={'rounded-xl bg-black/40 border border-white/10 p-4 space-y-3'}>
                        <div className={'flex items-center justify-between'}>
                            <div className={'flex items-center gap-2'}>
                                <span className={'px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30'}>
                                    Record 1 (Required)
                                </span>
                                <h4 className={'text-sm font-bold text-white'}>CNAME Record (Host Routing)</h4>
                            </div>
                            <span className={'text-[11px] text-neutral-400'}>Directs traffic to your server node</span>
                        </div>

                        <div className={'overflow-x-auto'}>
                            <table className={'w-full text-left text-xs border-collapse'}>
                                <thead>
                                    <tr className={'border-b border-white/10 text-neutral-400 text-[11px]'}>
                                        <th className={'pb-2 font-medium'}>Type</th>
                                        <th className={'pb-2 font-medium'}>Name / Host</th>
                                        <th className={'pb-2 font-medium'}>Target / Value</th>
                                        <th className={'pb-2 font-medium'}>TTL</th>
                                        <th className={'pb-2 font-medium text-right'}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className={'text-neutral-200'}>
                                        <td className={'py-2.5 font-mono font-bold text-cyan-400'}>CNAME</td>
                                        <td className={'py-2.5 font-mono font-bold text-white'}>{recordHost}</td>
                                        <td className={'py-2.5 font-mono font-bold text-emerald-300'}>{domain.targetHost}</td>
                                        <td className={'py-2.5 font-mono text-neutral-400'}>Auto (300)</td>
                                        <td className={'py-2.5 text-right'}>
                                            <button
                                                type={'button'}
                                                onClick={() => handleCopy(domain.targetHost, 'cnameTarget')}
                                                className={'px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-white text-[11px] font-medium transition inline-flex items-center gap-1'}
                                            >
                                                {copiedField === 'cnameTarget' ? (
                                                    <>
                                                        <CheckIcon className={'w-3 h-3 text-emerald-400'} />
                                                        <span>Copied</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <DuplicateIcon className={'w-3 h-3'} />
                                                        <span>Copy Target</span>
                                                    </>
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Record 2: Minecraft SRV Record */}
                    <div className={'rounded-xl bg-black/40 border border-white/10 p-4 space-y-3'}>
                        <div className={'flex items-center justify-between'}>
                            <div className={'flex items-center gap-2'}>
                                <span className={'px-2 py-0.5 rounded text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30'}>
                                    Record 2 (Recommended)
                                </span>
                                <h4 className={'text-sm font-bold text-white'}>Minecraft SRV Record (Zero-Port Connection)</h4>
                            </div>
                            <span className={'text-[11px] text-neutral-400'}>Allows joining without typing a port number</span>
                        </div>

                        <p className={'text-[11px] text-neutral-400'}>
                            With an SRV record, players connect to <strong className={'text-purple-300'}>{domain.domain}</strong> and are automatically routed to port <strong className={'text-purple-300'}>{domain.targetPort}</strong> without appending &quot;:{domain.targetPort}&quot;!
                        </p>

                        <div className={'overflow-x-auto'}>
                            <table className={'w-full text-left text-xs border-collapse'}>
                                <thead>
                                    <tr className={'border-b border-white/10 text-neutral-400 text-[11px]'}>
                                        <th className={'pb-2 font-medium'}>Type</th>
                                        <th className={'pb-2 font-medium'}>Service</th>
                                        <th className={'pb-2 font-medium'}>Protocol</th>
                                        <th className={'pb-2 font-medium'}>Name</th>
                                        <th className={'pb-2 font-medium'}>Priority</th>
                                        <th className={'pb-2 font-medium'}>Weight</th>
                                        <th className={'pb-2 font-medium'}>Port</th>
                                        <th className={'pb-2 font-medium'}>Target</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className={'text-neutral-200'}>
                                        <td className={'py-2 font-mono font-bold text-purple-400'}>SRV</td>
                                        <td className={'py-2 font-mono text-neutral-300'}>_minecraft</td>
                                        <td className={'py-2 font-mono text-neutral-300'}>_tcp</td>
                                        <td className={'py-2 font-mono text-white'}>{recordHost}</td>
                                        <td className={'py-2 font-mono text-neutral-300'}>0</td>
                                        <td className={'py-2 font-mono text-neutral-300'}>5</td>
                                        <td className={'py-2 font-mono font-bold text-purple-300'}>{domain.targetPort}</td>
                                        <td className={'py-2 font-mono font-bold text-cyan-300'}>{domain.targetHost}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className={'flex items-center justify-between pt-2 border-t border-white/5'}>
                            <span className={'text-[11px] text-neutral-400 font-mono truncate mr-2'}>
                                Raw: {srvName} 300 IN SRV 0 5 {domain.targetPort} {domain.targetHost}.
                            </span>
                            <button
                                type={'button'}
                                onClick={() =>
                                    handleCopy(
                                        `_minecraft._tcp.${domain.domain}. 300 IN SRV 0 5 ${domain.targetPort} ${domain.targetHost}.`,
                                        'srvFull'
                                    )
                                }
                                className={'px-2.5 py-1 rounded bg-purple-600/80 hover:bg-purple-600 text-white text-[11px] font-semibold transition shrink-0 inline-flex items-center gap-1'}
                            >
                                {copiedField === 'srvFull' ? (
                                    <>
                                        <CheckIcon className={'w-3 h-3 text-white'} />
                                        <span>Copied SRV</span>
                                    </>
                                ) : (
                                    <>
                                        <DuplicateIcon className={'w-3 h-3'} />
                                        <span>Copy Full SRV</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Bedrock Connection Info */}
                    {domain.bedrockPort && (
                        <div className={'rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 space-y-2'}>
                            <div className={'flex items-center gap-2'}>
                                <span className={'px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}>
                                    Bedrock Edition Players
                                </span>
                                <h4 className={'text-sm font-bold text-white'}>Connecting via Mobile, Windows Bedrock & Consoles</h4>
                            </div>
                            <p className={'text-[11px] text-neutral-300'}>
                                Bedrock players enter your domain as the <strong>Server Address</strong> and specify your dedicated Bedrock UDP port:
                            </p>
                            <div className={'grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2'}>
                                <div className={'rounded-lg bg-black/30 p-2.5 border border-white/5 flex items-center justify-between'}>
                                    <div>
                                        <span className={'text-[10px] text-neutral-400 block'}>Server Address</span>
                                        <span className={'font-mono font-bold text-emerald-300'}>{domain.domain}</span>
                                    </div>
                                    <button
                                        type={'button'}
                                        onClick={() => handleCopy(domain.domain, 'bedrockDomain')}
                                        className={'p-1 text-neutral-400 hover:text-white transition'}
                                    >
                                        <DuplicateIcon className={'w-4 h-4'} />
                                    </button>
                                </div>
                                <div className={'rounded-lg bg-black/30 p-2.5 border border-white/5 flex items-center justify-between'}>
                                    <div>
                                        <span className={'text-[10px] text-neutral-400 block'}>Bedrock Port</span>
                                        <span className={'font-mono font-bold text-emerald-300'}>{domain.bedrockPort}</span>
                                    </div>
                                    <button
                                        type={'button'}
                                        onClick={() => handleCopy(String(domain.bedrockPort), 'bedrockPortVal')}
                                        className={'p-1 text-neutral-400 hover:text-white transition'}
                                    >
                                        <DuplicateIcon className={'w-4 h-4'} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={'flex items-center justify-end px-6 py-3.5 border-t border-white/10 bg-neutral-900/60'}>
                    <button
                        type={'button'}
                        onClick={onClose}
                        className={'px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-white transition'}
                    >
                        Close Instructions
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DnsInstructionsModal;
