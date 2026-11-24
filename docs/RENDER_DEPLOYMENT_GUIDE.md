# Deploying NIMI KINGS Backend on Render (render.com)

This guide walks you through deploying the **NIMI KINGS LTD** backend to **Render** as a live cloud Web Service.

---

## 1. Prerequisites
- A [Render](https://render.com) account.
- Access to the GitHub repository: `nimikingslimited-max/nimi_kings_backend`.
- Your Supabase PostgreSQL database credentials (`DATABASE_URL`).
- Your JWT and SMTP credentials.

---

## 2. Deployment Methods

You have two easy ways to deploy:
1. **Method A (Recommended): 1-Click Blueprint** using the pre-configured `render.yaml`.
2. **Method B: Manual Web Service Setup** via the Render dashboard UI.

---

### Method A: 1-Click Blueprint Deployment (Fastest)

1. Log into your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** (top right) and select **Blueprint**.
3. Connect your GitHub repository (`nimikingslimited-max/nimi_kings_backend`).
4. Select the branch to deploy: **`Dev`** (or `main`).
5. Render will automatically detect the [`render.yaml`](../render.yaml) file in the root directory.
6. Under **Environment Variables**, fill in your secret values:
   - `DATABASE_URL`
   - `JWT_ACCESS_SECRET`
   - `JWT_REFRESH_SECRET`
   - SMTP details (`SMTP_USER`, `SMTP_PASS`, etc.)
7. Click **Apply**. Render will automatically provision the service, run `npm install && npm run build`, and launch the backend!

---

### Method B: Manual Web Service Deployment

1. In the [Render Dashboard](https://dashboard.render.com), click **New +** -> **Web Service**.
2. Select **Build and deploy from a Git repository** and connect `nimikingslimited-max/nimi_kings_backend`.
3. Configure the service settings:

| Setting Field | Value | Notes |
| :--- | :--- | :--- |
| **Name** | `nimi-kings-backend` | Appears in your URL: `nimi-kings-backend.onrender.com` |
| **Region** | `Frankfurt (EU Central)` | Best latency for Nigeria / Europe. |
| **Branch** | `Dev` | Active development & testing branch. |
| **Root Directory** | *(leave empty)* | Repository root. |
| **Runtime** | `Node` | Node.js environment. |
| **Build Command** | `npm install && npm run build` | Generates Prisma client and compiles NestJS. |
| **Start Command** | `npm run start:prod` | Runs `node dist/main.js`. |
| **Instance Type** | `Free` or `Starter` | Free tier spins down when idle; Starter ($7/mo) stays alive 24/7. |

4. Scroll down to **Advanced** and set:
   - **Health Check Path:** `/api/v1/health`
   - **Auto-Deploy:** `Yes` (deploys automatically whenever code is pushed to `Dev`).

5. Click **Add Environment Variable** to add your configuration (see Section 3).
6. Click **Create Web Service**.

---

## 3. Environment Variables Reference

Add these key-value pairs in Render under the **Environment** tab:

```env
# Application
NODE_ENV=production

# Database (Supabase Cloud Transaction Pooler URL)
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-eu-west-2.pooler.supabase.com:5432/postgres

# JWT Security
JWT_ACCESS_SECRET=your_super_strong_jwt_access_secret_key_2026
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_SECRET=your_super_strong_jwt_refresh_secret_key_2026
JWT_REFRESH_EXPIRATION=7d

# Email / Notifications (Gmail SMTP or SendGrid/Postmark)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
SMTP_FROM="NIMI KINGS LTD" <noreply@nimikingsltd.com>
FRONTEND_URL=https://www.nimikingsltd.com

# Optional: Redis & Queues (e.g. from Upstash or Render Redis)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Optional: Cloud Object Storage (AWS S3 or Cloudflare R2)
S3_ENDPOINT=
S3_REGION=us-east-1
S3_BUCKET=nimi-kings-assets
S3_ACCESS_KEY=
S3_SECRET_KEY=
CDN_BASE_URL=https://cdn.nimikingsltd.com
```

> **Note on Port:** Render automatically injects the `PORT` environment variable (usually `10000`). The backend code binds to `0.0.0.0:$PORT` automatically.

---

## 4. Verifying the Deployment

Once Render finishes building and marks your service **Live**:

1. **Root API Check:**
   Open: `https://<your-service-name>.onrender.com/api/v1`  
   Expected Response:
   ```json
   {
     "name": "NIMI KINGS LTD - Backend API",
     "version": "1.0.0",
     "status": "online",
     "docs": "/api/docs",
     "health": "/api/v1/health"
   }
   ```

2. **Health Check:**
   Open: `https://<your-service-name>.onrender.com/api/v1/health`  
   Expected Response:
   ```json
   {
     "status": "ok",
     "service": "NIMI KINGS Backend API",
     "timestamp": "2026-11-24T..."
   }
   ```

3. **Live Interactive Swagger UI:**
   Open: `https://<your-service-name>.onrender.com/api/docs`  
   - All 125 endpoints are available for your frontend teammate and QA to test directly from the cloud without running anything locally!
   - Test login with:
     - `admin@nimikingsltd.com` / `Password123!`
     - `agent@nimikingsltd.com` / `Password123!`
     - `customer@nimikingsltd.com` / `Password123!`

---

## 5. Connecting Frontend to Render Backend

Once live, share the Render URL with your frontend teammate:
- **Base API URL:** `https://<your-service-name>.onrender.com/api/v1`
- **Swagger Documentation:** `https://<your-service-name>.onrender.com/api/docs`
- **WebSocket Chat Gateway:** `wss://<your-service-name>.onrender.com/chat`
- **CORS:** CORS is already configured with `origin: true, credentials: true`, allowing their Next.js / React frontend (local or deployed on Vercel) to interact without CORS errors.
