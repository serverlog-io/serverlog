#!/usr/bin/env bash
set -euo pipefail

# ─── Serverlog Installer ─────────────────────────────────────────────
# Usage: curl -fsSL https://raw.githubusercontent.com/serverlog-io/serverlog/main/scripts/install.sh | bash
# ──────────────────────────────────────────────────────────────────────

SERVERLOG_VERSION="${SERVERLOG_VERSION:-latest}"
INSTALL_DIR="${INSTALL_DIR:-$HOME/serverlog}"
REPO_URL="${REPO_URL:-https://github.com/serverlog-io/serverlog}"

# ─── Colors ───────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()   { echo -e "${BLUE}[serverlog]${NC} $1"; }
ok()    { echo -e "${GREEN}[serverlog]${NC} $1"; }
warn()  { echo -e "${YELLOW}[serverlog]${NC} $1"; }
error() { echo -e "${RED}[serverlog]${NC} $1" >&2; }

# ─── Banner ───────────────────────────────────────────────────────────
echo ""
echo -e "${BLUE}"
echo "  ╔═══════════════════════════════════════╗"
echo "  ║         Serverlog Installer           ║"
echo "  ║   Real-time event tracking platform   ║"
echo "  ╚═══════════════════════════════════════╝"
echo -e "${NC}"

# ─── Helpers ─────────────────────────────────────────────────────────
SUDO=""
if [ "$(id -u)" -ne 0 ]; then
    if command -v sudo &>/dev/null; then
        SUDO="sudo"
    else
        error "Run as root, or install sudo first."
        exit 1
    fi
fi

confirm() {
    # confirm "Message" [default Y|n]
    local msg="$1" default="${2:-Y}" yn
    read -rp "$(echo -e "${BLUE}[serverlog]${NC}") $msg [$default]: " yn </dev/tty
    yn="${yn:-$default}"
    [[ "$yn" =~ ^[Yy]$ ]]
}

install_docker() {
    log "Installing Docker via get.docker.com (this can take 1-2 min)..."
    if ! curl -fsSL https://get.docker.com | $SUDO sh; then
        error "Docker install failed. See output above."
        exit 1
    fi
    # Start + enable the daemon
    if command -v systemctl &>/dev/null; then
        $SUDO systemctl enable --now docker 2>/dev/null || $SUDO service docker start 2>/dev/null || true
    elif command -v service &>/dev/null; then
        $SUDO service docker start 2>/dev/null || true
    fi
    # Add non-root user to docker group
    if [ -n "$SUDO" ] && [ -n "${USER:-}" ]; then
        $SUDO usermod -aG docker "$USER" 2>/dev/null || true
        warn "Added $USER to the docker group — a new shell may be needed if you re-run as non-root."
    fi
}

