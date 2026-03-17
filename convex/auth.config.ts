/**
 * Convex auth provider configuration.
 *
 * Configures a test JWT provider for local integration tests.
 * JWTs are RS256-signed with the test private key (integration/clients/auth.ts).
 * The JWKS endpoint is served by this deployment at /.well-known/jwks.json.
 *
 * The issuer matches CONVEX_SITE_ORIGIN (http://localhost:3211) for the
 * local Docker test environment.
 *
 * For production: replace domain with your real auth provider (Clerk, Auth0, etc.)
 */
export default {
  providers: [
    {
      // Issuer must match the `iss` claim in test JWTs and CONVEX_SITE_ORIGIN.
      domain: "http://localhost:3211",
      applicationID: "convex",
    },
  ],
};
