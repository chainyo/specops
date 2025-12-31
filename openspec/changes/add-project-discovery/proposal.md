# Change: Add project discovery

## Why
SpecOps needs a baseline way to register local repositories and report whether they already use OpenSpec.
This establishes the backend-to-frontend path for filesystem checks and creates the first visible cockpit list.

## What Changes
- Add a project discovery capability for local git repositories.
- Detect presence of an `openspec/` folder at the repository root.
- Display a project list with OpenSpec status in the cockpit UI.

## Impact
- Affected specs: project-discovery
- Affected code: Tauri commands for repo inspection, frontend project store, project list UI
