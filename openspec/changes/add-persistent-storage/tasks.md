## 1. Implementation
- [ ] 1.1 Add a storage module in the Tauri backend that initializes and migrates a SQLite database in `~/.specops/`.
- [ ] 1.2 Define schema and CRUD helpers for persisted preferences (starting with theme choice) and projects.
- [ ] 1.3 Add Tauri commands to load preferences and projects at startup and persist updates from the UI.
- [ ] 1.4 Hydrate the frontend stores from persisted data and save changes on updates.
- [ ] 1.5 Add backend tests for migrations and persistence behavior.
