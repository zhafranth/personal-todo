# Deployment Guide

Split deployment: frontend on Vercel, backend on VPS.

- **Frontend**: Vercel (auto-deploy from Git)
- **Backend**: `todo.zhafranth.web.id` → `43.133.139.90` (Go binary behind Nginx)

---

## Part A: VPS (Backend Only)

### Prerequisites

The server must have these installed:
- Go (1.25+)
- PostgreSQL (15+)
- Nginx
- Certbot (for SSL)
- Git

### Step 1: Clone Repository

```bash
cd /opt
git clone <repo-url> personal-todo
cd personal-todo
```

### Step 2: Setup PostgreSQL

```bash
sudo -u postgres psql
```

```sql
CREATE USER todo_user WITH PASSWORD '<strong-password>';
CREATE DATABASE personal_todo OWNER todo_user;
\q
```

Run migrations in order:

```bash
cd /opt/personal-todo/server/migrations
for f in $(ls *.sql | sort); do
  sudo -u postgres psql -d personal_todo -f "$f"
done
```

### Step 3: Configure Server Environment

```bash
cp /opt/personal-todo/server/.env.example /opt/personal-todo/server/.env
nano /opt/personal-todo/server/.env
```

Fill in the values:

```
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=todo_user
DB_PASSWORD=<password-from-step-2>
DB_NAME=personal_todo
JWT_SECRET=<generate-with: openssl rand -base64 48>
PORT=8080
ALLOWED_ORIGINS=https://<vercel-frontend-domain>
```

### Step 4: Build & Run Go Server

```bash
cd /opt/personal-todo/server
go build -o server ./cmd/server
```

Test it works:

```bash
./server
# Should print "Connected to database" and "Server starting on :8080"
# Ctrl+C to stop
```

#### Create systemd service

```bash
sudo tee /etc/systemd/system/personal-todo.service > /dev/null <<EOF
[Unit]
Description=Personal Todo API Server
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/personal-todo/server
ExecStart=/opt/personal-todo/server/server
Restart=always
RestartSec=5
EnvironmentFile=/opt/personal-todo/server/.env

[Install]
WantedBy=multi-user.target
EOF
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable personal-todo
sudo systemctl start personal-todo
sudo systemctl status personal-todo
```

### Step 5: Configure Nginx

```bash
sudo tee /etc/nginx/sites-available/todo.zhafranth.web.id > /dev/null <<'EOF'
server {
    listen 80;
    server_name todo.zhafranth.web.id;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
```

```bash
sudo ln -sf /etc/nginx/sites-available/todo.zhafranth.web.id /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 6: Setup SSL with Certbot

```bash
sudo certbot --nginx -d todo.zhafranth.web.id
```

### Step 7: Verify Backend

```bash
curl https://todo.zhafranth.web.id/api/v1/login
# Should return a JSON error response (no body), confirming the API is live
```

---

## Part B: Vercel (Frontend)

### Step 1: Connect to Vercel

1. Import the Git repository in Vercel dashboard
2. Set **Root Directory** to `web`
3. Framework preset: **Vite**
4. Build command: `npm run build`
5. Output directory: `dist`

### Step 2: Set Environment Variable

In Vercel project settings → Environment Variables:

```
VITE_API_URL=https://todo.zhafranth.web.id
```

### Step 3: Deploy

Vercel auto-deploys on push to `main`. Frontend will call the API at `https://todo.zhafranth.web.id/api/v1/...`.

---

## Redeployment

### Backend (VPS)

```bash
cd /opt/personal-todo
git pull origin main
cd server
go build -o server ./cmd/server
sudo systemctl restart personal-todo
```

### Frontend (Vercel)

Push to `main` — Vercel auto-deploys.

---

## Troubleshooting

| Issue | Command |
|-------|---------|
| Check API logs | `sudo journalctl -u personal-todo -f` |
| Check Nginx logs | `sudo tail -f /var/log/nginx/error.log` |
| Test DB connection | `psql -U todo_user -d personal_todo -h localhost` |
| Restart API | `sudo systemctl restart personal-todo` |
| Restart Nginx | `sudo systemctl restart nginx` |
