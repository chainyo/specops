# Project Context

## Purpose

SpecOps is a desktop app that acts as an AI engineering cockpit.

It gives a single control panel over:

- OpenSpec driven specs and changes
- AI agents (Codex, Claude Code, OpenAI compatible models, local LLMs)
- Git worktrees for safe parallel branches per change
- CodeRabbit and PR status for reviews
- A backlog of ideas, tasks, and open questions

Core goals:

- Keep the human as the brain. SpecOps externalizes intent and plans, but never auto decides.
- Make spec driven development practical by wiring OpenSpec directly into branches, agents, and reviews.
- Enforce context discipline around RPI (Research, Plan, Implement) so agents work in tight, relevant contexts instead of slop.
- Let engineers spin up an IDE on a focused worktree when needed, without thinking about git internals.

## Tech Stack

### Frontend

- TypeScript
- React 19 (Vite)
- Zustand
- Tailwind CSS v4
- shadcn inspired components
- tanstack query
- Lucide Icons

### Backend

- Tauri 2 (Rust)

### Tooling

- Bun
- Biome (format, lint, check for TypeScript)
- cargo fmt, cargo clippy, cargo test
- Target OS: macOS

## Project Conventions

### Code Style

#### TypeScript

- `strict` mode enabled
- Biome for formatting, linting, and type checks
- Two space indentation
- Use `@/` imports for internal modules
- UI primitives live under `src/components/ui`
- Tailwind utilities for layout and simple styling
- Shared design tokens and global Tailwind setup in `src/App.css` or equivalent

#### Rust

- `cargo fmt` for formatting
- `cargo clippy` must be clean for all targets
- Tauri commands return structured errors using `thiserror`
- Backend emits Tauri events for long running operations and agent runs

### Architecture Patterns

- Renderer: React SPA bundled and hosted by Tauri
- State:
  - Zustand stores split by domain (projects, changes, runs, agents, settings, UI)
  - Central “session” view model for the current project + change
- UI:
  - Tailwind v4 utility first
  - Headless components for lists, tables, dialogs, split views
  - shadcn inspired primitives for consistent layout
- File and system access:
  - Only Rust backend touches the filesystem, git, subprocesses, or network calls that need OS access
  - Frontend calls typed Tauri commands for all side effects
- Git and worktrees:
  - One “base” repo path per project on the default branch
  - One worktree per OpenSpec change for implementation branches (`os/<change-id>`)
  - Worktree paths and branches tracked in the app’s local metadata
- OpenSpec integration:
  - OpenSpec folders discovered per project
  - Changes and tasks parsed from OpenSpec change folders and markdown conventions
  - OpenSpec remains the source of truth for intent and change status
- RPI workflow:
  - Research, Plan, Implement is explicit
  - Research and Plan outputs are stored as artifacts and must be human approved before Implement runs

- IPC:
  - Typed invoke / emit bridge between React and Tauri (central command module)
  - Long running tasks (git, AI runs, test runs) stream progress via events

- CLI integration:
  - Small Rust binary or symlink installed in PATH (for example `specops` or `so`)
  - CLI launches or focuses the Tauri app on a given project path or change id
  - Future: optional subcommands to trigger RPI runs from terminal

### Testing Strategy

#### Frontend

- vitest + React Testing Library
- Snapshot tests for key visual components (dashboard layout, spec lists, runs table) and Markdown or OpenSpec rendering
- Sanity tests for Zustand stores:
  - project selection
  - change status transitions
  - run lifecycle state machine
- Basic routing / view tests to ensure the cockpit states render correctly

#### Backend

- Unit tests for:
  - git wrappers (status, branch creation, worktree management)
  - file IO (config, metadata, OpenSpec parsing)
  - AI adapter logic (prompt building, response parsing, error handling)
- Integration smoke tests for:
  - Tauri commands that orchestrate RPI flows
  - Worktree creation and cleanup
- clippy compliance is required and treated as non optional

### Git Workflow

- Trunk based:
  - `main` is always stable and releasable
- Feature branches:
  - `feat/*` for new features
  - `fix/*` for bug fixes
  - `chore/*` for tooling, infra, and non functional work
- Commit messages:
  - Concise conventional commits (for example `feat(ui): add agents dashboard`, `fix(git): handle missing worktree`)
- Pull requests:
  - Must pass Biome checks
  - Must pass `cargo fmt`, `cargo clippy`, and tests
  - Where possible, PRs should be linked to corresponding OpenSpec changes

## Domain Context

SpecOps lives in the context of AI assisted software engineering, especially for brownfield and complex repos.

Key domain ideas:

- Human remains the decision maker. Tools provide leverage, not authority.
- OpenSpec describes intent, requirements, and tasks. It is the structured spec layer.
- Context engineering is critical. Agents work best with compact, precise context.
- RPI (Research, Plan, Implement) is the default workflow for non trivial changes:
  - Research produces a compact digest of relevant files and code paths
  - Plan compresses human intent into a concrete implementation and test plan
  - Implement uses that plan plus compacted context to generate code
- Git worktrees are the mechanism to run multiple OpenSpec changes in parallel on the same repo without touching `main`.
- CodeRabbit (or similar) is used for AI assisted PR review and quality gatekeeping.

The app’s job is to orchestrate OpenSpec, agents, git, and review tools into one coherent cockpit while keeping the human in control.

## Important Constraints

- Target platform is macOS only for initial versions (Linux and Windows later)
- Single user environment per app instance (no multi tenant backend)
- The app should not try to replace the IDE:
  - No in app code editing
  - Use external editors (Cursor, VS Code, Zed) for code level work based on user preference
- Git operations are controlled and limited:
  - Create branches and worktrees
  - Inspect status and diffs
  - Do not perform destructive operations silently
- Spec transitions (for example Draft → Aligned → Ready to Implement) are always human gated, even if AI suggested
- AI context must stay compact:
  - Prefer small, precise prompts
  - Explicit research and compaction steps before large tasks
- Secrets and API keys are stored in the OS keychain or environment variables, not in repo or plain local config files

## External Dependencies

- Git CLI available on the system
- Tauri runtime and macOS system APIs for windowing, file dialogs, process spawning, and keychain
- OpenSpec:
  - Project level OpenSpec folder structure
  - Optional OpenSpec CLI for initial project setup
- AI providers and tools:
  - OpenAI compatible HTTP APIs (OpenAI, Anthropic, local proxy servers)
  - IDE based tools like Claude Code or Cursor, triggered via instructions and editor integration
- Code hosting:
  - GitHub (primary target)
  - CodeRabbit or similar AI reviewer GitHub app for PR review status
- System tools:
  - Optional `gh` CLI or similar to open PRs from branches

This context should be used by AI assistants to:

- respect the spec driven workflow
- maintain context discipline
- avoid heavy, uncontrolled codebase changes
- always keep the human approval steps in the loop
