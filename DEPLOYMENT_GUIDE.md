# PunchRaksha — Server Deployment Guide

This guide covers everything needed to run PunchRaksha on a fresh server (Ubuntu/Debian VPS, AWS EC2, or similar Linux host).

---

## Prerequisites

Install the following on your server before starting:

| Tool | Minimum version | Install guide |
|---|---|---|
| Node.js | 18.x or 20.x (LTS) | https://nodejs.org/en/download/package-manager |
| npm | Ships with Node.js | — |
| PostgreSQL | 14+ | https://www.postgresql.org/download/linux/ |
| Git | any | `sudo apt install git` |

> **Quick install on Ubuntu 22.04:**
> ```bash
> curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
> sudo apt-get install -y nodejs postgresql postgresql-contrib git
> ```

---

## Step 1 — Get the Code

```bash
# Option A: clone from a Git repository (if hosted on GitHub/GitLab)
git clone <your-repo-url> punchraksha
cd punchraksha

# Option B: upload the project folder to the server via SCP / SFTP
# then cd into it
cd punchraksha
```

---

## Step 2 — Set Up the Database

```bash
# Switch to the postgres system user
sudo -u postgres psql

# Inside psql, run:
CREATE DATABASE punchraksha;
CREATE USER punchraksha_user WITH PASSWORD 'choose_a_strong_password';
GRANT ALL PRIVILEGES ON DATABASE punchraksha TO punchraksha_user;
\q

# Apply the schema (creates all tables)
npx tsx scripts/apply-schema.ts
```

---

## Step 3 — Configure Environment Variables

Create a file named `.env` in the project root. Copy the template below and fill in every value:

```env
# ──────────────────────────────────────────────────────
# DATABASE
# ──────────────────────────────────────────────────────
DATABASE_URL=postgresql://punchraksha_user:choose_a_strong_password@localhost:5432/punchraksha

# ──────────────────────────────────────────────────────
# CLOUDFLARE R2 — Image Storage
# (Create a bucket at dash.cloudflare.com → R2)
# ──────────────────────────────────────────────────────
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET=your_r2_bucket_name
R2_PUBLIC_BASE_URL=https://pub-xxxxxxxxxxxx.r2.dev

# ──────────────────────────────────────────────────────
# AUTHENTICATION
# ──────────────────────────────────────────────────────
# Pick any long random string (32+ characters)
NEXT_PUBLIC_JWT_SECRET=replace_with_a_long_random_secret_string

# Admin login credentials for the /admin panel
NEXT_PUBLIC_ADMIN_EMAIL=admin@yourdomain.com
NEXT_PUBLIC_ADMIN_PASSWORD=choose_a_strong_admin_password

# ──────────────────────────────────────────────────────
# FIREBASE — Phone OTP (Customer Login)
# (Create a project at console.firebase.google.com)
# ──────────────────────────────────────────────────────
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-firebase-project-id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id

# ──────────────────────────────────────────────────────
# RAZORPAY — Payments
# (Get keys from dashboard.razorpay.com)
# Use live keys for production, test keys for testing
# ──────────────────────────────────────────────────────
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx
NEXT_PUBLIC_RAZORPAY_KEY_SECRET=your_razorpay_secret

# ──────────────────────────────────────────────────────
# SHIPROCKET — Shipping & Logistics
# (Get credentials from app.shiprocket.in → Settings → API)
# ──────────────────────────────────────────────────────
SHIPROCKET_EMAIL=your_shiprocket_email
SHIPROCKET_PASSWORD=your_shiprocket_password
SHIPROCKET_PICKUP_LOCATION=Primary

SHIPROCKET_CHECKOUT_API_KEY=your_shiprocket_checkout_key
SHIPROCKET_CHECKOUT_API_SECRET=your_shiprocket_checkout_secret

# ──────────────────────────────────────────────────────
# PUBLIC SITE URLs
# Replace with your actual domain
# ──────────────────────────────────────────────────────
NEXT_PUBLIC_SITE_URL=https://www.yourdomain.com
NEXT_PUBLIC_BASE_URL=https://www.yourdomain.com

# ──────────────────────────────────────────────────────
# ENVIRONMENT
# ──────────────────────────────────────────────────────
NEXT_PUBLIC_NODE_ENV=production
```

> **Security note:** Never share this `.env` file publicly or commit it to Git. It contains all your secret keys.

---

## Step 4 — Install Dependencies & Build

```bash
# Install all npm packages
npm install

# Build the production app
npm run build
```

