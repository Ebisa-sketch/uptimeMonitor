import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { authenticateJwt, AuthenticatedRequest } from '../middleware/auth';
import { validatePublicUrl } from '../middleware/ssrf';
import { probeMonitor } from '../utils/prober';
import { checkSslCertificate } from '../utils/ssl';

const router = Router();

const monitorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  url: z.string().url('Invalid URL format'),
  method: z.enum(['GET', 'POST', 'HEAD']).default('GET'),
  intervalSec: z.number().refine((val) => [60, 300, 900].includes(val), {
    message: 'Interval must be 60 (1m), 300 (5m), or 900 (15m) seconds',
  }).default(300),
  timeoutSec: z.number().min(5).max(30).default(10),
  expectedStatus: z.number().min(100).max(599).default(200),
  keyword: z.string().optional().nullable(),
  headers: z.record(z.string()).optional().nullable(),
  body: z.string().optional().nullable(),
  failureThreshold: z.number().min(1).max(10).default(2),
  isPublic: z.boolean().default(false),
  alertChannelIds: z.array(z.string()).optional().default([]),
});

// GET /api/monitors - List user monitors
router.get('/', authenticateJwt, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { status, search } = req.query;

    const monitors = await prisma.monitor.findMany({
      where: {
        userId,
        ...(search ? {
          OR: [
            { name: { contains: search as string, mode: 'insensitive' } },
            { url: { contains: search as string, mode: 'insensitive' } },
          ],
        } : {}),
      },
      include: {
        checkResults: {
          take: 1,
          orderBy: { checkedAt: 'desc' },
        },
        incidents: {
          where: { resolvedAt: null },
          take: 1,
        },
        alertChannels: {
          include: { channel: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = monitors.map((m) => {
      const lastCheck = m.checkResults[0] || null;
      const isOpenIncident = m.incidents.length > 0;
      let statusState: 'UP' | 'DOWN' | 'PAUSED' = 'UP';
      if (!m.isActive) {
        statusState = 'PAUSED';
      } else if (isOpenIncident || (lastCheck && !lastCheck.success)) {
        statusState = 'DOWN';
      }

      return {
        id: m.id,
        name: m.name,
        url: m.url,
        method: m.method,
        intervalSec: m.intervalSec,
        timeoutSec: m.timeoutSec,
        expectedStatus: m.expectedStatus,
        keyword: m.keyword,
        failureThreshold: m.failureThreshold,
        isActive: m.isActive,
        isPublic: m.isPublic,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        status: statusState,
        lastCheckTime: lastCheck ? lastCheck.checkedAt : null,
        lastResponseMs: lastCheck ? lastCheck.responseMs : null,
        lastStatusCode: lastCheck ? lastCheck.statusCode : null,
        alertChannels: m.alertChannels.map((ac) => ac.channel),
      };
    });

    // Optional status filtering
    const filtered = status
      ? formatted.filter((m) => m.status.toLowerCase() === (status as string).toLowerCase())
      : formatted;

    return res.json(filtered);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Failed to fetch monitors' });
  }
});

// POST /api/monitors - Create monitor
router.post('/', authenticateJwt, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = monitorSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ errors: parseResult.error.errors });
    }

    const data = parseResult.data;
    const userId = req.user!.id;

    // SSRF URL Validation
    const ssrfResult = await validatePublicUrl(data.url);
    if (!ssrfResult.valid) {
      return res.status(400).json({ message: `Security violation: ${ssrfResult.reason}` });
    }

    const monitor = await prisma.monitor.create({
      data: {
        userId,
        name: data.name,
        url: data.url,
        method: data.method,
        intervalSec: data.intervalSec,
        timeoutSec: data.timeoutSec,
        expectedStatus: data.expectedStatus,
        keyword: data.keyword,
        headers: data.headers ? JSON.parse(JSON.stringify(data.headers)) : {},
        body: data.body,
        failureThreshold: data.failureThreshold,
        isPublic: data.isPublic,
        alertChannels: {
          create: data.alertChannelIds.map((channelId) => ({
            channel: { connect: { id: channelId } },
          })),
        },
      },
      include: {
        alertChannels: { include: { channel: true } },
      },
    });

    return res.status(201).json(monitor);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Create monitor failed' });
  }
});

// GET /api/monitors/:id - Detail view
router.get('/:id', authenticateJwt, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const monitor = await prisma.monitor.findFirst({
      where: { id, userId },
      include: {
        alertChannels: { include: { channel: true } },
        incidents: { orderBy: { startedAt: 'desc' }, take: 10 },
      },
    });

    if (!monitor) {
      return res.status(404).json({ message: 'Monitor not found' });
    }

    return res.json(monitor);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Fetch monitor failed' });
  }
});

