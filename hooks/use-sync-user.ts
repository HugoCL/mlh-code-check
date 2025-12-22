"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "@/convex/_generated/api";

/**
 * Hook to sync Clerk user to Convex database.
 * Should be called once when the user is authenticated.
 */
export function useSyncUser() {
	const { user, isLoaded } = useUser();
	const getOrCreateUser = useMutation(api.users.getOrCreateUser);
	const hasSynced = useRef(false);

	useEffect(() => {
		if (!isLoaded || !user || hasSynced.current) return;

		const syncUser = async () => {
			try {
				await getOrCreateUser({
					clerkId: user.id,
					email: user.primaryEmailAddress?.emailAddress ?? "",
					name: user.fullName ?? user.firstName ?? user.username ?? "Anonymous",
					imageUrl: user.imageUrl,
				});
				hasSynced.current = true;
			} catch (error) {
				console.error("Failed to sync user to Convex:", error);
			}
		};

		syncUser();
	}, [isLoaded, user, getOrCreateUser]);
}
