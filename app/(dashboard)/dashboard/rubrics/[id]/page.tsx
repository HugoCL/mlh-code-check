"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import { RubricForm } from "@/components/rubrics/rubric-form";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export default function EditRubricPage() {
	const params = useParams();
	const router = useRouter();
	const rubricId = params.id as string;
	const { isAuthenticated } = useConvexAuth();
	const currentUser = useQuery(
		api.users.getCurrentUser,
		isAuthenticated ? {} : "skip",
	);

	const handleBack = () => {
		router.push("/dashboard/rubrics");
	};

	const handleSaved = () => {
		// Stay on the same page after saving
	};

	if (currentUser === undefined) {
		return (
			<div className="flex items-center justify-center py-12">
				<Spinner className="size-8" />
			</div>
		);
	}

	if (currentUser === null) {
		return (
			<div className="text-center py-12">
				<p className="text-muted-foreground">Please sign in to edit rubrics.</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold">Edit Rubric</h1>
				<p className="text-muted-foreground">
					Modify your evaluation rubric and its criteria.
				</p>
			</div>

			<RubricForm
				userId={currentUser._id}
				rubricId={rubricId as Id<"rubrics">}
				onBack={handleBack}
				onSaved={handleSaved}
			/>
		</div>
	);
}
