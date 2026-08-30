// IndexedDB wrapper + first-run seeding.
//
// Stores (all documents, denormalized — this is a single-user app so there's
// no need for relational joins):
//   profile  (keyPath "id", exactly one record, id="me")
//   exercises (keyPath "id")            library entries, incl. user-added
//   programs  (keyPath "id")            templates + the trainee's own copies,
//                                        each embedding its days & exercises
//   sessions  (keyPath "id")            logged workouts, embedding their sets

import { slugify, uid } from "./util.js";
import { EXERCISES } from "./data/exercises.js";
import { DEFAULT_PROGRAMS } from "./data/programs.js";

const DB_NAME = "exercise-tracker";
const DB_VERSION = 1;
const PROFILE_ID = "me";

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("profile")) db.createObjectStore("profile", { keyPath: "id" });
      if (!db.objectStoreNames.contains("exercises")) db.createObjectStore("exercises", { keyPath: "id" });
      if (!db.objectStoreNames.contains("programs")) db.createObjectStore("programs", { keyPath: "id" });
      if (!db.objectStoreNames.contains("sessions")) db.createObjectStore("sessions", { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(storeName, mode = "readonly") {
  return openDb().then((db) => db.transaction(storeName, mode).objectStore(storeName));
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const store = {
  async get(storeName, id) {
    const s = await tx(storeName);
    return reqToPromise(s.get(id));
  },
  async getAll(storeName) {
    const s = await tx(storeName);
    return reqToPromise(s.getAll());
  },
  async put(storeName, value) {
    const s = await tx(storeName, "readwrite");
    await reqToPromise(s.put(value));
    return value;
  },
  async delete(storeName, id) {
    const s = await tx(storeName, "readwrite");
    return reqToPromise(s.delete(id));
  },
};

export function exerciseId(name) {
  return "ex-" + slugify(name);
}

async function seedExercises() {
  const existing = await store.getAll("exercises");
  const existingIds = new Set(existing.map((e) => e.id));
  for (const [name, muscleGroup, equipment, isBodyweight, isCompound] of EXERCISES) {
    const id = exerciseId(name);
    if (existingIds.has(id)) continue;
    await store.put("exercises", {
      id, name, muscleGroup, equipment, isBodyweight, isCompound, isCustom: false,
    });
  }
}

function buildProgramFromSpec(spec, exerciseIndex) {
  const programId = spec.templateKey;
  return {
    id: programId,
    name: spec.name,
    description: spec.description,
    level: spec.level,
    goal: spec.goal,
    location: spec.location,
    daysPerWeek: spec.daysPerWeek,
    isTemplate: true,
    templateKey: spec.templateKey,
    ownerProfileId: null,
    forkedFromId: null,
    createdAt: new Date().toISOString(),
    days: spec.days.map((daySpec, dayIndex) => ({
      id: `${programId}-d${dayIndex}`,
      name: daySpec.name,
      order: dayIndex,
      exercises: daySpec.exercises.map((exSpec, exIndex) => {
        const exId = exerciseIndex.get(exSpec.exercise);
        if (!exId) throw new Error(`Unknown exercise "${exSpec.exercise}" in ${programId}`);
        return {
          id: `${programId}-d${dayIndex}-e${exIndex}`,
          exerciseId: exId,
          order: exIndex,
          sets: exSpec.sets,
          repMin: exSpec.repMin,
          repMax: exSpec.repMax,
          targetWeight: exSpec.targetWeight ?? null,
          weightUnit: exSpec.weightUnit || "kg",
          progressionType: exSpec.progressionType,
          increment: exSpec.increment ?? 2.5,
          restSeconds: exSpec.restSeconds ?? 90,
          notes: exSpec.notes || null,
          consecutiveMisses: 0,
          lastStatus: null,
          lastMessage: null,
        };
      }),
    })),
  };
}

async function seedDefaultPrograms() {
  const exercises = await store.getAll("exercises");
  const exerciseIndex = new Map(exercises.map((e) => [e.name, e.id]));
  const existing = await store.getAll("programs");
  const existingKeys = new Set(existing.filter((p) => p.isTemplate).map((p) => p.templateKey));
  for (const spec of DEFAULT_PROGRAMS) {
    if (existingKeys.has(spec.templateKey)) continue;
    const program = buildProgramFromSpec(spec, exerciseIndex);
    await store.put("programs", program);
  }
}

export async function getProfile() {
  let profile = await store.get("profile", PROFILE_ID);
  if (!profile) {
    profile = {
      id: PROFILE_ID,
      name: "Me",
      experienceLevel: "beginner",
      primaryGoal: "general_fitness",
      locationPreference: "gym",
      daysPerWeek: 3,
      weightUnit: "kg",
      onboarded: false,
      activeProgramId: null,
    };
    await store.put("profile", profile);
  }
  return profile;
}

export async function saveProfile(profile) {
  return store.put("profile", profile);
}

export async function init() {
  await seedExercises();
  await seedDefaultPrograms();
  return getProfile();
}

export { uid };
