use serde::Serialize;
use std::{
	fs,
	path::{Path, PathBuf},
	process::Command,
};
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
struct ProjectDiscoveryErrorPayload {
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

#[tauri::command]
fn discover_project(path: String) -> Result<ProjectDiscovery, ProjectDiscoveryErrorPayload> {
	discover_project_info(Path::new(&path)).map_err(ProjectDiscoveryErrorPayload::from)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
	tauri::Builder::default()
		.plugin(tauri_plugin_dialog::init())
		.plugin(tauri_plugin_opener::init())
		.invoke_handler(tauri::generate_handler![discover_project])
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
}
