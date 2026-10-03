# 📋 Uptime & API Monitor — Project Notes & Purpose

---

## 1. What is the Purpose of This Project?

In modern web development and distributed cloud architectures, services frequently experience transient network degradations, microservice outages, third-party dependency failures, or slow response times. 

The primary purpose of **UptimePulse (Uptime & API Monitor)** is to provide an **autonomous, self-hosted, full-stack monitoring and alerting platform** that continuously audits HTTP/HTTPS endpoints, detects service degradation or complete downtime in real-time, logs incident history, and immediately notifies engineers before end-users are impacted.

### Core Problems Solved
1. **Silent Failures ("Soft 200s")**: An endpoint might return HTTP 200 OK, but output an error message or empty payload. UptimePulse solves this via **Keyword Assertions** in addition to status code checks.
2. **Delayed Outage Awareness**: Engineers often learn about outages from frustrated customers. UptimePulse continuously probes endpoints on a background schedule and dispatches instant **Telegram** and **Email** alerts.
3. **Flaky Alert Fatigue**: Intermittent single-second blips should not wake up on-call teams. UptimePulse implements a configurable **Failure Threshold** ($N$ consecutive failures required before opening an incident).
4. **Public Transparency**: Customers demand insight into system health. UptimePulse includes an unauthenticated **Public Status Page** (`/status/:slug`) for external stakeholders.

---

## 2. Who is This Project For?

* **DevOps & Platform Engineers**: To monitor production infrastructure, cloud APIs, microservices, and webhook receivers.
* **SaaS Founders & Engineering Teams**: To track SLAs, analyze 24h/7d/30d uptime percentages, and present real-time status pages to clients.
* **Full-Stack Developers**: Anyone needing a robust, privacy-respecting, self-hostable monitoring tool with zero subscription fees.

---

## 3. High-Level System Architecture

The application is engineered into **three decoupled tiers** backed by a relational PostgreSQL database:

```
┌────────────────────────────────────────────────────────┐
│                   React 18 Frontend                    │
│    (Vite + TypeScript + TanStack Query + Recharts)     │
└───────────────────────────┬────────────────────────────┘
                            │ REST API (Bearer JWT)
                            ▼
┌────────────────────────────────────────────────────────┐
│                  Express REST Backend                  │
│    (Node.js + Prisma ORM + Rate Limiting + SSRF Guard) │
└─────────────┬────────────────────────────┬─────────────┘
              │ Read / Write               │ Read / Write
              ▼                            ▼
┌───────────────────────────┐    ┌───────────────────────┐
│    PostgreSQL Database    │    │   Background Worker   │
│ (Users, Monitors, Checks, │◄───┤  (Continuous 10s Cron │
│   Incidents, Channels)    │    │ Loop & Alert Retries) │
└───────────────────────────┘    └───────────────────────┘
```

### Why Decouple the Background Worker?
The worker runs in an independent Node.js process. Probing external websites with varying timeouts (5s to 30s) never blocks the Express REST API or slows down user interface requests.

---

## 4. Key Functional Capabilities

### A. Health Checking & Probing Engine
* **Protocol & Methods**: Supports `GET`, `POST`, and `HEAD` requests over HTTP and HTTPS.
* **Timing & Intervals**: Probing intervals of **1 minute**, **5 minutes**, or **15 minutes** with customizable timeouts (5s to 30s).
* **Payloads & Headers**: Custom HTTP request headers and JSON request body payloads.
* **Assertions**:
  * Status code validation (e.g. Expected `200`, `201`, etc.).
  * Response body substring / keyword verification.
* **SSRF Guard**: Both the API and Worker strictly validate URLs against private IP subnets (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`) and internal domains (`localhost`, `*.local`) to prevent Server-Side Request Forgery.

### B. Incident Lifecycle & Alerting
* **Threshold Detection**: An incident is only triggered when consecutive failures equal or exceed the monitor's `failureThreshold`.
* **Auto-Resolution**: Once the monitored URL returns a passing check, the open incident is automatically marked as resolved.
* **Alert Channels**:
  * **Email**: Configurable recipient addresses for outage and recovery summaries.
  * **Telegram Bot**: Instant message notifications sent directly to user or team group chats (`botToken` + `chatId`).
  * **Reliability**: 3-attempt exponential backoff retry mechanism on network notification dispatch.
  * **On-Demand Testing**: One-click "Test Alert" button to confirm channel connectivity before enabling.

### C. Analytics & Telemetry
* **Uptime Calculations**: Live calculation of uptime percentages across **24 Hours**, **7 Days**, and **30 Days**.
* **Average Latency**: Response time tracking in milliseconds (`ms`).
* **Visual Charts**: Interactive Area Charts powered by **Recharts** displaying latency over time.
* **Data Retention**: Built-in daily midnight cleanup cron job purging check logs older than 30 days to keep database storage lean.

### D. User Interface & Experience (UI/UX)
* **Glassmorphism Design System**: Modern dark theme with CSS custom properties, frosted card panels, and smooth micro-animations.
* **Live Status Indicators**: Color-coded badges with pulsing glow dots (`UP` = Emerald, `DOWN` = Crimson, `PAUSED` = Slate).
* **Real-Time Polling**: 30-second background refetching via TanStack Query keeps tables and metrics synchronized without manual page reloads.
* **Safety Guards**: Confirmation modal dialogs prevent accidental monitor or channel deletions.
* **Toast Feedback**: Non-intrusive notification popups for all user actions (saves, edits, pauses, deletions).

---

## 5. Technology Stack Summary

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, TanStack React Query v5, React Hook Form, Zod, Recharts v3, Lucide React, Pure CSS Tokens |
| **Backend API** | Node.js, Express, TypeScript, Prisma ORM, JSON Web Tokens (JWT), Bcrypt.js, Helmet, CORS, Express-Rate-Limit, Cookie-Parser |
| **Worker Engine** | Node.js, TypeScript, Axios, Node-Cron, Prisma Client, Custom SSRF DNS resolver |
| **Database** | PostgreSQL 15+ with relational schema, foreign key cascades, and composite indexes |
| **Deployment** | Docker & Docker-Compose, Vercel SPA deployment, Render Web Service & Background Worker |

---

## 6. How to Run Locally

### Prerequisites
* Node.js v18+ & npm
* PostgreSQL running locally on port `5432` (or via Docker)

### Setup Commands
```bash
# 1. Install dependencies & initialize database
cd backend
npm install
npx prisma db push

# 2. Run backend (Port 5000)
npm run dev

# 3. In another terminal, run worker
cd worker
npm install
npm run dev

# 4. In another terminal, run frontend (Port 3000)
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000` to register your admin account and start monitoring!
