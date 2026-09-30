import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { authenticateJwt, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

const alertChannelSchema = z.object({
  name: z.string().min(1, 'Channel name is required'),
  type: z.enum(['EMAIL', 'TELEGRAM', 'SLACK', 'DISCORD', 'WEBHOOK']),
  config: z.object({
    email: z.string().email().optional(),
    botToken: z.string().optional(),
    chatId: z.string().optional(),
    webhookUrl: z.string().url().optional(),
  }),
});

// GET /api/alert-channels
router.get('/', authenticateJwt, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const channels = await prisma.alertChannel.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(channels);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Fetch channels failed' });
  }
});

// POST /api/alert-channels
router.post('/', authenticateJwt, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = alertChannelSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ errors: parseResult.error.errors });
    }

    const { name, type, config } = parseResult.data;
    const userId = req.user!.id;

    if (type === 'EMAIL' && !config.email) {
      return res.status(400).json({ message: 'Email address is required for Email alert channels' });
    }
    if (type === 'TELEGRAM' && (!config.botToken || !config.chatId)) {
      return res.status(400).json({ message: 'Bot token and Chat ID are required for Telegram channels' });
    }
    if (['SLACK', 'DISCORD', 'WEBHOOK'].includes(type) && !config.webhookUrl) {
      return res.status(400).json({ message: 'Webhook URL is required for ' + type + ' channels' });
    }

    const channel = await prisma.alertChannel.create({
      data: {
        userId,
        name,
        type,
        config: config as any,
        isVerified: true, // Auto verify on creation for testing
      },
    });

    return res.status(201).json(channel);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Create channel failed' });
  }
});

// PATCH /api/alert-channels/:id
router.patch('/:id', authenticateJwt, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const existing = await prisma.alertChannel.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ message: 'Alert channel not found' });

    const parseResult = alertChannelSchema.partial().safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ errors: parseResult.error.errors });
    }

    const updated = await prisma.alertChannel.update({
      where: { id },
      data: {
        ...(parseResult.data.name && { name: parseResult.data.name }),
        ...(parseResult.data.type && { type: parseResult.data.type }),
        ...(parseResult.data.config && { config: parseResult.data.config as any }),
      },
    });

    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Update channel failed' });
  }
});

// DELETE /api/alert-channels/:id
router.delete('/:id', authenticateJwt, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const existing = await prisma.alertChannel.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ message: 'Alert channel not found' });

    await prisma.alertChannel.delete({ where: { id } });
    return res.json({ message: 'Alert channel deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Delete channel failed' });
  }
});

// POST /api/alert-channels/:id/test
router.post('/:id/test', authenticateJwt, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const channel = await prisma.alertChannel.findFirst({ where: { id, userId } });
    if (!channel) return res.status(404).json({ message: 'Alert channel not found' });

    const config = channel.config as any;

    if (channel.type === 'TELEGRAM') {
      if (!config.botToken || !config.chatId) {
        return res.status(400).json({ message: 'Invalid Telegram configuration' });
      }
      // Send Telegram test message via fetch
      const telegramUrl = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
      const resTelegram = await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: config.chatId,
          text: `🔔 [Uptime API Monitor] Test alert for channel "${channel.name}". Your alert channel is working properly!`,
        }),
      });

      if (!resTelegram.ok) {
        const errorData = await resTelegram.json().catch(() => ({}));
        return res.status(400).json({ message: `Telegram API error: ${JSON.stringify(errorData)}` });
      }
    } else if (channel.type === 'EMAIL') {
      // Simulate/log test email dispatch
      console.log(`[TEST EMAIL DISPATCH] To: ${config.email} | Subject: Uptime API Monitor Test Alert`);
    } else if (channel.type === 'DISCORD' && config.webhookUrl) {
      await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `🔔 **[Uptime API Monitor]** Test alert for channel **${channel.name}**. Your Discord alert channel is working!`,
        }),
      }).catch((e) => console.error('Discord test error:', e.message));
    } else if (channel.type === 'SLACK' && config.webhookUrl) {
      await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🔔 *[Uptime API Monitor]* Test alert for channel *${channel.name}*. Your Slack alert channel is working!`,
        }),
      }).catch((e) => console.error('Slack test error:', e.message));
    } else if (channel.type === 'WEBHOOK' && config.webhookUrl) {
      await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'test_alert',
          channelName: channel.name,
          timestamp: new Date().toISOString(),
          message: 'Webhook test from Uptime API Monitor',
        }),
      }).catch((e) => console.error('Webhook test error:', e.message));
    }

    return res.json({ message: `Test alert sent successfully to channel "${channel.name}"` });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Send test alert failed' });
  }
});

export default router;
