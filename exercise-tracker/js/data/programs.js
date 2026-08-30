// Default program catalog: beginner/intermediate/advanced, gym and home.
//
// Seeded once (matched by templateKey) as read-only templates. Picking a
// program clones it into a profile-owned, fully editable copy — see
// js/catalog.js. Exercise names must match entries in js/data/exercises.js.
//
// progressionType:
//   linear_weight      add weight once all sets hit repMax; hold if within
//                       range; deload after repeated misses. Used for big
//                       barbell compounds with a narrow, fixed rep target.
//   double_progression climb reps across a range before adding weight, then
//                       reset reps to the bottom of the range.
//   bodyweight_reps     no external weight; progress by raising the rep
//                       target (or hold body position longer for planks).
//   static              fixed prescription, no auto-progression.

export const DEFAULT_PROGRAMS = [
  // ---------------------------------------------------------------- GYM --
  {
    templateKey: "beginner_full_body_strength_gym",
    name: "Beginner Full-Body Strength",
    description:
      "A classic 3-day full-body routine built around the big barbell lifts. Add weight every " +
      "session as long as you hit the rep target — this is where most of your early strength comes from.",
    level: "beginner", goal: "strength", location: "gym", daysPerWeek: 3,
    days: [
      { name: "Day 1 - Full Body A", exercises: [
        { exercise: "Barbell Back Squat", sets: 3, repMin: 5, repMax: 5, targetWeight: 20.0, progressionType: "linear_weight", increment: 2.5, restSeconds: 150 },
        { exercise: "Barbell Bench Press", sets: 3, repMin: 5, repMax: 5, targetWeight: 20.0, progressionType: "linear_weight", increment: 2.5, restSeconds: 150 },
        { exercise: "Barbell Bent-Over Row", sets: 3, repMin: 8, repMax: 10, targetWeight: 20.0, progressionType: "double_progression", increment: 2.5, restSeconds: 90 },
        { exercise: "Plank", sets: 3, repMin: 20, repMax: 45, progressionType: "bodyweight_reps", restSeconds: 60, notes: "Reps = seconds held." },
      ]},
      { name: "Day 2 - Full Body B", exercises: [
        { exercise: "Barbell Deadlift", sets: 3, repMin: 5, repMax: 5, targetWeight: 30.0, progressionType: "linear_weight", increment: 5.0, restSeconds: 180 },
        { exercise: "Barbell Overhead Press", sets: 3, repMin: 5, repMax: 5, targetWeight: 15.0, progressionType: "linear_weight", increment: 2.5, restSeconds: 150 },
        { exercise: "Lat Pulldown", sets: 3, repMin: 8, repMax: 12, targetWeight: 25.0, progressionType: "double_progression", increment: 2.5, restSeconds: 90 },
        { exercise: "Dumbbell Bicep Curl", sets: 3, repMin: 8, repMax: 12, targetWeight: 8.0, progressionType: "double_progression", increment: 1.0, restSeconds: 60 },
      ]},
      { name: "Day 3 - Full Body A", exercises: [
        { exercise: "Barbell Back Squat", sets: 3, repMin: 5, repMax: 5, targetWeight: 20.0, progressionType: "linear_weight", increment: 2.5, restSeconds: 150 },
        { exercise: "Barbell Incline Bench Press", sets: 3, repMin: 6, repMax: 8, targetWeight: 17.5, progressionType: "double_progression", increment: 2.5, restSeconds: 120 },
        { exercise: "Seated Cable Row", sets: 3, repMin: 8, repMax: 12, targetWeight: 25.0, progressionType: "double_progression", increment: 2.5, restSeconds: 90 },
        { exercise: "Cable Face Pull", sets: 3, repMin: 12, repMax: 15, targetWeight: 10.0, progressionType: "double_progression", increment: 1.0, restSeconds: 60 },
      ]},
    ],
  },
  {
    templateKey: "beginner_general_fitness_gym",
    name: "Beginner Gym Fitness Foundation",
    description:
      "Machine- and dumbbell-led full-body sessions for building confidence in the gym and " +
      "general fitness without heavy barbell loading.",
    level: "beginner", goal: "general_fitness", location: "gym", daysPerWeek: 3,
    days: [
      { name: "Day 1 - Full Body", exercises: [
        { exercise: "Leg Press", sets: 3, repMin: 10, repMax: 15, targetWeight: 40.0, progressionType: "double_progression", increment: 5.0, restSeconds: 90 },
        { exercise: "Chest Fly Machine", sets: 3, repMin: 10, repMax: 15, targetWeight: 15.0, progressionType: "double_progression", increment: 2.5, restSeconds: 75 },
        { exercise: "Seated Cable Row", sets: 3, repMin: 10, repMax: 15, targetWeight: 20.0, progressionType: "double_progression", increment: 2.5, restSeconds: 75 },
        { exercise: "Plank", sets: 3, repMin: 15, repMax: 30, progressionType: "bodyweight_reps", restSeconds: 45, notes: "Reps = seconds held." },
      ]},
      { name: "Day 2 - Full Body", exercises: [
        { exercise: "Dumbbell Goblet Squat", sets: 3, repMin: 10, repMax: 15, targetWeight: 10.0, progressionType: "double_progression", increment: 2.0, restSeconds: 90 },
        { exercise: "Dumbbell Shoulder Press", sets: 3, repMin: 8, repMax: 12, targetWeight: 8.0, progressionType: "double_progression", increment: 1.0, restSeconds: 75 },
        { exercise: "Lat Pulldown", sets: 3, repMin: 10, repMax: 15, targetWeight: 20.0, progressionType: "double_progression", increment: 2.5, restSeconds: 75 },
        { exercise: "Bicycle Crunch", sets: 3, repMin: 15, repMax: 25, progressionType: "bodyweight_reps", restSeconds: 45 },
      ]},
      { name: "Day 3 - Full Body", exercises: [
        { exercise: "Leg Curl Machine", sets: 3, repMin: 10, repMax: 15, targetWeight: 20.0, progressionType: "double_progression", increment: 2.5, restSeconds: 75 },
        { exercise: "Dumbbell Bench Press", sets: 3, repMin: 8, repMax: 12, targetWeight: 10.0, progressionType: "double_progression", increment: 1.0, restSeconds: 90 },
        { exercise: "Dumbbell Row", sets: 3, repMin: 8, repMax: 12, targetWeight: 12.0, progressionType: "double_progression", increment: 1.0, restSeconds: 75 },
        { exercise: "Dumbbell Lateral Raise", sets: 3, repMin: 12, repMax: 15, targetWeight: 4.0, progressionType: "double_progression", increment: 0.5, restSeconds: 60 },
      ]},
    ],
  },
  {
    templateKey: "intermediate_upper_lower_hypertrophy_gym",
    name: "Intermediate Upper/Lower Hypertrophy",
    description:
      "4-day upper/lower split for building muscle once beginner linear progress has slowed. " +
      "Double progression drives most accessory work; the main lifts still climb in weight.",
    level: "intermediate", goal: "hypertrophy", location: "gym", daysPerWeek: 4,
    days: [
      { name: "Day 1 - Upper", exercises: [
        { exercise: "Barbell Bench Press", sets: 4, repMin: 6, repMax: 8, targetWeight: 40.0, progressionType: "linear_weight", increment: 2.5, restSeconds: 120 },
        { exercise: "Barbell Bent-Over Row", sets: 4, repMin: 6, repMax: 8, targetWeight: 40.0, progressionType: "linear_weight", increment: 2.5, restSeconds: 120 },
        { exercise: "Dumbbell Incline Press", sets: 3, repMin: 8, repMax: 12, targetWeight: 14.0, progressionType: "double_progression", increment: 1.0, restSeconds: 90 },
        { exercise: "Lat Pulldown", sets: 3, repMin: 8, repMax: 12, targetWeight: 35.0, progressionType: "double_progression", increment: 2.5, restSeconds: 90 },
        { exercise: "Dumbbell Lateral Raise", sets: 3, repMin: 12, repMax: 15, targetWeight: 6.0, progressionType: "double_progression", increment: 0.5, restSeconds: 60 },
      ]},
      { name: "Day 2 - Lower", exercises: [
        { exercise: "Barbell Back Squat", sets: 4, repMin: 6, repMax: 8, targetWeight: 50.0, progressionType: "linear_weight", increment: 2.5, restSeconds: 150 },
        { exercise: "Barbell Romanian Deadlift", sets: 3, repMin: 8, repMax: 10, targetWeight: 40.0, progressionType: "double_progression", increment: 2.5, restSeconds: 120 },
        { exercise: "Leg Press", sets: 3, repMin: 10, repMax: 15, targetWeight: 80.0, progressionType: "double_progression", increment: 5.0, restSeconds: 90 },
        { exercise: "Leg Curl Machine", sets: 3, repMin: 10, repMax: 15, targetWeight: 25.0, progressionType: "double_progression", increment: 2.5, restSeconds: 75 },
        { exercise: "Seated Calf Raise Machine", sets: 4, repMin: 12, repMax: 20, targetWeight: 30.0, progressionType: "double_progression", increment: 5.0, restSeconds: 60 },
      ]},
      { name: "Day 3 - Upper", exercises: [
        { exercise: "Barbell Overhead Press", sets: 4, repMin: 6, repMax: 8, targetWeight: 25.0, progressionType: "linear_weight", increment: 2.5, restSeconds: 120 },
        { exercise: "Assisted Pull-Up Machine", sets: 4, repMin: 6, repMax: 10, targetWeight: 20.0, progressionType: "double_progression", increment: 2.5, restSeconds: 120, notes: "Weight = assistance level; lower it as you get stronger." },
        { exercise: "Dumbbell Bench Press", sets: 3, repMin: 8, repMax: 12, targetWeight: 16.0, progressionType: "double_progression", increment: 1.0, restSeconds: 90 },
        { exercise: "Seated Cable Row", sets: 3, repMin: 8, repMax: 12, targetWeight: 35.0, progressionType: "double_progression", increment: 2.5, restSeconds: 90 },
        { exercise: "Cable Tricep Pushdown", sets: 3, repMin: 10, repMax: 15, targetWeight: 15.0, progressionType: "double_progression", increment: 1.0, restSeconds: 60 },
      ]},
      { name: "Day 4 - Lower", exercises: [
        { exercise: "Barbell Deadlift", sets: 3, repMin: 5, repMax: 5, targetWeight: 60.0, progressionType: "linear_weight", increment: 5.0, restSeconds: 180 },
        { exercise: "Dumbbell Bulgarian Split Squat", sets: 3, repMin: 8, repMax: 12, targetWeight: 12.0, progressionType: "double_progression", increment: 1.0, restSeconds: 90 },
        { exercise: "Leg Extension Machine", sets: 3, repMin: 10, repMax: 15, targetWeight: 25.0, progressionType: "double_progression", increment: 2.5, restSeconds: 75 },
        { exercise: "Barbell Hip Thrust", sets: 3, repMin: 8, repMax: 12, targetWeight: 30.0, progressionType: "double_progression", increment: 2.5, restSeconds: 90 },
        { exercise: "Plank", sets: 3, repMin: 30, repMax: 60, progressionType: "bodyweight_reps", restSeconds: 45, notes: "Reps = seconds held." },
      ]},
    ],
  },
  {
    templateKey: "advanced_ppl_hypertrophy_gym",
    name: "Advanced Push/Pull/Legs",
    description: "6-day push/pull/legs for experienced lifters chasing hypertrophy with high weekly volume.",
    level: "advanced", goal: "hypertrophy", location: "gym", daysPerWeek: 6,
    days: [
      { name: "Day 1 - Push", exercises: [
        { exercise: "Barbell Bench Press", sets: 5, repMin: 5, repMax: 6, targetWeight: 70.0, progressionType: "linear_weight", increment: 2.5, restSeconds: 150 },
        { exercise: "Barbell Overhead Press", sets: 4, repMin: 6, repMax: 8, targetWeight: 35.0, progressionType: "linear_weight", increment: 2.5, restSeconds: 120 },
        { exercise: "Dumbbell Incline Press", sets: 3, repMin: 8, repMax: 12, targetWeight: 20.0, progressionType: "double_progression", increment: 1.0, restSeconds: 90 },
        { exercise: "Dumbbell Lateral Raise", sets: 4, repMin: 12, repMax: 15, targetWeight: 8.0, progressionType: "double_progression", increment: 0.5, restSeconds: 60 },
        { exercise: "Cable Tricep Pushdown", sets: 3, repMin: 10, repMax: 15, targetWeight: 20.0, progressionType: "double_progression", increment: 1.0, restSeconds: 60 },
      ]},
      { name: "Day 2 - Pull", exercises: [
        { exercise: "Barbell Deadlift", sets: 3, repMin: 4, repMax: 5, targetWeight: 90.0, progressionType: "linear_weight", increment: 5.0, restSeconds: 180 },
        { exercise: "Pull-Up", sets: 4, repMin: 6, repMax: 10, progressionType: "bodyweight_reps", restSeconds: 120 },
        { exercise: "Barbell Bent-Over Row", sets: 4, repMin: 6, repMax: 8, targetWeight: 55.0, progressionType: "linear_weight", increment: 2.5, restSeconds: 120 },
        { exercise: "Seated Cable Row", sets: 3, repMin: 8, repMax: 12, targetWeight: 45.0, progressionType: "double_progression", increment: 2.5, restSeconds: 90 },
        { exercise: "Dumbbell Bicep Curl", sets: 4, repMin: 8, repMax: 12, targetWeight: 14.0, progressionType: "double_progression", increment: 1.0, restSeconds: 60 },
      ]},
      { name: "Day 3 - Legs", exercises: [
        { exercise: "Barbell Back Squat", sets: 5, repMin: 5, repMax: 6, targetWeight: 85.0, progressionType: "linear_weight", increment: 2.5, restSeconds: 180 },
        { exercise: "Barbell Romanian Deadlift", sets: 4, repMin: 8, repMax: 10, targetWeight: 55.0, progressionType: "double_progression", increment: 2.5, restSeconds: 120 },
        { exercise: "Leg Press", sets: 4, repMin: 10, repMax: 15, targetWeight: 120.0, progressionType: "double_progression", increment: 5.0, restSeconds: 90 },
        { exercise: "Leg Curl Machine", sets: 3, repMin: 10, repMax: 15, targetWeight: 30.0, progressionType: "double_progression", increment: 2.5, restSeconds: 75 },
        { exercise: "Seated Calf Raise Machine", sets: 4, repMin: 12, repMax: 20, targetWeight: 40.0, progressionType: "double_progression", increment: 5.0, restSeconds: 60 },
      ]},
      { name: "Day 4 - Push", exercises: [
        { exercise: "Barbell Incline Bench Press", sets: 4, repMin: 6, repMax: 8, targetWeight: 45.0, progressionType: "linear_weight", increment: 2.5, restSeconds: 120 },
        { exercise: "Dumbbell Shoulder Press", sets: 4, repMin: 8, repMax: 12, targetWeight: 16.0, progressionType: "double_progression", increment: 1.0, restSeconds: 90 },
        { exercise: "Chest Fly Machine", sets: 3, repMin: 10, repMax: 15, targetWeight: 25.0, progressionType: "double_progression", increment: 2.5, restSeconds: 75 },
        { exercise: "Dumbbell Tricep Extension", sets: 3, repMin: 10, repMax: 15, targetWeight: 10.0, progressionType: "double_progression", increment: 1.0, restSeconds: 60 },
        { exercise: "Dumbbell Lateral Raise", sets: 3, repMin: 12, repMax: 15, targetWeight: 8.0, progressionType: "double_progression", increment: 0.5, restSeconds: 60 },
      ]},
      { name: "Day 5 - Pull", exercises: [
        { exercise: "Chin-Up", sets: 4, repMin: 6, repMax: 10, progressionType: "bodyweight_reps", restSeconds: 120 },
        { exercise: "Dumbbell Row", sets: 4, repMin: 8, repMax: 12, targetWeight: 22.0, progressionType: "double_progression", increment: 1.0, restSeconds: 90 },
        { exercise: "Lat Pulldown", sets: 3, repMin: 8, repMax: 12, targetWeight: 45.0, progressionType: "double_progression", increment: 2.5, restSeconds: 90 },
        { exercise: "Cable Face Pull", sets: 4, repMin: 12, repMax: 15, targetWeight: 15.0, progressionType: "double_progression", increment: 1.0, restSeconds: 60 },
        { exercise: "Barbell Bicep Curl", sets: 3, repMin: 8, repMax: 12, targetWeight: 20.0, progressionType: "double_progression", increment: 1.25, restSeconds: 60 },
      ]},
      { name: "Day 6 - Legs", exercises: [
        { exercise: "Barbell Front Squat", sets: 4, repMin: 6, repMax: 8, targetWeight: 55.0, progressionType: "linear_weight", increment: 2.5, restSeconds: 150 },
        { exercise: "Dumbbell Bulgarian Split Squat", sets: 3, repMin: 8, repMax: 12, targetWeight: 16.0, progressionType: "double_progression", increment: 1.0, restSeconds: 90 },
        { exercise: "Barbell Hip Thrust", sets: 4, repMin: 8, repMax: 12, targetWeight: 50.0, progressionType: "double_progression", increment: 2.5, restSeconds: 90 },
        { exercise: "Leg Extension Machine", sets: 3, repMin: 10, repMax: 15, targetWeight: 30.0, progressionType: "double_progression", increment: 2.5, restSeconds: 75 },
        { exercise: "Plank", sets: 3, repMin: 45, repMax: 90, progressionType: "bodyweight_reps", restSeconds: 45, notes: "Reps = seconds held." },
      ]},
    ],
  },
  {
    templateKey: "intermediate_fat_loss_circuit_gym",
    name: "Gym Fat-Loss Circuit",
    description:
      "4-day full-body circuits mixing resistance work with cardio finishers, kept at higher " +
      "reps and shorter rest to maximize calorie burn while preserving muscle.",
    level: "intermediate", goal: "fat_loss", location: "gym", daysPerWeek: 4,
    days: [
      { name: "Day 1 - Full Body Circuit A", exercises: [
        { exercise: "Dumbbell Goblet Squat", sets: 3, repMin: 12, repMax: 15, targetWeight: 14.0, progressionType: "double_progression", increment: 2.0, restSeconds: 45 },
        { exercise: "Dumbbell Bench Press", sets: 3, repMin: 12, repMax: 15, targetWeight: 10.0, progressionType: "double_progression", increment: 1.0, restSeconds: 45 },
        { exercise: "Seated Cable Row", sets: 3, repMin: 12, repMax: 15, targetWeight: 25.0, progressionType: "double_progression", increment: 2.5, restSeconds: 45 },
        { exercise: "Mountain Climbers", sets: 3, repMin: 20, repMax: 40, progressionType: "bodyweight_reps", restSeconds: 30 },
        { exercise: "Burpees", sets: 3, repMin: 8, repMax: 15, progressionType: "bodyweight_reps", restSeconds: 45 },
      ]},
      { name: "Day 2 - Full Body Circuit B", exercises: [
        { exercise: "Leg Press", sets: 3, repMin: 12, repMax: 15, targetWeight: 60.0, progressionType: "double_progression", increment: 5.0, restSeconds: 45 },
        { exercise: "Dumbbell Shoulder Press", sets: 3, repMin: 12, repMax: 15, targetWeight: 8.0, progressionType: "double_progression", increment: 1.0, restSeconds: 45 },
        { exercise: "Lat Pulldown", sets: 3, repMin: 12, repMax: 15, targetWeight: 25.0, progressionType: "double_progression", increment: 2.5, restSeconds: 45 },
        { exercise: "Jumping Jacks", sets: 3, repMin: 30, repMax: 50, progressionType: "bodyweight_reps", restSeconds: 30 },
        { exercise: "Bicycle Crunch", sets: 3, repMin: 20, repMax: 30, progressionType: "bodyweight_reps", restSeconds: 30 },
      ]},
      { name: "Day 3 - Full Body Circuit A", exercises: [
        { exercise: "Dumbbell Romanian Deadlift", sets: 3, repMin: 12, repMax: 15, targetWeight: 16.0, progressionType: "double_progression", increment: 2.0, restSeconds: 45 },
        { exercise: "Dumbbell Incline Press", sets: 3, repMin: 12, repMax: 15, targetWeight: 10.0, progressionType: "double_progression", increment: 1.0, restSeconds: 45 },
        { exercise: "Dumbbell Row", sets: 3, repMin: 12, repMax: 15, targetWeight: 12.0, progressionType: "double_progression", increment: 1.0, restSeconds: 45 },
        { exercise: "High Knees", sets: 3, repMin: 30, repMax: 50, progressionType: "bodyweight_reps", restSeconds: 30 },
        { exercise: "Burpees", sets: 3, repMin: 8, repMax: 15, progressionType: "bodyweight_reps", restSeconds: 45 },
      ]},
      { name: "Day 4 - Full Body Circuit B", exercises: [
        { exercise: "Dumbbell Bulgarian Split Squat", sets: 3, repMin: 10, repMax: 15, targetWeight: 10.0, progressionType: "double_progression", increment: 1.0, restSeconds: 45 },
        { exercise: "Cable Tricep Pushdown", sets: 3, repMin: 12, repMax: 15, targetWeight: 12.0, progressionType: "double_progression", increment: 1.0, restSeconds: 45 },
        { exercise: "Dumbbell Bicep Curl", sets: 3, repMin: 12, repMax: 15, targetWeight: 8.0, progressionType: "double_progression", increment: 1.0, restSeconds: 45 },
        { exercise: "Mountain Climbers", sets: 3, repMin: 20, repMax: 40, progressionType: "bodyweight_reps", restSeconds: 30 },
        { exercise: "Plank", sets: 3, repMin: 30, repMax: 60, progressionType: "bodyweight_reps", restSeconds: 30, notes: "Reps = seconds held." },
      ]},
    ],
  },
  // --------------------------------------------------------------- HOME --
  {
    templateKey: "beginner_home_bodyweight_full_body",
    name: "Home Beginner Bodyweight Full Body",
    description:
      "No-equipment full-body routine to build a fitness base at home. Progress by adding " +
      "reps or seconds held each session.",
    level: "beginner", goal: "general_fitness", location: "home", daysPerWeek: 3,
    days: [
      { name: "Day 1 - Full Body", exercises: [
        { exercise: "Bodyweight Squat", sets: 3, repMin: 10, repMax: 15, progressionType: "bodyweight_reps", restSeconds: 60 },
        { exercise: "Push-Up", sets: 3, repMin: 5, repMax: 12, progressionType: "bodyweight_reps", restSeconds: 60 },
        { exercise: "Inverted Row", sets: 3, repMin: 5, repMax: 12, progressionType: "bodyweight_reps", restSeconds: 60, notes: "Use a sturdy table edge or low bar." },
        { exercise: "Glute Bridge", sets: 3, repMin: 10, repMax: 15, progressionType: "bodyweight_reps", restSeconds: 45 },
        { exercise: "Plank", sets: 3, repMin: 20, repMax: 45, progressionType: "bodyweight_reps", restSeconds: 45, notes: "Reps = seconds held." },
      ]},
      { name: "Day 2 - Full Body", exercises: [
        { exercise: "Walking Lunge", sets: 3, repMin: 8, repMax: 14, progressionType: "bodyweight_reps", restSeconds: 60, notes: "Reps per leg." },
        { exercise: "Chair Dip", sets: 3, repMin: 6, repMax: 12, progressionType: "bodyweight_reps", restSeconds: 60 },
        { exercise: "Superman", sets: 3, repMin: 10, repMax: 15, progressionType: "bodyweight_reps", restSeconds: 45 },
        { exercise: "Wall Sit", sets: 3, repMin: 20, repMax: 45, progressionType: "bodyweight_reps", restSeconds: 45, notes: "Reps = seconds held." },
        { exercise: "Bicycle Crunch", sets: 3, repMin: 15, repMax: 25, progressionType: "bodyweight_reps", restSeconds: 45 },
      ]},
      { name: "Day 3 - Full Body", exercises: [
        { exercise: "Step-Up", sets: 3, repMin: 8, repMax: 14, progressionType: "bodyweight_reps", restSeconds: 60, notes: "Reps per leg; use a stair or sturdy chair." },
        { exercise: "Pike Push-Up", sets: 3, repMin: 5, repMax: 10, progressionType: "bodyweight_reps", restSeconds: 60 },
        { exercise: "Single-Leg Glute Bridge", sets: 3, repMin: 8, repMax: 12, progressionType: "bodyweight_reps", restSeconds: 45, notes: "Reps per leg." },
        { exercise: "Side Plank", sets: 3, repMin: 15, repMax: 30, progressionType: "bodyweight_reps", restSeconds: 45, notes: "Reps = seconds held per side." },
        { exercise: "Jumping Jacks", sets: 3, repMin: 20, repMax: 40, progressionType: "bodyweight_reps", restSeconds: 30 },
      ]},
    ],
  },
  {
    templateKey: "intermediate_home_fat_loss_conditioning",
    name: "Home Fat-Loss Conditioning",
    description:
      "4-day bodyweight strength-and-cardio circuits for burning fat at home with minimal " +
      "rest between exercises.",
    level: "intermediate", goal: "fat_loss", location: "home", daysPerWeek: 4,
    days: [
      { name: "Day 1 - Circuit A", exercises: [
        { exercise: "Jump Squat", sets: 4, repMin: 10, repMax: 20, progressionType: "bodyweight_reps", restSeconds: 40 },
        { exercise: "Push-Up", sets: 4, repMin: 10, repMax: 20, progressionType: "bodyweight_reps", restSeconds: 40 },
        { exercise: "Mountain Climbers", sets: 4, repMin: 20, repMax: 40, progressionType: "bodyweight_reps", restSeconds: 30 },
        { exercise: "Burpees", sets: 4, repMin: 10, repMax: 20, progressionType: "bodyweight_reps", restSeconds: 45 },
      ]},
      { name: "Day 2 - Circuit B", exercises: [
        { exercise: "Walking Lunge", sets: 4, repMin: 10, repMax: 16, progressionType: "bodyweight_reps", restSeconds: 40, notes: "Reps per leg." },
        { exercise: "Inverted Row", sets: 4, repMin: 8, repMax: 15, progressionType: "bodyweight_reps", restSeconds: 40 },
        { exercise: "High Knees", sets: 4, repMin: 30, repMax: 60, progressionType: "bodyweight_reps", restSeconds: 30 },
        { exercise: "Bicycle Crunch", sets: 4, repMin: 20, repMax: 35, progressionType: "bodyweight_reps", restSeconds: 30 },
      ]},
      { name: "Day 3 - Circuit A", exercises: [
        { exercise: "Bodyweight Squat", sets: 4, repMin: 15, repMax: 25, progressionType: "bodyweight_reps", restSeconds: 40 },
        { exercise: "Diamond Push-Up", sets: 4, repMin: 6, repMax: 15, progressionType: "bodyweight_reps", restSeconds: 40 },
        { exercise: "Jumping Jacks", sets: 4, repMin: 30, repMax: 60, progressionType: "bodyweight_reps", restSeconds: 30 },
        { exercise: "Plank", sets: 4, repMin: 30, repMax: 60, progressionType: "bodyweight_reps", restSeconds: 30, notes: "Reps = seconds held." },
      ]},
      { name: "Day 4 - Circuit B", exercises: [
        { exercise: "Step-Up", sets: 4, repMin: 10, repMax: 18, progressionType: "bodyweight_reps", restSeconds: 40, notes: "Reps per leg." },
        { exercise: "Chair Dip", sets: 4, repMin: 8, repMax: 15, progressionType: "bodyweight_reps", restSeconds: 40 },
        { exercise: "Mountain Climbers", sets: 4, repMin: 25, repMax: 45, progressionType: "bodyweight_reps", restSeconds: 30 },
        { exercise: "Burpees", sets: 4, repMin: 10, repMax: 20, progressionType: "bodyweight_reps", restSeconds: 45 },
      ]},
    ],
  },
  {
    templateKey: "advanced_home_calisthenics",
    name: "Home Advanced Calisthenics",
    description:
      "5-day bodyweight strength split for experienced trainees working toward harder " +
      "calisthenics progressions at home.",
    level: "advanced", goal: "hypertrophy", location: "home", daysPerWeek: 5,
    days: [
      { name: "Day 1 - Push", exercises: [
        { exercise: "Push-Up", sets: 5, repMin: 15, repMax: 25, progressionType: "bodyweight_reps", restSeconds: 60 },
        { exercise: "Diamond Push-Up", sets: 4, repMin: 10, repMax: 20, progressionType: "bodyweight_reps", restSeconds: 60 },
        { exercise: "Pike Push-Up", sets: 4, repMin: 8, repMax: 15, progressionType: "bodyweight_reps", restSeconds: 60 },
        { exercise: "Chair Dip", sets: 4, repMin: 12, repMax: 20, progressionType: "bodyweight_reps", restSeconds: 60 },
      ]},
      { name: "Day 2 - Pull", exercises: [
        { exercise: "Pull-Up", sets: 5, repMin: 6, repMax: 12, progressionType: "bodyweight_reps", restSeconds: 90 },
        { exercise: "Chin-Up", sets: 4, repMin: 6, repMax: 12, progressionType: "bodyweight_reps", restSeconds: 90 },
        { exercise: "Inverted Row", sets: 4, repMin: 12, repMax: 20, progressionType: "bodyweight_reps", restSeconds: 60 },
        { exercise: "Superman", sets: 4, repMin: 15, repMax: 25, progressionType: "bodyweight_reps", restSeconds: 45 },
      ]},
      { name: "Day 3 - Legs", exercises: [
        { exercise: "Jump Squat", sets: 5, repMin: 15, repMax: 25, progressionType: "bodyweight_reps", restSeconds: 60 },
        { exercise: "Walking Lunge", sets: 4, repMin: 14, repMax: 22, progressionType: "bodyweight_reps", restSeconds: 60, notes: "Reps per leg." },
        { exercise: "Single-Leg Glute Bridge", sets: 4, repMin: 12, repMax: 20, progressionType: "bodyweight_reps", restSeconds: 45, notes: "Reps per leg." },
        { exercise: "Wall Sit", sets: 4, repMin: 45, repMax: 90, progressionType: "bodyweight_reps", restSeconds: 45, notes: "Reps = seconds held." },
      ]},
      { name: "Day 4 - Push", exercises: [
        { exercise: "Push-Up", sets: 5, repMin: 15, repMax: 25, progressionType: "bodyweight_reps", restSeconds: 60, notes: "Elevate feet for extra difficulty as reps climb." },
        { exercise: "Pike Push-Up", sets: 4, repMin: 10, repMax: 18, progressionType: "bodyweight_reps", restSeconds: 60 },
        { exercise: "Diamond Push-Up", sets: 4, repMin: 10, repMax: 20, progressionType: "bodyweight_reps", restSeconds: 60 },
        { exercise: "Plank", sets: 4, repMin: 45, repMax: 90, progressionType: "bodyweight_reps", restSeconds: 45, notes: "Reps = seconds held." },
      ]},
      { name: "Day 5 - Pull & Core", exercises: [
        { exercise: "Pull-Up", sets: 5, repMin: 6, repMax: 12, progressionType: "bodyweight_reps", restSeconds: 90 },
        { exercise: "Inverted Row", sets: 4, repMin: 12, repMax: 20, progressionType: "bodyweight_reps", restSeconds: 60 },
        { exercise: "Bicycle Crunch", sets: 4, repMin: 25, repMax: 40, progressionType: "bodyweight_reps", restSeconds: 45 },
        { exercise: "Side Plank", sets: 4, repMin: 30, repMax: 60, progressionType: "bodyweight_reps", restSeconds: 45, notes: "Reps = seconds held per side." },
      ]},
    ],
  },
];