detect_public_ip() {
    local ip
    for url in https://api.ipify.org https://ifconfig.me https://icanhazip.com; do
        ip=$(curl -fsSL --max-time 5 "$url" 2>/dev/null | tr -d '[:space:]')
        if [[ "$ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            echo "$ip"
            return 0
        fi
    done
    echo ""
}

install_git() {
    log "Installing git..."
    if command -v apt-get &>/dev/null; then
        $SUDO apt-get update -qq && $SUDO apt-get install -y git
    elif command -v dnf &>/dev/null; then
        $SUDO dnf install -y git
    elif command -v yum &>/dev/null; then
        $SUDO yum install -y git
    elif command -v apk &>/dev/null; then
        $SUDO apk add --no-cache git
    elif command -v pacman &>/dev/null; then
        $SUDO pacman -Sy --noconfirm git
    else
        error "Could not install git automatically. Install manually and re-run."
        exit 1
    fi
}

# ─── Check prerequisites ─────────────────────────────────────────────
log "Checking prerequisites..."

if ! command -v git &>/dev/null; then
    warn "git is not installed."
    if confirm "Install git now?"; then
        install_git
    else
        error "git is required. Aborting."
        exit 1
    fi
fi

if ! command -v docker &>/dev/null; then
    warn "Docker is not installed."
    if confirm "Install Docker automatically?"; then
        install_docker
    else
        error "Docker is required. See https://docs.docker.com/engine/install/"
        exit 1
    fi
fi

# Check Docker daemon is running (might need start after fresh install)
if ! $SUDO docker info &>/dev/null; then
    log "Starting Docker daemon..."
    if command -v systemctl &>/dev/null; then
        $SUDO systemctl start docker 2>/dev/null || true
    elif command -v service &>/dev/null; then
        $SUDO service docker start 2>/dev/null || true
    fi
    sleep 2
    if ! $SUDO docker info &>/dev/null; then
        error "Docker daemon is not running and could not be started. Start it manually and re-run."
        exit 1
    fi
fi

# Check docker compose
if $SUDO docker compose version &>/dev/null; then
    DOCKER_COMPOSE="$SUDO docker compose"
elif command -v docker-compose &>/dev/null; then
    DOCKER_COMPOSE="$SUDO docker-compose"
else
    error "Docker Compose is not available even after Docker install."
    echo "  Install: https://docs.docker.com/compose/install/"
    exit 1
fi
# When running as root, drop the leading SUDO from the variable (it's empty anyway)
DOCKER_COMPOSE="${DOCKER_COMPOSE# }"

ok "Prerequisites OK (Docker + Git)"

# ─── Get user input ──────────────────────────────────────────────────
echo ""
read -rp "$(echo -e "${BLUE}[serverlog]${NC}") Domain (leave empty for localhost): " USER_DOMAIN </dev/tty
DOMAIN="${USER_DOMAIN:-localhost}"

USE_CLOUDFLARE=false
if [ "$DOMAIN" != "localhost" ]; then
    echo ""
    log "How should TLS/HTTPS be handled?"
    echo "  1) Let's Encrypt (Caddy gets a certificate automatically)"
    echo "  2) Cloudflare Proxy (Cloudflare handles TLS, orange cloud)"
    read -rp "$(echo -e "${BLUE}[serverlog]${NC}") Choose [1]: " TLS_CHOICE </dev/tty
    if [ "${TLS_CHOICE:-1}" = "2" ]; then
        USE_CLOUDFLARE=true
    fi

    # ─── DNS configuration walkthrough ───────────────────────────────
    PUBLIC_IP=$(detect_public_ip)
    IP_LINE="${PUBLIC_IP:-<your VPS public IP>}"

    echo ""
    log "DNS configuration required before continuing:"
    echo ""
    echo "  In your DNS provider, create an A record:"
    echo "    Type   A"
    echo "    Name   $DOMAIN"
    echo "    Value  $IP_LINE"
    echo "    TTL    Auto (or 300)"
    echo ""

    if [ "$USE_CLOUDFLARE" = true ]; then
        echo "  Cloudflare-specific settings:"
        echo "    • DNS → set Proxy status to Proxied (orange cloud)"
        echo "    • SSL/TLS → Overview → set encryption mode to ${YELLOW}Flexible${NC}"
        echo "      (Caddy serves plain HTTP; Cloudflare terminates TLS. Other modes return 521.)"
    else
        echo "  Cloudflare users: keep the DNS record gray-cloud (DNS only) — Let's Encrypt"
        echo "  needs direct access to validate the domain."
    fi

    echo ""
    echo "  Verify it propagated:"
    echo "    dig +short $DOMAIN"
    echo ""

    read -rp "$(echo -e "${BLUE}[serverlog]${NC}") Press Enter once DNS is configured (or Ctrl+C to abort)... " _ </dev/tty
fi

read -erp "$(echo -e "${BLUE}[serverlog]${NC}") Install directory [$INSTALL_DIR]: " USER_DIR </dev/tty
INSTALL_DIR="$(cd "$(dirname "${USER_DIR:-$INSTALL_DIR}")" 2>/dev/null && pwd)/$(basename "${USER_DIR:-$INSTALL_DIR}")"

# ─── Admin user onboarding ───────────────────────────────────────────
echo ""
log "Set up your admin account."

while :; do
    read -rp "$(echo -e "${BLUE}[serverlog]${NC}") Admin email: " ADMIN_EMAIL </dev/tty
    if [[ "$ADMIN_EMAIL" =~ ^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$ ]]; then
        break
    fi
    warn "Invalid email — try again."
done

while :; do
    read -rsp "$(echo -e "${BLUE}[serverlog]${NC}") Admin password (min 8 chars): " ADMIN_PASSWORD </dev/tty
    echo ""
    if [ ${#ADMIN_PASSWORD} -lt 8 ]; then
        warn "Password must be at least 8 characters."
        continue
    fi
    read -rsp "$(echo -e "${BLUE}[serverlog]${NC}") Confirm password: " ADMIN_PASSWORD_CONFIRM </dev/tty
    echo ""
    if [ "$ADMIN_PASSWORD" = "$ADMIN_PASSWORD_CONFIRM" ]; then
        unset ADMIN_PASSWORD_CONFIRM
        break
    fi
    warn "Passwords don't match — try again."
done

# ─── Clone or update repository ──────────────────────────────────────
if [ -d "$INSTALL_DIR" ]; then
    log "Directory $INSTALL_DIR already exists."
    read -rp "$(echo -e "${YELLOW}[serverlog]${NC}") Overwrite? (y/N): " OVERWRITE </dev/tty
    if [[ "$OVERWRITE" =~ ^[Yy]$ ]]; then
        log "Stopping existing services..."
        cd "$INSTALL_DIR" && $DOCKER_COMPOSE -f docker-compose.prod.yml down -v 2>/dev/null || true
        cd /
        rm -rf "$INSTALL_DIR"
    else
        error "Installation cancelled."
        exit 1
    fi
fi

log "Cloning Serverlog ($SERVERLOG_VERSION)..."
if [ "$SERVERLOG_VERSION" = "latest" ]; then
    git clone --depth 1 "$REPO_URL" "$INSTALL_DIR" 2>&1 | tail -1
else
    git clone --depth 1 --branch "$SERVERLOG_VERSION" "$REPO_URL" "$INSTALL_DIR" 2>&1 | tail -1
fi

cd "$INSTALL_DIR"

# ─── Generate secrets ────────────────────────────────────────────────
generate_secret() {
    LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 44 2>/dev/null || openssl rand -hex 22
}

log "Generating secure configuration..."

JWT_SECRET=$(generate_secret)
POSTGRES_PASSWORD=$(generate_secret)

# ─── Write .env ───────────────────────────────────────────────────────
if [ "$DOMAIN" = "localhost" ]; then
    CADDY_DOMAIN="http://localhost"
    FRONTEND_URL="http://localhost"
    API_URL="http://localhost"
else
    CADDY_DOMAIN="$DOMAIN"
    FRONTEND_URL="https://$DOMAIN"
    API_URL="https://$DOMAIN"
fi

cat > .env <<EOF
# Generated by Serverlog installer on $(date -u +"%Y-%m-%d %H:%M:%S UTC")
# Do not commit this file.

DOMAIN=$CADDY_DOMAIN
JWT_SECRET=$JWT_SECRET

POSTGRES_USER=serverlog
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_DB=serverlog

BACKEND_PORT=3010
FRONTEND_PORT=3011

HTTP_PORT=80
HTTPS_PORT=443

FRONTEND_URL=$FRONTEND_URL
NEXT_PUBLIC_API_URL=$API_URL
EOF

ok "Configuration written to .env"

# ─── Select Caddyfile (env-driven, doesn't modify tracked files) ─────
if [ "$USE_CLOUDFLARE" = true ]; then
    echo "CADDYFILE=Caddyfile.cloudflare" >> .env
    log "Using Cloudflare proxy Caddyfile (TLS off)"
fi

# ─── Start services ──────────────────────────────────────────────────
log "Starting Serverlog (this may take a few minutes on first run)..."
echo ""

$DOCKER_COMPOSE -f docker-compose.prod.yml up -d --build 2>&1

# ─── Wait for health ─────────────────────────────────────────────────
log "Waiting for services to be ready..."

MAX_WAIT=120
ELAPSED=0
while [ $ELAPSED -lt $MAX_WAIT ]; do
    if $SUDO docker exec serverlog-backend wget --no-verbose --tries=1 --spider http://localhost:3010/health &> /dev/null; then
        break
    fi
    sleep 3
    ELAPSED=$((ELAPSED + 3))
    printf "."
done
echo ""

if [ $ELAPSED -ge $MAX_WAIT ]; then
    warn "Services are still starting. Check logs with:"
    echo "  cd $INSTALL_DIR && $DOCKER_COMPOSE -f docker-compose.prod.yml logs -f"
    exit 1
fi

# ─── Create admin user ───────────────────────────────────────────────
log "Creating admin user..."
SETUP_OUTPUT=$($SUDO docker exec \
    -e ADMIN_EMAIL="$ADMIN_EMAIL" \
    -e ADMIN_PASSWORD="$ADMIN_PASSWORD" \
    serverlog-backend node scripts/setup.js 2>&1) && SETUP_RC=0 || SETUP_RC=$?
unset ADMIN_PASSWORD

case $SETUP_RC in
    0) ok "Admin user created: $ADMIN_EMAIL" ;;
    2) warn "Setup already completed — keeping the existing admin user" ;;
    *)
        warn "Admin user creation failed:"
        echo "  $SETUP_OUTPUT"
        warn "You can create one from the dashboard on first visit."
        ;;
esac

# ─── Install CLI globally ────────────────────────────────────────────
CLI_SRC="$INSTALL_DIR/cli/serverlog"
CLI_DEST="/usr/local/bin/serverlog"
CLI_CONF="/etc/serverlog.conf"
CLI_INSTALLED=false

install_cli_root() {
    cp "$CLI_SRC" "$CLI_DEST" && chmod 0755 "$CLI_DEST"
    printf 'SERVERLOG_HOME="%s"\n' "$INSTALL_DIR" > "$CLI_CONF"
    chmod 0644 "$CLI_CONF"
}

install_cli_sudo() {
    sudo cp "$CLI_SRC" "$CLI_DEST" && sudo chmod 0755 "$CLI_DEST"
    printf 'SERVERLOG_HOME="%s"\n' "$INSTALL_DIR" | sudo tee "$CLI_CONF" >/dev/null
    sudo chmod 0644 "$CLI_CONF"
}

install_cli_user() {
    mkdir -p "$HOME/.local/bin" "$HOME/.config/serverlog"
    cp "$CLI_SRC" "$HOME/.local/bin/serverlog" && chmod 0755 "$HOME/.local/bin/serverlog"
    printf 'SERVERLOG_HOME="%s"\n' "$INSTALL_DIR" > "$HOME/.config/serverlog/config"
}

if [ -f "$CLI_SRC" ]; then
    log "Installing serverlog CLI..."
    if [ "$(id -u)" -eq 0 ]; then
        install_cli_root && CLI_INSTALLED=true
    elif command -v sudo &>/dev/null && sudo -n true 2>/dev/null; then
        install_cli_sudo && CLI_INSTALLED=true
    elif command -v sudo &>/dev/null; then
        warn "Installing the CLI to $CLI_DEST needs sudo. You may be prompted."
        if install_cli_sudo; then
            CLI_INSTALLED=true
        else
            install_cli_user && CLI_INSTALLED=user
        fi
    else
        install_cli_user && CLI_INSTALLED=user
    fi

    case "$CLI_INSTALLED" in
        true) ok "CLI installed at $CLI_DEST (config: $CLI_CONF)" ;;
        user) ok "CLI installed at \$HOME/.local/bin/serverlog (no sudo)" ;;
        *)    warn "CLI install failed — manage manually from $INSTALL_DIR" ;;
    esac
