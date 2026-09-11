# ☁️ SmitCloud Hosting - Pterodactyl Panel & Wings Installer

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Ubuntu](https://img.shields.io/badge/Ubuntu-20.04%20%7C%2022.04%20%7C%2024.04-orange?logo=ubuntu)](https://ubuntu.com)
[![Debian](https://img.shields.io/badge/Debian-11%20%7C%2012-red?logo=debian)](https://debian.org)
[![Architecture](https://img.shields.io/badge/Arch-x86__64%20%7C%20arm64%20(aarch64)-blue)](#supported-systems--architectures)
[![Pterodactyl](https://img.shields.io/badge/Pterodactyl-Official%20Open--Source-007ACC?logo=pterodactyl)](https://pterodactyl.io)

An automated, production-ready, **one-command installer** for [Pterodactyl Panel](https://github.com/pterodactyl/panel) and [Pterodactyl Wings](https://github.com/pterodactyl/wings). Built to work out of the box on modern Linux distributions including **Ubuntu 24.04 LTS (Noble)** and **ARM64 (aarch64 / Oracle Cloud Ampere)**.

---

## ⚡ Quick Start (One Command)

### Option A: Remote One-Command Web Execution
Run this single command on any fresh Ubuntu/Debian server:
```bash
bash <(curl -sSL https://raw.githubusercontent.com/SmitroniX/SmitCloud-Hosting/main/install.sh)
```

### Option B: Local Execution
If you clone this repository:
```bash
git clone https://github.com/SmitroniX/SmitCloud-Hosting.git
cd SmitCloud-Hosting
sudo bash install.sh
```

---

## 🌟 Key Features

- **All-in-One Engine**: Install Panel, Wings, or Both simultaneously on a single server.
- **Full Architecture Support**:
  - `x86_64` (Intel / AMD)
  - `aarch64` / `arm64` (Oracle Cloud Free Tier Ampere, Raspberry Pi 4/5, AWS Graviton)
- **Zero-Touch Automated Stack**:
  - **Web Stack**: Nginx + PHP 8.3 / 8.2 (FPM) with all required extensions.
  - **Database & Cache**: MariaDB Server + Redis (in-memory cache & sessions).
  - **Package Manager**: Latest Composer v2.
  - **Virtualization**: Official Docker CE engine for containerized game servers.
  - **Daemon**: Official Pterodactyl Wings binary matched to host CPU architecture.
  - **Process Management**: Systemd services (`pteroq.service` queue worker, `wings.service`).
  - **Security & SSL**: Automated Let's Encrypt SSL via Certbot (or HTTP fallback for Cloudflare Proxy / Tunnels).
  - **Firewall (UFW)**: Auto-opens HTTP (80), HTTPS (443), Wings API (8080), SFTP (2022), and default game allocations (25565-25600).
- **Interactive & Non-Interactive Modes**:
  - Interactive colored menu for beginners.
  - Unattended CLI flags for CI/CD and scripted deployments.

---

## 🖥️ Interactive Menu Preview

Running `sudo bash install.sh` without arguments launches the guided wizard:

```text
  ____  _                      _             _   _ 
 |  _ \| |_ ___ _ __ ___   __| | __ _  ___| |_| |_   _ 
 | |_) | __/ _ \ '__/ _ \ / _` |/ _` |/ __| __| | | | |
 |  __/| ||  __/ | | (_) | (_| | (_| | (__| |_| |_| |_|
 |_|    \__\___|_|  \___/ \__,_|\__,_|\___|\__|_|\__, |
                                                 |___/ 
         One-Command Panel & Wings Installer v1.2.0

  Official Open-Source Engine: pterodactyl.io
  System Arch: aarch64 | OS: Ubuntu 24.04.5 LTS
======================================================

Select an action to perform:

  [1] Install Pterodactyl Panel
  [2] Install Pterodactyl Wings (Daemon)
  [3] Install Both (Panel + Wings All-in-One)
  [4] Configure Wings with Panel Token
  [5] Update Panel & Wings
  [6] Uninstall / Remove Pterodactyl
  [0] Exit
```

---

## ⚙️ Unattended / Command-Line Flags

You can pass command-line arguments to run completely hands-free:

### Install Both Panel & Wings:
```bash
sudo bash install.sh -a \
  --domain panel.yourdomain.com \
  --email admin@yourdomain.com \
  --user admin \
  --password "YourSecurePassword123!" \
  --ssl letsencrypt \
  -y
```

### Install Panel Only:
```bash
sudo bash install.sh -p --domain panel.example.com --email admin@example.com -y
```

### Install Wings Only:
```bash
sudo bash install.sh -w
```

### Update Both:
```bash
sudo bash install.sh -u
```

### Available Flags:

| Flag | Shorthand | Description |
| :--- | :--- | :--- |
| `--all` / `--both` | `-a` | Install both Panel & Wings |
| `--panel` | `-p` | Install Pterodactyl Panel only |
| `--wings` | `-w` | Install Pterodactyl Wings daemon only |
| `--update` | `-u` | Update existing Panel & Wings to latest releases |
| `--configure-wings`| | Interactive helper to link node token to Wings |
| `--uninstall` | | Remove Panel, Wings, and background services |
| `--unattended` | `-y` | Run unattended without interactive questions |
| `--domain <fqdn>` | | Domain name or public IP for the Panel |
| `--email <email>` | | Administrator and SSL email address |
| `--user <user>` | | Administrator username (default: `admin`) |
| `--password <pwd>`| | Administrator password (auto-generated if omitted) |
| `--ssl <mode>` | | SSL mode: `letsencrypt` or `http` |
| `--help` | `-h` | Show help menu |

---

## 🔗 Connecting Wings to Your Panel

Once Wings and Panel are installed:
1. Open your Panel in your web browser and log in with your Admin credentials.
2. Go to **Admin Area** (gear icon in the top right).
3. Navigate to **Locations** and click **Create New** (e.g. `Main-DC` or `Local`).
4. Navigate to **Nodes** and click **Create New**:
   - **Name**: e.g., `Node-01`
   - **FQDN**: Your server's domain or public IP.
   - **Daemon Port**: `8080`
   - **SFTP Port**: `2022`
   - **Total Memory & Disk**: Set according to your VPS specs.
5. Click **Create Node**, then open the **Configuration** tab.
6. Click **Generate Token** and copy the command shown.
7. Run that command on your server, or run:
   ```bash
   sudo bash install.sh --configure-wings
   ```
   and paste the token!
8. Wings will automatically start and connect:
   ```bash
   sudo systemctl status wings
   ```

---

## 🎮 Minecraft Server Features: Plugins & Player Manager

For Minecraft game servers, the panel includes dedicated management tabs in the server navigation bar:

### 🧩 Plugin Section (`/minecraft/plugins`)
- **Multi-Repository Search**: Browse and search thousands of plugins from **Modrinth**, **SpigotMC**, **CurseForge**, and **Hangar**.
- **Version & Loader Filtering**: Filter by Minecraft version (e.g. `1.20.4`, `1.21`) and server software (Paper, Spigot, Purpur, Velocity, BungeeCord).
- **1-Click Installation**: Download plugin `.jar` files straight into the `/plugins` directory with zero manual FTP uploads.

### 👤 Player Manager Section (`/minecraft/players`)
- **Live Command Center**: Instantly **Kick**, **Ban**, **OP / De-OP**, or execute **Kill** and **Gamemode** commands on target players.
- **Whitelist Management**: View whitelisted players with live Minecraft avatars, add/remove players, and toggle Whitelist ON/OFF.
- **Server Operators (OPs)**: View current operators with their permission levels, grant OP, and revoke OP.
- **Bans (Players & IPs)**: View banned players and banned IP addresses with ban reasons, issue bans, and unban/pardon with one click.

---

## 🛠️ Service Management Cheatsheet

| Service | Action | Command |
| :--- | :--- | :--- |
| **Wings Daemon** | Check status | `sudo systemctl status wings` |
| | Restart | `sudo systemctl restart wings` |
| | View live logs | `sudo journalctl -u wings -f` |
| **Queue Worker** | Check status | `sudo systemctl status pteroq` |
| | Restart | `sudo systemctl restart pteroq` |
| **Web Server** | Check status | `sudo systemctl status nginx` |
| | Test config | `sudo nginx -t` |
| | Reload | `sudo systemctl reload nginx` |
| **Database** | Status | `sudo systemctl status mariadb` |

---

## 🚀 How to Host Your Own One-Command Installer on GitHub

1. Create a new public repository on GitHub (e.g., `pterodactyl-installer`).
2. Run these commands inside this folder:
   ```bash
   git init
   git add .
   git commit -m "feat: initial release of pterodactyl one-click installer"
   git branch -M main
   git remote add origin https://github.com/<YOUR-USERNAME>/pterodactyl-installer.git
   git push -u origin main
   ```
3. Anyone can now install Pterodactyl with your branded one-line command:
   ```bash
   bash <(curl -sSL https://raw.githubusercontent.com/<YOUR-USERNAME>/pterodactyl-installer/main/install.sh)
   ```

---

## 📄 License
This installer is open-source and licensed under the [MIT License](LICENSE).
Pterodactyl Panel and Wings are copyrighted by [Pterodactyl Software](https://pterodactyl.io) under the MIT License.
