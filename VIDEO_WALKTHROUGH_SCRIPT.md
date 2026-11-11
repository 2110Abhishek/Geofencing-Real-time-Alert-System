# GeoTrack — Assessment Video Walkthrough Script & Submission Guide

This document contains your complete submission details and a word-for-word script for recording your assessment demo video.

---

## 1. Assessment Form Submission Summary

Copy and paste these exact links into your evaluation form:

| Form Field | Exact Value to Submit | Status |
| :--- | :--- | :--- |
| **Base URL of your deployed Frontend \*** | `https://alertsystem-omega.vercel.app` | ✅ Live on Vercel |
| **Base URL of your deployed Backend \*** | `https://geofencing-real-time-alert-system-k1l2.onrender.com` | ✅ Live on Render |
| **Docker Hub Image link \*** | `https://hub.docker.com/r/abhishek2110/geotrack-backend` | ✅ Public & Published |
| **GitHub Repository URL** | `https://github.com/2110Abhishek/Geofencing-Real-time-Alert-System` | ✅ Public on GitHub |
| **Link to the solution video \*** | `https://www.loom.com/share/...` *(Paste after recording)* | 🎥 Ready to Record |

---

## 2. Quick Recording Instructions (5–10 Minutes)

### Option A: Using Loom (Easiest — Instant Link)
1. Go to **[loom.com](https://www.loom.com)** and sign in with Google.
2. Click **Record a Loom** (using Loom Desktop app or Chrome Extension).
3. Select **Screen + Camera** (or Screen Only).
4. Follow the script below while demonstrating your tabs.
5. Click **Stop Sharing** — Loom immediately copies a public share link (`https://www.loom.com/share/xxxxxx`).
6. Paste that link into your assessment form!

### Option B: Windows Screen Recorder + YouTube Unlisted
1. Press **`Win + Shift + R`** (or open OBS / Xbox Game Bar `Win + G`) to record your screen.
2. Follow the script below.
3. Upload the MP4 video to **[youtube.com](https://youtube.com)**.
4. Set the visibility to **Unlisted** (anyone with the link can view; not public in search).
5. Copy the YouTube link and paste it into your form.

---

## 3. Word-for-Word Video Script

### Section 1: Introduction (30 seconds)
> **[On Camera / Showing GitHub Repo]**
>
> *"Hello everyone! My name is Abhishek Choudhari. Today, I am presenting my submission for the GeoTrack Smart Geofencing and Real-Time Fleet Monitoring System assessment.*
>
> *GeoTrack is a full-stack, production-ready platform designed for fleet operators. It solves key logistics challenges: tracking real-time vehicle movement, enforcing geographical boundaries with PostGIS spatial algorithms, and broadcasting sub-second alerts over WebSockets.*
>
> *The system is built with a high-performance Go modular monolith backend, PostgreSQL with the PostGIS spatial extension on Supabase, and a modern React 18, TypeScript, and Leaflet frontend hosted on Vercel."*

---

### Section 2: Live Frontend Dashboard Demo (2 minutes)
> **[Switch tab to: https://alertsystem-omega.vercel.app/dashboard]**
>
> *"Here is the live deployed frontend running on Vercel at `alertsystem-omega.vercel.app`.*
>
> *On the Operations Dashboard, we have real-time fleet KPI cards displaying Total Vehicles, Active Units, Monitored Zones, and Restricted Violations.*
>
> *Below is the interactive Dark Theme Leaflet map, displaying color-coded boundary zones: Green for Delivery Zones, Red for Restricted Areas, Yellow for Toll Plazas, and Purple for Customer Areas.*
>
> *Notice the indicator at the top: `Live WebSocket Connected`. Our frontend maintains an active full-duplex WebSocket stream with automatic reconnect logic."*

---

### Section 3: Geofence Management (1 minute)
> **[Switch tab to: Geofences menu]**
>
> *"Navigating to the Geofences page, we can inspect all active boundaries.*
>
> *GeoTrack supports dual-mode geofence creation:*
> 1. *Interactive Map Drawing: Operators can click directly on the map to define custom polygon perimeters.*
> 2. *Bulk JSON & CSV Import: Operators can upload existing fleet boundaries.*
>
> *Each polygon is validated: unclosed shapes, out-of-bounds coordinates, and self-intersections are strictly rejected before being persisted into PostGIS."*

---

### Section 4: Vehicle Fleet & Live GPS Simulation (2 minutes)
> **[Switch tab to: Live Tracking / Vehicles]**
>
> *"On the Vehicles Directory, fleet managers can register new vehicles, edit driver details, or track assets.*
>
> *Let's demonstrate real-time boundary intersection detection by clicking 'Simulate GPS Telemetry'.*
>
> *I will select vehicle `MH-49-BQ-7645` and dispatch a GPS coordinate ping located inside our restricted zone.*
>
> **[Click 'Send Location Update']**
>
> *Immediately, notice the sub-second response: the vehicle pin updates its position on the map, and an instant alert toast appears with severity and geofence details. All connected dashboard clients receive this notification instantly without needing to refresh."*

---

### Section 5: Historical Auditing & CSV Export (1 minute)
> **[Switch tab to: Violation History]**
>
> *"Under Violation History, the platform maintains a persistent, queryable audit trail of every entry and exit event.*
>
> *Fleet operators can filter by vehicle, geofence, event type, and date range.*
>
> *We can also click 'Export CSV' to download the historical records for auditing and compliance reporting."*

---

### Section 6: Code Architecture & PostGIS Engine (2 minutes)
> **[Switch to VS Code / Code Editor]**
>
> *"Let's look at the backend architecture in Go:*
>
> 1. *Spatial Engine (`backend/internal/services/geofence_service.go`):*
>    *We use PostGIS `ST_Covers(geofence.polygon, ST_SetSRID(ST_MakePoint(lon, lat), 4326))` for boundary-inclusive point-in-polygon queries, backed by spatial GiST indexes.*
>
> 2. *Transition Detection State Machine (`backend/internal/services/vehicle_service.go`):*
>    *We track `(vehicle_id, geofence_id)` transitions to guarantee zero duplicate alerts. If a vehicle first reports inside a zone, Rule 2 initializes its state without triggering false entry events. Stale out-of-order pings are archived without reversing current state.*
>
> 3. *Real-Time Hub (`backend/internal/websocket/hub.go`):*
>    *Powered by Gorilla WebSocket with an asynchronous buffered channel dispatcher and heartbeat ping/pong handlers.*
>
> 4. *Execution Timing SLA (`time_ns`):*
>    *Every single API response strictly measures and returns execution time in nanoseconds measured at the HTTP handler layer."*

---

### Section 7: Cloud Deployment & Deliverables (1 minute)
> **[Show browser tabs]**
>
> *"To summarize our production deployment deliverables:*
>
> 1. *Frontend: Live on Vercel at `https://alertsystem-omega.vercel.app`.*
> 2. *Backend: Live on Render at `https://geofencing-real-time-alert-system-k1l2.onrender.com`.*
> 3. *Database: Managed PostgreSQL 15 with PostGIS on Supabase.*
> 4. *Docker Hub: Published container image at `hub.docker.com/r/abhishek2110/geotrack-backend`.*
> 5. *Source Code: Complete, documented Git repository on GitHub.*
>
> *All assessment specifications and edge cases are implemented, tested, and fully operational. Thank you for your time and review!"*

---

## 4. Tips for Getting Full Marks

- **Keep it under 10 minutes:** Stay concise and follow the script sections in order.
- **Microphone Check:** Ensure your voice is clear and background noise is minimal.
- **Tab Layout:** Have these 4 browser tabs open in advance before starting:
  1. `https://alertsystem-omega.vercel.app/dashboard`
  2. `https://geofencing-real-time-alert-system-k1l2.onrender.com/geofences`
  3. `https://hub.docker.com/r/abhishek2110/geotrack-backend`
  4. `https://github.com/2110Abhishek/Geofencing-Real-time-Alert-System`
