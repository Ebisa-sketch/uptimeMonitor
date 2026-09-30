import { Router, Request, Response } from 'express';
import { prisma } from '../db';

const router = Router();

// GET /api/status or /api/status/:slug - Public status page data
router.get(['/', '/:slug'], async (req: Request, res: Response) => {
  try {
    const publicMonitors = await prisma.monitor.findMany({
      where: { isPublic: true },
      select: {
        id: true,
        name: true,
        url: true,
        intervalSec: true,
        checkResults: {
          take: 1,
          orderBy: { checkedAt: 'desc' },
        },
        incidents: {
          where: { resolvedAt: null },
          take: 1,
        },
      },
    });

    const now = new Date();
    const past30Days = new Date();
    past30Days.setDate(now.getDate() - 30);

    const formatted = await Promise.all(
      publicMonitors.map(async (m) => {
        const lastCheck = m.checkResults[0] || null;
        const isOpenIncident = m.incidents.length > 0;
        let status: 'UP' | 'DOWN' | 'UNKNOWN' = 'UP';
        if (isOpenIncident || (lastCheck && !lastCheck.success)) {
          status = 'DOWN';
        } else if (!lastCheck) {
          status = 'UNKNOWN';
        }

        // Calculate 30d uptime & daily bars
        const checks = await prisma.checkResult.findMany({
          where: { monitorId: m.id, checkedAt: { gte: past30Days } },
          select: { checkedAt: true, success: true, responseMs: true },
          orderBy: { checkedAt: 'asc' },
        });

        const uptime30d = checks.length > 0
          ? Number(((checks.filter((c) => c.success).length / checks.length) * 100).toFixed(2))
          : 100;

        // Daily 30 bars
        const bars: Array<{
          date: string;
          uptimePercentage: number;
          totalChecks: number;
          avgResponseMs: number;
          status: 'UP' | 'DOWN' | 'DEGRADED' | 'NO_DATA';
        }> = [];

        for (let i = 29; i >= 0; i--) {
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

            let barStatus: 'UP' | 'DOWN' | 'DEGRADED' = 'UP';
            if (uptime === 0) barStatus = 'DOWN';
            else if (uptime < 99) barStatus = 'DEGRADED';

            bars.push({
              date: dateStr,
              uptimePercentage: uptime,
              totalChecks: dayChecks.length,
              avgResponseMs: avgMs,
              status: barStatus,
            });
          }
        }

        return {
          id: m.id,
          name: m.name,
          url: m.url,
          status,
          uptime30d,
          bars,
          lastCheckTime: lastCheck ? lastCheck.checkedAt : null,
          lastResponseMs: lastCheck ? lastCheck.responseMs : null,
        };
      })
    );

    // Fetch active & past incidents for public monitors
    const publicMonitorIds = publicMonitors.map((m) => m.id);
    const activeIncidents = await prisma.incident.findMany({
      where: {
        monitorId: { in: publicMonitorIds },
        resolvedAt: null,
      },
      include: {
        monitor: { select: { name: true } },
      },
      orderBy: { startedAt: 'desc' },
    });

    const pastIncidents = await prisma.incident.findMany({
      where: {
        monitorId: { in: publicMonitorIds },
        resolvedAt: { not: null },
      },
      include: {
        monitor: { select: { name: true } },
      },
      orderBy: { resolvedAt: 'desc' },
      take: 5,
    });

    // Compute overall system aggregates
    const upCount = formatted.filter((m) => m.status === 'UP').length;
    const downCount = formatted.filter((m) => m.status === 'DOWN').length;
    const totalCount = formatted.length;
    const validAvgMs = formatted.filter((m) => m.lastResponseMs !== null).map((m) => m.lastResponseMs as number);
    const systemAvgMs = validAvgMs.length > 0 ? Math.round(validAvgMs.reduce((a, b) => a + b, 0) / validAvgMs.length) : 0;
    const systemUptime = totalCount > 0
      ? Number((formatted.reduce((acc, m) => acc + m.uptime30d, 0) / totalCount).toFixed(2))
      : 100;

    return res.json({
      title: 'System Status & Performance',
      updatedAt: new Date(),
      metrics: {
        totalMonitors: totalCount,
        upMonitors: upCount,
        downMonitors: downCount,
        systemUptime,
        systemAvgMs,
      },
      monitors: formatted,
      activeIncidents: activeIncidents.map((inc) => ({
        id: inc.id,
        monitorName: inc.monitor.name,
        cause: inc.reason,
        startedAt: inc.startedAt,
      })),
      pastIncidents: pastIncidents.map((inc) => ({
        id: inc.id,
        monitorName: inc.monitor.name,
        cause: inc.reason,
        startedAt: inc.startedAt,
        resolvedAt: inc.resolvedAt,
        durationMinutes: inc.resolvedAt
          ? Math.round((inc.resolvedAt.getTime() - inc.startedAt.getTime()) / 60000)
          : null,
      })),
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Fetch status page failed' });
  }
});

export default router;

