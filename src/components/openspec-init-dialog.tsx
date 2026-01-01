import { listen } from "@tauri-apps/api/event";
import { Loader2, Terminal } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	getOpenSpecCliStatus,
	getOpenSpecTools,
	getPackageManagerStatuses,
	installOpenSpecCli,
	runOpenSpecInit,
} from "@/lib/openspec";
import { discoverProject } from "@/lib/projects";
import { createProjectFromDiscovery } from "@/stores/projects";
import type {
	CliOutputEvent,
	CliOutputLine,
	OpenSpecCliStatus,
	OpenSpecInitRequest,
	OpenSpecToolsMode,
	PackageManagerName,
	PackageManagerStatus,
} from "@/types/openspec";
import type { Project, ProjectDiscoveryError } from "@/types/projects";

const DEFAULT_TOOL_MODE: OpenSpecToolsMode = "none";

const INSTALL_OPERATION = "install";
const INIT_OPERATION = "init";

const TOOL_LABELS: Record<string, string> = {
	"amazon-q": "Amazon Q",
	"github-copilot": "GitHub Copilot",
};

type OpenSpecInitDialogProps = {
	open: boolean;
	project: Project | null;
	cliStatus: OpenSpecCliStatus | null;
	onClose: () => void;
	onProjectUpdated: (project: Project) => void;
	onCliStatusChange: (status: OpenSpecCliStatus) => void;
};

