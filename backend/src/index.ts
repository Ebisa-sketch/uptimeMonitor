import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import authRouter from './routes/auth';
import userRouter from './routes/user';
import monitorsRouter from './routes/monitors';
import incidentsRouter from './routes/incidents';
import alertChannelsRouter from './routes/alertChannels';
import statusRouter from './routes/status';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

// Rate Limiter for Auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per windowMs
  message: { message: 'Too many requests from this IP, please try again after 15 minutes.' },
});

// Routes
app.use('/api/auth', authLimiter, authRouter);
app.use('/api', userRouter);
app.use('/api/monitors', monitorsRouter);
app.use('/api/incidents', incidentsRouter);
app.use('/api/alert-channels', alertChannelsRouter);
app.use('/api/status', statusRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`🚀 Uptime API Backend server running on port ${PORT}`);
});