// PATCH /api/monitors/:id - Edit monitor
router.patch('/:id', authenticateJwt, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const existing = await prisma.monitor.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ message: 'Monitor not found' });

    const parseResult = monitorSchema.partial().safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ errors: parseResult.error.errors });
    }

    const data = parseResult.data;

    if (data.url) {
      const ssrfResult = await validatePublicUrl(data.url);
      if (!ssrfResult.valid) {
        return res.status(400).json({ message: `Security violation: ${ssrfResult.reason}` });
      }
    }

    // Update alert channels if provided
    if (data.alertChannelIds) {
      await prisma.monitorAlertChannel.deleteMany({ where: { monitorId: id } });
    }

    const updated = await prisma.monitor.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.url && { url: data.url }),
        ...(data.method && { method: data.method }),
        ...(data.intervalSec && { intervalSec: data.intervalSec }),
        ...(data.timeoutSec && { timeoutSec: data.timeoutSec }),
        ...(data.expectedStatus && { expectedStatus: data.expectedStatus }),
        ...(data.keyword !== undefined && { keyword: data.keyword }),
        ...(data.headers !== undefined && { headers: data.headers ? JSON.parse(JSON.stringify(data.headers)) : {} }),
        ...(data.body !== undefined && { body: data.body }),
        ...(data.failureThreshold && { failureThreshold: data.failureThreshold }),
        ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
        ...(data.alertChannelIds && {
          alertChannels: {
            create: data.alertChannelIds.map((channelId) => ({
              channel: { connect: { id: channelId } },
            })),
          },
        }),
      },
      include: {
        alertChannels: { include: { channel: true } },
      },
    });

    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Update failed' });
  }
});

// DELETE /api/monitors/:id - Delete monitor
router.delete('/:id', authenticateJwt, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const existing = await prisma.monitor.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ message: 'Monitor not found' });

    await prisma.monitor.delete({ where: { id } });

    return res.json({ message: 'Monitor deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Delete failed' });
  }
});

// POST /api/monitors/:id/pause
router.post('/:id/pause', authenticateJwt, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const updated = await prisma.monitor.updateMany({
      where: { id, userId },
      data: { isActive: false },
    });

    if (updated.count === 0) return res.status(404).json({ message: 'Monitor not found' });
    return res.json({ message: 'Monitor paused' });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Pause failed' });
  }
});

// POST /api/monitors/:id/resume
router.post('/:id/resume', authenticateJwt, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const updated = await prisma.monitor.updateMany({
      where: { id, userId },
      data: { isActive: true },
    });

    if (updated.count === 0) return res.status(404).json({ message: 'Monitor not found' });
    return res.json({ message: 'Monitor resumed' });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Resume failed' });
  }
});

// GET /api/monitors/:id/checks?range=24h|7d|30d
router.get('/:id/checks', authenticateJwt, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const range = (req.query.range as string) || '24h';

    const monitor = await prisma.monitor.findFirst({ where: { id, userId } });
    if (!monitor) return res.status(404).json({ message: 'Monitor not found' });

    const now = new Date();
    let past = new Date();
    if (range === '7d') past.setDate(now.getDate() - 7);
    else if (range === '30d') past.setDate(now.getDate() - 30);
    else past.setHours(now.getHours() - 24); // default 24h

    const checks = await prisma.checkResult.findMany({
      where: {
        monitorId: id,
        checkedAt: { gte: past },
      },
      orderBy: { checkedAt: 'asc' },
    });

    return res.json(checks);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Fetch checks failed' });
  }
});

// GET /api/monitors/:id/stats - Calculate uptime % & avg response time
router.get('/:id/stats', authenticateJwt, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const monitor = await prisma.monitor.findFirst({ where: { id, userId } });
    if (!monitor) return res.status(404).json({ message: 'Monitor not found' });

    const now = new Date();
    const calculateStatsForRange = async (days: number) => {
      const past = new Date();
      past.setDate(now.getDate() - days);

      const checks = await prisma.checkResult.findMany({
        where: { monitorId: id, checkedAt: { gte: past } },
        select: { success: true, responseMs: true },
      });

      if (checks.length === 0) {
        return {
          uptimePercentage: 100,
          avgResponseMs: 0,
          totalChecks: 0,
          p50: 0,
          p90: 0,
          p95: 0,
          p99: 0,
          minMs: 0,
          maxMs: 0,
        };
      }

      const total = checks.length;
      const successes = checks.filter((c) => c.success).length;
      const uptimePercentage = Number(((successes / total) * 100).toFixed(2));

      const validResponseTimes = checks.filter((c) => c.responseMs !== null).map((c) => c.responseMs!);
      const avgResponseMs = validResponseTimes.length > 0
        ? Math.round(validResponseTimes.reduce((a, b) => a + b, 0) / validResponseTimes.length)
        : 0;

      const sortedMs = [...validResponseTimes].sort((a, b) => a - b);
      const count = sortedMs.length;
      const p50 = count ? sortedMs[Math.floor(count * 0.50)] : 0;
      const p90 = count ? sortedMs[Math.floor(count * 0.90)] : 0;
      const p95 = count ? sortedMs[Math.floor(count * 0.95)] : 0;
      const p99 = count ? sortedMs[Math.floor(count * 0.99)] : 0;
      const minMs = count ? sortedMs[0] : 0;
      const maxMs = count ? sortedMs[count - 1] : 0;

      return {
        uptimePercentage,
        avgResponseMs,
        totalChecks: total,
        p50,
        p90,
        p95,
        p99,
        minMs,
        maxMs,
      };
    };

    const stats24h = await calculateStatsForRange(1);
    const stats7d = await calculateStatsForRange(7);
    const stats30d = await calculateStatsForRange(30);

    return res.json({
      '24h': stats24h,
      '7d': stats7d,
      '30d': stats30d,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Fetch stats failed' });
  }
});

