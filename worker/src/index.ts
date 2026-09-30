import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import cron from 'node-cron';
import dotenv from 'dotenv';
import { validatePublicUrl } from './ssrf';

dotenv.config();

const prisma = new PrismaClient();

// Helper to send alert notifications with up to 3 retries
async function sendAlertNotification(
  channel: any,
  monitorName: string,
  monitorUrl: string,
  type: 'OPEN' | 'RESOLVED',
  reason?: string
) {
  const config = channel.config as any;
  const isOpening = type === 'OPEN';
  const emoji = isOpening ? '🚨 DOWN' : '✅ RECOVERED';
  const title = `[Uptime API Monitor] Monitor Alert: ${monitorName} is ${emoji}`;
  const message = isOpening
    ? `🚨 Monitor "${monitorName}" (${monitorUrl}) went DOWN.\nReason: ${reason || 'Consecutive checks failed'}`
    : `✅ Monitor "${monitorName}" (${monitorUrl}) has RECOVERED and is back UP.`;

  let attempts = 0;
  const maxRetries = 3;

  while (attempts < maxRetries) {
    attempts++;
    try {
      if (channel.type === 'TELEGRAM') {
        if (!config.botToken || !config.chatId) break;
        const telegramUrl = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
        await axios.post(telegramUrl, {
          chat_id: config.chatId,
          text: message,
        });
      } else if (channel.type === 'EMAIL') {
        console.log(`[ALERT EMAIL] To: ${config.email} | Subject: ${title} | Body: ${message}`);
      } else if (channel.type === 'DISCORD' && config.webhookUrl) {
        await axios.post(config.webhookUrl, {
          content: `${emoji} **${monitorName}** (${monitorUrl})\n${message}`,
        });
      } else if (channel.type === 'SLACK' && config.webhookUrl) {
        await axios.post(config.webhookUrl, {
          text: `${emoji} *${monitorName}* (${monitorUrl})\n${message}`,
        });
      } else if (channel.type === 'WEBHOOK' && config.webhookUrl) {
        await axios.post(config.webhookUrl, {
          event: isOpening ? 'incident_opened' : 'incident_resolved',
          monitorName,
          monitorUrl,
          type,
          reason,
          timestamp: new Date().toISOString(),
        });
      }
      console.log(`[ALERT SUCCESS] Dispatched ${type} alert to ${channel.type} channel "${channel.name}" (attempt ${attempts})`);
      break;
    } catch (err: any) {
      console.error(`[ALERT ERROR] Attempt ${attempts} failed for channel "${channel.name}":`, err.message);
      if (attempts < maxRetries) {
        await new Promise((r) => setTimeout(r, 2000 * attempts)); // Exponential backoff
      }
    }
  }
}

