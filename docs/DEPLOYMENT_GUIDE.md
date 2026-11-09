# Solli (சொல்லி) &mdash; Production Deployment Guide

This guide provides step-by-step instructions for deploying **Solli**, the multilingual voice form assistant powered by Gnani AI, to public cloud platforms, split edge CDNs, and physical CSC / Gram Panchayat kiosk hardware.

---

## Table of Contents
1. [Pre-Deployment Requirements & Constraints](#1-pre-deployment-requirements--constraints)
2. [Architecture Deployment Models](#2-architecture-deployment-models)
3. [Option 1: Unified Full-Stack Cloud Deployment (Render — Recommended)](#3-option-1-unified-full-stack-cloud-deployment-render--recommended)
4. [Option 2: Alternative Cloud PaaS (Railway / Fly.io)](#4-option-2-alternative-cloud-paas-railway--flyio)
5. [Option 3: Split Edge Hosting (Vercel Frontend + Render Backend)](#5-option-3-split-edge-hosting-vercel-frontend--render-backend)
6. [Option 4: Self-Hosted Linux VPS (Ubuntu + Nginx + PM2 + Let's Encrypt)](#6-option-4-self-hosted-linux-vps-ubuntu--nginx--pm2--lets-encrypt)
7. [Option 5: Local Kiosk / Village Helpdesk Setup (with HTTPS Tunnel)](#7-option-5-local-kiosk--village-helpdesk-setup-with-https-tunnel)
8. [Environment Variables Reference](#8-environment-variables-reference)
9. [Post-Deployment Smoke Test & Verification](#9-post-deployment-smoke-test--verification)
10. [Troubleshooting & Common Pitfalls](#10-troubleshooting--common-pitfalls)

---

## 1. Pre-Deployment Requirements & Constraints

### System Requirements
* **Node.js**: `v18.0.0` or higher (verified on Node `20.x LTS` and `22.x LTS`).
* **npm**: `v9.0.0` or higher.
* **RAM**: Minimum 512 MB (1 GB recommended for Vite build step).
* **Storage**: ~250 MB disk space including dependencies.

### Confidentiality & Security Constraints
* **Gnani API Key Isolation**: The `GNANI_API_KEY` token (`vach_...`) must **never** be injected into client environment variables or committed to source control. It resides exclusively on the backend Express server. All STT and TTS traffic is proxied through server endpoints (`/api/transcribe`, `/api/speak`).
* **Zero Client Storage**: Solli stores zero citizen data in browser storage (`localStorage`, `sessionStorage`, or cookies). Do not configure persistent storage or caching proxies that capture citizen personal identifiable information (PII).
* **HTTPS Strictly Mandatory for Web Audio**: Modern browsers (`navigator.mediaDevices.getUserMedia`) **refuse** microphone access over plain HTTP (e.g. `http://your-server-ip:5000` or `http://192.168.x.x`). A valid TLS/SSL certificate (`https://`) or `localhost` is strictly required for the microphone capture to function on smartphones, tablets, and kiosks.

---

## 2. Architecture Deployment Models

| Model | Frontend | Backend | SSL / HTTPS | Cost | Complexity | Best For |
|---|---|---|---|---|---|---|
| **Option 1: Unified Cloud (Render)** | Express static (`client/dist`) | Node.js Express (`server/`) | Automatic Let's Encrypt | Free | Lowest | **Contest pitch, judge demo, live testing** |
| **Option 2: Cloud PaaS (Railway)** | Express static (`client/dist`) | Node.js Express (`server/`) | Automatic SSL | Free / \$5 credit | Low | Quick containerized alternative |
| **Option 3: Split Edge CDN (Vercel)** | Vercel Edge (`client/`) | Render / Railway (`server/`) | Automatic SSL | Free | Medium | Independent scaling of client assets |
| **Option 4: Self-Hosted VPS** | Nginx reverse proxy | Node.js via PM2 | Certbot Let's Encrypt | \$4–\$6 / mo | High | Dedicated production server / sovereign hosting |
| **Option 5: CSC / Panchayat Kiosk** | Local Chromium Kiosk | Local Node.js server | Cloudflare Tunnel HTTPS | Free | Low–Med | Local hardware with phone audio testing |

---

## 3. Option 1: Unified Full-Stack Cloud Deployment (Render — Recommended)

Render provides free hosting for Node.js web services with automatic HTTPS certificates, zero configuration SSL, and instant redeployment on git push. In this mode, Express serves both the backend `/api/*` endpoints and the compiled React production assets from `client/dist`.

### Method A: 1-Click Blueprint (Using `render.yaml`)

1. Fork or push the Solli repository to your GitHub account:
   ```bash
   https://github.com/dhanushkumar-amk/SOLLI
   ```
2. Log in to [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** &rarr; **Blueprint**.
4. Select your `SOLLI` repository. Render reads the root `render.yaml` configuration automatically.
5. In the configuration prompt, enter your `GNANI_API_KEY` obtained from [app.gnani.ai](https://app.gnani.ai).
6. Click **Apply**. Render will automatically run `npm run build:all` and start the server with `npm start`.

---

### Method B: Manual Dashboard Setup

1. In [Render Dashboard](https://dashboard.render.com/), click **New +** &rarr; **Web Service**.
2. Connect your GitHub repository `dhanushkumar-amk/SOLLI` (or your fork).
3. Configure the service settings:
   * **Name**: `solli` (or custom name, e.g. `solli-voice`)
   * **Region**: Singapore or Frankfurt (choose nearest to India for lowest STT latency)
   * **Branch**: `master` (or `main`)
   * **Runtime**: `Node`
   * **Build Command**:
     ```bash
     npm run build:all
     ```
   * **Start Command**:
     ```bash
     npm start
     ```
   * **Instance Type**: `Free`
4. Expand **Advanced** &rarr; **Environment Variables** and add:
   | Key | Value | Description |
   |---|---|---|
   | `NODE_ENV` | `production` | Enables production optimizations |
   | `PORT` | `5000` | Server listening port |
   | `GNANI_API_KEY` | `vach_your_actual_key` | Secret key from app.gnani.ai |
   | `VITE_DEMO_MODE` | `false` | Set to `true` only if testing without live credits |
5. Click **Create Web Service**.
6. Wait for the build logs to show `✓ built in X.XXs` and `Solli server listening on port 5000`.
7. Your app is live at `https://<your-service-name>.onrender.com`!

> [!NOTE]
> On Render's free tier, instances spin down after 15 minutes of inactivity. The first request after sleep takes ~30–45 seconds to spin up. Subsequent voice interactions are instantaneous.

---

## 4. Option 2: Alternative Cloud PaaS (Railway / Fly.io)

### Railway Deployment
1. Log in to [Railway.app](https://railway.app/).
2. Click **New Project** &rarr; **Deploy from GitHub repo**.
3. Select `SOLLI`.
4. Navigate to **Settings**:
   * **Build Command**: `npm run build:all`
   * **Start Command**: `npm start`
5. In **Variables**, add:
   * `NODE_ENV`: `production`
   * `PORT`: `5000`
   * `GNANI_API_KEY`: `vach_...`
6. Under **Networking**, click **Generate Domain** to get a public HTTPS URL (e.g. `https://solli-production.up.railway.app`).

---

## 5. Option 3: Split Edge Hosting (Vercel Frontend + Render Backend)

If you prefer hosting the React client separately on Vercel's global Edge CDN while hosting the Node/Express server on Render or Railway:

### Step 1: Deploy Backend (Render / Railway)
1. Deploy the backend following Option 1, or set root directory to `server`.
2. Note your backend URL: e.g. `https://solli-api.onrender.com`.

### Step 2: Deploy Frontend on Vercel
1. Log in to [Vercel](https://vercel.com/) and click **Add New...** &rarr; **Project**.
2. Import the `SOLLI` repository.
3. In project setup:
   * **Framework Preset**: `Vite`
   * **Root Directory**: Click edit and select `client`
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
4. In **Environment Variables**, add:
   * `VITE_API_URL`: `https://solli-api.onrender.com` (your backend URL without trailing slash)
5. Click **Deploy**.
6. Vercel automatically deploys the frontend with client-side SPA routing governed by `client/vercel.json`.

---

## 6. Option 4: Self-Hosted Linux VPS (Ubuntu + Nginx + PM2 + Let's Encrypt)

For on-premise government servers or cloud VPS (AWS EC2, DigitalOcean, Hetzner, Linode):

### 1. System Preparation
```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx git certbot python3-certbot-nginx

# Install PM2 process manager globally
sudo npm install -g pm2
```

### 2. Clone & Build
```bash
cd /var/www
sudo git clone https://github.com/dhanushkumar-amk/SOLLI.git solli
cd solli

# Install dependencies and build client assets
sudo npm run build:all
```

### 3. Configure Server Environment
Create `/var/www/solli/server/.env`:
```ini
NODE_ENV=production
PORT=5000
GNANI_API_KEY=vach_your_actual_key_here
```
Secure file permissions:
```bash
sudo chmod 600 /var/www/solli/server/.env
```

### 4. Start with PM2
```bash
pm2 start server/index.js --name solli
pm2 save
pm2 startup
```

### 5. Configure Nginx Reverse Proxy with SSL
Create `/etc/nginx/sites-available/solli`:
```nginx
server {
    server_name solli.yourdomain.org;

    # Client asset cache and proxy
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Audio upload buffer limit
        client_max_body_size 10M;
    }
}
```

Enable site and provision free SSL certificate:
```bash
sudo ln -s /etc/nginx/sites-available/solli /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Issue Let's Encrypt SSL certificate
sudo certbot --nginx -d solli.yourdomain.org
```

---

## 7. Option 5: Local Kiosk / Village Helpdesk Setup (with HTTPS Tunnel)

When testing or operating on local hardware in a Common Service Centre (CSC) or Gram Panchayat office, operators can run the application on their desktop and connect applicants' phones or kiosk touchscreens.

### Why an HTTPS Tunnel is Necessary
When connecting a smartphone or external tablet over the local Wi-Fi network (e.g. `http://192.168.1.15:5000`), mobile Safari and Android Chrome **block microphone recording** because the URL is not `localhost` and lacks HTTPS. Using a free secure tunnel bypasses this without purchasing a custom domain.

### Method A: Cloudflare Tunnel (Zero Install, Instant Free SSL)
1. Download `cloudflared` from [developers.cloudflare.com](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/).
2. Start the Solli local server:
   ```bash
   npm run build:all
   npm start
   ```
3. In a second terminal, launch the tunnel:
   ```bash
   cloudflared tunnel --url http://localhost:5000
   ```
4. Cloudflare outputs a public HTTPS link:
   ```text
   +-----------------------------------------------------------------------+
   |  Your quick Tunnel has been created! Visit it at:                    |
   |  https://village-kiosk-test-xxxx.trycloudflare.com                   |
   +-----------------------------------------------------------------------+
   ```
5. Scan the QR code or open the URL on any smartphone or tablet. Full microphone recording and voice synthesis operate securely.

---

### Method B: ngrok Tunnel
```bash
ngrok http 5000
```
Open the generated `https://xxxx.ngrok-free.app` URL on the target device.

---

### Method C: Chrome Kiosk Mode for Operator Touchscreen
To lock a dedicated terminal into full-screen kiosk mode:

**Windows**:
```cmd
"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --app=http://localhost:5000 --disable-pinch --overscroll-history-navigation=0
```

**Linux / Raspberry Pi**:
```bash
chromium-browser --kiosk --app=http://localhost:5000 --noerrdialogs --disable-infobars
```

---

## 8. Environment Variables Reference

| Variable | Required | Default | Scope | Description |
|---|---|---|---|---|
| `GNANI_API_KEY` | **Yes** (in live mode) | _None_ | Server only | Secret authentication key for Gnani Prisma (STT) and Timbre (TTS). Keep private. |
| `PORT` | No | `5000` | Server | HTTP port the Express backend binds to. Auto-assigned on Render/Railway. |
| `NODE_ENV` | No | `development` | Server | Set to `production` in live environments to optimize asset delivery. |
| `VITE_DEMO_MODE` | No | `false` | Client & Server | When set to `true`, enables offline fallback mode with built-in voice simulation. |
| `VITE_API_URL` | No | `""` (relative) | Client | Target API URL when frontend is hosted separately on Vercel/Netlify. |

---

## 9. Post-Deployment Smoke Test & Verification

Once deployed, run this quick 6-point verification checklist:

### 1. Verify Backend Health Check
```bash
curl -I https://<your-deployment-url>/api/health
```
**Expected response**: `HTTP/2 200` with JSON body:
```json
{
  "status": "ok",
  "uptime": 12.34,
  "timestamp": 1710000000000
}
```

### 2. Verify Schema Loading
```bash
curl https://<your-deployment-url>/api/form/ignoaps_pension
```
**Expected response**: JSON payload returning the 16 form fields, prompt scripts, and validation criteria.

### 3. Verify Static Frontend Asset Serving
Open `https://<your-deployment-url>/` in a web browser. The dark-themed landing page (`Solli / சொல்லி`) should render with ember accents and interactive buttons.

### 4. Verify Web Audio Microphone Capture
1. Click **Try voice form demo** or **Launch kiosk**.
2. Click **Start voice session** (`குரல் அமர்வை தொடங்கவும்`).
3. The browser will prompt: *"Allow solli to use your microphone?"*.
4. Click **Allow**. Verify that the audio waveform / status pulses when you speak.

### 5. Verify Speech Synthesis (TTS Audio)
1. Ensure device speakers or headphones are unmuted.
2. The introductory question should play aloud in spoken Tamil (`"உங்கள் பெயர் என்ன?"` / *"What is your name?"*).

### 6. Verify DPDP Act Zero Storage Compliance
1. Open Chrome DevTools (`F12`) &rarr; **Application** tab.
2. Inspect **Local Storage**, **Session Storage**, and **Cookies**.
3. Confirm that all three remain completely empty (`0 items`) throughout the session.

---

## 10. Troubleshooting & Common Pitfalls

### Issue 1: "Microphone permission blocked" or `NotAllowedError`
* **Root Cause**: The application is being accessed over insecure HTTP on a remote IP address (e.g. `http://192.168.1.100:5000`).
* **Fix**: Use the HTTPS URL provided by Render, Cloudflare Tunnel (`trycloudflare.com`), or ngrok. Chrome allows microphone access only over `https://` or `http://localhost`.

### Issue 2: "Gnani API error 401: Unauthorized" or `CREDIT_LIMIT_EXCEEDED`
* **Root Cause**: `GNANI_API_KEY` is either missing, mistyped, or your Gnani account has exhausted its free monthly internship credits.
* **Fix**:
  1. Verify the key in Render environment settings starts with `vach_`.
  2. Log into [app.gnani.ai](https://app.gnani.ai) and check your credit balance.
  3. If credits are exhausted during an offline presentation, set `VITE_DEMO_MODE=true` in environment variables to demonstrate the complete UI workflow using simulated speech responses.

### Issue 3: "404 Not Found" on page refresh for deep links (e.g. `/kiosk` or `/review`)
* **Root Cause**: Web server is not redirecting non-API GET requests back to Vite's `index.html`.
* **Fix**:
  * In unified mode: Handled automatically by `server/index.js` which catches non-API GET routes and serves `client/dist/index.html`. Ensure `client/dist` exists by running `npm run build:all`.
  * On Vercel: Handled automatically by `client/vercel.json`.

### Issue 4: Render free tier cold-start lag
* **Observation**: The app takes ~40 seconds to open on the very first morning visit.
* **Explanation**: Render's free tier spins down containers after 15 minutes of zero traffic. Once awake, performance returns to normal.
* **Pro-tip**: Ping `https://<your-app>.onrender.com/api/health` 1 minute before presenting your pitch to wake the instance up!

