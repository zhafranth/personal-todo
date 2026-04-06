#!/bin/bash
set -euo pipefail

APP_DIR="/opt/personal-todo"
SERVICE_NAME="personal-todo"

echo "==> Pulling latest changes..."
cd "$APP_DIR"
git pull origin main

echo "==> Running migrations..."
cd "$APP_DIR/server/migrations"
for f in $(ls *.sql | sort); do
  sudo -u postgres psql -d personal_todo -f "$f" 2>&1 || true
done

echo "==> Building server..."
cd "$APP_DIR/server"
go build -o server ./cmd/server

echo "==> Restarting service..."
sudo systemctl restart "$SERVICE_NAME"

echo "==> Waiting for service to start..."
sleep 2

if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
  echo "==> Deploy successful! Service is running."
else
  echo "==> Deploy FAILED! Service is not running."
  sudo journalctl -u "$SERVICE_NAME" --no-pager -n 20
  exit 1
fi
