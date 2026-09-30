# 🌐 UptimePulse — Uptime & API Monitoring Platform

[![React](https://img.shields.io/badge/React-18.2-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.1-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.10-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

> A modern, full-stack, distributed **Uptime & API Health Monitoring** system designed for high reliability, real-time alerting, and developer-centric telemetry.

---

## 📸 Overview & Highlights

**UptimePulse** continuously audits your HTTP/HTTPS endpoints, APIs, and web services. When an endpoint degrades or experiences downtime, the autonomous worker detects consecutive failures, records incident history, and immediately dispatches alerts across configured notification channels.

### ✨ Key Features

- **⚡ High-Throughput Decoupled Architecture**:
  - **Frontend SPA**: React 18, Vite, TypeScript, TanStack React Query, Recharts, and Lucide icons.
  - **REST API Backend**: Node.js, Express, Prisma ORM, JWT authentication, and Zod input validation.
  - **Autonomous Background Worker**: Dedicated cron loop executing health checks independently of user sessions.
  - **PostgreSQL Database**: Indexed check results for fast 24h, 7d, and 30d time-series metrics.

- **🛡️ Enterprise-Grade Health Checking**:
  - Configurable intervals (`60s`, `300s`, `900s`) and custom timeouts (`5s` to `30s`).
  - Method selection (`GET`, `POST`, `HEAD`), custom request headers, and request body payloads.
  - Assertions: Expected HTTP status codes and keyword response verification.
  - **SSRF Hardening**: Validates URLs and strictly blocks private IP ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), loopbacks (`127.0.0.1`, `localhost`), and AWS/cloud metadata services (`169.254.169.254`).

- **🚨 Incident Management & Alerting**:
  - Configurable failure threshold (e.g., $N$ consecutive errors before triggering an incident).
  - Automatic resolution on the first successful check.
  - Alert Channels: **Email (SMTP)** and **Telegram Bot** notifications with automated retry and exponential backoff.
  - On-demand "Test Alert" button to verify delivery before going live.

- **📊 Visual Telemetry & Public Status Pages**:
  - Interactive **30-day health strips** with status color codes (UP, DEGRADED, DOWN, NO DATA).
  - Response time latency curve charts powered by Recharts.
  - Standalone **Public Status Page** (`/status`) with live countdown refresh and incident logs.
  - Instant on-demand **Quick Probe Modal** directly from the dashboard table.
  - **Command Palette (`Ctrl + K`)** for rapid keyboard-driven navigation.
  - Curated **Dark / Light Mode** glassmorphism interface.

---

## 🏗️ System Architecture

```
                          ┌────────────────────────┐
                          │   React 18 Frontend    │
                          │   (Vite / Port 3000)   │
                          └───────────┬────────────┘
                                      │ REST API / Reverse Proxy
                                      ▼
                          ┌────────────────────────┐
                          │   Express API Server   │
                          │      (Port 5000)       │
                          └───────────┬────────────┘
                                      │ Prisma SQL
                                      ▼
┌────────────────────────┐       ┌─────────────────┐       ┌────────────────────────┐
│  Target HTTP Endpoints │ <──── │   PostgreSQL    │ ────> │ Alert Channels         │
│  (Validated checks)    │       │   (Port 5432)   │       │ (Email & Telegram)     │
└───────────▲────────────┘       └────────▲────────┘       └───────────▲────────────┘
            │                             │                            │
            └───────────────── [ Background Worker ] ──────────────────┘
                              (Checks & Incident Loop)
```

---

## 📂 Project Structure

```text
Uptime api monitor/
├── backend/                  # Express REST API & Prisma Database Layer
│   ├── prisma/
│   │   └── schema.prisma     # Database schema (Users, Monitors, Results, Incidents, Channels)
│   ├── src/
│   │   ├── middleware/       # JWT auth & validation middleware
│   │   ├── routes/           # Auth, Monitors, Incidents, AlertChannels, Status routes
│   │   ├── services/         # Security (SSRF protection), notifier, SSL checks
│   │   └── index.ts          # Express application entry point
│   ├── .env.example
│   └── package.json
│
├── frontend/                 # React 18 Single-Page Application
│   ├── src/
│   │   ├── api/              # Axios client & request interceptors
│   │   ├── components/       # Status badges, UptimeBarStrip, Charts, CommandPalette, Modals
│   │   ├── context/          # AuthContext, ThemeContext, ToastContext
│   │   ├── pages/            # Dashboard, Create/Edit Monitor, Details, Incidents, Status, Auth
│   │   ├── App.tsx           # Router configuration & protected routes
│   │   ├── index.css         # Glassmorphism design system & micro-animations
│   │   └── main.tsx          # React application root
│   ├── vite.config.ts        # Vite configuration with API proxy to port 5000
│   └── package.json
│
├── worker/                   # Autonomous Health Checker & Incident Dispatcher
│   ├── src/
│   │   ├── checker.ts        # HTTP execution, status assertion, keyword checks
│   │   ├── alertNotifier.ts  # Notification dispatch with retries
│   │   └── index.ts          # Cron loop & incident state transitions
│   ├── .env.example
│   └── package.json
│
├── docker-compose.yml        # Multi-container orchestration
├── .gitignore                # Git ignore patterns
└── README.md
```

---

## ⚡ Quick Start

### Option 1: Docker Compose (All-in-One)

The fastest way to launch the entire platform:

```bash
docker-compose up --build
```

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:5000/api](http://localhost:5000/api)
- **Status Page**: [http://localhost:3000/status](http://localhost:3000/status)
- **PostgreSQL**: `localhost:5432`

---

### Option 2: Local Manual Setup

#### Prerequisites
- **Node.js** >= 18.x
- **npm** >= 9.x
- **PostgreSQL** running locally on port `5432` (database named `uptime_db`)

#### 1. Setup Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your PostgreSQL credentials
npx prisma db push
npm run dev
```
> The API backend will start on `http://localhost:5000`.

#### 2. Setup Background Worker
```bash
cd ../worker
npm install
cp .env.example .env
# Ensure DATABASE_URL matches backend .env
npx prisma generate
npm run dev
```
> The background worker will begin executing scheduled check loops.

#### 3. Setup Frontend
```bash
cd ../frontend
npm install
npm run dev
```
> The React dashboard will be accessible at `http://localhost:3000`.

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
| Variable | Description | Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:...@localhost:5432/uptime_db` |
| `PORT` | API listening port | `5000` |
| `JWT_SECRET` | Secret key for signing authentication tokens | *Random secret string* |
| `NODE_ENV` | Application environment (`development` / `production`) | `development` |
| `FRONTEND_URL` | Allowed CORS origin | `http://localhost:3000` |

### Worker (`worker/.env`)
| Variable | Description | Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:...@localhost:5432/uptime_db` |
| `NODE_ENV` | Worker environment | `development` |

---

## 📡 REST API Reference

### Authentication
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new account (`email`, `name`, `password`) |
| `POST` | `/api/auth/login` | Authenticate and obtain JWT token |
| `POST` | `/api/auth/forgot-password` | Request password reset token |
| `POST` | `/api/auth/reset-password` | Reset password using verified token |
| `GET` | `/api/auth/me` | Fetch authenticated user profile |

### Monitors
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/monitors` | List user monitors (supports `?search=` and `?status=`) |
| `POST` | `/api/monitors` | Create a new monitor |
| `GET` | `/api/monitors/:id` | Get monitor configuration, stats, and recent checks |
| `PATCH` | `/api/monitors/:id` | Update monitor settings |
| `DELETE` | `/api/monitors/:id` | Delete monitor and its check history |
| `POST` | `/api/monitors/:id/pause` | Pause active monitoring |
| `POST` | `/api/monitors/:id/resume` | Resume paused monitoring |
| `GET` | `/api/monitors/:id/checks` | Get time-series response checks (`?range=24h\|7d\|30d`) |
| `POST` | `/api/monitors/:id/probe` | Execute an instant on-demand health check |

### Alert Channels
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/alert-channels` | List configured notification channels |
| `POST` | `/api/alert-channels` | Create Email or Telegram alert channel |
| `DELETE` | `/api/alert-channels/:id` | Delete an alert channel |
| `POST` | `/api/alert-channels/:id/test`| Send a test notification to verify integration |

### Incidents & Public Status
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/incidents` | List active outages and past resolved incidents |
| `GET` | `/api/status` | Public status page data for all public monitors |
| `GET` | `/api/status/:slug` | Filtered public status page for specific slug |
| `GET` | `/health` | Server health check endpoint |

---

## 🚢 Pushing to GitHub

Follow these steps in your terminal inside the project directory:

```bash
# 1. Initialize git in the project root
git init

# 2. Stage all project files (ignoring node_modules and .env via .gitignore)
git add .

# 3. Create initial commit
git commit -m "feat: initial commit of UptimePulse monitoring platform"

# 4. Set default branch to main
git branch -M main

# 5. Add your GitHub repository remote (replace with your repo URL)
git remote add origin https://github.com/<YOUR-USERNAME>/<YOUR-REPO-NAME>.git

# 6. Push to GitHub
git push -u origin main
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
