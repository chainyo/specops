export type OpenSpecCliStatus = {
	available: boolean;
	version?: string | null;
};

export type PackageManagerName = "npm" | "bun" | "yarn" | "pnpm";

export type PackageManagerStatus = {
	name: PackageManagerName;
	installed: boolean;
	version?: string | null;
};

export type OpenSpecToolsMode = "all" | "custom" | "none";

export type OpenSpecInitRequest = {
	path: string;
	toolsMode: OpenSpecToolsMode;
	tools: string[];
};

export type CommandRunOutput = {
	status: number;
	stdout: string;
	stderr: string;
};

export type CliOutputLine = {
	stream: "stdout" | "stderr";
	line: string;
};

export type CliOutputEvent = {
	operation: "install" | "init";
	stream: "stdout" | "stderr";
	line: string;
};
