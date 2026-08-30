// Aggregate logged results into chart-ready series.

import { isoWeekKey } from "./util.js";

/** Epley formula; a reasonable estimate for reps <= ~12. */
export function estimatedOneRm(weight, reps) {
  if (reps <= 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

/** Per-session best set (top weight, then top est. 1RM) for one exercise. */
export function exerciseProgress(sessions, exerciseId) {
  const bestByDate = new Map();
  for (const session of sessions) {
    for (const set of session.sets) {
      if (set.exerciseId !== exerciseId || set.isWarmup) continue;
      const est = estimatedOneRm(set.weight, set.repsCompleted);
      const current = bestByDate.get(session.date);
      if (!current || est > current.estimated1Rm) {
        bestByDate.set(session.date, { weight: set.weight, estimated1Rm: est });
      }
    }
  }
  const dates = Array.from(bestByDate.keys()).sort();
  return {
    dates,
    topWeight: dates.map((d) => bestByDate.get(d).weight),
    estimated1Rm: dates.map((d) => bestByDate.get(d).estimated1Rm),
  };
}

/** Total volume (weight x reps, working sets only), grouped by ISO week. */
export function weeklyVolume(sessions) {
  const totals = new Map();
  for (const session of sessions) {
    const key = isoWeekKey(session.date);
    let sum = totals.get(key) || 0;
    for (const set of session.sets) {
      if (set.isWarmup) continue;
      sum += (set.weight || 0) * set.repsCompleted;
    }
    totals.set(key, sum);
  }
  const weeks = Array.from(totals.keys()).sort();
  return { weeks, volume: weeks.map((w) => Math.round(totals.get(w) * 10) / 10) };
}
