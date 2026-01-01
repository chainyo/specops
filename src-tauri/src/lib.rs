use serde::{Deserialize, Serialize};
use std::{
	fs,
	io::{BufRead, BufReader},
	path::{Path, PathBuf},
	process::{Command, Stdio},
	sync::{Arc, Mutex},
	thread,
};
use tauri::{Emitter, Window};
use thiserror::Error;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProjectDiscovery {
	repo_path: String,
	repo_name: String,
	openspec_present: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct OpenSpecCliStatus {
	available: bool,
	version: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PackageManagerStatus {
	name: String,
	installed: bool,
	version: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CliOutputEvent {
	operation: String,
	stream: String,
	line: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CommandRunOutput {
	status: i32,
	stdout: String,
	stderr: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct OpenSpecInitRequest {
	path: String,
	tools_mode: OpenSpecToolsMode,
	tools: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
enum OpenSpecToolsMode {
	All,
	Custom,
	None,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProjectDiscoveryErrorPayload {
	code: String,
	message: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct OpenSpecCommandErrorPayload {
	code: String,
	message: String,
}

#[derive(Debug, Error)]
enum DiscoveryError {
	#[error("Path does not exist")]
	MissingPath,
	#[error("Path is not a directory")]
	NotDirectory,
	#[error("Git is not available on this system")]
	GitUnavailable,
	#[error("Path is not a git work tree")]
	NotGitWorkTree,
	#[error("Could not resolve repository root")]
	RepoRootUnavailable,
	#[error(transparent)]
	Io(#[from] std::io::Error),
}

#[derive(Debug, Error)]
enum OpenSpecCommandError {
	#[error("OpenSpec CLI is not available")]
	CliUnavailable,
	#[error("Package manager is not supported")]
	UnsupportedPackageManager,
	#[error("Package manager is not available")]
	PackageManagerUnavailable,
	#[error("No tools were selected")]
	MissingToolsSelection,
	#[error("Unable to parse tools list")]
	ToolsParseFailed,
	#[error("Command failed: {command}")]
	CommandFailed {
		command: String,
		status: i32,
		stderr: String,
	},
	#[error(transparent)]
	Io(#[from] std::io::Error),
}

impl From<DiscoveryError> for ProjectDiscoveryErrorPayload {
	fn from(error: DiscoveryError) -> Self {
		let (code, message) = match error {
			DiscoveryError::MissingPath => ("path_not_found", "Path does not exist"),
			DiscoveryError::NotDirectory => ("path_not_directory", "Path is not a directory"),
			DiscoveryError::GitUnavailable => ("git_unavailable", "Git is not available"),
			DiscoveryError::NotGitWorkTree => ("not_git_work_tree", "Path is not a git work tree"),
			DiscoveryError::RepoRootUnavailable => {
				("repo_root_unavailable", "Could not resolve repository root")
			}
			DiscoveryError::Io(_) => ("io_error", "File system error"),
		};

		Self {
			code: code.to_string(),
			message: message.to_string(),
		}
	}
}

impl From<OpenSpecCommandError> for OpenSpecCommandErrorPayload {
	fn from(error: OpenSpecCommandError) -> Self {
		let (code, message) = match error {
			OpenSpecCommandError::CliUnavailable => (
				"openspec_unavailable",
				"OpenSpec CLI is not available".to_string(),
			),
			OpenSpecCommandError::UnsupportedPackageManager => (
				"package_manager_unsupported",
				"Package manager is not supported".to_string(),
			),
			OpenSpecCommandError::PackageManagerUnavailable => (
				"package_manager_unavailable",
				"Package manager is not available".to_string(),
			),
			OpenSpecCommandError::MissingToolsSelection => {
				("tools_missing", "Select at least one tool".to_string())
			}
			OpenSpecCommandError::ToolsParseFailed => (
				"tools_parse_failed",
				"Unable to parse the OpenSpec tools list".to_string(),
			),
			OpenSpecCommandError::CommandFailed {
				command,
				status,
				stderr,
			} => {
				let mut message =
					format!("{command} exited with status {status}");
				if !stderr.trim().is_empty() {
					message.push_str(&format!(": {stderr}"));
				}
				("command_failed", message)
			}
			OpenSpecCommandError::Io(_) => ("io_error", "Command failed to run".to_string()),
		};

		Self {
			code: code.to_string(),
			message,
		}
	}
}

fn discover_project_info(path: &Path) -> Result<ProjectDiscovery, DiscoveryError> {
	if !path.exists() {
		return Err(DiscoveryError::MissingPath);
	}
	if !path.is_dir() {
		return Err(DiscoveryError::NotDirectory);
	}

	let output = Command::new("git")
		.arg("-C")
		.arg(path)
		.arg("rev-parse")
		.arg("--show-toplevel")
		.output()
		.map_err(|_| DiscoveryError::GitUnavailable)?;

	if !output.status.success() {
		return Err(DiscoveryError::NotGitWorkTree);
	}

	let stdout = String::from_utf8_lossy(&output.stdout);
	let repo_root_str = stdout.trim();
	if repo_root_str.is_empty() {
		return Err(DiscoveryError::RepoRootUnavailable);
	}

	let repo_root = PathBuf::from(repo_root_str);
	let openspec_present = fs::metadata(repo_root.join("openspec"))
		.map(|metadata| metadata.is_dir())
		.unwrap_or(false);
	let repo_name = repo_root
		.file_name()
		.and_then(|name| name.to_str())
		.unwrap_or(repo_root_str)
		.to_string();

	Ok(ProjectDiscovery {
		repo_path: repo_root.to_string_lossy().to_string(),
		repo_name,
		openspec_present,
	})
}

fn command_version(command: &str) -> Option<String> {
	let output = Command::new(command).arg("--version").output().ok()?;
	if !output.status.success() {
		return None;
	}
	let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
	let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
	if !stdout.is_empty() {
		Some(stdout)
	} else if !stderr.is_empty() {
		Some(stderr)
	} else {
		Some(String::new())
	}
}

fn package_manager_status(name: &str) -> PackageManagerStatus {
	let version = command_version(name);
	PackageManagerStatus {
		name: name.to_string(),
		installed: version.is_some(),
		version,
	}
}

fn parse_openspec_tools(help_text: &str) -> Result<Vec<String>, OpenSpecCommandError> {
	let mut lines = help_text.lines().peekable();

	while let Some(line) = lines.next() {
		if let Some(index) = line.find("list of:") {
			let mut segments = Vec::new();
			let list = line[index + "list of:".len()..].trim();
			if !list.is_empty() {
				segments.push(list.to_string());
			}

			while let Some(next) = lines.peek() {
				let trimmed = next.trim();
				if trimmed.is_empty()
					|| trimmed.starts_with('-')
					|| trimmed.starts_with("Options:")
					|| trimmed.starts_with("Usage:")
				{
					break;
				}
				segments.push(trimmed.to_string());
				lines.next();
			}

			let combined = segments.join(" ");
			let tools = combined
				.split(',')
				.map(|entry| entry.trim().trim_end_matches('.'))
				.filter(|entry| !entry.is_empty())
				.map(String::from)
				.collect::<Vec<_>>();
			if tools.is_empty() {
				return Err(OpenSpecCommandError::ToolsParseFailed);
			}
			return Ok(tools);
		}
	}

	Err(OpenSpecCommandError::ToolsParseFailed)
}

fn build_tools_arg(
	mode: &OpenSpecToolsMode,
	tools: &[String],
) -> Result<String, OpenSpecCommandError> {
	match mode {
		OpenSpecToolsMode::All => Ok("all".to_string()),
		OpenSpecToolsMode::Custom => {
			let selected = tools
				.iter()
				.map(|tool| tool.trim())
				.filter(|tool| !tool.is_empty())
				.collect::<Vec<_>>();
			if selected.is_empty() {
				return Err(OpenSpecCommandError::MissingToolsSelection);
			}
			Ok(selected.join(","))
		}
		OpenSpecToolsMode::None => Ok("none".to_string()),
	}
}

fn run_command_with_events(
	window: &Window,
	operation: &str,
	command: &str,
	args: &[String],
	current_dir: Option<&Path>,
) -> Result<CommandRunOutput, OpenSpecCommandError> {
	let mut command_builder = Command::new(command);
	command_builder.args(args);
	if let Some(dir) = current_dir {
		command_builder.current_dir(dir);
	}
	let mut child = command_builder
		.stdout(Stdio::piped())
		.stderr(Stdio::piped())
		.spawn()
		.map_err(|error| {
			if error.kind() == std::io::ErrorKind::NotFound {
				if command == "openspec" {
					OpenSpecCommandError::CliUnavailable
				} else {
					OpenSpecCommandError::PackageManagerUnavailable
				}
			} else {
				OpenSpecCommandError::Io(error)
			}
		})?;

	let stdout = child
		.stdout
		.take()
		.ok_or_else(|| OpenSpecCommandError::Io(std::io::Error::new(
			std::io::ErrorKind::Other,
			"Missing stdout",
		)))?;
	let stderr = child
		.stderr
		.take()
		.ok_or_else(|| OpenSpecCommandError::Io(std::io::Error::new(
			std::io::ErrorKind::Other,
			"Missing stderr",
		)))?;

	let stdout_lines = Arc::new(Mutex::new(Vec::new()));
	let stderr_lines = Arc::new(Mutex::new(Vec::new()));

	let stdout_store = Arc::clone(&stdout_lines);
	let stderr_store = Arc::clone(&stderr_lines);
	let stdout_window = window.clone();
	let stderr_window = window.clone();
	let operation_name = operation.to_string();
	let operation_err = operation.to_string();

	let stdout_handle = thread::spawn(move || {
		let reader = BufReader::new(stdout);
		for line in reader.lines().flatten() {
			if let Ok(mut stored) = stdout_store.lock() {
				stored.push(line.clone());
			}
			let _ = stdout_window.emit(
				"openspec://cli-output",
				CliOutputEvent {
					operation: operation_name.clone(),
					stream: "stdout".to_string(),
					line,
				},
			);
		}
	});

	let stderr_handle = thread::spawn(move || {
		let reader = BufReader::new(stderr);
		for line in reader.lines().flatten() {
			if let Ok(mut stored) = stderr_store.lock() {
				stored.push(line.clone());
			}
			let _ = stderr_window.emit(
				"openspec://cli-output",
				CliOutputEvent {
					operation: operation_err.clone(),
					stream: "stderr".to_string(),
					line,
				},
			);
		}
	});

	let status = child.wait().map_err(OpenSpecCommandError::Io)?;
	let _ = stdout_handle.join();
	let _ = stderr_handle.join();

	let stdout = stdout_lines
		.lock()
		.map(|lines| lines.join("\n"))
		.unwrap_or_default();
	let stderr = stderr_lines
		.lock()
		.map(|lines| lines.join("\n"))
		.unwrap_or_default();
	let status_code = status.code().unwrap_or(-1);

	if status.success() {
		Ok(CommandRunOutput {
			status: status_code,
			stdout,
			stderr,
		})
	} else {
		Err(OpenSpecCommandError::CommandFailed {
			command: command.to_string(),
			status: status_code,
			stderr,
		})
	}
}

#[tauri::command]
fn discover_project(path: String) -> Result<ProjectDiscovery, ProjectDiscoveryErrorPayload> {
	discover_project_info(Path::new(&path)).map_err(ProjectDiscoveryErrorPayload::from)
}

#[tauri::command]
fn openspec_cli_status() -> OpenSpecCliStatus {
	if let Some(version) = command_version("openspec") {
		OpenSpecCliStatus {
			available: true,
			version: Some(version),
		}
	} else {
		OpenSpecCliStatus {
			available: false,
			version: None,
		}
	}
}

#[tauri::command]
fn package_manager_statuses() -> Vec<PackageManagerStatus> {
	["npm", "bun", "yarn", "pnpm"]
		.iter()
		.map(|name| package_manager_status(name))
		.collect()
}

#[tauri::command]
fn openspec_tools() -> Result<Vec<String>, OpenSpecCommandErrorPayload> {
	let output = Command::new("openspec")
		.arg("init")
		.arg("--help")
		.output()
		.map_err(|error| {
			if error.kind() == std::io::ErrorKind::NotFound {
				OpenSpecCommandError::CliUnavailable
			} else {
				OpenSpecCommandError::Io(error)
			}
		})?;

	if !output.status.success() {
		return Err(OpenSpecCommandError::CliUnavailable.into());
	}

	let stdout = String::from_utf8_lossy(&output.stdout);
	let stderr = String::from_utf8_lossy(&output.stderr);
	let combined = format!("{stdout}\n{stderr}");
	parse_openspec_tools(&combined).map_err(OpenSpecCommandErrorPayload::from)
}

#[tauri::command]
fn install_openspec_cli(
	window: Window,
	package_manager: String,
) -> Result<CommandRunOutput, OpenSpecCommandErrorPayload> {
	let status = package_manager_status(&package_manager);
	if !status.installed {
		return Err(OpenSpecCommandError::PackageManagerUnavailable.into());
	}

	let (command, args) = match package_manager.as_str() {
		"npm" => (
			"npm",
			vec!["install", "-g", "@fission-ai/openspec@latest"],
		),
		"bun" => ("bun", vec!["add", "-g", "@fission-ai/openspec@latest"]),
		"yarn" => ("yarn", vec!["global", "add", "@fission-ai/openspec@latest"]),
		"pnpm" => ("pnpm", vec!["add", "-g", "@fission-ai/openspec@latest"]),
		_ => return Err(OpenSpecCommandError::UnsupportedPackageManager.into()),
	};

	let args = args.iter().map(|arg| arg.to_string()).collect::<Vec<_>>();
	run_command_with_events(&window, "install", command, &args, None)
		.map_err(OpenSpecCommandErrorPayload::from)
}

#[tauri::command]
fn openspec_init(
	window: Window,
	request: OpenSpecInitRequest,
) -> Result<CommandRunOutput, OpenSpecCommandErrorPayload> {
	let tools_arg = build_tools_arg(&request.tools_mode, &request.tools)
		.map_err(OpenSpecCommandErrorPayload::from)?;
	let args = vec![
		"init".to_string(),
		request.path,
		"--tools".to_string(),
		tools_arg,
	];

	run_command_with_events(&window, "init", "openspec", &args, None)
		.map_err(OpenSpecCommandErrorPayload::from)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
	tauri::Builder::default()
		.plugin(tauri_plugin_dialog::init())
		.plugin(tauri_plugin_opener::init())
		.invoke_handler(tauri::generate_handler![
			discover_project,
			openspec_cli_status,
			package_manager_statuses,
			openspec_tools,
			install_openspec_cli,
			openspec_init
		])
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
	use super::*;
	use std::fs;
	use std::path::Path;
	use std::process::Command;
	use tempfile::TempDir;

	fn git_available() -> bool {
		Command::new("git").arg("--version").output().is_ok()
	}

	fn init_git_repo(path: &Path) {
		let status = Command::new("git")
			.arg("-C")
			.arg(path)
			.arg("init")
			.arg("-q")
			.status()
			.expect("failed to run git init");
		assert!(status.success());
	}

	#[test]
	fn rejects_non_git_directory() {
		if !git_available() {
			return;
		}

		let temp_dir = TempDir::new().expect("create temp dir");
		let error = discover_project_info(temp_dir.path()).expect_err("expected error");
		assert!(matches!(error, DiscoveryError::NotGitWorkTree));
	}

	#[test]
	fn detects_repo_without_openspec() {
		if !git_available() {
			return;
		}

		let temp_dir = TempDir::new().expect("create temp dir");
		init_git_repo(temp_dir.path());

		let result = discover_project_info(temp_dir.path()).expect("discovery succeeds");
		assert!(!result.openspec_present);
		assert_eq!(
			result.repo_path,
			temp_dir.path().to_string_lossy().to_string(),
		);
	}

	#[test]
	fn detects_openspec_and_repo_root_from_subdir() {
		if !git_available() {
			return;
		}

		let temp_dir = TempDir::new().expect("create temp dir");
		init_git_repo(temp_dir.path());
		fs::create_dir_all(temp_dir.path().join("openspec"))
			.expect("create openspec dir");

		let nested = temp_dir.path().join("nested");
		fs::create_dir_all(&nested).expect("create nested dir");

		let result = discover_project_info(&nested).expect("discovery succeeds");
		assert!(result.openspec_present);
		assert_eq!(
			result.repo_path,
			temp_dir.path().to_string_lossy().to_string(),
		);
	}

	#[test]
	fn parses_tools_from_help() {
		let help = r#"--tools <tools>  Configure AI tools non-interactively. Use "all", "none", or a comma-separated list of: auggie, claude, cline, cursor"#;
		let tools = parse_openspec_tools(help).expect("tools parsed");
		assert_eq!(tools, vec!["auggie", "claude", "cline", "cursor"]);
	}

	#[test]
	fn parses_wrapped_tools_from_help() {
		let help = r#"Options:
  --tools <tools>  Configure AI tools non-interactively. Use "all", "none", or a comma-separated list of: auggie, claude, cline,
                   cursor, gemini, opencode
  -h, --help       display help for command"#;
		let tools = parse_openspec_tools(help).expect("tools parsed");
		assert_eq!(
			tools,
			vec!["auggie", "claude", "cline", "cursor", "gemini", "opencode"],
		);
	}

	#[test]
	fn rejects_missing_tools_in_custom_mode() {
		let result = build_tools_arg(&OpenSpecToolsMode::Custom, &[]);
		assert!(matches!(result, Err(OpenSpecCommandError::MissingToolsSelection)));
	}

	#[test]
	fn builds_tools_arg_for_all_mode() {
		let result = build_tools_arg(&OpenSpecToolsMode::All, &[]).expect("all");
		assert_eq!(result, "all");
	}

	#[test]
	fn builds_tools_arg_for_none_mode() {
		let result = build_tools_arg(&OpenSpecToolsMode::None, &[]).expect("none");
		assert_eq!(result, "none");
	}

	#[test]
	fn builds_tools_arg_for_custom_mode() {
		let result = build_tools_arg(
			&OpenSpecToolsMode::Custom,
			&["claude".to_string(), "cline".to_string()],
		)
		.expect("custom");
		assert_eq!(result, "claude,cline");
	}
}
