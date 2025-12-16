"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { RubricList } from "@/components/rubrics/rubric-list";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export default function RubricsPage() {
	const router = useRouter();
	const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
	const currentUser = useQuery(
		api.users.getCurrentUser,
		isAuthenticated ? {} : "skip",
	);
	const deleteRubric = useMutation(api.rubrics.deleteRubric);
	const duplicateTemplate = useMutation(api.rubrics.duplicateSystemTemplate);

	const handleCreateNew = () => {
		router.push("/dashboard/rubrics/new");
	};

	const handleEdit = (rubricId: Id<"rubrics">) => {
		router.push(`/dashboard/rubrics/${rubricId}`);
	};

	const handleDelete = async (rubricId: Id<"rubrics">) => {
		if (confirm("Are you sure you want to delete this rubric?")) {
			await deleteRubric({ rubricId });
		}
	};

	const handleDuplicate = async (rubricId: Id<"rubrics">) => {
		if (!currentUser) return;
		const newRubricId = await duplicateTemplate({
			userId: currentUser._id,
			systemTemplateId: rubricId,
		});
		router.push(`/dashboard/rubrics/${newRubricId}`);
	};

	// Only show loading spinner when auth is done and user data is actually loading
	const isDataLoading =
		!isAuthLoading && isAuthenticated && currentUser === undefined;

	if (isDataLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Spinner className="size-8" />
			</div>
		);
	}

	if (!currentUser) {
		return (
			<div className="text-center py-12">
				<p className="text-muted-foreground">Please sign in to view rubrics.</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold">Rubrics</h1>
				<p className="text-muted-foreground">
					Create and manage evaluation rubrics for your code reviews.
				</p>
			</div>

			<RubricList
				userId={currentUser._id}
				onCreateNew={handleCreateNew}
				onEdit={handleEdit}
				onDelete={handleDelete}
				onDuplicate={handleDuplicate}
			/>
		</div>
	);
}
