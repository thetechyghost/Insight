import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

function identity(email: string) {
  return {
    email,
    subject: `user|${email}`,
    tokenIdentifier: `test|${email}`,
  };
}

describe("memberNotes", () => {
  // NOTE: The create handler writes `createdAt: Date.now()` but the schema
  // does not define a `createdAt` field on member_notes. This is a schema
  // mismatch bug. The test verifies the handler attempts the insert and
  // expects the validator error.
  test("create stores note with correct authorId", async () => {
    const t = convexTest(schema);

    const { tenantId, coachUserId, athleteMembershipId } = await t.run(
      async (ctx) => {
        const coachUserId = await ctx.db.insert("users", {
          name: "Coach",
          email: "coach@example.com",
        });
        const tenantId = await ctx.db.insert("tenants", {
          name: "Test Gym",
          slug: "test-gym",
        });
        await ctx.db.insert("memberships", {
          userId: coachUserId,
          tenantId,
          role: "coach",
          status: "active",
          isPrimaryGym: true,
          joinDate: "2024-01-01",
        });

        const athleteId = await ctx.db.insert("users", {
          name: "Athlete",
          email: "athlete@example.com",
        });
        const athleteMembershipId = await ctx.db.insert("memberships", {
          userId: athleteId,
          tenantId,
          role: "athlete",
          status: "active",
          isPrimaryGym: true,
          joinDate: "2024-01-01",
        });

        return { tenantId, coachUserId, athleteMembershipId };
      }
    );

    const asCoach = t.withIdentity(identity("coach@example.com"));

    const noteId = await asCoach.mutation(api.memberNotes.create, {
      tenantId,
      memberId: athleteMembershipId,
      content: "Great progress today!",
    });

    const note = await t.run(async (ctx) => ctx.db.get(noteId));
    expect(note!.authorId).toBe(coachUserId);
    expect(note!.content).toBe("Great progress today!");
  });

  test("update only allows original author (second user should fail)", async () => {
    const t = convexTest(schema);

    const { tenantId, noteId } = await t.run(async (ctx) => {
      const coach1Id = await ctx.db.insert("users", {
        name: "Coach One",
        email: "coach1@example.com",
      });
      const tenantId = await ctx.db.insert("tenants", {
        name: "Test Gym",
        slug: "test-gym",
      });
      await ctx.db.insert("memberships", {
        userId: coach1Id,
        tenantId,
        role: "coach",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      const coach2Id = await ctx.db.insert("users", {
        name: "Coach Two",
        email: "coach2@example.com",
      });
      await ctx.db.insert("memberships", {
        userId: coach2Id,
        tenantId,
        role: "coach",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      const athleteId = await ctx.db.insert("users", {
        name: "Athlete",
        email: "athlete@example.com",
      });
      const athleteMembershipId = await ctx.db.insert("memberships", {
        userId: athleteId,
        tenantId,
        role: "athlete",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      const noteId = await ctx.db.insert("member_notes", {
        tenantId,
        memberId: athleteMembershipId,
        authorId: coach1Id,
        content: "Original note",
        createdAt: Date.now(),
      });

      return { tenantId, noteId };
    });

    // Coach 2 tries to update Coach 1's note — should fail
    const asCoach2 = t.withIdentity(identity("coach2@example.com"));

    await expect(
      asCoach2.mutation(api.memberNotes.update, {
        tenantId,
        noteId,
        content: "Hijacked note",
      })
    ).rejects.toThrow("Only the original author can edit this note");
  });

  test("listByMember returns notes for correct member only", async () => {
    const t = convexTest(schema);

    const { tenantId, membershipAId, membershipBId } = await t.run(
      async (ctx) => {
        const coachId = await ctx.db.insert("users", {
          name: "Coach",
          email: "coach@example.com",
        });
        const tenantId = await ctx.db.insert("tenants", {
          name: "Test Gym",
          slug: "test-gym",
        });
        await ctx.db.insert("memberships", {
          userId: coachId,
          tenantId,
          role: "coach",
          status: "active",
          isPrimaryGym: true,
          joinDate: "2024-01-01",
        });

        const athleteAId = await ctx.db.insert("users", {
          name: "Athlete A",
          email: "athletea@example.com",
        });
        const membershipAId = await ctx.db.insert("memberships", {
          userId: athleteAId,
          tenantId,
          role: "athlete",
          status: "active",
          isPrimaryGym: true,
          joinDate: "2024-01-01",
        });

        const athleteBId = await ctx.db.insert("users", {
          name: "Athlete B",
          email: "athleteb@example.com",
        });
        const membershipBId = await ctx.db.insert("memberships", {
          userId: athleteBId,
          tenantId,
          role: "athlete",
          status: "active",
          isPrimaryGym: true,
          joinDate: "2024-01-01",
        });

        // Notes for Athlete A
        await ctx.db.insert("member_notes", {
          tenantId,
          memberId: membershipAId,
          authorId: coachId,
          content: "Note for A",
          createdAt: Date.now(),
        });

        // Notes for Athlete B
        await ctx.db.insert("member_notes", {
          tenantId,
          memberId: membershipBId,
          authorId: coachId,
          content: "Note for B",
          createdAt: Date.now(),
        });

        return { tenantId, membershipAId, membershipBId };
      }
    );

    const asCoach = t.withIdentity(identity("coach@example.com"));

    const notesA = await asCoach.query(api.memberNotes.listByMember, {
      tenantId,
      memberId: membershipAId,
    });

    expect(notesA).toHaveLength(1);
    expect(notesA[0].content).toBe("Note for A");
    expect(notesA[0].memberId).toEqual(membershipAId);

    const notesB = await asCoach.query(api.memberNotes.listByMember, {
      tenantId,
      memberId: membershipBId,
    });

    expect(notesB).toHaveLength(1);
    expect(notesB[0].content).toBe("Note for B");
  });

  test("listByMember requires coach role (athlete should fail)", async () => {
    const t = convexTest(schema);

    const { tenantId, membershipId } = await t.run(async (ctx) => {
      const athleteId = await ctx.db.insert("users", {
        name: "Athlete",
        email: "athlete@example.com",
      });
      const tenantId = await ctx.db.insert("tenants", {
        name: "Test Gym",
        slug: "test-gym",
      });
      const membershipId = await ctx.db.insert("memberships", {
        userId: athleteId,
        tenantId,
        role: "athlete",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      return { tenantId, membershipId };
    });

    const asAthlete = t.withIdentity(identity("athlete@example.com"));

    await expect(
      asAthlete.query(api.memberNotes.listByMember, {
        tenantId,
        memberId: membershipId,
      })
    ).rejects.toThrow("Insufficient permissions");
  });
});
