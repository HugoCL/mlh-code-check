"use client";

import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { RubricForm } from "@/components/rubrics/rubric-form";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export default function NewRubricPage() {
	const router = useRouter();
	const currentUser = useQuery(api.users.getCurrentUser);

	const handleBack = () => {
		router.push("/dashboard/rubrics");
	};

	const handleSaved = (rubricId: Id<"rubrics">) => {
		router.push(`/dashboard/rubrics/${rubricId}`);
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
				<p className="text-muted-foreground">
					Please sign in to create rubrics.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold">Create Rubric</h1>
				<p className="text-muted-foreground">
					Define a new evaluation rubric for code reviews.
				</p>
			</div>

			<RubricForm
				userId={currentUser._id}
				onBack={handleBack}
				onSaved={handleSaved}
			/>
		</div>
	);
}
