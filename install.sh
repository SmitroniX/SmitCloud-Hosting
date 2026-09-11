#!/usr/bin/env bash
# ==============================================================================
# Pterodactyl Panel & Wings All-in-One Installer
# Official Open-Source Components: github.com/pterodactyl/panel & wings
# Supports: Ubuntu 20.04/22.04/24.04 (Noble), Debian 11/12 (amd64 & arm64)
# ==============================================================================

set -o pipefail

SCRIPT_VERSION="1.2.0"

# Color Codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Default values
UNATTENDED=false
INSTALL_PANEL=false
INSTALL_WINGS=false
CONFIGURE_WINGS=false
UPDATE_MODE=false
UNINSTALL_MODE=false

DOMAIN=""
SSL_MODE="letsencrypt" # letsencrypt, selfsigned, http
ADMIN_EMAIL=""
ADMIN_USER=""
ADMIN_PASS=""
ADMIN_FIRST="Admin"
ADMIN_LAST="User"
PANEL_URL=""
TIMEZONE="UTC"

DB_HOST="127.0.0.1"
DB_PORT="3306"
DB_NAME="panel"
DB_USER="pterodactyl"
DB_PASS=""

# Logging functions
log_info()    { echo -e "${CYAN}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }
log_step()    { echo -e "\n${BOLD}${PURPLE}==> $1${NC}"; }

print_banner() {
    clear 2>/dev/null || true
    echo -e "${CYAN}${BOLD}"
    cat << "EOF"
  ____  _                      _             _   _ 
 |  _ \| |_ ___ _ __ ___   __| | __ _  ___| |_| |_   _ 
 | |_) | __/ _ \ '__/ _ \ / _` |/ _` |/ __| __| | | | |
 |  __/| ||  __/ | | (_) | (_| | (_| | (__| |_| |_| |_|
 |_|    \__\___|_|  \___/ \__,_|\__,_|\___|\__|_|\__, |
                                                 |___/ 
         SmitCloud Hosting - Panel & Wings Installer v1.2.0
EOF
    echo -e "${NC}"
    echo -e "${WHITE}  Official Open-Source Engine: ${CYAN}pterodactyl.io${NC}"
    echo -e "${WHITE}  System Arch: ${GREEN}$(uname -m)${NC} | OS: ${GREEN}$(lsb_release -ds 2>/dev/null || cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2 | tr -d '\"')${NC}"
    echo -e "${CYAN}======================================================${NC}\n"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This installer must be run as root or with sudo privileges!"
        echo -e "Please execute: ${BOLD}sudo bash $0${NC}\n"
        exit 1
    fi
}

detect_system() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$ID
        OS_VER=$VERSION_ID
        OS_CODENAME=$VERSION_CODENAME
    else
        log_error "Unsupported operating system: /etc/os-release not found."
        exit 1
    fi

    ARCH=$(uname -m)
    case "$ARCH" in
        x86_64)
            WINGS_ARCH="amd64"
            ;;
        aarch64|arm64)
            WINGS_ARCH="arm64"
            ;;
        *)
            log_error "Unsupported CPU architecture: $ARCH. Only x86_64 and aarch64 are supported."
            exit 1
            ;;
    esac

    case "$OS" in
        ubuntu)
            if [[ "$OS_VER" != "20.04" && "$OS_VER" != "22.04" && "$OS_VER" != "24.04" ]]; then
                log_warn "Detected Ubuntu $OS_VER. Recommended: 20.04, 22.04, or 24.04."
            fi
            ;;
        debian)
            if [[ "$OS_VER" != "11" && "$OS_VER" != "12" ]]; then
                log_warn "Detected Debian $OS_VER. Recommended: 11 (Bullseye) or 12 (Bookworm)."
            fi
            ;;
        *)
            log_error "Unsupported Linux distribution: $OS. This script supports Ubuntu and Debian."
            exit 1
            ;;
    esac
}

