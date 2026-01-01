# Change: Initialize OpenSpec in repos missing OpenSpec

## Why
Users currently have to leave SpecOps and run `openspec init` manually when a repo is missing OpenSpec files. This breaks the in-app workflow and makes onboarding inconsistent.

## What Changes
- Provide an in-app action to initialize OpenSpec when a project is missing `openspec/`.
- Check for the OpenSpec CLI with `openspec --version` at app launch.
- Offer to install `@fission-ai/openspec` via npm, bun, yarn, or pnpm when the CLI is missing, with availability indicated per package manager.
- Mirror `openspec init` choices (including `--tools`) in the UI and translate selections into the CLI invocation.
- Update project status after init completes.

## Impact
- Affected specs: `openspec-init` (new)
- Affected code: Tauri commands for CLI checks/install/init, project status refresh, frontend init flow UI
