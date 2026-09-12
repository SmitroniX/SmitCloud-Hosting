import getFileContents from '@/api/server/files/getFileContents';
import saveFileContents from '@/api/server/files/saveFileContents';

export interface DnsCheckDetails {
    cnameResolves: boolean;
    cnameTarget?: string;
    aRecordResolves: boolean;
    aRecordIp?: string;
    srvResolves: boolean;
    srvPort?: number;
    srvTarget?: string;
}

export interface CustomDomain {
    id: string;
    domain: string;
    type: 'custom' | 'subdomain';
    targetHost: string;
    targetPort: number;
    bedrockPort?: number;
    isPrimary?: boolean;
    createdAt: string;
    lastChecked?: string;
    status: 'verified' | 'pending' | 'failed' | 'unknown';
    statusMessage?: string;
    dnsDetails?: DnsCheckDetails;
}

const DOMAINS_CONFIG_FILE = '.domains.json';

/**
 * Fetch all registered custom domains for this server from .domains.json
 */
export const getCustomDomains = async (uuid: string): Promise<CustomDomain[]> => {
    try {
        const raw = await getFileContents(uuid, DOMAINS_CONFIG_FILE);
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            return parsed;
        }
        return [];
    } catch {
        return [];
    }
};

/**
 * Save custom domains array to .domains.json
 */
export const saveCustomDomains = async (uuid: string, domains: CustomDomain[]): Promise<void> => {
    const serialized = JSON.stringify(domains, null, 2);
    await saveFileContents(uuid, DOMAINS_CONFIG_FILE, serialized);
};

/**
 * Add a new domain to the server
 */
export const addCustomDomain = async (
    uuid: string,
    domainData: Omit<CustomDomain, 'id' | 'createdAt' | 'status'>
): Promise<CustomDomain> => {
    const existing = await getCustomDomains(uuid);

    // Normalize domain
    const cleanDomain = domainData.domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    // Check if domain already added
    if (existing.some((d) => d.domain.toLowerCase() === cleanDomain)) {
        throw new Error(`Domain "${cleanDomain}" is already added to this server.`);
    }

    const newDomain: CustomDomain = {
        ...domainData,
        id: `dom_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        domain: cleanDomain,
        isPrimary: existing.length === 0, // First domain is primary by default
        createdAt: new Date().toISOString(),
        status: 'unknown',
    };

    const updated = [...existing, newDomain];
    await saveCustomDomains(uuid, updated);

    return newDomain;
};

/**
 * Remove a custom domain from the server
 */
export const deleteCustomDomain = async (uuid: string, domainId: string): Promise<void> => {
    const existing = await getCustomDomains(uuid);
    const updated = existing.filter((d) => d.id !== domainId);

    // If we deleted the primary domain, set the first remaining as primary
    if (updated.length > 0 && !updated.some((d) => d.isPrimary)) {
        updated[0].isPrimary = true;
    }

    await saveCustomDomains(uuid, updated);
};

/**
 * Set a domain as the primary domain
 */
export const setPrimaryCustomDomain = async (uuid: string, domainId: string): Promise<void> => {
    const existing = await getCustomDomains(uuid);
    const updated = existing.map((d) => ({
        ...d,
        isPrimary: d.id === domainId,
    }));
    await saveCustomDomains(uuid, updated);
};

/**
 * Verify DNS resolution using Cloudflare DoH and Google DoH in real-time
 */
export const verifyDomainDns = async (
    domain: string,
    targetHost: string,
    targetPort: number
): Promise<{
    verified: boolean;
    status: 'verified' | 'pending' | 'failed';
    message: string;
    dnsDetails: DnsCheckDetails;
}> => {
    const cleanDomain = domain.trim().toLowerCase();
    const cleanTarget = targetHost.trim().toLowerCase().replace(/\.$/, '');

    const details: DnsCheckDetails = {
        cnameResolves: false,
        aRecordResolves: false,
        srvResolves: false,
    };

    try {
        // Query 1: Check CNAME record
        const cnameRes = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(cleanDomain)}&type=CNAME`, {
            headers: { accept: 'application/dns-json' },
        });

        if (cnameRes.ok) {
            const json = await cnameRes.json();
            if (json.Answer && json.Answer.length > 0) {
                const target = String(json.Answer[0].data || '').toLowerCase().replace(/\.$/, '');
                details.cnameTarget = target;
                if (target === cleanTarget || target.includes(cleanTarget) || cleanTarget.includes(target)) {
                    details.cnameResolves = true;
                }
            }
        }

        // Query 2: Check A record
        const aRes = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(cleanDomain)}&type=A`, {
            headers: { accept: 'application/dns-json' },
        });

        if (aRes.ok) {
            const json = await aRes.json();
            if (json.Answer && json.Answer.length > 0) {
                details.aRecordIp = String(json.Answer[0].data || '');
                // If it resolves to an IPv4 address, DNS is active
                if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(details.aRecordIp)) {
                    details.aRecordResolves = true;
                }
            }
        }

        // Query 3: Check SRV record (_minecraft._tcp.domain)
        const srvQueryName = `_minecraft._tcp.${cleanDomain}`;
        const srvRes = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(srvQueryName)}&type=SRV`, {
            headers: { accept: 'application/dns-json' },
        });

        if (srvRes.ok) {
            const json = await srvRes.json();
            if (json.Answer && json.Answer.length > 0) {
                const dataParts = String(json.Answer[0].data || '').split(/\s+/);
                // format: priority weight port target
                if (dataParts.length >= 4) {
                    const port = parseInt(dataParts[2], 10);
                    const target = dataParts[3].toLowerCase().replace(/\.$/, '');
                    details.srvPort = port;
                    details.srvTarget = target;

                    if (port === targetPort) {
                        details.srvResolves = true;
                    }
                }
            }
        }

        // Evaluate Status
        // If SRV resolves to the correct port -> VERIFIED!
        if (details.srvResolves) {
            return {
                verified: true,
                status: 'verified',
                message: `SRV record verified! Connected directly to port ${targetPort}.`,
                dnsDetails: details,
            };
        }

        // If CNAME resolves to target host -> VERIFIED!
        if (details.cnameResolves) {
            return {
                verified: true,
                status: 'verified',
                message: `CNAME record verified! Resolves directly to ${details.cnameTarget}.`,
                dnsDetails: details,
            };
        }

        // If A record resolves
        if (details.aRecordResolves) {
            return {
                verified: true,
                status: 'verified',
                message: `A record verified! Resolves to IP ${details.aRecordIp}.`,
                dnsDetails: details,
            };
        }

        // If nothing resolved yet
        return {
            verified: false,
            status: 'pending',
            message: 'DNS record not detected yet. Please allow up to 5-15 minutes for global DNS propagation.',
            dnsDetails: details,
        };
    } catch (err: any) {
        return {
            verified: false,
            status: 'failed',
            message: 'DNS lookup check failed to reach public resolver. Check domain spelling.',
            dnsDetails: details,
        };
    }
};
