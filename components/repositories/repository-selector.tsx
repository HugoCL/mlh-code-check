"use client";

import { GitBranchIcon, SearchIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery } from "convex/react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";

interface RepositorySelectorProps {
	value?: string;
	onValueChange?: (value: string | null) => void;
	placeholder?: string;
	disabled?: boolean;
}

export function RepositorySelector({
	value,
	onValueChange,
	placeholder = "Select a repository",
	disabled = false,
}: RepositorySelectorProps) {
	const repositories = useQuery(api.repositories.listRepositories);
	const [searchQuery, setSearchQuery] = useState("");

	const filteredRepositories = repositories?.filter(
		(repo) =>
			repo.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
			repo.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
			repo.name.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	if (repositories === undefined) {
		return (
			<Select disabled>
				<SelectTrigger>
					<SelectValue />
				</SelectTrigger>
			</Select>
		);
	}

	if (repositories.length === 0) {
		return (
			<Card>
				<CardContent className="flex flex-col items-center justify-center py-8">
					<HugeiconsIcon
						icon={GitBranchIcon}
						className="h-8 w-8 text-muted-foreground mb-2"
					/>
					<p className="text-sm text-muted-foreground text-center">
						No repositories connected. Connect a repository first to run
						analysis.
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<div className="relative">
					<HugeiconsIcon
						icon={SearchIcon}
						className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"
					/>
					<Input
						placeholder="Search repositories..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-10"
					/>
				</div>
				{repositories && repositories.length > 0 && (
					<p className="text-xs text-muted-foreground">
						{searchQuery
							? `${filteredRepositories?.length || 0} of ${repositories.length} repositories`
							: `${repositories.length} repositories available`}
					</p>
				)}
			</div>

			<Select value={value} onValueChange={onValueChange} disabled={disabled}>
				<SelectTrigger>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{filteredRepositories?.map((repo) => (
						<SelectItem key={repo._id} value={repo._id}>
							<div className="flex items-center justify-between w-full">
								<div className="flex flex-col items-start">
									<span className="font-medium">{repo.fullName}</span>
									<div className="flex items-center gap-2 text-xs text-muted-foreground">
										<HugeiconsIcon icon={GitBranchIcon} className="h-3 w-3" />
										<span>{repo.defaultBranch}</span>
									</div>
								</div>
								<Badge variant="outline" className="ml-2">
									{repo.owner}
								</Badge>
							</div>
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			{searchQuery && filteredRepositories?.length === 0 && (
				<p className="text-sm text-muted-foreground text-center py-4">
					No repositories found matching "{searchQuery}"
				</p>
			)}
		</div>
	);
}

// Compact version for use in forms
export function RepositorySelectorCompact({
	value,
	onValueChange,
	placeholder = "Select repository",
	disabled = false,
}: RepositorySelectorProps) {
	const repositories = useQuery(api.repositories.listRepositories);

	if (repositories === undefined) {
		return (
			<Select disabled>
				<SelectTrigger>
					<SelectValue />
				</SelectTrigger>
			</Select>
		);
	}

	if (repositories.length === 0) {
		return (
			<Select disabled>
				<SelectTrigger>
					<SelectValue />
				</SelectTrigger>
			</Select>
		);
	}

	return (
		<Select value={value} onValueChange={onValueChange} disabled={disabled}>
			<SelectTrigger>
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{repositories.map((repo) => (
					<SelectItem key={repo._id} value={repo._id}>
						<div className="flex items-center gap-2">
							<span>{repo.fullName}</span>
							<Badge variant="outline" className="text-xs">
								{repo.defaultBranch}
							</Badge>
						</div>
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
