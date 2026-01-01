# Change: Add persistent storage for app metadata and preferences

## Why
The app needs durable storage so project metadata and user preferences persist across restarts.

## What Changes
- Add a SQLite-backed storage layer for app metadata and user preferences.
- Store the database in a private user folder (`~/.specops/specops.db` on macOS).
- Load persisted metadata and preferences at startup and write changes through Tauri commands.
- Introduce schema versioning and migrations for forward compatibility.

## Impact
- Affected specs: persistent-storage (new)
- Affected code: Rust backend storage module, Tauri commands, frontend store hydration
