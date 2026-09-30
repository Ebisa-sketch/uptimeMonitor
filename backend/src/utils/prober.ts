import http from 'http';
import https from 'https';
import { URL } from 'url';
import { prisma } from '../db';
import { validatePublicUrl } from '../middleware/ssrf';
import { checkSslCertificate, SslInfo } from './ssl';

export interface ProbeResult {
  success: boolean;
  statusCode: number | null;
  responseMs: number;
  error: string | null;
  checkedAt: string;
  responseHeaders?: Record<string, string>;
  sslInfo?: SslInfo | null;
}

export async function probeMonitor(monitorId: string): Promise<ProbeResult> {
  const monitor = await prisma.monitor.findUnique({
    where: { id: monitorId },
    include: {
      alertChannels: { include: { channel: true } },
    },
  });

  if (!monitor) {
    throw new Error('Monitor not found');
  }

  // 1. SSRF validation
  const ssrf = await validatePublicUrl(monitor.url);
  if (!ssrf.valid) {
    throw new Error(`SSRF validation failed: ${ssrf.reason}`);
  }

  const startTime = Date.now();
  let success = false;
  let statusCode: number | null = null;
  let errorMsg: string | null = null;
  let responseMs = 0;
  let responseHeaders: Record<string, string> = {};

  // 2. Perform HTTP probe
  try {
    const parsed = new URL(monitor.url);
    const client = parsed.protocol === 'https:' ? https : http;

    const customHeaders: Record<string, string> = {
      'User-Agent': 'Uptime-API-Monitor-Prober/1.0',
      'Accept': '*/*',
      ...(monitor.headers ? (monitor.headers as Record<string, string>) : {}),
    };

    const reqOptions: https.RequestOptions = {
      method: monitor.method,
      hostname: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port, 10) : (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      headers: customHeaders,
      timeout: monitor.timeoutSec * 1000,
    };

    const result = await new Promise<{
      status: number;
      headers: Record<string, string>;
      body: string;
    }>((resolve, reject) => {
      const req = client.request(reqOptions, (res) => {
        let bodyData = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          if (bodyData.length < 50000) bodyData += chunk; // capture preview
        });
        res.on('end', () => {
          const rawHeaders: Record<string, string> = {};
          for (const [k, v] of Object.entries(res.headers)) {
            if (v) rawHeaders[k] = Array.isArray(v) ? v.join(', ') : v;
          }
          resolve({
            status: res.statusCode || 0,
            headers: rawHeaders,
            body: bodyData,
          });
        });
      });

      req.on('error', (err) => reject(err));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timed out after ${monitor.timeoutSec}s`));
      });

      if (monitor.body && monitor.method === 'POST') {
        req.write(monitor.body);
      }
      req.end();
    });

    responseMs = Date.now() - startTime;
    statusCode = result.status;
    responseHeaders = result.headers;

    const isStatusOk = result.status === monitor.expectedStatus;
    let isKeywordOk = true;
    if (monitor.keyword) {
      isKeywordOk = result.body.includes(monitor.keyword);
    }

    if (isStatusOk && isKeywordOk) {
      success = true;
    } else if (!isStatusOk) {
      errorMsg = `Status ${result.status} did not match expected ${monitor.expectedStatus}`;
    } else if (!isKeywordOk) {
      errorMsg = `Keyword "${monitor.keyword}" was not found in response`;
    }
  } catch (err: any) {
    responseMs = Date.now() - startTime;
    errorMsg = err.message || 'Connection failed';
  }

  // 3. SSL Certificate Details
  let sslInfo: SslInfo | null = null;
  if (monitor.url.startsWith('https://')) {
    sslInfo = await checkSslCertificate(monitor.url, 4000);
  }

  // 4. Save CheckResult
  await prisma.checkResult.create({
    data: {
      monitorId: monitor.id,
      success,
      statusCode,
      responseMs,
      error: errorMsg,
    },
  });

  // 5. Manage Incidents
  const openIncident = await prisma.incident.findFirst({
    where: { monitorId: monitor.id, resolvedAt: null },
  });

  if (!success && !openIncident) {
    // Check recent consecutive failures
    const recentChecks = await prisma.checkResult.findMany({
      where: { monitorId: monitor.id },
      orderBy: { checkedAt: 'desc' },
      take: monitor.failureThreshold,
    });

    if (
      recentChecks.length >= monitor.failureThreshold &&
      recentChecks.every((c) => !c.success)
    ) {
      await prisma.incident.create({
        data: {
          monitorId: monitor.id,
          reason: errorMsg || 'Consecutive checks failed',
        },
      });
    }
  } else if (success && openIncident) {
    // Auto-resolve incident
    await prisma.incident.update({
      where: { id: openIncident.id },
      data: { resolvedAt: new Date() },
    });
  }

  return {
    success,
    statusCode,
    responseMs,
    error: errorMsg,
    checkedAt: new Date().toISOString(),
    responseHeaders,
    sslInfo,
  };
}
