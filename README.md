# Nexus Homelab Dashboard

A modern, glassmorphic, mobile-first **Homelab Command Center** with real-time telemetry across 9 core infrastructure, network, smart-home, and media services, plus a zero-dependency Node.js backend and a built-in **AES-256-GCM Encrypted Credentials Vault**.

---

## ✨ Key Features

- **Frosted Glassmorphism & Custom Wallpapers**:
  - Live-adjustable **Glass Blur (`px`)**, **Card Glass Opacity (`%`)**, and **Wallpaper Dimming Overlay (`%`)**.
  - Upload your own custom background image or choose from curated 4K presets.
- **9 Native Live API Integrations** (with self-signed SSL support):
  1. **Proxmox VE** — Cluster node health, CPU %, RAM usage, running VMs & LXC containers.
  2. **TrueNAS SCALE** — Per-pool ZFS status (`ONLINE`, `DEGRADED`, `FAULTED`), exact usable dataset capacity (`TiB` used / total), disk topology health, and version info.
  3. **Home Assistant** — Total entity states, lights/switches on, automations count, or custom watched entities.
  4. **UniFi OS / Network** — Supports both **Full Gateway** setups (WAN IP, ISP, latency, throughput) and **AP-Only** setups (`WLAN Online`, Wi-Fi throughput, wireless/wired client counts, and adopted AP health).
  5. **Ubiquiti EdgeOS / EdgeRouter** — Live WebSocket streaming (`wss://.../ws/stats`) for CPU %, RAM %, uptime, and real-time WAN RX/TX throughput.
  6. **Jellyfin** — Active streams, now-playing titles, Movies, Episodes, and Songs library counts.
  7. **Radarr** — Monitored movies, disk space free, active download queue, and missing count.
  8. **Sonarr** — Monitored TV series, total episodes, active download queue, and missing episodes.
  9. **qBittorrent** — Real-time download/upload speeds, active/seeding torrents, session transfer totals, and free disk space.
- **Dashboard Authentication (`Remember this device`)**:
  - HMAC-SHA256 signed session tokens with 1-year `HttpOnly` cookie + `localStorage` device persistence.
- **Zero-Knowledge Encrypted Logins Vault (`AES-256-GCM` + `Scrypt`)**:
  - Dedicated **Vault Master Password** required **every single time** the **Logins** modal is opened.
  - Passwords are encrypted at rest in `config/vault.enc.json` using `Scrypt` (`N=16384, r=8, p=1`) + `AES-256-GCM`.
  - The Vault Master Password is never stored on disk, in environment variables, or in browser storage, and decrypted entries are wiped from memory the instant the modal is closed.
- **Dual Configuration**:
  - Configure services, pools, wallpapers, and credentials either **in the web UI** or directly in `config/config.json` / `.env`.

---

## 🚀 Quick Start (Deploying on Any Server)

