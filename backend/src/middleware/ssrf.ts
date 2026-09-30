import dns from 'dns';
import { URL } from 'url';

function isPrivateIp(ip: string): boolean {
  // IPv4 Private & Loopback Ranges:
  // 127.0.0.0/8 (Loopback)
  // 10.0.0.0/8 (Private)
  // 172.16.0.0/12 (Private)
  // 192.168.0.0/16 (Private)
  // 169.254.0.0/16 (Link-local)
  // 0.0.0.0/8
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
          // If resolve fails, try direct ip validation or lookup
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
      // If resolution fails but hostname isn't explicit IP, fail open/close as invalid domain
      return { valid: false, reason: 'Unable to resolve target domain address' };
    }

    for (const ip of addresses) {
      if (isPrivateIp(ip)) {
        return { valid: false, reason: `URL resolves to restricted IP address: ${ip}` };
      }
    }

    return { valid: true };
  } catch (err: any) {
    return { valid: false, reason: err.message || 'Invalid URL format' };
  }
}
