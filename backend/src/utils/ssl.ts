import tls from 'tls';
import { URL } from 'url';

export interface SslInfo {
  valid: boolean;
  issuer?: string;
  subject?: string;
  validFrom?: string;
  validTo?: string;
  daysRemaining?: number;
  error?: string;
}

export async function checkSslCertificate(urlString: string, timeoutMs: number = 5000): Promise<SslInfo | null> {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== 'https:') {
      return null; // Not HTTPS
    }

    const host = parsed.hostname;
    const port = parsed.port ? parseInt(parsed.port, 10) : 443;

    return await new Promise<SslInfo>((resolve) => {
      const socket = tls.connect(
        {
          host,
          port,
          servername: host,
          rejectUnauthorized: false, // Inspect cert even if self-signed/expired
          timeout: timeoutMs,
        },
        () => {
          const cert = socket.getPeerCertificate();
          if (!cert || Object.keys(cert).length === 0) {
            socket.destroy();
            return resolve({ valid: false, error: 'No certificate presented' });
          }

          const validTo = new Date(cert.valid_to);
          const validFrom = new Date(cert.valid_from);
          const now = Date.now();
          const daysRemaining = Math.max(0, Math.round((validTo.getTime() - now) / (1000 * 60 * 60 * 24)));
          const isExpired = validTo.getTime() < now;

          socket.destroy();
          resolve({
            valid: !isExpired,
            issuer: (cert.issuer?.O as string) || (cert.issuer?.CN as string) || 'Unknown',
            subject: (cert.subject?.CN as string) || host,
            validFrom: validFrom.toISOString(),
            validTo: validTo.toISOString(),
            daysRemaining,
          });
        }
      );

      socket.on('error', (err) => {
        socket.destroy();
        resolve({ valid: false, error: err.message });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({ valid: false, error: 'SSL Handshake timed out' });
      });
    });
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}