Because `.gitignore` excludes all personal files (`.env`, `config/config.json`, `config/config.yaml`, `config/vault.enc.json`), cloning this repository onto a new server (such as your dad's home server) starts with a **clean, ready-to-customize template**:

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/<your-repo>.git
cd Home-Dashboard

# 2. Create your local .env from the template
cp .env.example .env
nano .env   # Set DASHBOARD_USER, DASHBOARD_PASSWORD, and any API keys

# 3. (Optional) Pre-copy the starter config, or let the server create it automatically on first boot
cp config/config.example.json config/config.json

# 4. Launch with Docker Compose
sudo docker-compose up -d --build
```

Open **`http://<server-ip>:3000`** in your browser and sign in with the `DASHBOARD_USER` and `DASHBOARD_PASSWORD` from your `.env` file.

> **Note for older `docker-compose 1.29.x` on Ubuntu/WSL**:
> Avoid using `--force-recreate` on `docker-compose 1.29.2` due to a known Docker Engine v25+ `ContainerConfig` bug in old Python `docker-compose`. Instead, use:
> - `sudo docker-compose restart` (to restart after code/env changes), or
> - `sudo docker-compose down && sudo docker-compose up -d` (to recreate containers cleanly).

---

## 🌿 Git Workflow: Personal Server vs. Clean Production Branch (Dad's Server)

Your repository is already structured so that **`main` contains zero personal secrets**:
- **Ignored locally (never pushed to GitHub)**:
  - `.env` (your personal login & API tokens)
  - `config/config.json` & `config/config.yaml` (your personal service URLs & settings)
  - `config/vault.enc.json` (your encrypted Logins Vault)
  - `public/backgrounds/*` (your uploaded wallpapers)
- **Tracked in Git (shared across servers)**:
  - `.env.example` (template environment variables)
  - `config/config.example.json` (starter configuration with all 9 services pre-templated on `192.168.1.x`)

### Creating a Dedicated `production` Branch (Optional)
If you want a separate frozen `production` (or `dad-server`) branch that you only update when ready:

```bash
# Initialize Git and commit the clean codebase to main
git init
git add .
git status   # Verify .env and config/config.json are NOT listed
git commit -m "Initial commit: Nexus Homelab Dashboard"

# Create and push both 'main' and 'production' branches
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main

# Create the clean production branch for other servers
git checkout -b production
git push -u origin production
git checkout main
```

On your dad's server, simply run:
```bash
git clone -b production https://github.com/<your-username>/<your-repo>.git
```
On first boot, `src/lib/configManager.js` automatically detects that `config/config.json` does not exist yet and copies `config/config.example.json` into `config/config.json`, giving you all 9 service cards ready to edit in the UI.

---

## 🔑 How to Obtain API Keys & Credentials for All 9 Integrations

You can paste these credentials **directly in the Dashboard UI** (click the ⚙️ icon on any service card) **or** put them in `.env` and reference them as `${VAR_NAME}` in `config/config.json`.

---

### 1. Proxmox VE (`proxmox`)
Using an API Token is recommended over root password authentication.

1. Log in to your **Proxmox VE Web UI** (`https://192.168.1.10:8006`).
2. In the left sidebar, click **Datacenter** → **Permissions** → **API Tokens**.
3. Click **Add**:
   - **User**: `root@pam` (or your monitoring user)
   - **Token ID**: `dashboard`
   - **Privilege Separation**:
     - **Option A (Simplest)**: **Uncheck** *Privilege Separation* so the token inherits `root@pam` read permissions immediately.
     - **Option B (Least Privilege)**: Keep *Privilege Separation* checked, then go to **Datacenter → Permissions → Add → API Token Permission**, set **Path** to `/`, select your token `root@pam!dashboard`, and assign Role **`PVEAuditor`**.
4. Copy both values into the dashboard:
   - **API Token ID**: `root@pam!dashboard`
   - **API Token Secret**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

---

### 2. TrueNAS SCALE (`truenas`)
Supports multiple TrueNAS cards and per-card ZFS pool selection (e.g., `tank`).

1. Log in to your **TrueNAS SCALE Web UI**.
2. Click the **User Icon** (top-right corner) → **API Keys**.
3. Click **Add**, name it `Homelab Dashboard`, and click **Save**.
4. Copy the generated **API Key** (starts with `1-...`).
5. **Selecting a ZFS Pool**:
   - In the Dashboard's **Add/Edit Service** modal for TrueNAS, enter your **ZFS Pool Name** (e.g. `tank`), or click **Test Connection** to see buttons for all detected ZFS pools on your server and click one to auto-fill it.
   - *Note*: Status badge stays **Green (`ONLINE`)** as long as the ZFS pool itself is `ONLINE` and healthy, even if TrueNAS has non-storage system update notifications. It turns **Yellow (`WARNING`)** or **Red (`ERROR`)** only if drives or pool topology degrade.

---

### 3. Home Assistant (`homeassistant`)

1. Log in to your **Home Assistant** instance (`http://192.168.1.30:8123`).
2. Click your **Profile** (bottom-left sidebar, your username/initials).
3. Scroll to the very bottom under the **Security** tab (or main Profile page) to **Long-Lived Access Tokens**.
4. Click **Create Token**, name it `Dashboard`, and copy the token string (`eyJ...`).
5. *(Optional)* **Watched Entity IDs**:
   - Leave blank to display overall counts (`Total Entities`, `Lights On`, `Switches On`, `Automations`).
   - Or provide up to 4 comma-separated entity IDs (e.g. `sensor.living_room_temperature,sensor.power_consumption,person.john,lock.front_door`) to display their exact live states on the card.

---

### 4. UniFi OS / UniFi Network (`unifi`)
Works with UniFi Dream Machine (UDM/UDR/UCG), Cloud Key Gen2+, and standalone/self-hosted UniFi Network controllers—including **AP-Only setups** where routing/WAN is handled by another router (such as EdgeOS).

#### Method A: Official UniFi OS API Key (Recommended for UniFi OS 3.x / 4.x+)
1. Open your **UniFi OS Console** → **Settings (Control Plane)** → **Admins & Users** (or **Integrations**).
2. Select your local admin or create a **Read-Only Local Admin** and generate an **API Key**.
3. Paste it into the **UniFi API Key** field in the dashboard.

#### Method B: Local Admin Username & Password
1. In UniFi OS → **Admins & Users** → **Add Admin**.
2. Check **Restrict to Local Access Only**, assign **Site Admin** or **View Only**, and set a username and password.
3. Enter the **Local Username** and **Password** in the dashboard (leave API Key blank).
4. **Site Name**: Usually `default` (check the URL in your browser when viewing your UniFi Network dashboard: `/network/<site-name>/dashboard`).

---

### 5. Ubiquiti EdgeOS / EdgeRouter (`edgeos`)
Streams real-time CPU %, RAM %, uptime, and interface throughput over EdgeOS's WebSocket (`/ws/stats`).

1. Log in to your **EdgeRouter Web UI** (`https://192.168.1.254`).
2. Use your existing admin credentials or create a dedicated user under the **Users** tab.
3. In the dashboard configuration:
   - **Username**: `admin` (or `ubnt`)
   - **Password**: Your EdgeOS password
   - **WAN Interface**: The interface connected to your ISP, e.g., `eth0`, `eth4`, or `pppoe0` (visible on the main EdgeOS Dashboard tab).

---

### 6. Jellyfin (`jellyfin`)

1. Log in to **Jellyfin** as an administrator (`http://192.168.1.40:8096`).
2. Open the menu (top-left `☰`) → **Dashboard** (Administration).
3. In the left sidebar under **Advanced**, click **API Keys**.
4. Click the **`+`** button at the top, enter App Name `Homelab Dashboard`, and click **OK**.
5. Copy the 32-character hex **API Key** into the dashboard.

---

### 7. Radarr (`radarr`)

1. Open **Radarr** (`http://192.168.1.40:7878`).
2. Go to **Settings** → **General**.
3. Scroll down to the **Security** section.
4. Copy the **API Key** and paste it into the dashboard.

---

### 8. Sonarr (`sonarr`)

1. Open **Sonarr** (`http://192.168.1.40:8989`).
2. Go to **Settings** → **General**.
3. Scroll down to the **Security** section.
4. Copy the **API Key** and paste it into the dashboard.

---

### 9. qBittorrent (`qbittorrent`)
Supports multiple qBittorrent instances simultaneously.

1. Open **qBittorrent Web UI** (`http://192.168.1.40:8080`).
2. Click **Tools** → **Options** (or the Gear ⚙️ icon) → **Web UI** tab.
3. Under **Authentication**, check your **Username** and **Password**.
4. Enter those credentials into the dashboard's qBittorrent service configuration.

---

## 🔒 Encrypted Logins Vault (`config/vault.enc.json`)

Click the **Logins** button (lock icon in the top header) to open the built-in password manager:
1. **First-Time Initialization**:
   - Choose a **Vault Master Password** (can be completely different from your dashboard login password).
   - Keep *"Pre-populate vault with my currently configured dashboard services"* checked to automatically import your services into the encrypted vault.
2. **Everyday Usage**:
   - Every time you open **Logins**, you must enter the **Vault Master Password**.
   - Click **Show** to reveal a password, **Copy** for 1-click clipboard copy, or **+ Add Login** to store additional credentials, SSH logins, IPMI passwords, or router PINs.
   - Closing the modal (or clicking **Lock**) immediately wipes all decrypted data from browser memory.
