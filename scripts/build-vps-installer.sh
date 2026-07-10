#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PKG_NAME="${PKG_NAME:-personal-blog-vps-installer}"
DIST_DIR="$ROOT_DIR/dist"
PKG_ROOT="$DIST_DIR/$PKG_NAME"
ARCHIVE="$DIST_DIR/$PKG_NAME.tar.gz"

cd "$ROOT_DIR"
npm run build

rm -rf "$PKG_ROOT"
mkdir -p "$PKG_ROOT/app" "$PKG_ROOT/nginx" "$DIST_DIR"

cp -R .next/standalone/. "$PKG_ROOT/app/"
mkdir -p "$PKG_ROOT/app/.next"
cp -R .next/static "$PKG_ROOT/app/.next/static"
cp -R public "$PKG_ROOT/app/public"
cp -R content "$PKG_ROOT/app/content"

# The standalone trace does not expose bcryptjs as a root require target, but
# install.sh needs it to generate the initial admin password hash offline.
mkdir -p "$PKG_ROOT/app/node_modules"
rm -rf "$PKG_ROOT/app/node_modules/bcryptjs"
cp -R node_modules/bcryptjs "$PKG_ROOT/app/node_modules/bcryptjs"

cat > "$PKG_ROOT/app/.env.example" <<'ENV'
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=replace-with-bcrypt-hash
JWT_SECRET=replace-with-random-secret
ENV

cat > "$PKG_ROOT/nginx/personal-blog.conf.example" <<'NGINX'
server {
  listen 80;
  server_name example.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
NGINX

cat > "$PKG_ROOT/README_VPS_INSTALL.md" <<'README'
# Personal Blog VPS Installer

## Install

```bash
tar -xzf personal-blog-vps-installer.tar.gz
cd personal-blog-vps-installer
sudo bash install.sh
```

The installer:

- checks Node.js >= 20.9
- installs the app to `/opt/personal-blog`
- creates `.env.local` with one admin account
- creates and starts the `personal-blog` systemd service
- enables the service at boot

Default port is `3000`. Override defaults with environment variables:

```bash
sudo PORT=4000 APP_DIR=/opt/my-blog bash install.sh
```

## Nginx

Use `nginx/personal-blog.conf.example` as a reverse proxy template and change `server_name`.

## Content

Markdown posts live in `content/posts/`. Reinstalling preserves an existing target `content/` directory.
README

cat > "$PKG_ROOT/install.sh" <<'INSTALL'
#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="${SERVICE_NAME:-personal-blog}"
APP_DIR="${APP_DIR:-/opt/personal-blog}"
APP_USER="${APP_USER:-personal-blog}"
PORT="${PORT:-3000}"
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/app"
NODE_BIN="$(command -v node || true)"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

if [ "${EUID}" -ne 0 ]; then
  fail "Please run as root: sudo bash install.sh"
fi

if [ -z "$NODE_BIN" ]; then
  fail "Node.js not found. Install Node.js 20.9 or newer first."
fi

node -e '
const v = process.versions.node.split(".").map(Number);
if (v[0] < 20 || (v[0] === 20 && v[1] < 9)) process.exit(1);
' || fail "Node.js is too old. Current: $($NODE_BIN -v), required: >= 20.9."

if ! command -v systemctl >/dev/null 2>&1; then
  fail "systemctl not found. This installer targets systemd VPS hosts."
fi

if ! id -u "$APP_USER" >/dev/null 2>&1; then
  useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin "$APP_USER"
fi

mkdir -p "$APP_DIR"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
cp -a "$SRC_DIR/." "$TMP_DIR/"

if [ -d "$APP_DIR/content" ]; then
  rm -rf "$TMP_DIR/content"
fi

cp -a "$TMP_DIR/." "$APP_DIR/"

if [ ! -f "$APP_DIR/.env.local" ]; then
  echo "Create admin account"
  read -r -p "Admin username [admin]: " ADMIN_USERNAME
  ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
  read -r -s -p "Admin password: " ADMIN_PASSWORD
  echo
  [ -n "$ADMIN_PASSWORD" ] || fail "Admin password cannot be empty"

  (
    cd "$APP_DIR"
    ADMIN_USERNAME="$ADMIN_USERNAME" ADMIN_PASSWORD="$ADMIN_PASSWORD" "$NODE_BIN" <<'NODE' > ".env.local"
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const username = process.env.ADMIN_USERNAME || "admin";
const password = process.env.ADMIN_PASSWORD;
if (!password) process.exit(1);
const hash = bcrypt.hashSync(password, 12);
const secret = crypto.randomBytes(32).toString("hex");
console.log(`ADMIN_USERNAME=${username}`);
console.log(`ADMIN_PASSWORD_HASH=${hash}`);
console.log(`JWT_SECRET=${secret}`);
NODE
  )
else
  echo "Keeping existing $APP_DIR/.env.local"
fi

cat > "/etc/systemd/system/${SERVICE_NAME}.service" <<SERVICE
[Unit]
Description=Personal Blog Next.js service
After=network.target

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}
Environment=NODE_ENV=production
Environment=PORT=${PORT}
Environment=HOSTNAME=0.0.0.0
EnvironmentFile=${APP_DIR}/.env.local
ExecStart=${NODE_BIN} ${APP_DIR}/server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

chown -R "$APP_USER:$APP_USER" "$APP_DIR"
chmod 600 "$APP_DIR/.env.local"

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl restart "$SERVICE_NAME"

echo
echo "Install complete"
echo "Service: $SERVICE_NAME"
echo "App directory: $APP_DIR"
echo "Local URL: http://127.0.0.1:${PORT}"
echo "Status: systemctl status $SERVICE_NAME"
echo "Logs: journalctl -u $SERVICE_NAME -f"
echo "Admin login path: /login"
INSTALL

chmod +x "$PKG_ROOT/install.sh"

if find "$PKG_ROOT" -name ".env.local" -print -quit | grep -q .; then
  echo "Refusing to package .env.local" >&2
  exit 1
fi

(
  cd "$DIST_DIR"
  tar -czf "$ARCHIVE" "$PKG_NAME"
)

echo "$ARCHIVE"
