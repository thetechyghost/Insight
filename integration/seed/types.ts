/**
 * SeedContext — the result of seeding, containing all created entity IDs.
 * Tests use this to reference seeded data.
 */
export interface SeedEntityRef {
  id: string;
  email?: string;
  slug?: string;
}

export interface SeedContext {
  /** Unique prefix for this test run */
  prefix: string;

  /** Map of tenant key → { id, slug } */
  tenants: Record<string, SeedEntityRef>;

  /** Map of user key → { id, email } */
  users: Record<string, SeedEntityRef>;

  /** Map of "userKey:tenantKey" → { id } */
  memberships: Record<string, SeedEntityRef>;
}
