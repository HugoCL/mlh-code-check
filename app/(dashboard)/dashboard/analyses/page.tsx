"use client";

import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnalysisHistory } from "@/components/history/analysis-history";
import { Button } from "@/components/ui/button";
import type { Id } from "@/convex/_generated/dataModel";

export default function AnalysesPage() {
	const router = useRouter();

	const handleSelectAnalysis = (analysisId: Id<"analyses">) => {
		router.push(`/dashboard/analyses/${analysisId}`);
	};

	const handleStartNewAnalysis = () => {
		router.push("/dashboard/analyses/new");
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">Analyses</h1>
					<p className="text-muted-foreground">
						View and manage your code review analyses.
					</p>
				</div>
				<Button render={<Link href="/dashboard/analyses/new" />}>
					<HugeiconsIcon icon={Add01Icon} data-icon="inline-start" />
					New Analysis
				</Button>
			</div>

			<AnalysisHistory
				onSelectAnalysis={handleSelectAnalysis}
				onStartNewAnalysis={handleStartNewAnalysis}
				showFilters={true}
			/>
		</div>
	);
}