// Perform a single HTTP check
async function checkMonitor(monitor: any) {
  const startTime = Date.now();
  let success = false;
  let statusCode: number | null = null;
  let errorMsg: string | null = null;
  let responseMs: number | null = null;

  try {
    // Validate against SSRF
    const ssrf = await validatePublicUrl(monitor.url);
    if (!ssrf.valid) {
      throw new Error(`SSRF blocked: ${ssrf.reason}`);
    }

    const headers = (monitor.headers as Record<string, string>) || {};
    const res = await axios({
      method: monitor.method.toLowerCase(),
      url: monitor.url,
      headers: {
        'User-Agent': 'Uptime-API-Monitor-Worker/1.0',
        ...headers,
      },
      data: monitor.body || undefined,
      timeout: monitor.timeoutSec * 1000,
      validateStatus: () => true, // Don't throw on status codes
    });

    responseMs = Date.now() - startTime;
    statusCode = res.status;

    const isStatusOk = res.status === monitor.expectedStatus;
    let isKeywordOk = true;

    if (monitor.keyword && typeof res.data === 'string') {
      isKeywordOk = res.data.includes(monitor.keyword);
    }

    if (isStatusOk && isKeywordOk) {
      success = true;
    } else if (!isStatusOk) {
      errorMsg = `Status code ${res.status} does not match expected ${monitor.expectedStatus}`;
    } else if (!isKeywordOk) {
      errorMsg = `Required keyword "${monitor.keyword}" was not found in response`;
    }
  } catch (err: any) {
    responseMs = Date.now() - startTime;
    errorMsg = err.message || 'Request failed or timed out';
  }

  // Save check result
  await prisma.checkResult.create({
    data: {
      monitorId: monitor.id,
      success,
      statusCode,
      responseMs,
      error: errorMsg,
    },
  });

  console.log(`[CHECK] Monitor "${monitor.name}" (${monitor.url}): ${success ? 'SUCCESS' : 'FAILURE'} (${responseMs}ms)`);

  // Incident Lifecycle Management
  const openIncident = await prisma.incident.findFirst({
    where: { monitorId: monitor.id, resolvedAt: null },
  });

  if (success) {
    // If successful and there's an open incident, resolve it!
    if (openIncident) {
      await prisma.incident.update({
        where: { id: openIncident.id },
        data: { resolvedAt: new Date() },
      });
      console.log(`[INCIDENT RESOLVED] Monitor "${monitor.name}" resolved incident ${openIncident.id}`);

      // Dispatch Recovery Alerts
      const channels = monitor.alertChannels.map((ac: any) => ac.channel);
      for (const channel of channels) {
        await sendAlertNotification(channel, monitor.name, monitor.url, 'RESOLVED');
      }
    }
  } else {
    // If check failed, check consecutive failure count
    const recentChecks = await prisma.checkResult.findMany({
      where: { monitorId: monitor.id },
      orderBy: { checkedAt: 'desc' },
      take: monitor.failureThreshold,
    });

    const consecutiveFailures = recentChecks.filter((c) => !c.success).length;

    // Trigger incident if threshold met AND no open incident exists yet
    if (consecutiveFailures >= monitor.failureThreshold && !openIncident) {
      const newIncident = await prisma.incident.create({
        data: {
          monitorId: monitor.id,
          reason: errorMsg || 'Consecutive checks failed',
        },
      });
      console.log(`[INCIDENT CREATED] Monitor "${monitor.name}" triggered incident ${newIncident.id}`);

      // Dispatch Incident Alerts
      const channels = monitor.alertChannels.map((ac: any) => ac.channel);
      for (const channel of channels) {
        await sendAlertNotification(channel, monitor.name, monitor.url, 'OPEN', errorMsg || undefined);
      }
    }
  }
}

// Tracker for monitor check execution timestamps to avoid duplicate checks in short intervals
const lastCheckTimestamps: Record<string, number> = {};

async function runSchedulerCycle() {
  try {
    const activeMonitors = await prisma.monitor.findMany({
      where: { isActive: true },
      include: {
        alertChannels: { include: { channel: true } },
      },
    });

    const now = Date.now();

    for (const monitor of activeMonitors) {
      const lastCheck = lastCheckTimestamps[monitor.id] || 0;
      const intervalMs = monitor.intervalSec * 1000;

      // If time elapsed since last check >= interval (with 5s buffer tolerance)
      if (now - lastCheck >= intervalMs - 5000) {
        lastCheckTimestamps[monitor.id] = now;
        // Run check asynchronously without blocking loop
        checkMonitor(monitor).catch((err) => {
          console.error(`[WORKER ERROR] Check failed for monitor ${monitor.id}:`, err);
        });
      }
    }
  } catch (err: any) {
    console.error('[SCHEDULER ERROR]:', err.message);
  }
}

// Run cleanup job daily at midnight (00:00) to purge results older than 30 days
cron.schedule('0 0 * * *', async () => {
  console.log('[CLEANUP JOB] Purging check results older than 30 days...');
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  try {
    const deleted = await prisma.checkResult.deleteMany({
      where: { checkedAt: { lt: thirtyDaysAgo } },
    });
    console.log(`[CLEANUP JOB] Successfully purged ${deleted.count} old check results.`);
  } catch (err: any) {
    console.error('[CLEANUP JOB ERROR]:', err.message);
  }
});

// Start Main Loop (runs every 10 seconds)
console.log('🚀 Uptime API Worker Service Started...');
setInterval(runSchedulerCycle, 10000);
runSchedulerCycle();
