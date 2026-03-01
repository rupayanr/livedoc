# LiveDoc Deployment Guide

## Architecture

```
┌─────────────────┐         ┌─────────────────┐
│     Vercel      │         │     Render      │
│    (Frontend)   │ ──────► │    (Backend)    │
│   React + Vite  │   API   │  FastAPI + WS   │
└─────────────────┘         └────────┬────────┘
                                     │
                            ┌────────┴────────┐
                            │                 │
                       ┌────▼────┐       ┌────▼────┐
                       │ Postgres │       │  Redis  │
                       │ (Render) │       │(Render) │
                       └──────────┘       └─────────┘
```

## Step 1: Deploy Backend to Render

### Option A: One-Click Blueprint (Recommended)

1. Push your code to GitHub
2. Go to [render.com/deploy](https://render.com/deploy)
3. Connect your GitHub repo
4. Render will detect `render.yaml` and create all services automatically

### Option B: Manual Setup

1. **Create PostgreSQL Database**
   - Dashboard → New → PostgreSQL
   - Name: `livedoc-db`
   - Plan: Free
   - Copy the **Internal Connection String**

2. **Create Redis Instance**
   - Dashboard → New → Redis
   - Name: `livedoc-redis`
   - Plan: Free
   - Copy the **Internal Connection String**

3. **Create Web Service**
   - Dashboard → New → Web Service
   - Connect your GitHub repo
   - Settings:
     - Name: `livedoc-api`
     - Runtime: Docker
     - Dockerfile Path: `./backend/Dockerfile`
     - Docker Context: `./backend`
     - Plan: Free

4. **Set Environment Variables** on the web service:
   ```
   DATABASE_URL=<postgres internal connection string>
   REDIS_URL=<redis internal connection string>
   CORS_ORIGINS=["https://your-app.vercel.app"]
   DEBUG=false
   ```

5. Deploy and wait for health check to pass

6. Copy your Render URL (e.g., `https://livedoc-api.onrender.com`)

---

## Step 2: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and import your GitHub repo

2. Configure the project:
   - Framework Preset: Vite
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`

3. **Set Environment Variables**:
   ```
   VITE_API_URL=https://livedoc-api.onrender.com
   VITE_WS_URL=wss://livedoc-api.onrender.com
   ```

   ⚠️ Use `wss://` (not `ws://`) for WebSocket since Render uses HTTPS

4. Deploy

---

## Step 3: Update CORS on Render

After Vercel deployment, update `CORS_ORIGINS` on Render:

```
CORS_ORIGINS=["https://your-app.vercel.app"]
```

If using a custom domain:
```
CORS_ORIGINS=["https://livedoc.rupayan.dev"]
```

---

## Environment Variables Reference

### Render (Backend)

| Variable | Example | Required |
|----------|---------|----------|
| `DATABASE_URL` | `postgresql://user:pass@host/db` | Yes |
| `REDIS_URL` | `redis://user:pass@host:port` | Yes |
| `CORS_ORIGINS` | `["https://app.vercel.app"]` | Yes |
| `DEBUG` | `false` | No |

### Vercel (Frontend)

| Variable | Example | Required |
|----------|---------|----------|
| `VITE_API_URL` | `https://livedoc-api.onrender.com` | Yes |
| `VITE_WS_URL` | `wss://livedoc-api.onrender.com` | Yes |

---

## Free Tier Limitations

### Render Free Tier
- Web services spin down after 15 min of inactivity
- First request after spin-down takes ~30 seconds (cold start)
- PostgreSQL: 90 days, then requires upgrade
- Redis: 25MB storage

### Vercel Free Tier
- 100GB bandwidth/month
- Serverless function limits (not used for frontend-only)

---

## Custom Domain Setup

### Vercel (Frontend)
1. Go to Project Settings → Domains
2. Add `livedoc.rupayan.dev`
3. Update DNS: CNAME to `cname.vercel-dns.com`

### Render (Backend API)
1. Go to Service Settings → Custom Domains
2. Add `api.livedoc.rupayan.dev`
3. Update DNS as instructed by Render

---

## Troubleshooting

### WebSocket Connection Failed
- Ensure `VITE_WS_URL` uses `wss://` (not `ws://`)
- Check CORS_ORIGINS includes your frontend domain
- Verify Render service is running (check logs)

### CORS Errors
- CORS_ORIGINS must be valid JSON array: `["https://domain.com"]`
- Include the full origin with protocol

### Database Connection Failed
- Render free PostgreSQL expires after 90 days
- Check DATABASE_URL is set correctly
- Verify migrations ran (check deploy logs for "Running database migrations...")

### Cold Start Delays
- Render free tier spins down after 15 min
- First request takes ~30 seconds
- Consider upgrading to paid tier for production
