"use client";

import { RepositoryConnectionForm } from "@/components/repositories/repository-connection-form";
import { RepositoryList } from "@/components/repositories/repository-list";

export default function RepositoriesPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold">Repositories</h1>
				<p className="text-muted-foreground">
					Connect and manage your GitHub repositories for code analysis.
				</p>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<div>
					<h2 className="text-lg font-semibold mb-4">Connect Repository</h2>
					<RepositoryConnectionForm />
				</div>
				<div>
					<h2 className="text-lg font-semibold mb-4">Connected Repositories</h2>
					<RepositoryList />
				</div>
			</div>
		</div>
	);
}
