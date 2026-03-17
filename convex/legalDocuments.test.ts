import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

describe("legalDocuments", () => {
  test("create inserts a legal document", async () => {
    const t = convexTest(schema);

    await t.run(async (ctx) => {
      await ctx.db.insert("users", { name: "Admin", email: "admin@test.com" });
    });

    const asAdmin = t.withIdentity({ email: "admin@test.com", subject: "user|admin" });
    const docId = await asAdmin.mutation(api.legalDocuments.create, {
      type: "privacy_policy",
      version: "1.0",
      content: "Privacy policy content here.",
      effectiveDate: "2026-01-01",
    });

    const doc = await t.run(async (ctx) => ctx.db.get(docId));
    expect(doc).not.toBeNull();
    expect(doc!.type).toBe("privacy_policy");
    expect(doc!.version).toBe("1.0");
    expect(doc!.content).toBe("Privacy policy content here.");
    expect(doc!.effectiveDate).toBe("2026-01-01");
  });

  test("list returns all legal documents", async () => {
    const t = convexTest(schema);

    await t.run(async (ctx) => {
      await ctx.db.insert("users", { name: "Admin", email: "admin@test.com" });
      await ctx.db.insert("legal_documents", {
        type: "terms_of_service",
        version: "1.0",
        content: "TOS v1",
        effectiveDate: "2025-01-01",
      });
      await ctx.db.insert("legal_documents", {
        type: "privacy_policy",
        version: "2.0",
        content: "PP v2",
        effectiveDate: "2025-06-01",
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@test.com", subject: "user|admin" });
    const docs = await asAdmin.query(api.legalDocuments.list, {});
    expect(docs).toHaveLength(2);
  });

  test("getLatest returns most recent document of a type", async () => {
    const t = convexTest(schema);

    await t.run(async (ctx) => {
      await ctx.db.insert("legal_documents", {
        type: "privacy_policy",
        version: "1.0",
        content: "Old version",
        effectiveDate: "2024-01-01",
      });
      await ctx.db.insert("legal_documents", {
        type: "privacy_policy",
        version: "2.0",
        content: "New version",
        effectiveDate: "2025-01-01",
      });
    });

    const doc = await t.query(api.legalDocuments.getLatest, { type: "privacy_policy" });
    expect(doc).not.toBeNull();
    expect(doc!.version).toBe("2.0");
    expect(doc!.content).toBe("New version");
  });

  test("getLatest returns null for nonexistent type", async () => {
    const t = convexTest(schema);

    const doc = await t.query(api.legalDocuments.getLatest, { type: "dpa" });
    expect(doc).toBeNull();
  });

  test("update patches a legal document", async () => {
    const t = convexTest(schema);

    const documentId = await t.run(async (ctx) => {
      await ctx.db.insert("users", { name: "Admin", email: "admin@test.com" });
      return await ctx.db.insert("legal_documents", {
        type: "waiver",
        version: "1.0",
        content: "Original content",
        effectiveDate: "2025-01-01",
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@test.com", subject: "user|admin" });
    await asAdmin.mutation(api.legalDocuments.update, {
      documentId,
      content: "Updated content",
      effectiveDate: "2025-06-15",
    });

    const updated = await t.run(async (ctx) => ctx.db.get(documentId));
    expect(updated!.content).toBe("Updated content");
    expect(updated!.effectiveDate).toBe("2025-06-15");
    expect(updated!.version).toBe("1.0"); // unchanged
  });

  test("update rejects nonexistent document", async () => {
    const t = convexTest(schema);

    await t.run(async (ctx) => {
      await ctx.db.insert("users", { name: "Admin", email: "admin@test.com" });
    });

    const asAdmin = t.withIdentity({ email: "admin@test.com", subject: "user|admin" });
    // Use a valid-format but nonexistent ID
    await expect(
      asAdmin.mutation(api.legalDocuments.update, {
        documentId: "k57a1qkr3c1npj4a1bda52d16h74aw3g" as any,
        content: "nope",
      })
    ).rejects.toThrow();
  });

  test("create with tenantId scopes to tenant", async () => {
    const t = convexTest(schema);

    const tenantId = await t.run(async (ctx) => {
      await ctx.db.insert("users", { name: "Admin", email: "admin@test.com" });
      return await ctx.db.insert("tenants", { name: "Gym A", slug: "gym-a" });
    });

    const asAdmin = t.withIdentity({ email: "admin@test.com", subject: "user|admin" });
    const docId = await asAdmin.mutation(api.legalDocuments.create, {
      type: "waiver",
      version: "1.0",
      content: "Gym-specific waiver",
      effectiveDate: "2026-01-01",
      tenantId,
    });

    const doc = await t.run(async (ctx) => ctx.db.get(docId));
    expect(doc!.tenantId).toBe(tenantId);
  });

  test("list rejects unauthenticated request", async () => {
    const t = convexTest(schema);
    await expect(t.query(api.legalDocuments.list, {})).rejects.toThrow();
  });

  test("create rejects unauthenticated request", async () => {
    const t = convexTest(schema);
    await expect(
      t.mutation(api.legalDocuments.create, {
        type: "privacy_policy",
        version: "1.0",
        content: "test",
        effectiveDate: "2026-01-01",
      })
    ).rejects.toThrow();
  });
});
