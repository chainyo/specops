import { create } from "zustand";

import type {
	OpenSpecStatus,
	Project,
	ProjectDiscoveryResult,
} from "@/types/projects";

export type ProjectsState = {
	projects: Project[];
	addProject: (project: Project) => void;
};

export const useProjectsStore = create<ProjectsState>((set) => ({
	projects: [],
	addProject: (project) =>
		set((state) => {
			const existingIndex = state.projects.findIndex(
				(entry) => entry.path === project.path,
			);
			if (existingIndex >= 0) {
				const nextProjects = [...state.projects];
				nextProjects[existingIndex] = project;
				return { projects: nextProjects };
			}
			return { projects: [project, ...state.projects] };
		}),
}));

export function createProjectFromDiscovery(
	result: ProjectDiscoveryResult,
): Project {
	return {
		id: result.repoPath,
		name: result.repoName,
		path: result.repoPath,
		openspecStatus: toOpenSpecStatus(result.openspecPresent),
	};
}

export function openSpecStatusLabel(status: OpenSpecStatus): string {
	return status === "present" ? "Present" : "Missing";
}

function toOpenSpecStatus(present: boolean): OpenSpecStatus {
	return present ? "present" : "missing";
}
