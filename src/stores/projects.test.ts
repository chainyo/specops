import { describe, expect, it } from "vitest";

import {
	createProjectFromDiscovery,
	openSpecStatusLabel,
	useProjectsStore,
} from "@/stores/projects";
import type { Project } from "@/types/projects";

const resetStore = () => {
	useProjectsStore.setState({ projects: [] });
};

describe("projects store", () => {
	it("maps discovery results into projects", () => {
		const project = createProjectFromDiscovery({
			repoName: "specops",
			repoPath: "/tmp/specops",
			openspecPresent: true,
		});

		expect(project).toEqual({
			id: "/tmp/specops",
			name: "specops",
			path: "/tmp/specops",
			openspecStatus: "present",
		});
	});

	it("adds projects and preserves latest ordering", () => {
		resetStore();

		const first: Project = {
			id: "/tmp/one",
			name: "one",
			path: "/tmp/one",
			openspecStatus: "missing",
		};
		const second: Project = {
			id: "/tmp/two",
			name: "two",
			path: "/tmp/two",
			openspecStatus: "present",
		};

		useProjectsStore.getState().addProject(first);
		useProjectsStore.getState().addProject(second);

		const { projects } = useProjectsStore.getState();
		expect(projects).toHaveLength(2);
		expect(projects[0].path).toBe("/tmp/two");
		expect(projects[1].path).toBe("/tmp/one");
	});

	it("updates existing project entries by path", () => {
		resetStore();

		const project: Project = {
			id: "/tmp/specops",
			name: "specops",
			path: "/tmp/specops",
			openspecStatus: "present",
		};
		useProjectsStore.getState().addProject(project);
		useProjectsStore.getState().addProject({
			...project,
			openspecStatus: "missing",
		});

		const { projects } = useProjectsStore.getState();
		expect(projects).toHaveLength(1);
		expect(projects[0].openspecStatus).toBe("missing");
	});

	it("renders readable status labels", () => {
		expect(openSpecStatusLabel("present")).toBe("Present");
		expect(openSpecStatusLabel("missing")).toBe("Missing");
	});
});