// POST /api/monitors/:id/check-now - Instant on-demand probe
router.post('/:id/check-now', authenticateJwt, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const monitor = await prisma.monitor.findFirst({ where: { id, userId } });
    if (!monitor) return res.status(404).json({ message: 'Monitor not found' });

    const result = await probeMonitor(id);
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'On-demand check failed' });
  }
});

// GET /api/monitors/:id/uptime-bars - 30-day bucketed uptime stripes
router.get('/:id/uptime-bars', authenticateJwt, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const monitor = await prisma.monitor.findFirst({ where: { id, userId } });
    if (!monitor) return res.status(404).json({ message: 'Monitor not found' });

    const days = 30;
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - days);

    const checks = await prisma.checkResult.findMany({
      where: { monitorId: id, checkedAt: { gte: startDate } },
      select: { checkedAt: true, success: true, responseMs: true },
      orderBy: { checkedAt: 'asc' },
    });

    const bars: Array<{
      date: string;
      uptimePercentage: number;
      totalChecks: number;
      avgResponseMs: number;
      status: 'UP' | 'DOWN' | 'DEGRADED' | 'NO_DATA';
    }> = [];

    for (let i = days - 1; i >= 0; i--) {
      const targetDate = new Date();
      targetDate.setDate(now.getDate() - i);
      const dateStr = targetDate.toISOString().slice(0, 10);

      const dayChecks = checks.filter(
        (c) => c.checkedAt.toISOString().slice(0, 10) === dateStr
      );

      if (dayChecks.length === 0) {
        bars.push({
          date: dateStr,
          uptimePercentage: 100,
          totalChecks: 0,
          avgResponseMs: 0,
          status: 'NO_DATA',
        });
      } else {
        const successes = dayChecks.filter((c) => c.success).length;
        const uptime = Number(((successes / dayChecks.length) * 100).toFixed(1));
        const validMs = dayChecks.filter((c) => c.responseMs !== null).map((c) => c.responseMs!);
        const avgMs = validMs.length > 0 ? Math.round(validMs.reduce((a, b) => a + b, 0) / validMs.length) : 0;

        let status: 'UP' | 'DOWN' | 'DEGRADED' = 'UP';
        if (uptime === 0) status = 'DOWN';
        else if (uptime < 99) status = 'DEGRADED';

        bars.push({
          date: dateStr,
          uptimePercentage: uptime,
          totalChecks: dayChecks.length,
          avgResponseMs: avgMs,
          status,
        });
      }
    }

    return res.json(bars);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Fetch uptime bars failed' });
  }
});

// GET /api/monitors/:id/ssl - Certificate health and expiry
router.get('/:id/ssl', authenticateJwt, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const monitor = await prisma.monitor.findFirst({ where: { id, userId } });
    if (!monitor) return res.status(404).json({ message: 'Monitor not found' });

    if (!monitor.url.startsWith('https://')) {
      return res.json({ isHttps: false, sslInfo: null });
    }

    const sslInfo = await checkSslCertificate(monitor.url, 5000);
    return res.json({ isHttps: true, sslInfo });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'SSL inspection failed' });
  }
});

// GET /api/monitors/:id/export - Download check history as CSV or JSON
router.get('/:id/export', authenticateJwt, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const formatType = (req.query.format as string) || 'json';

    const monitor = await prisma.monitor.findFirst({ where: { id, userId } });
    if (!monitor) return res.status(404).json({ message: 'Monitor not found' });

    const checks = await prisma.checkResult.findMany({
      where: { monitorId: id },
      orderBy: { checkedAt: 'desc' },
      take: 1000,
    });

    if (formatType === 'csv') {
      const header = 'id,checkedAt,success,statusCode,responseMs,error\n';
      const rows = checks
        .map(
          (c) =>
            `"${c.id}","${c.checkedAt.toISOString()}",${c.success},${c.statusCode || ''},${c.responseMs || ''},"${(c.error || '').replace(/"/g, '""')}"`
        )
        .join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${monitor.name.replace(/\s+/g, '_')}_checks.csv"`);
      return res.send(header + rows);
    }

    return res.json(checks);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Export failed' });
  }
});

export default router;
