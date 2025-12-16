"use client";

import {
	Calendar03Icon,
	Delete02Icon,
	GitBranchIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export function RepositoryList() {
	const { isAuthenticated } = useConvexAuth();
	const repositories = useQuery(
		api.repositories.listRepositories,
		isAuthenticated ? {} : "skip",
	);
	const disconnectRepository = useMutation(
		api.repositories.disconnectRepository,
	);

	const handleDisconnect = async (
		repositoryId: Id<"repositories">,
		fullName: string,
	) => {
		try {
			await disconnectRepository({ repositoryId });
			toast.success(`Disconnected ${fullName}`);
		} catch (error) {
			toast.error(`Failed to disconnect repository: ${error}`);
		}
	};

	const formatDate = (timestamp: number) => {
		return new Date(timestamp).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	if (repositories === undefined) {
		return (
			<div className="space-y-4">
				{Array.from({ length: 3 }).map((_, i) => (
					<Card key={i} className="animate-pulse">
						<CardHeader>
							<div className="h-4 bg-muted rounded w-1/3"></div>
							<div className="h-3 bg-muted rounded w-1/2"></div>
						</CardHeader>
						<CardContent>
							<div className="h-3 bg-muted rounded w-1/4"></div>
						</CardContent>
					</Card>
				))}
			</div>
		);
	}

	if (repositories.length === 0) {
		return (
			<Card>
				<CardContent className="flex flex-col items-center justify-center py-12">
					<HugeiconsIcon
						icon={GitBranchIcon}
						className="h-12 w-12 text-muted-foreground mb-4"
					/>
					<h3 className="text-lg font-semibold mb-2">
						No repositories connected
					</h3>
					<p className="text-muted-foreground text-center mb-4">
						Connect your first repository to start analyzing code with AI
						rubrics.
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-4">
			{repositories.map((repo) => (
				<Card key={repo._id}>
					<CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
						<div className="space-y-1">
							<CardTitle className="text-lg font-semibold">
								{repo.fullName}
							</CardTitle>
							<CardDescription className="flex items-center gap-2">
								<HugeiconsIcon icon={GitBranchIcon} className="h-4 w-4" />
								<span>Default branch: {repo.defaultBranch}</span>
							</CardDescription>
						</div>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => handleDisconnect(repo._id, repo.fullName)}
							className="text-destructive hover:text-destructive hover:bg-destructive/10"
						>
							<HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />
						</Button>
					</CardHeader>
					<CardContent>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<HugeiconsIcon icon={Calendar03Icon} className="h-4 w-4" />
								<span>Connected {formatDate(repo.connectedAt)}</span>
							</div>
							<Badge variant="secondary">{repo.owner}</Badge>
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	);
}