else
    warn "cli/serverlog not found in $INSTALL_DIR — skipping CLI install"
fi

# ─── Done ─────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}"
echo "  ╔═══════════════════════════════════════╗"
echo "  ║      Serverlog is running! :)         ║"
echo "  ╚═══════════════════════════════════════╝"
echo -e "${NC}"

if [ "$DOMAIN" = "localhost" ]; then
    ok "Open http://localhost to get started"
else
    ok "Open https://$DOMAIN to get started"
fi

echo ""
if [ "$CLI_INSTALLED" = "true" ]; then
    log "Manage your install with the serverlog CLI:"
    echo "  serverlog status        # Show running containers"
    echo "  serverlog logs          # Tail logs"
    echo "  serverlog logs backend  # Tail one service"
    echo "  serverlog update        # Pull latest and rebuild"
    echo "  serverlog stop          # Stop everything"
    echo "  serverlog help          # All commands"
elif [ "$CLI_INSTALLED" = "user" ]; then
    log "CLI installed to ~/.local/bin/serverlog. Make sure it's on your PATH, then:"
    echo "  serverlog status"
    echo "  serverlog logs backend"
    echo "  serverlog update"
    echo ""
    warn "If 'serverlog' isn't found, add this to your shell profile:"
    echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
else
    log "Useful commands:"
    echo "  cd $INSTALL_DIR"
    echo "  $DOCKER_COMPOSE -f docker-compose.prod.yml logs -f      # View logs"
    echo "  $DOCKER_COMPOSE -f docker-compose.prod.yml down          # Stop"
    echo "  $DOCKER_COMPOSE -f docker-compose.prod.yml up -d         # Start"
fi
echo ""
