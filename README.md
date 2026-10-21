# SafeVote Monorepo

SafeVote is a verifiable, privacy-preserving voting platform consisting of:
1. **API Server (`vote_server/`)**: Rust Rocket backend connected to PostgreSQL, providing poll management, vote auditing, ballot casting, and winner calculations.
2. **Mobile App (`mobile/`)**: Cross-platform React Native + Expo application for anonymous voting, poll discovery, and personal voting history.

---

## Architecture Overview

```mermaid
flowchart LR
    subgraph Host ["Host Machine (saar-laptop)"]
        AVD["Android Emulator (Pixel 10 Pro XL)"]
        ADB["adb.service (*:5037)"]
        Bridge["orca-vm-emulator-bridge.service"]
    end

    subgraph VM ["Orca microVM (172.30.0.6)"]
        DB["PostgreSQL (5432)"]
        Supervisor["supervisord"]
        VoteServer["vote_server (8001)"]
        Metro["Expo / Metro Bundler (8081)"]
    end

    AVD <-->|"adb reverse tcp:8081, tcp:8001"| Host
    Bridge <-->|"socat 0.0.0.0:8081"| Metro
    Bridge <-->|"socat 0.0.0.0:8001"| VoteServer
    VM -->|"ADB_SERVER_SOCKET (172.30.0.5:5037)"| ADB
    Supervisor --> VoteServer
    Supervisor --> Metro
    VoteServer --> DB
```

---

## Quick Start / Run Instructions

### 1. Host Setup (One-time or after boot)

The host bridges network ports and ADB communication between the desktop Android emulator and the microVM.

1. **Ensure Host Services are Active:**
   ```bash
   systemctl --user status adb.service orca-vm-emulator-bridge.service
   ```
   If either is inactive, start them:
   ```bash
   systemctl --user start adb.service orca-vm-emulator-bridge.service
   ```

2. **Start the Android Emulator:**
   ```bash
   emulator -avd Pixel_10_Pro_XL
   ```
   *(Note: Under Wayland compositors, pass `QT_QPA_PLATFORM=xcb` if needed).*

3. **Verify Emulator Connection & Reverse Ports:**
   ```bash
   adb devices -l
   adb reverse --list
   ```
   You should see:
   ```text
   host-15 tcp:8081 tcp:8081
   host-15 tcp:8001 tcp:8001
   ```
   The `orca-vm-emulator-bridge.service` automatically syncs these reverse mappings whenever the emulator boots.

---

### 2. MicroVM Service Supervision (`172.30.0.6`)

The backend API and Metro bundler are managed inside the microVM by `supervisord` to prevent ephemeral process death.

1. **Check Service Status:**
   ```bash
   supervisorctl status
   ```
   Expected output:
   ```text
   metro                            RUNNING   pid 12976, uptime 0:10:00
   vote_server                      RUNNING   pid 12565, uptime 0:10:00
   ```

2. **Restarting Services:**
   - Restart API server: `supervisorctl restart vote_server`
   - Restart Metro bundler: `supervisorctl restart metro`
   - Restart all: `supervisorctl restart all`

3. **Inspecting Logs:**
   - API server logs: `tail -f /var/log/vote_server.log`
   - Metro bundler logs: `tail -f /var/log/metro.log`
   - Error logs: `/var/log/vote_server.err.log`, `/var/log/metro.err.log`

---

### 3. Launching the App on the Emulator

With the emulator running and services active:

```bash
# Launch SafeVote Mobile App
adb shell am start -n com.safevote.mobile/.MainActivity

# Force stop and re-launch
adb shell am force-stop com.safevote.mobile && adb shell am start -n com.safevote.mobile/.MainActivity
```

To take a screenshot of the running emulator from the host:
```bash
adb exec-out screencap -p > /tmp/emulator_screenshot.png
```

---

## Manual Execution (Without Supervisor)

If you need to run services in the foreground for interactive debugging:

### Backend API:
```bash
cd /root/repo/vote_server
export DATABASE_URL="postgres://safe-vote:test-pass@localhost:5432/votes"
export ROCKET_ADDRESS="0.0.0.0"
export ROCKET_PORT="8001"
export RUST_BACKTRACE="1"
./target/debug/vote_server
```

### Metro Bundler:
```bash
cd /root/repo/mobile
export ADB_SERVER_SOCKET="tcp:172.30.0.5:5037"
npx expo start --host lan
```

---

## Running Verification Tests

### Backend Tests (Rust):
```bash
cd /root/repo/vote_server
DATABASE_URL="postgres://safe-vote:test-pass@localhost:5432/votes" cargo test --test vote_count_test
```

### Mobile Tests & Typechecking (TypeScript / Jest):
```bash
cd /root/repo/mobile
npm run typecheck
npm test
```

---

## Troubleshooting Guide

| Issue | Cause | Resolution |
| :--- | :--- | :--- |
| `TypeError: configs.toReversed is not a function` | Node.js v18 in VM; Metro requires Node >= 20 | Upgrade Node to latest current: `curl -fsSL https://deb.nodesource.com/setup_current.x \| bash - && apt-get install -y nodejs && npm install -g npm@latest` in the VM. |
| `supervisorctl: command not found` | Supervisor not installed on VM disk | Run `apt-get update && apt-get install -y supervisor` in VM. |
| `adb: command not found` in VM | ADB client missing in VM | Run `apt-get install -y adb` and verify `ADB_SERVER_SOCKET="tcp:172.30.0.5:5037"`. |
| `Network request failed` in Mobile App | Reverse ports missing on emulator | Verify `adb reverse --list` on host. Re-run `adb reverse tcp:8001 tcp:8001` or restart `orca-vm-emulator-bridge.service`. |
| `libnspr4.so` / `libcairo.so.2` missing | Missing GTK/DevTools shared libraries | Run `apt-get install -y libnspr4 libnss3 libcairo2 libatk1.0-0` in VM. |