export function OpenSpecInitDialog({
	open,
	project,
	cliStatus,
	onClose,
	onProjectUpdated,
	onCliStatusChange,
}: OpenSpecInitDialogProps) {
	const [tools, setTools] = useState<string[]>([]);
	const [toolsMode, setToolsMode] =
		useState<OpenSpecToolsMode>(DEFAULT_TOOL_MODE);
	const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());
	const [isLoadingTools, setIsLoadingTools] = useState(false);
	const [toolsError, setToolsError] = useState<string | null>(null);

	const [packageManagers, setPackageManagers] = useState<
		PackageManagerStatus[]
	>([]);
	const [selectedPackageManager, setSelectedPackageManager] =
		useState<PackageManagerName | null>(null);
	const [isInstalling, setIsInstalling] = useState(false);
	const [installError, setInstallError] = useState<string | null>(null);

	const [isRunningInit, setIsRunningInit] = useState(false);
	const [initError, setInitError] = useState<string | null>(null);

	const [logs, setLogs] = useState<{
		install: CliOutputLine[];
		init: CliOutputLine[];
	}>({ install: [], init: [] });

	const availablePackageManagers = useMemo(
		() => packageManagers.filter((manager) => manager.installed),
		[packageManagers],
	);
	const selectedToolList = useMemo(
		() => Array.from(selectedTools),
		[selectedTools],
	);
	const isAllMode = toolsMode === "all";
	const isNoneMode = toolsMode === "none";
	const canRunInit =
		!!project &&
		!!cliStatus?.available &&
		!isRunningInit &&
		!isLoadingTools &&
		tools.length > 0 &&
		(toolsMode !== "custom" || selectedTools.size > 0);

	useEffect(() => {
		if (!open) {
			return;
		}

		let unlisten: (() => void) | null = null;
		listen<CliOutputEvent>("openspec://cli-output", (event) => {
			setLogs((previous) => {
				const line = {
					stream: event.payload.stream,
					line: event.payload.line,
				};
				if (event.payload.operation === INSTALL_OPERATION) {
					return {
						...previous,
						install: [...previous.install, line],
					};
				}
				if (event.payload.operation === INIT_OPERATION) {
					return {
						...previous,
						init: [...previous.init, line],
					};
				}
				return previous;
			});
		})
			.then((unlistenFn) => {
				unlisten = unlistenFn;
			})
			.catch(() => {
				unlisten = null;
			});

		return () => {
			if (unlisten) {
				unlisten();
			}
		};
	}, [open]);

	const loadTools = useCallback(async () => {
		setIsLoadingTools(true);
		setToolsError(null);
		try {
			const fetchedTools = await getOpenSpecTools();
			setTools(fetchedTools);
			setSelectedTools(new Set());
		} catch (error) {
			setToolsError(readErrorMessage(error, "Unable to load tools."));
		} finally {
			setIsLoadingTools(false);
		}
	}, []);

	const loadPackageManagers = useCallback(async () => {
		try {
			const managers = await getPackageManagerStatuses();
			setPackageManagers(managers);
			const firstInstalled = managers.find((manager) => manager.installed);
			setSelectedPackageManager(firstInstalled?.name ?? null);
		} catch (error) {
			setInstallError(
				readErrorMessage(error, "Unable to detect package managers."),
			);
		}
	}, []);

	useEffect(() => {
		if (!open || !project) {
			return;
		}

		setTools([]);
		setToolsMode(DEFAULT_TOOL_MODE);
		setSelectedTools(new Set());
		setIsLoadingTools(false);
		setToolsError(null);
		setPackageManagers([]);
		setSelectedPackageManager(null);
		setIsInstalling(false);
		setInstallError(null);
		setIsRunningInit(false);
		setInitError(null);
		setLogs({ install: [], init: [] });

		if (cliStatus?.available) {
			void loadTools();
		} else if (cliStatus && !cliStatus.available) {
			void loadPackageManagers();
		}
	}, [open, project, cliStatus, loadPackageManagers, loadTools]);

	const handleClose = () => {
		onClose();
	};

	const handleToggleAllTools = () => {
		if (tools.length === 0) {
			return;
		}
		setToolsMode("all");
		setSelectedTools(new Set(tools));
	};

	const handleToggleNoTools = () => {
		setToolsMode("none");
		setSelectedTools(new Set());
	};

	const handleToggleTool = (tool: string) => {
		setToolsMode("custom");
		setSelectedTools((previous) => {
			const next = new Set(previous);
			if (next.has(tool)) {
				next.delete(tool);
			} else {
				next.add(tool);
			}
			return next;
		});
	};

	const handleInstall = async () => {
		if (!selectedPackageManager) {
			return;
		}
		setInstallError(null);
		setIsInstalling(true);
		setLogs((previous) => ({ ...previous, install: [] }));

		try {
			await installOpenSpecCli(selectedPackageManager);
			const status = await getOpenSpecCliStatus();
			onCliStatusChange(status);
			if (!status.available) {
				const message =
					"OpenSpec CLI is still unavailable after install. Check the global PATH.";
				setInstallError(message);
				setLogs((previous) =>
					previous.install.length > 0
						? previous
						: {
								...previous,
								install: [{ stream: "stderr", line: message }],
							},
				);
				return;
			}
			await loadTools();
		} catch (error) {
			const message = readErrorMessage(error, "Install failed.");
			setInstallError(message);
			setLogs((previous) =>
				previous.install.length > 0
					? previous
					: { ...previous, install: [{ stream: "stderr", line: message }] },
			);
		} finally {
			setIsInstalling(false);
		}
	};

	const handleInit = async () => {
		if (!project) {
			return;
		}
		setInitError(null);
		setIsRunningInit(true);
		setLogs((previous) => ({ ...previous, init: [] }));

		const request: OpenSpecInitRequest = {
			path: project.path,
			toolsMode,
			tools: selectedToolList,
		};

		try {
			await runOpenSpecInit(request);
			const result = await discoverProject(project.path);
			onProjectUpdated(createProjectFromDiscovery(result));
			handleClose();
		} catch (error) {
			const fallback = "OpenSpec init failed. Review the output and try again.";
			const message = readErrorMessage(error, fallback);
			setInitError(message);
			setLogs((previous) =>
				previous.init.length > 0
					? previous
					: { ...previous, init: [{ stream: "stderr", line: message }] },
			);
		} finally {
			setIsRunningInit(false);
		}
	};

	const initOutput = logs.init;
	const installOutput = logs.install;

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next) {
					handleClose();
				}
			}}
		>
			<DialogContent className="sm:max-w-3xl">
				<DialogHeader>
					<DialogTitle>Initialize OpenSpec</DialogTitle>
					<DialogDescription>
						{project
							? `Set up OpenSpec in ${project.name} without leaving SpecOps.`
							: "Set up OpenSpec without leaving SpecOps."}
					</DialogDescription>
				</DialogHeader>

				{!cliStatus ? (
					<div className="flex items-center gap-3 text-sm text-muted-foreground">
						<Loader2 className="size-4 animate-spin" />
						<span>Checking OpenSpec CLI...</span>
					</div>
				) : cliStatus.available ? (
					<div className="space-y-6">
						<div className="space-y-3">
							<div className="flex flex-wrap items-center justify-between gap-3">
								<div>
									<h3 className="text-sm font-medium">Tools</h3>
									<p className="text-xs text-muted-foreground">
										Pick one or more tools to initialize, or choose none.
									</p>
								</div>
								{isLoadingTools ? (
									<div className="flex items-center gap-2 text-xs text-muted-foreground">
										<Loader2 className="size-3 animate-spin" />
										<span>Fetching tools...</span>
									</div>
								) : null}
							</div>
							<div className="flex flex-wrap gap-2">
								<Button
									type="button"
									variant={isNoneMode ? "default" : "outline"}
									size="sm"
									onClick={handleToggleNoTools}
									disabled={isLoadingTools || tools.length === 0}
									aria-pressed={isNoneMode}
								>
									No tools
								</Button>
								<Button
									type="button"
									variant={isAllMode ? "default" : "outline"}
									size="sm"
									onClick={handleToggleAllTools}
									disabled={isLoadingTools || tools.length === 0}
									aria-pressed={isAllMode}
								>
									All tools
								</Button>
								{tools.map((tool) => {
									const selected = selectedTools.has(tool);
									return (
										<Button
											key={tool}
											type="button"
											variant={selected ? "default" : "outline"}
											size="sm"
											onClick={() => handleToggleTool(tool)}
											disabled={isLoadingTools}
											aria-pressed={selected}
										>
											{TOOL_LABELS[tool] ?? tool}
										</Button>
									);
								})}
							</div>
							{toolsError ? (
								<p className="text-xs text-destructive">{toolsError}</p>
							) : null}
							{toolsMode === "custom" && selectedTools.size === 0 ? (
								<p className="text-xs text-muted-foreground">
									Select at least one tool to continue.
								</p>
							) : null}
						</div>

						{initOutput.length > 0 ? (
							<OutputPanel title="Init output" lines={initOutput} />
						) : null}

						{initError ? (
							<p className="text-sm text-destructive" role="alert">
								{initError}
							</p>
						) : null}
					</div>
				) : (
					<div className="space-y-6">
						<div className="space-y-3">
							<div>
								<h3 className="text-sm font-medium">OpenSpec CLI missing</h3>
								<p className="text-xs text-muted-foreground">
									Install the CLI with a package manager on this machine.
								</p>
							</div>
							<div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1">
								{packageManagers.map((manager) => {
									const isSelected = selectedPackageManager === manager.name;
									return (
										<button
											type="button"
											key={manager.name}
											onClick={() =>
												manager.installed
													? setSelectedPackageManager(manager.name)
													: null
											}
											disabled={!manager.installed}
											className={`flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition ${
												manager.installed
													? isSelected
														? "border-emerald-400 bg-emerald-200 text-emerald-900 shadow-sm"
														: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300"
													: "border-slate-200 bg-slate-100 text-slate-500"
											} ${manager.installed ? "" : "cursor-not-allowed border-dashed"}`}
										>
											<span className="font-medium">{manager.name}</span>
										</button>
									);
								})}
							</div>
							{availablePackageManagers.length === 0 ? (
								<p className="text-xs text-muted-foreground">
									Install npm, bun, yarn, or pnpm to continue.
								</p>
							) : null}
						</div>

						{installOutput.length > 0 ? (
							<OutputPanel title="Install output" lines={installOutput} />
						) : null}

						{installError ? (
							<p className="text-sm text-destructive" role="alert">
								{installError}
							</p>
						) : null}
					</div>
				)}

				<DialogFooter className="gap-2 sm:gap-2">
					<Button type="button" variant="ghost" onClick={handleClose}>
						Cancel
					</Button>
					{cliStatus?.available ? (
						<Button type="button" onClick={handleInit} disabled={!canRunInit}>
							{isRunningInit ? (
								<Loader2 className="size-4 animate-spin" />
							) : (
								<Terminal className="size-4" />
							)}
							Initialize OpenSpec
						</Button>
					) : (
						<Button
							type="button"
							onClick={handleInstall}
							disabled={!selectedPackageManager || isInstalling}
						>
							{isInstalling ? (
								<Loader2 className="size-4 animate-spin" />
							) : (
								<Terminal className="size-4" />
							)}
							Install OpenSpec CLI
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function OutputPanel({
	title,
	lines,
}: {
	title: string;
	lines: CliOutputLine[];
}) {
	return (
		<div className="space-y-2">
			<div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
				<Terminal className="size-3" />
				<span>{title}</span>
			</div>
			<div className="max-h-40 overflow-auto rounded-md border bg-slate-950/90 p-3 text-xs text-slate-100">
				{lines.map((entry, index) => (
					<div
						key={`${entry.stream}-${index}`}
						className={
							entry.stream === "stderr" ? "text-rose-200" : "text-slate-100"
						}
					>
						{entry.line}
					</div>
				))}
			</div>
		</div>
	);
}

function readErrorMessage(error: unknown, fallback: string) {
	if (typeof error === "string") {
		return error;
	}
	if (typeof error === "object" && error) {
		if ("message" in error) {
			const message = (error as ProjectDiscoveryError).message;
			if (typeof message === "string" && message.trim().length > 0) {
				return message;
			}
		}
		if ("error" in error) {
			const errorValue = (error as { error: unknown }).error;
			if (typeof errorValue === "string" && errorValue.trim().length > 0) {
				return errorValue;
			}
			if (
				typeof errorValue === "object" &&
				errorValue &&
				"message" in errorValue
			) {
				const nestedMessage = (errorValue as { message?: unknown }).message;
				if (
					typeof nestedMessage === "string" &&
					nestedMessage.trim().length > 0
				) {
					return nestedMessage;
				}
			}
		}
		if ("payload" in error) {
			const payloadValue = (error as { payload: unknown }).payload;
			if (
				typeof payloadValue === "object" &&
				payloadValue &&
				"message" in payloadValue
			) {
				const payloadMessage = (payloadValue as { message?: unknown }).message;
				if (
					typeof payloadMessage === "string" &&
					payloadMessage.trim().length > 0
				) {
					return payloadMessage;
				}
			}
		}
	}
	return fallback;
}
