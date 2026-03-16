import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { SeedContext } from "../types";

/**
 * Workout seed fixture — creates exercises, workout definitions,
 * and benchmark workouts for integration tests.
 *
 * Requires the foundation fixture to have run first (users, tenants, memberships).
 *
 * Created entities:
 * - Exercises: "Back Squat", "Pull-Up", "Double-Under" (in cfAlpha)
 * - Workout definition: "Fran" (AMRAP in cfAlpha)
 * - Benchmark workout: "Murph" (Hero benchmark in cfAlpha)
 */
export interface WorkoutSeedResult {
  exercises: {
    backSquat: string;
    pullUp: string;
    doubleUnder: string;
  };
  workoutDefinitions: {
    fran: string;
  };
  benchmarkWorkouts: {
    murph: string;
  };
}

/**
 * Seed workout domain entities using a coach-level authenticated client.
 *
 * @param ctx - The SeedContext from the foundation fixture
 * @param coachClient - An authenticated ConvexHttpClient for a coach+ user
 * @returns IDs of all created workout entities
 */
export async function seedWorkouts(
  ctx: SeedContext,
  coachClient: ConvexHttpClient
): Promise<WorkoutSeedResult> {
  const tenantId = ctx.tenants.cfAlpha.id as Id<"tenants">;

  // --- Exercises ---

  const backSquatId = await coachClient.mutation(api.exercises.create, {
    tenantId,
    name: "Back Squat",
    category: "weightlifting",
    equipment: ["barbell", "squat rack"],
    muscleGroups: ["quadriceps", "glutes", "hamstrings"],
    instructions: "Place barbell on upper back, squat below parallel, stand up.",
    difficultyLevel: "intermediate",
  });

  const pullUpId = await coachClient.mutation(api.exercises.create, {
    tenantId,
    name: "Pull-Up",
    category: "gymnastics",
    equipment: ["pull-up bar"],
    muscleGroups: ["lats", "biceps", "forearms"],
    aliases: ["Strict Pull-Up"],
    instructions: "Hang from bar with arms extended, pull chin over bar.",
    difficultyLevel: "intermediate",
  });

  const doubleUnderId = await coachClient.mutation(api.exercises.create, {
    tenantId,
    name: "Double-Under",
    category: "monostructural",
    equipment: ["jump rope"],
    muscleGroups: ["calves", "shoulders"],
    aliases: ["DU", "Double Under"],
    instructions: "Jump rope passes under feet twice per jump.",
    difficultyLevel: "intermediate",
  });

  // --- Workout Definition ---

  const franId = await coachClient.mutation(api.workoutDefinitions.create, {
    tenantId,
    name: "Fran",
    description: "21-15-9 Thrusters and Pull-Ups",
    workoutType: "ForTime",
    components: [
      { exerciseName: "Thruster", reps: 21, sets: 1, order: 1, weight: { value: 95, unit: "lbs" } },
      { exerciseName: "Pull-Up", reps: 21, sets: 1, order: 2 },
      { exerciseName: "Thruster", reps: 15, sets: 1, order: 3, weight: { value: 95, unit: "lbs" } },
      { exerciseName: "Pull-Up", reps: 15, sets: 1, order: 4 },
      { exerciseName: "Thruster", reps: 9, sets: 1, order: 5, weight: { value: 95, unit: "lbs" } },
      { exerciseName: "Pull-Up", reps: 9, sets: 1, order: 6 },
    ],
    timeCap: 600,
    intendedStimulus: "Fast, aggressive pace. Should be sub-10 minutes for most athletes.",
    scalingGuidance: "Scale weight and use banded pull-ups as needed.",
  });

  // --- Benchmark Workout ---

  const murphId = await coachClient.mutation(api.benchmarkWorkouts.create, {
    tenantId,
    name: "Murph",
    description: "1 mile run, 100 pull-ups, 200 push-ups, 300 squats, 1 mile run. Partition pull-ups, push-ups, and squats as needed.",
    workoutType: "ForTime",
    prescribedMovements: [
      { exerciseName: "Run", distance: { value: 1, unit: "mile" } },
      { exerciseName: "Pull-Up", reps: 100 },
      { exerciseName: "Push-Up", reps: 200 },
      { exerciseName: "Air Squat", reps: 300 },
      { exerciseName: "Run", distance: { value: 1, unit: "mile" } },
    ],
    timeCap: 3600,
    scoringMethod: "time",
    category: "Hero",
    intendedStimulus: "Long grinding workout. Wear a 20lb vest for Rx.",
  });

  return {
    exercises: {
      backSquat: backSquatId,
      pullUp: pullUpId,
      doubleUnder: doubleUnderId,
    },
    workoutDefinitions: {
      fran: franId,
    },
    benchmarkWorkouts: {
      murph: murphId,
    },
  };
}
