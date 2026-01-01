# openspec-init Specification

## Purpose
TBD - created by archiving change add-openspec-init. Update Purpose after archive.
## Requirements
### Requirement: Offer OpenSpec init for missing projects
The system SHALL present an in-app action to initialize OpenSpec for any project marked as OpenSpec missing.

#### Scenario: OpenSpec missing
- **WHEN** a project is marked as OpenSpec missing
- **THEN** the UI shows an Initialize OpenSpec action

#### Scenario: OpenSpec present
- **WHEN** a project is marked as OpenSpec present
- **THEN** the Initialize OpenSpec action is not shown

### Requirement: Verify OpenSpec CLI availability on app launch
The system SHALL check for the OpenSpec CLI by running `openspec --version` when the app launches.

#### Scenario: CLI available
- **WHEN** `openspec --version` succeeds at launch
- **THEN** the app records the CLI as available for init flows

#### Scenario: CLI missing
- **WHEN** `openspec --version` fails at launch
- **THEN** the app records the CLI as missing and the init flow shows an install prompt until resolved

### Requirement: Install OpenSpec CLI on user request
The system SHALL offer to install `@fission-ai/openspec` via npm, bun, yarn, or pnpm when the CLI is missing, and SHALL only proceed after explicit user confirmation.

#### Scenario: Show package manager availability
- **WHEN** the install prompt is shown
- **THEN** the UI lists npm, bun, yarn, and pnpm with installed status

#### Scenario: Prevent unavailable selection
- **WHEN** a package manager is not installed on the machine
- **THEN** its option is disabled and cannot be selected

#### Scenario: User confirms install
- **WHEN** the user approves installation
- **THEN** the system runs the selected global install command and reports progress

#### Scenario: User declines install
- **WHEN** the user declines installation
- **THEN** the system keeps init disabled and shows manual installation guidance

### Requirement: Configure and run OpenSpec init
The system SHALL display the OpenSpec init choices in the UI and translate the user's selections into the `openspec init` invocation without requiring manual terminal steps, including the tools selection for `--tools`.

#### Scenario: Successful init
- **WHEN** the user submits the init form
- **THEN** the system runs `openspec init` for the selected project path and marks OpenSpec as present on success

#### Scenario: Select tools list
- **WHEN** the user selects one or more tools
- **THEN** the system passes a comma-separated list to `openspec init --tools`

#### Scenario: Select all tools
- **WHEN** the user selects the all-tools option
- **THEN** the system passes `--tools all` to `openspec init`

#### Scenario: Tools list fetched at init start
- **WHEN** the user starts the init flow
- **THEN** the system fetches the current tools list from the CLI and uses it as the available choices

#### Scenario: Tools list updates
- **WHEN** the CLI tools list changes in a newer OpenSpec version
- **THEN** the UI reflects the updated tools without requiring a code change

#### Scenario: Init failure
- **WHEN** the init command fails
- **THEN** the system reports the error and leaves the project marked as OpenSpec missing

