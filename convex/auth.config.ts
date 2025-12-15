// Note: Set CLERK_JWT_ISSUER_DOMAIN in Convex dashboard environment variables
// Format: https://<your-clerk-frontend-api>.clerk.accounts.dev
// You can find this in your Clerk Dashboard under JWT Templates
export default {
    providers: [
        {
            domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
            applicationID: "convex",
        },
    ],
};
