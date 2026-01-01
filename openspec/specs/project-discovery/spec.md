# project-discovery Specification

## Purpose
TBD - created by archiving change add-project-discovery. Update Purpose after archive.
## Requirements
### Requirement: Add local project
The system SHALL allow a user to add a local git work tree by selecting a folder from a native picker.

#### Scenario: Add valid git work tree
- **WHEN** the user selects a folder that is a git work tree
- **THEN** the system adds a project entry tied to that path

#### Scenario: Reject non-git folder
- **WHEN** the user selects a folder that is not a git work tree
- **THEN** the system informs the user and does not add a project entry

#### Scenario: Picker starts at user home
- **WHEN** the user opens the folder picker
- **THEN** the picker starts at the user's home directory

### Requirement: Detect OpenSpec folder
The system SHALL detect whether an added project contains an `openspec/` directory at the repository root.

#### Scenario: OpenSpec present
- **WHEN** the repository has an `openspec/` directory at its root
- **THEN** the project status is marked as OpenSpec present

#### Scenario: OpenSpec missing
- **WHEN** the repository lacks an `openspec/` directory at its root
- **THEN** the project status is marked as OpenSpec missing

### Requirement: Display project list
The system SHALL display a list of added projects with repository name, path, and OpenSpec status.

#### Scenario: One or more projects
- **WHEN** the user has added at least one project
- **THEN** the project list renders each entry with name, path, and OpenSpec status

#### Scenario: No projects
- **WHEN** the user has not added any projects
- **THEN** the UI shows an empty state for the project list

