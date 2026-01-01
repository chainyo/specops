import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OpenSpecInitDialog } from "@/components/openspec-init-dialog";

const mockGetOpenSpecTools = vi.fn();
const mockGetPackageManagerStatuses = vi.fn();
const mockInstallOpenSpecCli = vi.fn();
const mockRunOpenSpecInit = vi.fn();
const mockGetOpenSpecCliStatus = vi.fn();
const mockDiscoverProject = vi.fn();

vi.mock("@tauri-apps/api/event", () => ({
	listen: vi.fn().mockResolvedValue(() => {}),
}));

vi.mock("@/lib/openspec", () => ({
	getOpenSpecCliStatus: () => mockGetOpenSpecCliStatus(),
	getOpenSpecTools: () => mockGetOpenSpecTools(),
	getPackageManagerStatuses: () => mockGetPackageManagerStatuses(),
	installOpenSpecCli: () => mockInstallOpenSpecCli(),
	runOpenSpecInit: () => mockRunOpenSpecInit(),
}));

vi.mock("@/lib/projects", () => ({
	discoverProject: () => mockDiscoverProject(),
}));

const baseProject = {
	id: "/tmp/specops",
	name: "specops",
	path: "/tmp/specops",
	openspecStatus: "missing" as const,
};

describe("OpenSpecInitDialog", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("shows package manager availability when CLI is missing", async () => {
		mockGetPackageManagerStatuses.mockResolvedValue([
			{ name: "npm", installed: false, version: null },
			{ name: "bun", installed: true, version: "1.1.0" },
		]);

		render(
			<OpenSpecInitDialog
				open
				project={baseProject}
				cliStatus={{ available: false, version: null }}
				onClose={vi.fn()}
				onProjectUpdated={vi.fn()}
				onCliStatusChange={vi.fn()}
			/>,
		);

		await screen.findByRole("button", { name: /bun/i });

		const npmButton = screen.getByRole("button", { name: /npm/i });
		const bunButton = screen.getByRole("button", { name: /bun/i });
		expect(npmButton).toBeDisabled();
		expect(bunButton).toBeEnabled();

		const installButton = screen.getByRole("button", {
			name: /install openspec cli/i,
		});
		expect(installButton).toBeEnabled();
	});

	it("loads tools when CLI is available", async () => {
		mockGetOpenSpecTools.mockResolvedValue(["claude", "cursor"]);

		render(
			<OpenSpecInitDialog
				open
				project={baseProject}
				cliStatus={{ available: true, version: "1.2.3" }}
				onClose={vi.fn()}
				onProjectUpdated={vi.fn()}
				onCliStatusChange={vi.fn()}
			/>,
		);

		await waitFor(() => {
			expect(mockGetOpenSpecTools).toHaveBeenCalled();
		});

		expect(screen.getByRole("button", { name: "All tools" })).toBeVisible();
		expect(screen.getByRole("button", { name: "claude" })).toBeVisible();
	});
});
