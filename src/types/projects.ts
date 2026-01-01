export type ProjectDiscoveryResult = {
	repoPath: string;
	repoName: string;
	openspecPresent: boolean;
};

export type ProjectDiscoveryError = {
	code: string;
	message: string;
};

export type OpenSpecStatus = "present" | "missing";

export type Project = {
	id: string;
	name: string;
	path: string;
	openspecStatus: OpenSpecStatus;
};
