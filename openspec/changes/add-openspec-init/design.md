## Context
Projects can be added without OpenSpec files. Initialization currently requires a manual terminal workflow (`openspec init`) and knowledge of CLI prompts. SpecOps should keep this onboarding flow inside the app while preserving the CLI as the source of truth.

## Goals / Non-Goals
- Goals:
  - Provide a guided init flow that mirrors OpenSpec CLI choices.
  - Keep all filesystem and subprocess work in the backend.
  - Handle missing CLI via explicit user-approved install.
- Non-Goals:
  - Re-implement OpenSpec init behavior in-app.
  - Auto-install or auto-run without user confirmation.

## Decisions
- Decision: Use the backend to run `openspec --version`, a package-manager-specific install command, and `openspec init`.
- Decision: Present a frontend form that mirrors the CLI options; map selections to args so no manual terminal steps are required.
- Decision: Support global installs via npm, bun, yarn, or pnpm, based on user selection and availability.
- Decision: Fetch the available tools list dynamically from the OpenSpec CLI (for example, parsing `openspec init --help`) when the user starts the init flow; do not cache the list.
- Decision: Translate the tools selection into the `--tools` flag (values: `all`, `none`, or a comma-separated list of supported tools).
- Decision: Stream CLI output to the UI for progress, and surface structured errors when commands fail.
- Decision: Check OpenSpec CLI availability on app launch and cache the result for init flows.

## Risks / Trade-offs
- CLI prompt schema may change across OpenSpec versions, requiring UI updates.
- Global installs may require elevated permissions; failures must be explained with actionable guidance.
- Some package managers may not be installed; detection and fallbacks are required.

## Migration Plan
- No data migration. Newly initialized repos gain an `openspec/` folder and are re-scanned.

## Open Questions
- None.
