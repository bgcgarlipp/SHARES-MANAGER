// Progressive-overload engine.
//
// After a workout is logged, evaluateSession() looks at how the working sets
// for one exercise went against its prescribed rep range and decides what to
// prescribe next session: hold, add weight/reps, or deload after repeated
// failure. applyResult() writes the outcome back onto the owning
// programExercise object so the program itself always reflects the
// trainee's current, up-to-date targets.

const DELOAD_FACTOR = 0.9;
const MISSES_BEFORE_DELOAD = 2; // consecutive missed sessions before we deload

function roundWeight(value) {
  return Math.round(value * 100) / 100;
}

function missed(pe, unit) {
  if (pe.consecutiveMisses + 1 >= MISSES_BEFORE_DELOAD) {
    const newWeight = roundWeight((pe.targetWeight || 0) * DELOAD_FACTOR);
    return {
      nextWeight: newWeight, nextRepMin: pe.repMin, nextRepMax: pe.repMax, status: "deload",
      message: `Missed the rep target ${pe.consecutiveMisses + 1} sessions in a row — ` +
        `deloading to ${newWeight}${unit} to rebuild.`,
    };
  }
  return {
    nextWeight: pe.targetWeight, nextRepMin: pe.repMin, nextRepMax: pe.repMax, status: "miss",
    message: "Missed the rep target — repeat the same weight next session.",
  };
}

/**
 * Decide the next prescription for one program exercise.
 * @param {object} pe programExercise object (mutated only by applyResult)
 * @param {Array<{repsCompleted:number}>} workingSets set logs for this
 *   exercise from the session just logged, warm-up sets excluded.
 */
export function evaluateSession(pe, workingSets) {
  const unit = pe.weightUnit || "kg";

  if (!workingSets || workingSets.length === 0) {
    return {
      nextWeight: pe.targetWeight, nextRepMin: pe.repMin, nextRepMax: pe.repMax,
      status: "hold_in_range", message: "No working sets logged — targets unchanged.",
    };
  }

  const hitTop = workingSets.every((s) => s.repsCompleted >= pe.repMax);
  const hitMin = workingSets.every((s) => s.repsCompleted >= pe.repMin);

  if (pe.progressionType === "static") {
    return {
      nextWeight: pe.targetWeight, nextRepMin: pe.repMin, nextRepMax: pe.repMax, status: "fixed",
      message: "Fixed prescription — no auto-progression for this exercise.",
    };
  }

  if (pe.progressionType === "bodyweight_reps") {
    if (hitTop) {
      const newMin = pe.repMin + 1;
      const newMax = pe.repMax + 2;
      return {
        nextWeight: null, nextRepMin: newMin, nextRepMax: newMax, status: "progress_reps",
        message: `All sets hit ${pe.repMax}+ reps — target raised to ${newMin}-${newMax} reps next session.`,
      };
    }
    if (!hitMin) {
      return {
        nextWeight: null, nextRepMin: pe.repMin, nextRepMax: pe.repMax, status: "miss",
        message: `Missed the ${pe.repMin}-rep target — repeat the same goal next session.`,
      };
    }
    return {
      nextWeight: null, nextRepMin: pe.repMin, nextRepMax: pe.repMax, status: "hold_in_range",
      message: "Within range but not at the top yet — repeat and push for more reps.",
    };
  }

  if (pe.progressionType === "double_progression") {
    if (hitTop) {
      const newWeight = roundWeight((pe.targetWeight || 0) + pe.increment);
      return {
        nextWeight: newWeight, nextRepMin: pe.repMin, nextRepMax: pe.repMax, status: "increase",
        message: `Hit the top of the rep range on every set — weight increased to ` +
          `${newWeight}${unit}, reps reset to ${pe.repMin}.`,
      };
    }
    if (hitMin) {
      return {
        nextWeight: pe.targetWeight, nextRepMin: pe.repMin, nextRepMax: pe.repMax, status: "hold_in_range",
        message: "In range but not at the top yet — same weight, aim for more reps.",
      };
    }
    return missed(pe, unit);
  }

  // linear_weight (default)
  if (hitTop) {
    const newWeight = roundWeight((pe.targetWeight || 0) + pe.increment);
    return {
      nextWeight: newWeight, nextRepMin: pe.repMin, nextRepMax: pe.repMax, status: "increase",
      message: `All sets met the rep target — weight increased to ${newWeight}${unit} next session.`,
    };
  }
  if (hitMin) {
    return {
      nextWeight: pe.targetWeight, nextRepMin: pe.repMin, nextRepMax: pe.repMax, status: "hold_in_range",
      message: "Sets landed inside the rep range but not at the top — repeat this weight.",
    };
  }
  return missed(pe, unit);
}

/** Persist an evaluateSession() result onto its programExercise (mutates in place). */
export function applyResult(pe, result) {
  if (result.nextWeight !== null && result.nextWeight !== undefined) {
    pe.targetWeight = result.nextWeight;
  }
  pe.repMin = result.nextRepMin;
  pe.repMax = result.nextRepMax;
  pe.lastStatus = result.status;
  pe.lastMessage = result.message;
  pe.consecutiveMisses = result.status === "miss" ? pe.consecutiveMisses + 1 : 0;
}

export const STATUS_LABELS = {
  increase: "Weight up",
  hold_in_range: "Hold",
  miss: "Missed target",
  deload: "Deload",
  progress_reps: "Reps up",
  fixed: "Fixed",
};
