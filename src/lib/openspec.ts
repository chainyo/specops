import { invoke } from "@tauri-apps/api/core";

import type {
	CommandRunOutput,
	OpenSpecCliStatus,
	OpenSpecInitRequest,
	PackageManagerName,
	PackageManagerStatus,
} from "@/types/openspec";

export async function getOpenSpecCliStatus(): Promise<OpenSpecCliStatus> {
	return invoke<OpenSpecCliStatus>("openspec_cli_status");
}

export async function getPackageManagerStatuses(): Promise<
	PackageManagerStatus[]
> {
	return invoke<PackageManagerStatus[]>("package_manager_statuses");
}

export async function getOpenSpecTools(): Promise<string[]> {
	return invoke<string[]>("openspec_tools");
}

export async function installOpenSpecCli(
	packageManager: PackageManagerName,
): Promise<CommandRunOutput> {
	return invoke<CommandRunOutput>("install_openspec_cli", {
		packageManager,
	});
}

export async function runOpenSpecInit(
	request: OpenSpecInitRequest,
): Promise<CommandRunOutput> {
	return invoke<CommandRunOutput>("openspec_init", { request });
}
