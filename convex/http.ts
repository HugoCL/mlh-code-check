import { httpRouter } from "convex/server";
import { Webhook } from "svix";
import { SYSTEM_TEMPLATES } from "../lib/templates.js";
import { api, internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const http = httpRouter();

// Minimal shape of the Clerk user events we handle
interface ClerkUserEvent {
	type: string;
	data: {
		id: string;
		email_addresses?: { id: string; email_address: string }[];
		primary_email_address_id?: string | null;
		first_name?: string | null;
		last_name?: string | null;
		image_url?: string;
	};
}

/**
 * Clerk webhook handler for user events.
 * This endpoint receives webhooks from Clerk when user events occur.
 * Requests are authenticated with the Svix signature headers using
 * CLERK_WEBHOOK_SECRET (set as a Convex deployment environment variable).
 */
http.route({
	path: "/clerk-webhook",
	method: "POST",
	handler: httpAction(async (ctx, request) => {
		const secret = process.env.CLERK_WEBHOOK_SECRET;
		if (!secret) {
			console.error("CLERK_WEBHOOK_SECRET is not set");
			return new Response("Webhook secret not configured", { status: 500 });
		}

		const svixId = request.headers.get("svix-id");
		const svixTimestamp = request.headers.get("svix-timestamp");
		const svixSignature = request.headers.get("svix-signature");
		if (!svixId || !svixTimestamp || !svixSignature) {
			return new Response("Missing svix headers", { status: 400 });
		}

		// Signature verification needs the exact raw body, so don't use .json()
		const body = await request.text();

		let payload: ClerkUserEvent;
		try {
			// svix >= 2 verify() throws on failure but no longer returns the
			// payload, so parse the body ourselves once it has been verified.
			new Webhook(secret).verify(body, {
				"svix-id": svixId,
				"svix-timestamp": svixTimestamp,
				"svix-signature": svixSignature,
			});
			payload = JSON.parse(body) as ClerkUserEvent;
		} catch (error) {
			console.error("Clerk webhook signature verification failed", error);
			return new Response("Invalid signature", { status: 400 });
		}

		const eventType = payload.type;

		if (eventType === "user.created" || eventType === "user.updated") {
			const { id, email_addresses, first_name, last_name, image_url } =
				payload.data;

			const primaryEmail = email_addresses?.find(
				(email) => email.id === payload.data.primary_email_address_id,
			);

			const name = [first_name, last_name].filter(Boolean).join(" ") || "User";

			await ctx.runMutation(api.users.syncUser, {
				clerkId: id,
				email: primaryEmail?.email_address || "",
				name,
				imageUrl: image_url,
			});
		}

		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	}),
});

/**
 * Initialize system templates endpoint.
 * This can be called to load/update system templates in the database.
 * Requirements: 3.1 - Load templates on application initialization
 */
http.route({
	path: "/init-templates",
	method: "OPTIONS",
	handler: httpAction(async (_ctx, request) => {
		const origin = request.headers.get("origin") ?? "*";
		return new Response(null, {
			status: 204,
			headers: {
				"Access-Control-Allow-Origin": origin,
				"Access-Control-Allow-Methods": "POST, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type",
			},
		});
	}),
});

http.route({
	path: "/init-templates",
	method: "POST",
	handler: httpAction(async (ctx, request) => {
		const result = await ctx.runMutation(internal.rubrics.loadSystemTemplates, {
			templates: SYSTEM_TEMPLATES,
		});

		const origin = request.headers.get("origin") ?? "*";
		return new Response(JSON.stringify(result), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": origin,
				"Access-Control-Allow-Methods": "POST, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type",
			},
		});
	}),
});

export default http;
