import { httpRouter } from "convex/server";
import { api, internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const http = httpRouter();

/**
 * Clerk webhook handler for user events.
 * This endpoint receives webhooks from Clerk when user events occur.
 */
http.route({
	path: "/clerk-webhook",
	method: "POST",
	handler: httpAction(async (ctx, request) => {
		const payload = await request.json();
		const eventType = payload.type;

		if (eventType === "user.created" || eventType === "user.updated") {
			const { id, email_addresses, first_name, last_name, image_url } =
				payload.data;

			const primaryEmail = email_addresses?.find(
				(email: { id: string }) =>
					email.id === payload.data.primary_email_address_id,
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
	method: "POST",
	handler: httpAction(async (ctx, request) => {
		// Import templates dynamically to avoid bundling issues
		const { SYSTEM_TEMPLATES } = await import("../lib/templates.js");

		const result = await ctx.runMutation(internal.rubrics.loadSystemTemplates, {
			templates: SYSTEM_TEMPLATES,
		});

		return new Response(JSON.stringify(result), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	}),
});

export default http;
