"use client";

import { SignedIn, UserButton } from "@clerk/nextjs";
import {
	Add01Icon,
	AnalyticsUpIcon,
	FileEditIcon,
	GitBranchIcon,
	Home01Icon,
	InvestigationIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { useSyncUser } from "@/hooks/use-sync-user";

const navigationItems = [
	{
		title: "Dashboard",
		href: "/dashboard",
		icon: Home01Icon,
	},
	{
		title: "Analyses",
		href: "/dashboard/analyses",
		icon: AnalyticsUpIcon,
	},
	{
		title: "Rubrics",
		href: "/dashboard/rubrics",
		icon: FileEditIcon,
	},
	{
		title: "Repositories",
		href: "/dashboard/repositories",
		icon: GitBranchIcon,
	},
];

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const pathname = usePathname();

	// Sync Clerk user to Convex on first load
	useSyncUser();

	return (
		<SidebarProvider>
			<Sidebar>
				<SidebarHeader className="border-b border-sidebar-border">
					<div className="flex items-center gap-2 px-2 py-2">
						<div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
							<HugeiconsIcon icon={InvestigationIcon} className="size-4" />
						</div>
						<span className="font-semibold">MLH Code Inspector</span>
					</div>
				</SidebarHeader>
				<SidebarContent>
					<SidebarGroup>
						<SidebarGroupLabel>Navigation</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								{navigationItems.map((item) => (
									<SidebarMenuItem key={item.href}>
										<SidebarMenuButton
											render={<Link href={item.href} />}
											isActive={pathname === item.href}
										>
											<HugeiconsIcon icon={item.icon} />
											<span>{item.title}</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
								))}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
					<SidebarGroup>
						<SidebarGroupLabel>Quick Actions</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								<SidebarMenuItem>
									<SidebarMenuButton
										render={<Link href="/dashboard/analyses/new" />}
									>
										<HugeiconsIcon icon={Add01Icon} />
										<span>New Analysis</span>
									</SidebarMenuButton>
								</SidebarMenuItem>
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				</SidebarContent>
				<SidebarFooter className="border-t border-sidebar-border">
					<SignedIn>
						<div className="flex items-center gap-2 px-2 py-2">
							<UserButton afterSignOutUrl="/" />
							<span className="text-sm text-muted-foreground">Account</span>
						</div>
					</SignedIn>
				</SidebarFooter>
			</Sidebar>
			<SidebarInset>
				<header className="flex h-16 shrink-0 items-center justify-between border-b px-2">
					<SidebarTrigger />
					<Button
						variant="default"
						size="sm"
						render={<Link href="/dashboard/analyses/new" />}
					>
						<HugeiconsIcon icon={Add01Icon} data-icon="inline-start" />
						New Analysis
					</Button>
				</header>
				<main className="flex-1 overflow-auto p-6">{children}</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
