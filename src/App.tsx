import { homeDir } from "@tauri-apps/api/path";
import { open } from "@tauri-apps/plugin-dialog";
import { Loader2, Plus } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@/components/ui/empty";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { discoverProject } from "@/lib/projects";
import {
	createProjectFromDiscovery,
	openSpecStatusLabel,
	useProjectsStore,
} from "@/stores/projects";
import type { ProjectDiscoveryError } from "@/types/projects";
import "./App.css";

function App() {
	const projects = useProjectsStore((state) => state.projects);
	const addProject = useProjectsStore((state) => state.addProject);

	const [error, setError] = useState<string | null>(null);
	const [isDiscovering, setIsDiscovering] = useState(false);

	const handlePickProject = async () => {
		setError(null);

		try {
			const defaultPath = await homeDir();
			const selection = await open({
				directory: true,
				multiple: false,
				defaultPath,
				title: "Select a code project",
			});

			if (!selection || Array.isArray(selection)) {
				return;
			}

			setIsDiscovering(true);
			const result = await discoverProject(selection);
			addProject(createProjectFromDiscovery(result));
		} catch (err) {
			const fallbackMessage =
				"Unable to add project. Confirm the path points to a git work tree.";
			const message =
				typeof err === "object" && err && "message" in err
					? (err as ProjectDiscoveryError).message
					: fallbackMessage;
			setError(message || fallbackMessage);
		} finally {
			setIsDiscovering(false);
		}
	};

	return (
		<main className="relative min-h-screen overflow-hidden text-foreground">
			<div aria-hidden className="pointer-events-none absolute inset-0">
				<div className="absolute -left-32 -top-32 h-72 w-72 rounded-full bg-emerald-200/40 blur-[120px]" />
				<div className="absolute -right-32 top-20 h-80 w-80 rounded-full bg-sky-200/40 blur-[140px]" />
				<div className="absolute left-1/2 top-[35%] h-64 w-64 -translate-x-1/2 rounded-full bg-amber-200/30 blur-[120px]" />
			</div>

			<div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12">
				<Card className="fade-in-up border-white/70 bg-white/80 shadow-xl backdrop-blur">
					<CardContent className="space-y-4">
						{projects.length === 0 ? (
							<Empty className="border border-dashed bg-white/50">
								<EmptyHeader>
									<EmptyTitle>No projects yet</EmptyTitle>
									<EmptyDescription>
										Add your first repo to start tracking OpenSpec adoption.
									</EmptyDescription>
								</EmptyHeader>
								<EmptyContent>
									<Button
										type="button"
										disabled={isDiscovering}
										size="icon-lg"
										aria-label="Add project"
										onClick={handlePickProject}
									>
										{isDiscovering ? (
											<Loader2 className="size-5 animate-spin" />
										) : (
											<Plus className="size-5" />
										)}
									</Button>
								</EmptyContent>
							</Empty>
						) : (
							<div className="space-y-4">
								<div className="flex items-center justify-end">
									<Button
										type="button"
										disabled={isDiscovering}
										size="icon"
										aria-label="Add project"
										onClick={handlePickProject}
									>
										{isDiscovering ? (
											<Loader2 className="size-4 animate-spin" />
										) : (
											<Plus className="size-4" />
										)}
									</Button>
								</div>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Repository</TableHead>
											<TableHead>Path</TableHead>
											<TableHead>OpenSpec</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{projects.map((project, index) => {
											const statusLabel = openSpecStatusLabel(
												project.openspecStatus,
											);
											const statusStyle =
												project.openspecStatus === "present"
													? "border-emerald-200/80 bg-emerald-100/80 text-emerald-700"
													: "border-amber-200/80 bg-amber-100/80 text-amber-700";

											return (
												<TableRow
													key={project.id}
													className="fade-in-up"
													style={{
														animationDelay: `${index * 70}ms`,
													}}
												>
													<TableCell className="font-medium">
														{project.name}
													</TableCell>
													<TableCell
														title={project.path}
														className="max-w-60 truncate font-mono text-xs text-muted-foreground"
													>
														{project.path}
													</TableCell>
													<TableCell>
														<Badge className={statusStyle} variant="outline">
															<span className="size-1.5 rounded-full bg-current" />
															{statusLabel}
														</Badge>
													</TableCell>
												</TableRow>
											);
										})}
									</TableBody>
								</Table>
							</div>
						)}
						{error ? (
							<p className="text-sm text-destructive" role="alert">
								{error}
							</p>
						) : null}
					</CardContent>
				</Card>
			</div>
		</main>
	);
}

export default App;
