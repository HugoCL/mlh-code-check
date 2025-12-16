"use client";

import {
	Calendar01Icon,
	FilterIcon,
	RefreshIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useConvexAuth, useQuery } from "convex/react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type AnalysisStatus = "pending" | "running" | "completed" | "failed";

export interface FilterValues {
	repositoryId?: Id<"repositories">;
	rubricId?: Id<"rubrics">;
	status?: AnalysisStatus;
	dateFrom?: number;
	dateTo?: number;
}

interface FilterPanelProps {
	filters: FilterValues;
	onFiltersChange: (filters: FilterValues) => void;
}

export function FilterPanel({ filters, onFiltersChange }: FilterPanelProps) {
	const { isAuthenticated } = useConvexAuth();
	const repositories = useQuery(
		api.repositories.listRepositories,
		isAuthenticated ? {} : "skip",
	);
	const rubrics = useQuery(api.rubrics.listRubrics, "skip");

	const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
		if (filters.dateFrom || filters.dateTo) {
			return {
				from: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
				to: filters.dateTo ? new Date(filters.dateTo) : undefined,
			};
		}
		return undefined;
	});

	const handleRepositoryChange = (value: string | null) => {
		if (value === null) return;
		onFiltersChange({
			...filters,
			repositoryId: value === "all" ? undefined : (value as Id<"repositories">),
		});
	};

	const handleRubricChange = (value: string | null) => {
		if (value === null) return;
		onFiltersChange({
			...filters,
			rubricId: value === "all" ? undefined : (value as Id<"rubrics">),
		});
	};

	const handleStatusChange = (value: string | null) => {
		if (value === null) return;
		onFiltersChange({
			...filters,
			status: value === "all" ? undefined : (value as AnalysisStatus),
		});
	};

	const handleDateRangeChange = (range: DateRange | undefined) => {
		setDateRange(range);
		onFiltersChange({
			...filters,
			dateFrom: range?.from?.getTime(),
			dateTo: range?.to?.getTime(),
		});
	};

	const handleClearFilters = () => {
		setDateRange(undefined);
		onFiltersChange({});
	};

	const hasActiveFilters =
		filters.repositoryId ||
		filters.rubricId ||
		filters.status ||
		filters.dateFrom ||
		filters.dateTo;

	const formatDateRange = () => {
		if (!dateRange?.from) return "Select dates";
		if (!dateRange.to) {
			return dateRange.from.toLocaleDateString();
		}
		return `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`;
	};

	return (
		<div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4">
			<div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
				<HugeiconsIcon icon={FilterIcon} className="size-4" />
				Filters
			</div>

			{/* Repository Filter */}
			<Select
				value={filters.repositoryId || "all"}
				onValueChange={handleRepositoryChange}
			>
				<SelectTrigger className="w-[180px]">
					<SelectValue>
						{filters.repositoryId
							? repositories?.find((r) => r._id === filters.repositoryId)
									?.fullName || "Repository"
							: "All Repositories"}
					</SelectValue>
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">All Repositories</SelectItem>
					{repositories?.map((repo) => (
						<SelectItem key={repo._id} value={repo._id}>
							{repo.fullName}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			{/* Rubric Filter */}
			<Select
				value={filters.rubricId || "all"}
				onValueChange={handleRubricChange}
			>
				<SelectTrigger className="w-[180px]">
					<SelectValue>
						{filters.rubricId
							? rubrics?.find((r) => r._id === filters.rubricId)?.name ||
								"Rubric"
							: "All Rubrics"}
					</SelectValue>
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">All Rubrics</SelectItem>
					{rubrics?.map((rubric) => (
						<SelectItem key={rubric._id} value={rubric._id}>
							{rubric.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			{/* Status Filter */}
			<Select
				value={filters.status || "all"}
				onValueChange={handleStatusChange}
			>
				<SelectTrigger className="w-[140px]">
					<SelectValue>
						{filters.status
							? filters.status.charAt(0).toUpperCase() + filters.status.slice(1)
							: "All Statuses"}
					</SelectValue>
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">All Statuses</SelectItem>
					<SelectItem value="pending">Pending</SelectItem>
					<SelectItem value="running">Running</SelectItem>
					<SelectItem value="completed">Completed</SelectItem>
					<SelectItem value="failed">Failed</SelectItem>
				</SelectContent>
			</Select>

			{/* Date Range Picker */}
			<Popover>
				<PopoverTrigger
					render={
						<Button
							variant="outline"
							className="w-[220px] justify-start text-left font-normal"
						>
							<HugeiconsIcon icon={Calendar01Icon} className="mr-2 size-4" />
							{formatDateRange()}
						</Button>
					}
				/>
				<PopoverContent className="w-auto p-0" align="start">
					<Calendar
						mode="range"
						selected={dateRange}
						onSelect={handleDateRangeChange}
						numberOfMonths={2}
					/>
				</PopoverContent>
			</Popover>

			{/* Clear Filters */}
			{hasActiveFilters && (
				<Button
					variant="ghost"
					size="sm"
					onClick={handleClearFilters}
					className="text-muted-foreground"
				>
					<HugeiconsIcon icon={RefreshIcon} className="mr-1 size-4" />
					Clear
				</Button>
			)}
		</div>
	);
}
