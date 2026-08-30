// Program catalog: goal-based recommendations and cloning a template into
// an editable, profile-owned program.

import { store, uid } from "./db.js";

const LEVEL_ORDER = { beginner: 0, intermediate: 1, advanced: 2 };

function locationOk(program, profile) {
  if (profile.locationPreference === "both") return true;
  return program.location === profile.locationPreference;
}

function score(program, profile) {
  const goalMatch = program.goal === profile.primaryGoal ? 0 : 1;
  const levelMatch = Math.abs(
    (LEVEL_ORDER[program.level] ?? 1) - (LEVEL_ORDER[profile.experienceLevel] ?? 0)
  );
  const locationMatch = locationOk(program, profile) ? 0 : 1;
  return [locationMatch, goalMatch, levelMatch];
}

function compareTuples(a, b) {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

/** Best-effort recommendation: goal + level + location, relaxed as needed. */
export async function recommendPrograms(profile, limit = 5) {
  const all = await store.getAll("programs");
  const templates = all.filter((p) => p.isTemplate);
  const ranked = templates
    .map((p) => ({ p, s: score(p, profile) }))
    .sort((a, b) => compareTuples(a.s, b.s))
    .map((x) => x.p);
  return ranked.slice(0, limit);
}

export async function allTemplates() {
  const all = await store.getAll("programs");
  return all.filter((p) => p.isTemplate);
}

export async function getProgram(id) {
  return store.get("programs", id);
}

/** Clone a template program into an editable copy owned by the profile. */
export async function cloneProgramForProfile(template, profile) {
  const programId = uid();
  const clone = {
    id: programId,
    name: template.name,
    description: template.description,
    level: template.level,
    goal: template.goal,
    location: template.location,
    daysPerWeek: template.daysPerWeek,
    isTemplate: false,
    templateKey: null,
    ownerProfileId: profile.id,
    forkedFromId: template.id,
    createdAt: new Date().toISOString(),
    days: template.days.map((day, dayIndex) => ({
      id: uid(),
      name: day.name,
      order: dayIndex,
      exercises: day.exercises.map((pe, exIndex) => ({
        id: uid(),
        exerciseId: pe.exerciseId,
        order: exIndex,
        sets: pe.sets,
        repMin: pe.repMin,
        repMax: pe.repMax,
        targetWeight: pe.targetWeight,
        weightUnit: pe.weightUnit,
        progressionType: pe.progressionType,
        increment: pe.increment,
        restSeconds: pe.restSeconds,
        notes: pe.notes,
        consecutiveMisses: 0,
        lastStatus: null,
        lastMessage: null,
      })),
    })),
  };
  await store.put("programs", clone);
  profile.activeProgramId = clone.id;
  await store.put("profile", profile);
  return clone;
}

export async function saveProgram(program) {
  return store.put("programs", program);
}

/** Pick the next day to train in an active program, cycling through order. */
export async function nextDay(program, sessions) {
  if (!program.days.length) return null;
  const programSessions = sessions
    .filter((s) => s.programId === program.id)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.createdAt || "").localeCompare(a.createdAt || "")));
  if (!programSessions.length) return program.days[0];
  const last = programSessions[0];
  const lastDay = program.days.find((d) => d.id === last.programDayId);
  if (!lastDay) return program.days[0];
  const nextOrder = (lastDay.order + 1) % program.days.length;
  return program.days.find((d) => d.order === nextOrder) || program.days[0];
}
