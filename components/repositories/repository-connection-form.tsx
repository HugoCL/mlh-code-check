"use client";

import {
	Add01Icon,
	GitBranchIcon,
	Loading03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";

interface RepositoryConnectionFormProps {
	onSuccess?: () => void;
}

export function RepositoryConnectionForm({
	onSuccess,
}: RepositoryConnectionFormProps) {
	const [formData, setFormData] = useState({
		owner: "",
		name: "",
		defaultBranch: "main",
	});
	const [isLoading, setIsLoading] = useState(false);

	const connectRepository = useMutation(api.repositories.connectRepository);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (
			!formData.owner.trim() ||
			!formData.name.trim() ||
			!formData.defaultBranch.trim()
		) {
			toast.error("Please fill in all fields");
			return;
		}

		setIsLoading(true);

		try {
			const fullName = `${formData.owner}/${formData.name}`;

			await connectRepository({
				owner: formData.owner.trim(),
				name: formData.name.trim(),
				fullName,
				defaultBranch: formData.defaultBranch.trim(),
			});

			toast.success(`Successfully connected ${fullName}`);

			// Reset form
			setFormData({
				owner: "",
				name: "",
				defaultBranch: "main",
			});

			onSuccess?.();
		} catch (error) {
			toast.error(`Failed to connect repository: ${error}`);
		} finally {
			setIsLoading(false);
		}
	};

	const handleInputChange =
		(field: keyof typeof formData) =>
		(e: React.ChangeEvent<HTMLInputElement>) => {
			setFormData((prev) => ({
				...prev,
				[field]: e.target.value,
			}));
		};

	const fullName =
		formData.owner && formData.name ? `${formData.owner}/${formData.name}` : "";

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<HugeiconsIcon icon={Add01Icon} className="h-5 w-5" />
					Connect Repository
				</CardTitle>
				<CardDescription>
					Connect a GitHub repository to analyze with AI rubrics. Make sure you
					have access to the repository.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="owner">Owner</Label>
							<Input
								id="owner"
								placeholder="e.g., microsoft"
								value={formData.owner}
								onChange={handleInputChange("owner")}
								disabled={isLoading}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="name">Repository Name</Label>
							<Input
								id="name"
								placeholder="e.g., vscode"
								value={formData.name}
								onChange={handleInputChange("name")}
								disabled={isLoading}
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="defaultBranch">Default Branch</Label>
						<div className="relative">
							<HugeiconsIcon
								icon={GitBranchIcon}
								className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"
							/>
							<Input
								id="defaultBranch"
								placeholder="main"
								value={formData.defaultBranch}
								onChange={handleInputChange("defaultBranch")}
								disabled={isLoading}
								className="pl-10"
							/>
						</div>
					</div>

					{fullName && (
						<div className="p-3 bg-muted rounded-md border">
							<p className="text-sm text-muted-foreground mb-1">
								Repository URL:
							</p>
							<p className="font-mono text-sm break-all">
								https://github.com/{fullName}
							</p>
							<p className="text-xs text-muted-foreground mt-1">
								Make sure you have access to this repository
							</p>
						</div>
					)}

					<Button type="submit" disabled={isLoading} className="w-full">
						{isLoading ? (
							<>
								<HugeiconsIcon
									icon={Loading03Icon}
									className="mr-2 h-4 w-4 animate-spin"
								/>
								Connecting...
							</>
						) : (
							<>
								<HugeiconsIcon icon={Add01Icon} className="mr-2 h-4 w-4" />
								Connect Repository
							</>
						)}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}
