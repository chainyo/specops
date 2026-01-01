## Context
The app currently stores project metadata and user preferences only in memory. We need durable storage to preserve UI choices and project lists across sessions. The user prefers a local SQLite database in a private directory under the user's home folder.

## Goals / Non-Goals
- Goals:
  - Persist project metadata and user preferences (starting with theme choice) across app restarts.
  - Keep filesystem access in the Rust backend via Tauri commands.
  - Use a versioned SQLite schema with migrations.
- Non-Goals:
  - Storing secrets or API keys (these remain in the OS keychain).
  - Multi-user or sync features.

## Decisions
- Decision: Use SQLite via a Rust backend module (e.g., rusqlite) rather than frontend access.
- Decision: Store the database at `~/.specops/specops.db` on macOS and Linux, and `%LOCALAPPDATA%\\SpecOps\\specops.db` on Windows, creating the directory if missing.
- Decision: Version schema with a `schema_version` table and apply migrations on startup.

## Risks / Trade-offs
- File locking or corruption could block startup. Mitigation: fall back to in-memory state and surface an error.

## Migration Plan
- Start with schema version 1 and add preferences and projects tables.
- Add migrations as new tables or columns are needed.

## Open Questions
- None.