A successful build will print a list of all pages/routes at the end with no errors.

---

## Step 5 — Run the App

### Option A — Quick start (not recommended for production)

```bash
npm run start
# App runs on http://localhost:3000
```

### Option B — Production with PM2 (recommended for VPS)

PM2 keeps the app running in the background and restarts it on crashes or server reboots.

```bash
# Install PM2 globally
npm install -g pm2

# Start the app
pm2 start npm --name "punchraksha" -- start

# Save so it auto-starts after a server reboot
pm2 save
pm2 startup   # follow the printed command to enable startup
```

Useful PM2 commands:

```bash
pm2 status          # check if the app is running
pm2 logs punchraksha   # view live logs
pm2 restart punchraksha
pm2 stop punchraksha
```

---

## Step 6 — Set Up Nginx as a Reverse Proxy (Recommended)

Nginx forwards traffic from port 80/443 (your domain) to port 3000 (the app).

```bash
sudo apt install nginx

# Create a site config
sudo nano /etc/nginx/sites-available/punchraksha
```

Paste this configuration (replace `yourdomain.com`):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/punchraksha /etc/nginx/sites-enabled/
sudo nginx -t          # test for syntax errors
sudo systemctl reload nginx
```

---

## Step 7 — Enable HTTPS (SSL)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot automatically renews certificates. After this step your site runs securely on `https://`.

---

## Step 8 — Point Your Domain

In your domain registrar's DNS settings, add:

| Type | Name | Value |
|---|---|---|
| A | @ | `<your server's public IP>` |
| A | www | `<your server's public IP>` |

DNS changes can take 5–30 minutes to propagate.

---

## Deployment via AWS Amplify (Alternative)

If deploying to **AWS Amplify** instead of a VPS:

1. Push the code to a GitHub / GitLab / Bitbucket repository.
2. In the AWS Amplify console, connect the repository and select the branch.
3. Amplify will detect Next.js automatically and set up the build command (`npm run build`).
4. Add all environment variables from Step 3 in **Amplify → App settings → Environment variables**.
5. **Critical:** In CloudFront settings, add a cache behavior to **forward the `punchraksha_token` cookie** to the origin — without this, logged-in pages will redirect on every load.

---

## First Login to Admin Panel

After the app is running:

1. Open `https://yourdomain.com/admin-login`
2. Enter the email and password you set in `.env` (`NEXT_PUBLIC_ADMIN_EMAIL` / `NEXT_PUBLIC_ADMIN_PASSWORD`)
3. From the admin panel you can add products, blogs, and all content

---

## Updating the App

When you receive a new version of the code:

```bash
# Pull latest code (if using Git)
git pull

# Re-install dependencies (in case packages changed)
npm install

# Apply any schema updates
npx tsx scripts/apply-schema.ts

# Rebuild and restart
npm run build
pm2 restart punchraksha
```

---

## Quick Troubleshooting

| Problem | What to check |
|---|---|
| App crashes on start | Run `pm2 logs punchraksha` — usually a missing env variable |
| Database connection error | Verify `DATABASE_URL` in `.env`; confirm PostgreSQL is running (`sudo systemctl status postgresql`) |
| Images not loading | Check all five `R2_*` variables; confirm the bucket exists and is public |
| Admin login fails | Check `NEXT_PUBLIC_ADMIN_EMAIL` and `NEXT_PUBLIC_ADMIN_PASSWORD` in `.env` |
| Payment doesn't work | Confirm Razorpay keys are **live** keys (not test) and the domain is whitelisted in Razorpay dashboard |
| OTP login fails | Confirm Firebase project has Phone Authentication enabled; check Firebase config variables |
| Nginx 502 Bad Gateway | App is not running — check `pm2 status` and restart if needed |

---

## Minimum Server Specs

| Resource | Minimum | Recommended |
|---|---|---|
| CPU | 1 vCPU | 2 vCPU |
| RAM | 1 GB | 2 GB |
| Storage | 20 GB SSD | 40 GB SSD |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

---

## Summary Checklist

- [ ] Node.js 20 installed
- [ ] PostgreSQL installed and database created
- [ ] Schema applied (`npx tsx scripts/apply-schema.ts`)
- [ ] `.env` file created with all values filled in
- [ ] `npm install` completed
- [ ] `npm run build` completed with no errors
- [ ] App started with PM2
- [ ] Nginx configured as reverse proxy
- [ ] SSL certificate installed via Certbot
- [ ] Domain DNS pointing to server IP
- [ ] Admin panel accessible at `/admin-login`
