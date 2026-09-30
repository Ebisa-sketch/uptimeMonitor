import { Router, Response } from 'express';
import { prisma } from '../db';
import { authenticateJwt, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/incidents - List incidents for user's monitors
router.get('/', authenticateJwt, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { status, monitorId } = req.query;

    const incidents = await prisma.incident.findMany({
      where: {
        monitor: {
          userId,
          ...(monitorId ? { id: monitorId as string } : {}),
        },
        ...(status === 'open' ? { resolvedAt: null } : {}),
        ...(status === 'resolved' ? { resolvedAt: { not: null } } : {}),
      },
      include: {
        monitor: {
          select: { id: true, name: true, url: true },
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    const formatted = incidents.map((inc) => {
      const durationMs = inc.resolvedAt
        ? inc.resolvedAt.getTime() - inc.startedAt.getTime()
        : Date.now() - inc.startedAt.getTime();

      return {
        id: inc.id,
        monitorId: inc.monitorId,
        monitorName: inc.monitor.name,
        monitorUrl: inc.monitor.url,
        startedAt: inc.startedAt,
        resolvedAt: inc.resolvedAt,
        reason: inc.reason || 'Consecutive checks failed',
        durationMs,
        isOpen: !inc.resolvedAt,
      };
    });

    return res.json(formatted);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Fetch incidents failed' });
  }
});

export default router;
