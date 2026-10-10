import { convexTest } from "convex-test";
import { Webhook } from "svix";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import schema from "../../convex/schema";
import { modules } from "../../convex/test.setup";

const SECRET = "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw";

const userCreatedEvent = JSON.stringify({
	type: "user.created",
	data: {
		id: "user_webhook_1",
		first_name: "Ada",
		last_name: "Lovelace",
		image_url: "https://example.com/ada.png",
		primary_email_address_id: "idn_1",
		email_addresses: [{ id: "idn_1", email_address: "ada@example.com" }],
	},
});

/** Sign a body the same way Clerk (Svix) does. */
function signedHeaders(body: string, secret = SECRET) {
	const id = "msg_test_1";
	const timestamp = new Date();
	return {
		"svix-id": id,
		"svix-timestamp": Math.floor(timestamp.getTime() / 1000).toString(),
		"svix-signature": new Webhook(secret).sign(id, timestamp, body),
	};
}

function post(
	t: ReturnType<typeof convexTest>,
	body: string,
	headers: Record<string, string> = {},
) {
	return t.fetch("/clerk-webhook", { method: "POST", body, headers });
}

describe("Integration: Clerk webhook signature verification", () => {
	let previousSecret: string | undefined;

	beforeEach(() => {
		previousSecret = process.env.CLERK_WEBHOOK_SECRET;
		process.env.CLERK_WEBHOOK_SECRET = SECRET;
	});

	afterEach(() => {
		if (previousSecret === undefined) {
			delete process.env.CLERK_WEBHOOK_SECRET;
		} else {
			process.env.CLERK_WEBHOOK_SECRET = previousSecret;
		}
	});

	const getUsers = (t: ReturnType<typeof convexTest>) =>
		t.run(async (ctx) => ctx.db.query("users").collect());

	it("syncs the user when the signature is valid", async () => {
		const t = convexTest(schema, modules);

		const response = await post(t, userCreatedEvent, {
			...signedHeaders(userCreatedEvent),
		});

		expect(response.status).toBe(200);
		const users = await getUsers(t);
		expect(users).toHaveLength(1);
		expect(users[0]).toMatchObject({
			clerkId: "user_webhook_1",
			email: "ada@example.com",
			name: "Ada Lovelace",
			imageUrl: "https://example.com/ada.png",
		});
	});

	it("rejects a signature made with a different secret", async () => {
		const t = convexTest(schema, modules);

		const response = await post(t, userCreatedEvent, {
			...signedHeaders(
				userCreatedEvent,
				"whsec_b3RoZXJzZWNyZXRvdGhlcnNlY3JldA==",
			),
		});

		expect(response.status).toBe(400);
		expect(await getUsers(t)).toHaveLength(0);
	});

	it("rejects a body that was tampered with after signing", async () => {
		const t = convexTest(schema, modules);
		const headers = signedHeaders(userCreatedEvent);
		const tampered = userCreatedEvent.replace(
			"ada@example.com",
			"evil@example.com",
		);

		const response = await post(t, tampered, headers);

		expect(response.status).toBe(400);
		expect(await getUsers(t)).toHaveLength(0);
	});

	it("rejects requests with missing svix headers", async () => {
		const t = convexTest(schema, modules);

		const unsigned = await post(t, userCreatedEvent);
		expect(unsigned.status).toBe(400);

		const { "svix-signature": _omitted, ...partial } =
			signedHeaders(userCreatedEvent);
		const partiallySigned = await post(t, userCreatedEvent, partial);
		expect(partiallySigned.status).toBe(400);

		expect(await getUsers(t)).toHaveLength(0);
	});

	it("returns 500 and ignores the payload when the secret is not configured", async () => {
		delete process.env.CLERK_WEBHOOK_SECRET;
		const t = convexTest(schema, modules);

		const response = await post(t, userCreatedEvent, {
			...signedHeaders(userCreatedEvent),
		});

		expect(response.status).toBe(500);
		expect(await getUsers(t)).toHaveLength(0);
	});
});
