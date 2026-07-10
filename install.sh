#!/usr/bin/env bash
set -euo pipefail

REPO_OWNER="${REPO_OWNER:-jing6616011111}"
REPO_NAME="${REPO_NAME:-boke}"
BRANCH="${BRANCH:-main}"
SERVICE_NAME="${SERVICE_NAME:-personal-blog}"
APP_DIR="${APP_DIR:-/opt/personal-blog}"
APP_USER="${APP_USER:-personal-blog}"
PORT="${PORT:-3000}"
HOSTNAME_VALUE="${HOSTNAME_VALUE:-0.0.0.0}"
SOURCE_URL="${SOURCE_URL:-https://github.com/${REPO_OWNER}/${REPO_NAME}/archive/refs/heads/${BRANCH}.tar.gz}"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

info() {
  echo "==> $*"
}

need_root() {
  if [ "${EUID}" -ne 0 ]; then
    fail "Please run as root. If sudo exists: curl -fsSL https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/install.sh | sudo bash. If already root: curl -fsSL https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/install.sh | bash"
  fi
}

node_ok() {
  command -v node >/dev/null 2>&1 || return 1
  node -e '
const v = process.versions.node.split(".").map(Number);
process.exit(v[0] > 20 || (v[0] === 20 && v[1] >= 9) ? 0 : 1);
' >/dev/null 2>&1
}

install_node_if_needed() {
  if node_ok; then
    return
  fi

  if ! command -v apt-get >/dev/null 2>&1; then
    fail "Node.js >= 20.9 is required. Automatic Node install currently supports Debian/Ubuntu with apt-get."
  fi

  info "Installing Node.js 22.x"
  apt-get update
  apt-get install -y ca-certificates curl gnupg
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs

  node_ok || fail "Node.js install failed or version is still too old."
}

read_secret_from_tty() {
  local prompt="$1"
  local value=""
  if [ -r /dev/tty ]; then
    read -r -s -p "$prompt" value < /dev/tty
    echo > /dev/tty
  fi
  printf '%s' "$value"
}

read_value_from_tty() {
  local prompt="$1"
  local default="$2"
  local value=""
  if [ -r /dev/tty ]; then
    read -r -p "$prompt" value < /dev/tty
  fi
  printf '%s' "${value:-$default}"
}

create_env_file() {
  if [ -f "$APP_DIR/.env.local" ]; then
    info "Keeping existing $APP_DIR/.env.local"
    return
  fi

  local username="${ADMIN_USERNAME:-}"
  local password="${ADMIN_PASSWORD:-}"

  if [ -z "$username" ]; then
    username="$(read_value_from_tty "Admin username [admin]: " "admin")"
  fi

  if [ -z "$password" ]; then
    password="$(read_secret_from_tty "Admin password: ")"
  fi

  [ -n "$password" ] || fail "Admin password is required. Set ADMIN_PASSWORD=... for non-interactive installs."

  (
    cd "$APP_DIR"
    ADMIN_USERNAME="$username" ADMIN_PASSWORD="$password" node <<'NODE' > ".env.local"
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const username = process.env.ADMIN_USERNAME || "admin";
const password = process.env.ADMIN_PASSWORD;
if (!password) process.exit(1);
console.log(`ADMIN_USERNAME=${username}`);
console.log(`ADMIN_PASSWORD_HASH=${bcrypt.hashSync(password, 12)}`);
console.log(`JWT_SECRET=${crypto.randomBytes(32).toString("hex")}`);
NODE
  )
}

install_systemd_service() {
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
Environment=HOSTNAME=${HOSTNAME_VALUE}
EnvironmentFile=${APP_DIR}/.env.local
ExecStart=$(command -v node) ${APP_DIR}/server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

  systemctl daemon-reload
  systemctl enable "$SERVICE_NAME"
  systemctl restart "$SERVICE_NAME"
}

main() {
  need_root

  if ! command -v curl >/dev/null 2>&1; then
    if command -v apt-get >/dev/null 2>&1; then
      apt-get update
      apt-get install -y curl ca-certificates
    else
      fail "curl is required."
    fi
  fi

  install_node_if_needed
  command -v npm >/dev/null 2>&1 || fail "npm is required."
  command -v systemctl >/dev/null 2>&1 || fail "systemctl is required."

  local tmp_dir backup_dir src_dir stage_dir
  tmp_dir="$(mktemp -d)"
  backup_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir" "$backup_dir"' EXIT

  info "Downloading ${SOURCE_URL}"
  curl -fsSL "$SOURCE_URL" -o "$tmp_dir/source.tar.gz"
  tar -xzf "$tmp_dir/source.tar.gz" -C "$tmp_dir"
  src_dir="$(find "$tmp_dir" -maxdepth 1 -type d -name "${REPO_NAME}-*" | head -n 1)"
  [ -n "$src_dir" ] || fail "Unable to locate extracted source directory."

  info "Installing dependencies and building"
  (
    cd "$src_dir"
    npm ci
    npm run build
  )

  if ! id -u "$APP_USER" >/dev/null 2>&1; then
    useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin "$APP_USER"
  fi

  systemctl stop "$SERVICE_NAME" >/dev/null 2>&1 || true

  if [ -d "$APP_DIR/content" ]; then
    cp -a "$APP_DIR/content" "$backup_dir/content"
  fi
  if [ -f "$APP_DIR/.env.local" ]; then
    cp -a "$APP_DIR/.env.local" "$backup_dir/.env.local"
  fi

  stage_dir="$tmp_dir/stage"
  mkdir -p "$stage_dir"
  cp -a "$src_dir/.next/standalone/." "$stage_dir/"
  mkdir -p "$stage_dir/.next"
  cp -a "$src_dir/.next/static" "$stage_dir/.next/static"
  cp -a "$src_dir/public" "$stage_dir/public"
  cp -a "$src_dir/content" "$stage_dir/content"
  mkdir -p "$stage_dir/node_modules"
  rm -rf "$stage_dir/node_modules/bcryptjs"
  cp -a "$src_dir/node_modules/bcryptjs" "$stage_dir/node_modules/bcryptjs"

  rm -rf "$APP_DIR"
  mkdir -p "$APP_DIR"
  cp -a "$stage_dir/." "$APP_DIR/"

  if [ -d "$backup_dir/content" ]; then
    rm -rf "$APP_DIR/content"
    cp -a "$backup_dir/content" "$APP_DIR/content"
  fi
  if [ -f "$backup_dir/.env.local" ]; then
    cp -a "$backup_dir/.env.local" "$APP_DIR/.env.local"
  fi

  create_env_file

  chown -R "$APP_USER:$APP_USER" "$APP_DIR"
  chmod 600 "$APP_DIR/.env.local"

  install_systemd_service

  echo
  echo "Install complete"
  echo "Repository: https://github.com/${REPO_OWNER}/${REPO_NAME}"
  echo "Service: $SERVICE_NAME"
  echo "App directory: $APP_DIR"
  echo "Local URL: http://127.0.0.1:${PORT}"
  echo "Admin login path: /login"
  echo "Status: systemctl status $SERVICE_NAME"
  echo "Logs: journalctl -u $SERVICE_NAME -f"
}

main "$@"
