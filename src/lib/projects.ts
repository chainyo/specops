import { invoke } from "@tauri-apps/api/core";

import type { ProjectDiscoveryResult } from "@/types/projects";

export async function discoverProject(
	path: string,
): Promise<ProjectDiscoveryResult> {
	return invoke<ProjectDiscoveryResult>("discover_project", { path });
}
