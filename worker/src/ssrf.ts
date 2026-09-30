import dns from 'dns';
import { URL } from 'url';

function isPrivateIp(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length === 4) {
    if (parts[0] === 127) return true;
    if (parts[0] === 10) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 0) return true;
  }

  // IPv6 Loopback / Private
  if (ip === '::1' || ip === 'fe80::' || ip.startsWith('fc00:') || ip.startsWith('fd00:')) {
    return true;
  }

  return false;
}

export async function validatePublicUrl(targetUrl: string): Promise<{ valid: boolean; reason?: string }> {
  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, reason: 'Only http and https protocols are supported' };
    }

    const hostname = parsed.hostname.toLowerCase();

    if (hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
      return { valid: false, reason: 'Local and internal hostnames are prohibited' };
    }

    // Resolve DNS lookup
    const addresses = await new Promise<string[]>((resolve, reject) => {
      dns.resolve(hostname, (err, records) => {
        if (err) {
          dns.lookup(hostname, (err2, address) => {
            if (err2) reject(err2);
            else resolve([address]);
          });
        } else {
          resolve(records);
        }
      });
    }).catch(() => []);

    if (addresses.length === 0 && !isPrivateIp(hostname)) {
      return { valid: false, reason: 'Unable to resolve target domain address' };
    }

    // Check resolved addresses
    for (const addr of addresses) {
      if (isPrivateIp(addr)) {
        return { valid: false, reason: `Target address resolves to private IP (${addr})` };
      }
    }

    return { valid: true };
  } catch (err: any) {
    return { valid: false, reason: err.message || 'Invalid target URL' };
  }
}