generate_random_password() {
    tr -dc 'A-Za-z0-9!#%*+=' < /dev/urandom | head -c 24
}

install_base_dependencies() {
    log_step "Installing Base System Packages & Repositories..."
    apt-get update -y
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
        curl wget tar unzip git jq ufw software-properties-common \
        apt-transport-https ca-certificates gnupg lsb-release \
        mariadb-server redis-server nginx
    
    systemctl enable --now mariadb || systemctl enable --now mysql
    systemctl enable --now redis-server || systemctl enable --now redis
    log_success "Base packages, MariaDB, and Redis installed and started."
}

install_php() {
    log_step "Configuring PHP Environment..."
    local need_php_repo=false

    if ! command -v php &>/dev/null; then
        need_php_repo=true
    else
        PHP_CURR_VER=$(php -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;')
        if [[ $(echo "$PHP_CURR_VER < 8.2" | bc -l 2>/dev/null || awk -v v="$PHP_CURR_VER" 'BEGIN{print (v<8.2)?1:0}') -eq 1 ]]; then
            need_php_repo=true
        fi
    fi

    if [[ "$need_php_repo" == "true" ]]; then
        if [[ "$OS" == "ubuntu" ]]; then
            LC_ALL=C.UTF-8 add-apt-repository -y ppa:ondrej/php
            apt-get update -y
        elif [[ "$OS" == "debian" ]]; then
            mkdir -p /usr/share/keyrings
            curl -sSLo /usr/share/keyrings/deb.sury.org-php.gpg https://packages.sury.org/php/apt.gpg
            echo "deb [signed-by=/usr/share/keyrings/deb.sury.org-php.gpg] https://packages.sury.org/php/ $(lsb_release -sc) main" > /etc/apt/sources.list.d/php.list
            apt-get update -y
        fi
    fi

    # Detect best PHP version (prefer 8.3, fallback to 8.2)
    PHP_TARGET="8.3"
    if ! apt-cache show php8.3-cli &>/dev/null; then
        PHP_TARGET="8.2"
    fi

    log_info "Installing PHP $PHP_TARGET and extensions..."
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
        php${PHP_TARGET} php${PHP_TARGET}-cli php${PHP_TARGET}-gd php${PHP_TARGET}-mysql \
        php${PHP_TARGET}-pdo php${PHP_TARGET}-mbstring php${PHP_TARGET}-tokenizer \
        php${PHP_TARGET}-bcmath php${PHP_TARGET}-xml php${PHP_TARGET}-fpm \
        php${PHP_TARGET}-curl php${PHP_TARGET}-zip php${PHP_TARGET}-redis

    systemctl enable --now php${PHP_TARGET}-fpm
    log_success "PHP $PHP_TARGET and extensions configured."

    # Install Composer
    if ! command -v composer &>/dev/null; then
        log_info "Installing Composer..."
        curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
        log_success "Composer installed."
    fi
}

setup_database() {
    log_step "Configuring MariaDB Database & User..."
    if [[ -z "$DB_PASS" ]]; then
        DB_PASS=$(generate_random_password)
    fi

    mariadb -u root <<EOF
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;
CREATE USER IF NOT EXISTS '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${DB_PASS}';
ALTER USER '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'127.0.0.1' WITH GRANT OPTION;
FLUSH PRIVILEGES;
EOF
    log_success "Database '${DB_NAME}' and user '${DB_USER}' ready."
}

install_panel() {
    log_step "Installing Pterodactyl Panel..."

    if [[ -d "/var/www/pterodactyl" && -f "/var/www/pterodactyl/artisan" ]]; then
        log_warn "Existing Pterodactyl Panel detected at /var/www/pterodactyl!"
        if [[ "$UNATTENDED" != "true" ]]; then
            read -r -p "Do you want to create a backup and proceed with fresh install? [y/N]: " confirm_ovw
            if [[ ! "$confirm_ovw" =~ ^[Yy]$ ]]; then
                log_info "Skipping Panel download, keeping existing installation."
                return 0
            fi
        fi
        BACKUP_DIR="/var/www/pterodactyl_backup_$(date +%Y%m%d_%H%M%S)"
        log_info "Backing up existing panel to $BACKUP_DIR..."
        mv /var/www/pterodactyl "$BACKUP_DIR"
    fi

    mkdir -p /var/www/pterodactyl
    cd /var/www/pterodactyl || exit 1

    log_info "Downloading latest open-source Pterodactyl Panel release..."
    curl -Lo panel.tar.gz https://github.com/pterodactyl/panel/releases/latest/download/panel.tar.gz
    tar -xzf panel.tar.gz
    rm -f panel.tar.gz
    chmod -R 755 storage/* bootstrap/cache/

    cp .env.example .env

    log_info "Installing Composer production dependencies (this may take 1-2 minutes)..."
    COMPOSER_ALLOW_SUPERUSER=1 composer install --no-dev --optimize-autoloader -n -q

    log_info "Generating Application Encryption Key..."
    php artisan key:generate --force

    log_info "Configuring Panel Environment..."
    php artisan p:environment:setup \
        --author="${ADMIN_EMAIL}" \
        --url="${PANEL_URL}" \
        --timezone="${TIMEZONE}" \
        --cache="redis" \
        --session="redis" \
        --queue="redis" \
        --redis-host="127.0.0.1" \
        --redis-pass="" \
        --redis-port="6379" \
        --settings-ui=yes \
        --telemetry=true \
        --no-interaction

    php artisan p:environment:database \
        --host="${DB_HOST}" \
        --port="${DB_PORT}" \
        --database="${DB_NAME}" \
        --username="${DB_USER}" \
        --password="${DB_PASS}" \
        --no-interaction

    log_info "Running Database Migrations & Seeds..."
    php artisan migrate --seed --force

    log_info "Creating Master Administrator Account..."
    php artisan p:user:make \
        --email="${ADMIN_EMAIL}" \
        --username="${ADMIN_USER}" \
        --name-first="${ADMIN_FIRST}" \
        --name-last="${ADMIN_LAST}" \
        --password="${ADMIN_PASS}" \
        --admin=1 \
        --no-interaction

    # Fix ownership
    chown -R www-data:www-data /var/www/pterodactyl/*

    # Cron Job
    log_info "Configuring Scheduled Tasks Cronjob..."
    cat > /etc/cron.d/pterodactyl << 'EOF'
* * * * * www-data /usr/bin/php /var/www/pterodactyl/artisan schedule:run >> /dev/null 2>&1
EOF
    chmod 0644 /etc/cron.d/pterodactyl

    # Queue Worker Service
    log_info "Configuring Pterodactyl Queue Worker (pteroq.service)..."
    cat > /etc/systemd/system/pteroq.service << EOF
[Unit]
Description=Pterodactyl Queue Worker
After=redis-server.service

[Service]
User=www-data
Group=www-data
Restart=always
ExecStart=/usr/bin/php /var/www/pterodactyl/artisan queue:work --queue=high,standard,low --sleep=3 --tries=3
StartLimitInterval=180
StartLimitBurst=30
RestartSec=5s

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable --now pteroq.service
    systemctl restart pteroq.service
    log_success "Pterodactyl Panel installed and Queue Worker active."
}

configure_nginx_and_ssl() {
    log_step "Configuring Nginx Virtual Host & SSL..."

    # Detect php socket
    PHP_SOCK=$(find /run/php/ -name "php*-fpm.sock" 2>/dev/null | head -n 1)
    if [[ -z "$PHP_SOCK" ]]; then
        PHP_SOCK="/run/php/php8.3-fpm.sock"
    fi

    local ssl_configured=false

    if [[ "$SSL_MODE" == "letsencrypt" && -n "$DOMAIN" && "$DOMAIN" != "localhost" ]]; then
        log_info "Obtaining Let's Encrypt SSL certificate for $DOMAIN..."
        DEBIAN_FRONTEND=noninteractive apt-get install -y certbot python3-certbot-nginx
        
        systemctl stop nginx || true
        certbot certonly --standalone -d "$DOMAIN" --non-interactive --agree-tos -m "$ADMIN_EMAIL" --preferred-challenges http || true
        systemctl start nginx || true

        if [[ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
            ssl_configured=true
            log_success "SSL Certificate obtained successfully."
        else
            log_warn "Certbot could not obtain certificate (DNS not pointed or port 80 blocked). Falling back to HTTP / Self-Signed."
        fi
    fi

    if [[ "$ssl_configured" == "true" ]]; then
        cat > /etc/nginx/sites-available/pterodactyl.conf << EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN};

    root /var/www/pterodactyl/public;
    index index.php;

    access_log /var/log/nginx/pterodactyl.app-access.log;
    error_log  /var/log/nginx/pterodactyl.app-error.log error;

    client_max_body_size 100m;
    client_body_timeout 120s;
    sendfile off;

    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384";
    ssl_prefer_server_ciphers on;

    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Robots-Tag none;
    add_header Content-Security-Policy "frame-ancestors 'self'";
    add_header X-Frame-Options DENY;
    add_header Referrer-Policy same-origin;

    location / {
        try_files \$uri \$uri/ /index.php?\$query_string;
    }

    location ~ \.php$ {
        fastcgi_split_path_info ^(.+\.php)(/.+)$;
        fastcgi_pass unix:${PHP_SOCK};
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME \$document_root\$fastcgi_script_name;
        fastcgi_param HTTP_PROXY "";
        fastcgi_intercept_errors off;
        fastcgi_buffer_size 16k;
        fastcgi_buffers 4 16k;
        fastcgi_connect_timeout 300;
        fastcgi_send_timeout 300;
        fastcgi_read_timeout 300;
    }

    location ~ /\.ht {
        deny all;
    }
}
EOF
    else
        # HTTP Configuration (suitable for reverse proxies, Cloudflare flexible/tunnel, or internal IP)
        cat > /etc/nginx/sites-available/pterodactyl.conf << EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN:-_};

    root /var/www/pterodactyl/public;
    index index.php;

    access_log /var/log/nginx/pterodactyl.app-access.log;
    error_log  /var/log/nginx/pterodactyl.app-error.log error;

    client_max_body_size 100m;
    client_body_timeout 120s;
    sendfile off;

    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Robots-Tag none;
    add_header Content-Security-Policy "frame-ancestors 'self'";
    add_header X-Frame-Options DENY;
    add_header Referrer-Policy same-origin;

    location / {
        try_files \$uri \$uri/ /index.php?\$query_string;
    }

    location ~ \.php$ {
        fastcgi_split_path_info ^(.+\.php)(/.+)$;
        fastcgi_pass unix:${PHP_SOCK};
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME \$document_root\$fastcgi_script_name;
        fastcgi_param HTTP_PROXY "";
        fastcgi_intercept_errors off;
        fastcgi_buffer_size 16k;
        fastcgi_buffers 4 16k;
        fastcgi_connect_timeout 300;
        fastcgi_send_timeout 300;
        fastcgi_read_timeout 300;
    }

    location ~ /\.ht {
        deny all;
    }
}
EOF
    fi

    ln -sf /etc/nginx/sites-available/pterodactyl.conf /etc/nginx/sites-enabled/pterodactyl.conf
    rm -f /etc/nginx/sites-enabled/default
    nginx -t && systemctl restart nginx
    log_success "Nginx virtual host configured and reloaded."
}

install_docker() {
    if ! command -v docker &>/dev/null; then
        log_step "Installing Docker CE..."
        curl -sSL https://get.docker.com/ | CHANNEL=stable bash
        systemctl enable --now docker
        log_success "Docker CE installed and started."
    else
        log_info "Docker is already installed."
    fi
}

install_wings() {
    log_step "Installing Pterodactyl Wings Daemon (Arch: ${WINGS_ARCH})..."
    install_docker

    mkdir -p /etc/pterodactyl
    log_info "Downloading official open-source Wings binary for ${WINGS_ARCH}..."
    curl -L -o /usr/local/bin/wings "https://github.com/pterodactyl/wings/releases/latest/download/wings_linux_${WINGS_ARCH}"
    chmod u+x /usr/local/bin/wings

    log_info "Configuring Wings systemd service..."
    cat > /etc/systemd/system/wings.service << 'EOF'
[Unit]
Description=Pterodactyl Wings Daemon
After=docker.service
Requires=docker.service
PartOf=docker.service

[Service]
User=root
WorkingDirectory=/etc/pterodactyl
LimitNOFILE=4096
PIDFile=/var/run/wings/daemon.pid
ExecStart=/usr/local/bin/wings
Restart=on-failure
StartLimitInterval=180
StartLimitBurst=30
RestartSec=5s

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable wings
    log_success "Wings installed at /usr/local/bin/wings and systemd service enabled."

    # Configure Firewall
    if command -v ufw &>/dev/null; then
        log_info "Configuring UFW firewall rules for Wings..."
        ufw allow 80/tcp >/dev/null 2>&1 || true
        ufw allow 443/tcp >/dev/null 2>&1 || true
        ufw allow 8080/tcp comment 'Pterodactyl Wings Daemon' >/dev/null 2>&1 || true
        ufw allow 2022/tcp comment 'Pterodactyl Wings SFTP' >/dev/null 2>&1 || true
        ufw allow 25565:25600/tcp comment 'Game Server Ports' >/dev/null 2>&1 || true
        ufw allow 25565:25600/udp comment 'Game Server Ports' >/dev/null 2>&1 || true
        log_success "Firewall ports 80, 443, 8080, 2022, 25565-25600 opened."
    fi
}

configure_wings_token() {
    log_step "Wings Node Configuration Helper"
    echo -e "${YELLOW}Please visit your Pterodactyl Panel:${NC}"
    echo -e "1. Go to ${BOLD}Admin Area -> Locations${NC} and create a Location (e.g., 'Local')."
    echo -e "2. Go to ${BOLD}Admin Area -> Nodes -> Create New Node${NC}."
    echo -e "   - FQDN: Your server IP or domain (e.g., ${DOMAIN:-$(curl -s https://api.ipify.org 2>/dev/null || echo 'your-server-ip')})"
    echo -e "   - Daemon Port: 8080 | SFTP Port: 2022"
    echo -e "3. Click on the Node -> ${BOLD}Configuration tab${NC}."
    echo -e "4. Copy either the Auto-Deploy token command OR click 'Generate Token'.\n"

    read -r -p "Paste the auto-deploy command (or press Enter to enter token manually): " wings_cmd
    if [[ -n "$wings_cmd" ]]; then
        cd /etc/pterodactyl || exit 1
        eval "$wings_cmd"
        systemctl restart wings
        log_success "Wings configured and restarted!"
    else
        read -r -p "Panel URL (e.g., https://panel.example.com): " w_url
        read -r -p "Node Token (ptla_... or token string): " w_tok
        read -r -p "Node ID (default 1): " w_id
        w_id=${w_id:-1}
        if [[ -n "$w_url" && -n "$w_tok" ]]; then
            cd /etc/pterodactyl || exit 1
            /usr/local/bin/wings configure --panel-url "$w_url" --token "$w_tok" --node "$w_id"
            systemctl restart wings
            log_success "Wings configured with Token and restarted!"
        else
            log_warn "Missing configuration parameters. You can run 'sudo wings configure' later."
        fi
    fi
}

update_all() {
    log_step "Updating Pterodactyl Panel & Wings..."
    if [[ -d "/var/www/pterodactyl" ]]; then
        log_info "Updating Panel to latest release..."
        cd /var/www/pterodactyl || exit 1
        php artisan down
        curl -Lo panel.tar.gz https://github.com/pterodactyl/panel/releases/latest/download/panel.tar.gz
        tar -xzf panel.tar.gz
        rm -f panel.tar.gz
        chmod -R 755 storage/* bootstrap/cache/
        COMPOSER_ALLOW_SUPERUSER=1 composer install --no-dev --optimize-autoloader -n -q
        php artisan view:clear
        php artisan config:clear
        php artisan migrate --seed --force
        chown -R www-data:www-data /var/www/pterodactyl/*
        php artisan queue:restart
        php artisan up
        systemctl restart pteroq.service
        log_success "Panel successfully updated."
    fi

    if [[ -f "/usr/local/bin/wings" ]]; then
        log_info "Updating Wings daemon..."
        systemctl stop wings || true
        curl -L -o /usr/local/bin/wings "https://github.com/pterodactyl/wings/releases/latest/download/wings_linux_${WINGS_ARCH}"
        chmod u+x /usr/local/bin/wings
        systemctl restart wings
        log_success "Wings successfully updated."
    fi
}

uninstall_pterodactyl() {
    log_warn "You are about to uninstall Pterodactyl Panel & Wings!"
    read -r -p "Are you sure you want to completely remove Pterodactyl? [y/N]: " confirm_rm
    if [[ "$confirm_rm" =~ ^[Yy]$ ]]; then
        systemctl stop wings pteroq 2>/dev/null || true
        systemctl disable wings pteroq 2>/dev/null || true
        rm -f /etc/systemd/system/wings.service /etc/systemd/system/pteroq.service
        systemctl daemon-reload
        rm -f /etc/cron.d/pterodactyl
        rm -f /etc/nginx/sites-enabled/pterodactyl.conf /etc/nginx/sites-available/pterodactyl.conf
        systemctl restart nginx 2>/dev/null || true
        rm -rf /var/www/pterodactyl
        rm -rf /etc/pterodactyl
        rm -f /usr/local/bin/wings
        log_success "Pterodactyl Panel and Wings removed."
    fi
}

gather_interactive_inputs() {
    if [[ "$INSTALL_PANEL" == "true" ]]; then
        echo -e "\n${BOLD}${CYAN}--- Panel Configuration ---${NC}"
        
        if [[ -z "$DOMAIN" ]]; then
            PUBLIC_IP=$(curl -s https://api.ipify.org 2>/dev/null || echo "127.0.0.1")
            read -r -p "Enter Domain or FQDN for Panel (e.g., panel.yourdomain.com or $PUBLIC_IP): " DOMAIN
            DOMAIN=${DOMAIN:-$PUBLIC_IP}
        fi

        if [[ -z "$ADMIN_EMAIL" ]]; then
            read -r -p "Enter Admin Email (e.g., admin@example.com): " ADMIN_EMAIL
            ADMIN_EMAIL=${ADMIN_EMAIL:-admin@example.com}
        fi

        if [[ -z "$ADMIN_USER" ]]; then
            read -r -p "Enter Admin Username (default: admin): " ADMIN_USER
            ADMIN_USER=${ADMIN_USER:-admin}
        fi

        if [[ -z "$ADMIN_PASS" ]]; then
            read -s -r -p "Enter Admin Password (leave blank to auto-generate): " ADMIN_PASS
            echo ""
            if [[ -z "$ADMIN_PASS" ]]; then
                ADMIN_PASS=$(generate_random_password)
                echo -e "Auto-generated admin password: ${GREEN}${ADMIN_PASS}${NC}"
            fi
        fi

        if [[ "$DOMAIN" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ || "$DOMAIN" == "localhost" ]]; then
            SSL_MODE="http"
            PANEL_URL="http://${DOMAIN}"
        else
            echo -e "\nSSL Options for ${DOMAIN}:"
            echo -e "  1) Let's Encrypt (Automated Free SSL - recommended for valid domain pointing to this IP)"
            echo -e "  2) HTTP only (Use if behind Cloudflare Tunnel, reverse proxy, or local setup)"
            read -r -p "Choose SSL option [1/2] (default 1): " ssl_choice
            case "$ssl_choice" in
                2) SSL_MODE="http"; PANEL_URL="http://${DOMAIN}" ;;
                *) SSL_MODE="letsencrypt"; PANEL_URL="https://${DOMAIN}" ;;
            esac
        fi
    fi
}

show_completion_summary() {
    echo -e "\n${GREEN}${BOLD}======================================================${NC}"
    echo -e "${GREEN}${BOLD}   PTERODACTYL INSTALLATION COMPLETE!                 ${NC}"
    echo -e "${GREEN}${BOLD}======================================================${NC}\n"

    if [[ "$INSTALL_PANEL" == "true" ]]; then
        echo -e "${BOLD}Panel Access Details:${NC}"
        echo -e "  URL:          ${CYAN}${PANEL_URL}${NC}"
        echo -e "  Username:     ${CYAN}${ADMIN_USER}${NC}"
        echo -e "  Email:        ${CYAN}${ADMIN_EMAIL}${NC}"
        echo -e "  Password:     ${YELLOW}${ADMIN_PASS}${NC}"
        echo -e "  Database:     ${WHITE}Database: ${DB_NAME} | User: ${DB_USER} | Password: ${DB_PASS}${NC}\n"
    fi

    if [[ "$INSTALL_WINGS" == "true" ]]; then
        echo -e "${BOLD}Wings Daemon Details:${NC}"
        echo -e "  Binary:       ${WHITE}/usr/local/bin/wings${NC}"
        echo -e "  Config Dir:   ${WHITE}/etc/pterodactyl${NC}"
        echo -e "  Service:      ${CYAN}systemctl status wings${NC}"
        echo -e "  Daemon Port:  ${WHITE}8080${NC} | SFTP Port: ${WHITE}2022${NC}\n"
        echo -e "${YELLOW}${BOLD}Next Step for Wings:${NC}"
        echo -e "  1. Log in to your Panel admin at ${CYAN}${PANEL_URL:-'your panel'}${NC}."
        echo -e "  2. Go to ${BOLD}Admin Area -> Nodes -> Create New Node${NC}."
        echo -e "  3. In the Node's Configuration tab, click 'Generate Token'."
        echo -e "  4. Run that command on this server or run this installer option [4].\n"
    fi

    echo -e "${BOLD}Quick Service Management Commands:${NC}"
    echo -e "  Queue Worker: ${CYAN}systemctl restart pteroq.service${NC}"
    echo -e "  Wings Daemon: ${CYAN}systemctl restart wings.service${NC}"
    echo -e "  Web Server:   ${CYAN}systemctl restart nginx${NC}\n"
    echo -e "${CYAN}======================================================${NC}\n"
}

# Parse CLI arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --panel|-p)
                INSTALL_PANEL=true
                shift
                ;;
            --wings|-w)
                INSTALL_WINGS=true
                shift
                ;;
            --all|-a|--both)
                INSTALL_PANEL=true
                INSTALL_WINGS=true
                shift
                ;;
            --update|-u)
                UPDATE_MODE=true
                shift
                ;;
            --uninstall)
                UNINSTALL_MODE=true
                shift
                ;;
            --configure-wings)
                CONFIGURE_WINGS=true
                shift
                ;;
            --domain)
                DOMAIN="$2"
                shift 2
                ;;
            --email)
                ADMIN_EMAIL="$2"
                shift 2
                ;;
            --user)
                ADMIN_USER="$2"
                shift 2
                ;;
            --password)
                ADMIN_PASS="$2"
                shift 2
                ;;
            --ssl)
                SSL_MODE="$2"
                shift 2
                ;;
            --unattended|-y)
                UNATTENDED=true
                shift
                ;;
            --help|-h)
                print_banner
                echo "Usage: sudo bash install.sh [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  -p, --panel           Install Pterodactyl Panel"
                echo "  -w, --wings           Install Pterodactyl Wings"
                echo "  -a, --all, --both     Install both Panel and Wings"
                echo "  -u, --update          Update Panel and Wings"
                echo "      --configure-wings Helper to configure Wings with token"
                echo "      --uninstall       Uninstall Pterodactyl Panel and Wings"
                echo "  -y, --unattended      Run without prompting (auto-generates passwords)"
                echo "      --domain <fqdn>   Set Panel Domain / FQDN"
                echo "      --email <email>   Set Admin & SSL Email"
                echo "      --user <username> Set Admin Username"
                echo "      --password <pwd>  Set Admin Password"
                echo "      --ssl <mode>      SSL mode: letsencrypt, http"
                echo "  -h, --help            Show this help message"
                exit 0
                ;;
            *)
                log_warn "Unknown argument: $1"
                shift
                ;;
        esac
    done
}

interactive_menu() {
    print_banner
    echo -e "${BOLD}Select an action to perform:${NC}\n"
    echo -e "  [1] Install Pterodactyl Panel"
    echo -e "  [2] Install Pterodactyl Wings (Daemon)"
    echo -e "  [3] Install Both (Panel + Wings All-in-One)"
    echo -e "  [4] Configure Wings with Panel Token"
    echo -e "  [5] Update Panel & Wings"
    echo -e "  [6] Uninstall / Remove Pterodactyl"
    echo -e "  [0] Exit\n"
    read -r -p "Enter choice [0-6]: " choice

    case "$choice" in
        1) INSTALL_PANEL=true ;;
        2) INSTALL_WINGS=true ;;
        3) INSTALL_PANEL=true; INSTALL_WINGS=true ;;
        4) CONFIGURE_WINGS=true ;;
        5) UPDATE_MODE=true ;;
        6) UNINSTALL_MODE=true ;;
        0) exit 0 ;;
        *) log_error "Invalid selection."; exit 1 ;;
    esac
}

main() {
    check_root
    detect_system

    if [[ $# -eq 0 ]]; then
        interactive_menu
    else
        parse_args "$@"
    fi

    if [[ "$UNINSTALL_MODE" == "true" ]]; then
        uninstall_pterodactyl
        exit 0
    fi

    if [[ "$UPDATE_MODE" == "true" ]]; then
        update_all
        exit 0
    fi

    if [[ "$CONFIGURE_WINGS" == "true" ]]; then
        configure_wings_token
        exit 0
    fi

    if [[ "$INSTALL_PANEL" == "false" && "$INSTALL_WINGS" == "false" ]]; then
        log_error "No installation target specified. Run with --help or execute without arguments."
        exit 1
    fi

    if [[ "$UNATTENDED" != "true" ]]; then
        gather_interactive_inputs
    else
        # Defaults for unattended
        [[ -z "$DOMAIN" ]] && DOMAIN=$(curl -s https://api.ipify.org 2>/dev/null || echo "127.0.0.1")
        [[ -z "$ADMIN_EMAIL" ]] && ADMIN_EMAIL="admin@example.com"
        [[ -z "$ADMIN_USER" ]] && ADMIN_USER="admin"
        [[ -z "$ADMIN_PASS" ]] && ADMIN_PASS=$(generate_random_password)
        if [[ "$SSL_MODE" == "letsencrypt" && "$DOMAIN" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            SSL_MODE="http"
        fi
        if [[ "$SSL_MODE" == "letsencrypt" ]]; then
            PANEL_URL="https://${DOMAIN}"
        else
            PANEL_URL="http://${DOMAIN}"
        fi
    fi

    # Execute Installations
    install_base_dependencies

    if [[ "$INSTALL_PANEL" == "true" ]]; then
        install_php
        setup_database
        install_panel
        configure_nginx_and_ssl
    fi

    if [[ "$INSTALL_WINGS" == "true" ]]; then
        install_wings
    fi

    show_completion_summary
}

main "$@"
