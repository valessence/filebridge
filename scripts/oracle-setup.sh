#!/bin/bash
set -e

echo "=== FileBridge Oracle Cloud setup ==="

if [ ! -f .env ]; then
  echo "ERROR: .env file not found."
  echo "Run: cp .env.oracle.example .env"
  echo "Then edit .env and set DOMAIN and APP_SECRET."
  exit 1
fi

echo "Opening firewall ports 80 and 443 (Oracle Ubuntu images block these by default)..."
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT 2>/dev/null || true
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT 2>/dev/null || true
if command -v netfilter-persistent >/dev/null 2>&1; then
  sudo netfilter-persistent save
fi

echo "Building and starting FileBridge..."
docker compose -f docker-compose.oracle.yml up -d --build

echo ""
echo "Done! Give Caddy 1-2 minutes to get your HTTPS certificate."
echo "Then open: https://$(grep '^DOMAIN=' .env | cut -d= -f2)"