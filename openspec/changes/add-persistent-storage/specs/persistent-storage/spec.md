## ADDED Requirements
### Requirement: Initialize local SQLite storage
The system SHALL store app metadata in a SQLite database at `~/.specops/specops.db` on macOS and Linux, and `%LOCALAPPDATA%\\SpecOps\\specops.db` on Windows, and create the parent directory if it does not exist.

#### Scenario: Directory missing
- **WHEN** the app starts and the storage directory does not exist
- **THEN** the system creates the directory before initializing the database

#### Scenario: Database exists
- **WHEN** the app starts and `~/.specops/specops.db` exists
- **THEN** the system opens the existing database without destroying data

### Requirement: Persist project metadata
The system SHALL persist the project list (id, name, path, OpenSpec status) to storage and reload it on app launch.

#### Scenario: Save project list
- **WHEN** the user adds or updates a project
- **THEN** the system writes the updated project list to the database

#### Scenario: Load project list
- **WHEN** the app launches
- **THEN** the system loads the stored project list into the frontend state

### Requirement: Persist theme preference
The system SHALL persist the user's theme preference (light or dark) to storage and reload it on app launch.

#### Scenario: Save theme preference
- **WHEN** the user changes the theme preference
- **THEN** the system writes the updated preference to the database

#### Scenario: Load theme preference
- **WHEN** the app launches
- **THEN** the system loads the stored theme preference into the frontend state

#### Scenario: Missing preference
- **WHEN** no theme preference is stored
- **THEN** the system uses the current default theme

### Requirement: Migrate schema versions
The system SHALL track a schema version and apply migrations before any read or write operations.

#### Scenario: Fresh install
- **WHEN** no schema exists
- **THEN** the system creates the schema and sets the current schema version

#### Scenario: Older schema detected
- **WHEN** the database schema version is older than the app expects
- **THEN** the system applies the required migrations and updates the schema version

### Requirement: Handle storage failures safely
The system SHALL surface storage errors to the UI and continue in-memory without crashing.

#### Scenario: Database unavailable
- **WHEN** the database cannot be opened or migrated
- **THEN** the system reports a storage error and keeps using in-memory data
