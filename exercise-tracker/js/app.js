// App entry point: hash router, view rendering, and event delegation.
// No framework/build step — plain DOM strings + delegated listeners.

import { store, init, getProfile, saveProfile, exerciseId, uid } from "./db.js";
import * as catalog from "./catalog.js";
import * as progressionEngine from "./progression.js";
import * as stats from "./stats.js";
import * as charts from "./charts.js";
import { escapeHtml, formatDate, titleCase, todayIso, qsa } from "./util.js";
import { MUSCLE_GROUPS, EQUIPMENT_TYPES } from "./data/exercises.js";

const { evaluateSession, applyResult, STATUS_LABELS } = progressionEngine;

const appContent = document.getElementById("app-content");
const pageTitle = document.getElementById("page-title");

let exercisesById = new Map();
let exercisesListCache = [];

async function ensureExercisesCache() {
  const all = await store.getAll("exercises");
  exercisesById = new Map(all.map((e) => [e.id, e]));
  exercisesListCache = all.slice().sort((a, b) => a.name.localeCompare(b.name));
  return exercisesListCache;
}

async function ensureExercisesList() {
  if (!exercisesListCache.length) await ensureExercisesCache();
  return exercisesListCache;
}

function setTitle(t) {
  pageTitle.textContent = t;
}

function setNavActive(hash) {
  let route = "dashboard";
  if (hash.startsWith("#/programs") || hash.startsWith("#/log")) route = "programs";
  else if (hash.startsWith("#/history") || hash.startsWith("#/session")) route = "history";
  else if (hash.startsWith("#/exercise")) route = "exercises";
  qsa("#bottom-nav a").forEach((a) => a.classList.toggle("active", a.dataset.route === route));
}

function optionsFor(values, selected) {
  return values
    .map((v) => `<option value="${v}" ${v === selected ? "selected" : ""}>${titleCase(v)}</option>`)
    .join("");
}

// ---------------------------------------------------------------- shared --

function profileSummaryCard(profile) {
  return `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
        <div>
          <div style="font-weight:700">${escapeHtml(profile.name || "Me")}</div>
          <div class="muted">${titleCase(profile.experienceLevel)} · ${titleCase(profile.primaryGoal)} · ${titleCase(profile.locationPreference)}</div>
        </div>
        <a class="btn secondary small" href="#/onboarding">Edit Goals</a>
      </div>
    </div>`;
}

function exerciseSummaryLine(pe) {
  const ex = exercisesById.get(pe.exerciseId);
  const name = ex ? ex.name : "Unknown exercise";
  const reps = pe.repMin === pe.repMax ? `${pe.repMin}` : `${pe.repMin}-${pe.repMax}`;
  const weight = pe.targetWeight != null ? ` @ ${pe.targetWeight}${pe.weightUnit}` : " (bodyweight)";
  const badge = pe.lastStatus
    ? `<span class="status-badge status-${pe.lastStatus}">${STATUS_LABELS[pe.lastStatus] || pe.lastStatus}</span>`
    : "";
  return `
    <div class="ex-row-view">
      <div class="ex-name">${escapeHtml(name)} ${badge}</div>
      <div class="muted">${pe.sets} sets × ${reps} reps${weight}</div>
      ${pe.lastMessage ? `<div class="muted" style="margin-top:2px">${escapeHtml(pe.lastMessage)}</div>` : ""}
    </div>`;
}

function sessionListItem(s) {
  const vol = s.sets
    .filter((x) => !x.isWarmup)
    .reduce((sum, x) => sum + (x.weight || 0) * x.repsCompleted, 0);
  return `
    <a class="list-item" href="#/session/${s.id}">
      <div>
        <div class="title">${escapeHtml(s.dayName || "Workout")}</div>
        <div class="muted">${formatDate(s.date)}</div>
      </div>
      <div class="muted">${Math.round(vol)} vol</div>
    </a>`;
}

function programCard(p, profile, recommended) {
  const isActive = profile.activeProgramId === p.id;
  const badge = isActive
    ? '<span class="pill recommended">Active</span>'
    : recommended
      ? '<span class="pill recommended">Recommended</span>'
      : "";
  return `
    <a class="card" href="#/programs/${p.id}" style="display:block;text-decoration:none;color:inherit">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
        <div>
          <div style="font-weight:700">${escapeHtml(p.name)}</div>
          <div class="muted" style="margin:4px 0">${p.daysPerWeek} days/week</div>
        </div>
        ${badge}
      </div>
      <div>
        <span class="pill">${titleCase(p.level)}</span>
        <span class="pill">${titleCase(p.goal)}</span>
        <span class="pill">${titleCase(p.location)}</span>
      </div>
    </a>`;
}

// -------------------------------------------------------------- views --

async function viewDashboard() {
  setTitle("Exercise Tracker");
  const profile = await getProfile();
  if (!profile.onboarded) {
    location.hash = "#/onboarding";
    return;
  }

  const [program, sessions] = await Promise.all([
    profile.activeProgramId ? catalog.getProgram(profile.activeProgramId) : Promise.resolve(null),
    store.getAll("sessions"),
  ]);

  const recentSessions = [...sessions]
    .sort((a, b) => b.date.localeCompare(a.date) || (b.completedAt || "").localeCompare(a.completedAt || ""))
    .slice(0, 3);

  let nextDayHtml;
  if (program) {
    const day = await catalog.nextDay(program, sessions);
    nextDayHtml = day
      ? `
      <div class="card">
        <h2>Up next: ${escapeHtml(day.name)}</h2>
        <p class="muted" style="margin-top:-6px">${escapeHtml(program.name)}</p>
        ${day.exercises.map(exerciseSummaryLine).join("")}
        <div style="margin-top:12px">
          <a class="btn" href="#/log/${program.id}/${day.id}">Start Workout</a>
        </div>
      </div>`
      : "";
  } else {
    nextDayHtml = `
      <div class="card">
        <h2>No active program yet</h2>
        <p class="muted">Tell us your goals and we'll suggest a program to start with.</p>
        <a class="btn" href="#/onboarding">Set Your Goals</a>
      </div>`;
  }

  const vol = stats.weeklyVolume(sessions);
  const chartHtml = vol.weeks.length
    ? `
      <div class="card">
        <h2>Weekly Volume</h2>
        <div class="chart-wrap"><canvas id="chart-weekly-volume"></canvas></div>
      </div>`
    : "";

  const historyHtml = recentSessions.length
    ? `
      <div class="card">
        <h2>Recent Workouts</h2>
        ${recentSessions.map(sessionListItem).join("")}
        <div style="margin-top:8px"><a class="link" href="#/history">View all history →</a></div>
      </div>`
    : "";

  appContent.innerHTML = `${profileSummaryCard(profile)}${nextDayHtml}${chartHtml}${historyHtml}`;

  if (vol.weeks.length) {
    charts.renderBarChart("chart-weekly-volume", vol.weeks, vol.volume, "#2f6fed");
  }
}

async function viewOnboarding() {
  setTitle("Your Goals");
  const profile = await getProfile();
  const isFirstTime = !profile.onboarded;
  appContent.innerHTML = `
    <div class="card">
      <h2>${isFirstTime ? "Welcome — tell us about you" : "Edit your goals"}</h2>
      <p class="muted">${isFirstTime
        ? "We'll recommend a program based on your answers. You can change this anytime."
        : "Changing these updates your recommended programs — your current program keeps its own settings."}</p>
      <form data-form="onboarding">
        <label>Name</label>
        <input name="name" value="${escapeHtml(profile.name || "")}" placeholder="Optional">

        <label>Experience level</label>
        <select name="experienceLevel">${optionsFor(["beginner", "intermediate", "advanced"], profile.experienceLevel)}</select>

        <label>Primary goal</label>
        <select name="primaryGoal">${optionsFor(["strength", "hypertrophy", "fat_loss", "general_fitness", "endurance"], profile.primaryGoal)}</select>

        <label>Where do you train?</label>
        <select name="locationPreference">${optionsFor(["gym", "home", "both"], profile.locationPreference)}</select>

        <label>Days per week</label>
        <input name="daysPerWeek" type="number" min="1" max="7" value="${profile.daysPerWeek}">

        <label>Weight unit</label>
        <select name="weightUnit">${optionsFor(["kg", "lb"], profile.weightUnit)}</select>

        <div style="margin-top:16px">
          <button class="btn" type="submit">${isFirstTime ? "Get My Program" : "Save & Update Recommendations"}</button>
        </div>
      </form>
    </div>`;
}

async function viewPrograms() {
  setTitle("Programs");
  const profile = await getProfile();
  const [recommended, allTpl, allPrograms] = await Promise.all([
    catalog.recommendPrograms(profile, 3),
    catalog.allTemplates(),
    store.getAll("programs"),
  ]);
  const owned = allPrograms.filter((p) => !p.isTemplate);
  const recommendedIds = new Set(recommended.map((p) => p.id));

  const ownedHtml = owned.length
    ? `<h3>Your Programs</h3>${owned.map((p) => programCard(p, profile, false)).join("")}`
    : "";

  const recommendedHtml = `<h3>Recommended For You</h3>${recommended.map((p) => programCard(p, profile, true)).join("")}`;

  appContent.innerHTML = `
    ${ownedHtml}
    ${recommendedHtml}
    <h3>Full Catalog</h3>
    <div class="tabs">
      <select id="filter-location">
        <option value="">Any location</option>
        <option value="gym">Gym</option>
        <option value="home">Home</option>
      </select>
      <select id="filter-level">
        <option value="">Any level</option>
        <option value="beginner">Beginner</option>
        <option value="intermediate">Intermediate</option>
        <option value="advanced">Advanced</option>
      </select>
      <select id="filter-goal">
        <option value="">Any goal</option>
        <option value="strength">Strength</option>
        <option value="hypertrophy">Hypertrophy</option>
        <option value="fat_loss">Fat Loss</option>
        <option value="general_fitness">General Fitness</option>
      </select>
    </div>
    <div id="catalog-list">${allTpl.map((p) => programCard(p, profile, recommendedIds.has(p.id))).join("")}</div>
  `;

  const applyFilters = () => {
    const loc = document.getElementById("filter-location").value;
    const lvl = document.getElementById("filter-level").value;
    const goal = document.getElementById("filter-goal").value;
    const filtered = allTpl.filter(
      (p) => (!loc || p.location === loc) && (!lvl || p.level === lvl) && (!goal || p.goal === goal)
    );
    document.getElementById("catalog-list").innerHTML = filtered.length
      ? filtered.map((p) => programCard(p, profile, recommendedIds.has(p.id))).join("")
      : `<div class="empty-state">No programs match those filters.</div>`;
  };
  ["filter-location", "filter-level", "filter-goal"].forEach((id) => {
    document.getElementById(id).addEventListener("change", applyFilters);
  });
}

async function viewProgramDetail(id) {
  const program = await catalog.getProgram(id);
  if (!program) {
    appContent.innerHTML = `<div class="empty-state">Program not found.</div>`;
    return;
  }
  setTitle(program.name);
  const profile = await getProfile();
  const isOwned = !program.isTemplate && program.ownerProfileId === profile.id;
  const isActive = profile.activeProgramId === program.id;

  const actionsHtml = program.isTemplate
    ? `<button class="btn" data-action="use-program" data-program-id="${program.id}">Use This Program</button>`
    : `<div class="btn-row">
        <a class="btn secondary" href="#/programs/${program.id}/edit">Edit</a>
        ${isActive ? "" : `<button class="btn" data-action="activate-program" data-program-id="${program.id}">Set Active</button>`}
      </div>`;

  const daysHtml = program.days
    .map(
      (day) => `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <h2 style="margin:0">${escapeHtml(day.name)}</h2>
          ${isOwned ? `<a class="btn small" href="#/log/${program.id}/${day.id}">Log</a>` : ""}
        </div>
        ${day.exercises.map(exerciseSummaryLine).join("")}
      </div>`
    )
    .join("");

  appContent.innerHTML = `
    <div class="card">
      <p>${escapeHtml(program.description || "")}</p>
      <div>
        <span class="pill">${titleCase(program.level)}</span>
        <span class="pill">${titleCase(program.goal)}</span>
        <span class="pill">${titleCase(program.location)}</span>
        <span class="pill">${program.daysPerWeek}x/week</span>
      </div>
      <div style="margin-top:12px">${actionsHtml}</div>
    </div>
    ${daysHtml}`;
}

function dayEditBlock(day) {
  return `
    <div class="day-block" data-day-id="${day.id}">
      <input class="day-name-input" value="${escapeHtml(day.name)}">
      <div style="overflow-x:auto">
        <table>
          <thead><tr><th>Exercise</th><th>Sets</th><th>Reps</th><th>Wt</th><th>Type</th><th>Inc</th><th>Rest</th><th></th></tr></thead>
          <tbody class="ex-rows">${day.exercises.map(exEditRow).join("")}</tbody>
        </table>
      </div>
      <div class="btn-row" style="margin-top:8px">
        <select class="add-ex-select">${exerciseOptions()}</select>
        <button type="button" class="btn small" data-action="add-day-exercise">+ Add</button>
      </div>
      <button type="button" class="remove-btn" data-action="remove-day" style="margin-top:4px">Remove day</button>
    </div>`;
}

function exEditRow(pe) {
  const ex = exercisesById.get(pe.exerciseId);
  const name = ex ? ex.name : "Unknown";
  return `
    <tr class="ex-row" data-ex-id="${pe.id}" data-exercise-id="${pe.exerciseId}">
      <td>${escapeHtml(name)}</td>
      <td><input class="f-sets" type="number" min="1" value="${pe.sets}" style="width:44px"></td>
      <td style="display:flex;gap:2px">
        <input class="f-repmin" type="number" min="1" value="${pe.repMin}" style="width:38px">
        <input class="f-repmax" type="number" min="1" value="${pe.repMax}" style="width:38px">
      </td>
      <td><input class="f-weight" type="number" step="0.5" value="${pe.targetWeight ?? ""}" style="width:55px"></td>
      <td><select class="f-progtype">${optionsFor(["linear_weight", "double_progression", "bodyweight_reps", "static"], pe.progressionType)}</select></td>
      <td><input class="f-increment" type="number" step="0.25" value="${pe.increment}" style="width:48px"></td>
      <td><input class="f-rest" type="number" value="${pe.restSeconds}" style="width:48px"></td>
      <td><button type="button" class="remove-btn" data-action="remove-day-exercise">✕</button></td>
    </tr>`;
}

function exerciseOptions() {
  return exercisesListCache.map((e) => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join("");
}

async function viewProgramEdit(id) {
  const program = await catalog.getProgram(id);
  if (!program || program.isTemplate) {
    location.hash = `#/programs/${id}`;
    return;
  }
  setTitle("Edit " + program.name);
  await ensureExercisesList();

  appContent.innerHTML = `
    <form data-form="program-edit" data-program-id="${program.id}">
      <div id="days-container">${program.days.map(dayEditBlock).join("")}</div>
      <button type="button" class="btn ghost" data-action="add-day">+ Add Day</button>
      <div style="margin-top:16px" class="btn-row">
        <a class="btn secondary" href="#/programs/${program.id}">Cancel</a>
        <button class="btn" type="submit">Save Program</button>
      </div>
    </form>`;
}

function exerciseLogBlock(pe) {
  const ex = exercisesById.get(pe.exerciseId);
  const name = ex ? ex.name : "Unknown";
  const defaultWeight = pe.targetWeight ?? 0;
  const rows = [];
  for (let i = 1; i <= pe.sets; i++) {
    rows.push(`
      <div class="set-row" data-set-number="${i}">
        <div class="set-num">${i}</div>
        <input class="f-weight" type="number" step="0.5" value="${defaultWeight}" inputmode="decimal" aria-label="Weight">
        <input class="f-reps" type="number" value="${pe.repMax}" inputmode="numeric" aria-label="Reps">
        <input class="f-rpe" type="number" step="0.5" min="1" max="10" placeholder="RPE" inputmode="decimal" aria-label="RPE">
        <label class="inline"><input class="f-warmup" type="checkbox">W/U</label>
      </div>`);
  }
  const target = pe.repMin === pe.repMax ? `${pe.repMax} reps` : `${pe.repMin}-${pe.repMax} reps`;
  const weightNote = pe.targetWeight != null ? ` @ ${pe.targetWeight}${pe.weightUnit}` : " (bodyweight)";
  return `
    <div class="card ex-log-block" data-pe-id="${pe.id}" data-exercise-id="${pe.exerciseId}">
      <h2 style="margin-bottom:2px">${escapeHtml(name)}</h2>
      <p class="muted" style="margin-top:0">Target: ${pe.sets} × ${target}${weightNote}</p>
      ${pe.notes ? `<p class="muted">${escapeHtml(pe.notes)}</p>` : ""}
      ${rows.join("")}
    </div>`;
}

async function viewWorkoutLog(programId, dayId) {
  const program = await catalog.getProgram(programId);
  const day = program && program.days.find((d) => d.id === dayId);
  if (!program || !day) {
    appContent.innerHTML = `<div class="empty-state">Workout day not found.</div>`;
    return;
  }
  setTitle(day.name);
  appContent.innerHTML = `
    <form data-form="workout-log" data-program-id="${program.id}" data-day-id="${day.id}">
      <div class="card">
        <label>Date</label>
        <input type="date" name="date" value="${todayIso()}">
      </div>
      ${day.exercises.map(exerciseLogBlock).join("")}
      <div class="card">
        <label>Notes</label>
        <textarea name="notes" placeholder="How did it feel?"></textarea>
      </div>
      <button class="btn" type="submit">Finish Workout</button>
    </form>`;
}

async function viewSessionDetail(id) {
  const session = await store.get("sessions", id);
  if (!session) {
    appContent.innerHTML = `<div class="empty-state">Workout not found.</div>`;
    return;
  }
  setTitle(session.dayName || "Workout");

  const byExercise = new Map();
  for (const set of session.sets) {
    if (!byExercise.has(set.exerciseId)) byExercise.set(set.exerciseId, []);
    byExercise.get(set.exerciseId).push(set);
  }
  const notesByExercise = new Map((session.progressionNotes || []).map((n) => [n.exerciseId, n]));

  const exerciseBlocks = Array.from(byExercise.entries())
    .map(([exId, sets]) => {
      const ex = exercisesById.get(exId);
      const name = ex ? ex.name : "Exercise";
      const note = notesByExercise.get(exId);
      const rows = sets
        .map(
          (s) => `
        <tr>
          <td>${s.setNumber}${s.isWarmup ? " (W/U)" : ""}</td>
          <td>${s.weight}</td>
          <td>${s.repsCompleted}</td>
          <td>${s.rpe ?? "—"}</td>
        </tr>`
        )
        .join("");
      return `
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <h2 style="margin:0">${escapeHtml(name)}</h2>
            <a class="link" href="#/exercise/${exId}/progress">Progress →</a>
          </div>
          <div style="overflow-x:auto">
            <table>
              <thead><tr><th>Set</th><th>Wt</th><th>Reps</th><th>RPE</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
          ${note ? `<p style="margin-top:10px"><span class="status-badge status-${note.status}">${STATUS_LABELS[note.status] || note.status}</span> ${escapeHtml(note.message)}</p>` : ""}
        </div>`;
    })
    .join("");

  appContent.innerHTML = `
    <div class="card">
      <div class="muted">${formatDate(session.date)}</div>
      ${session.notes ? `<p>${escapeHtml(session.notes)}</p>` : ""}
      <button class="btn danger small" data-action="delete-session" data-session-id="${session.id}">Delete Workout</button>
    </div>
    ${exerciseBlocks}`;
}

async function viewHistory() {
  setTitle("History");
  const sessions = (await store.getAll("sessions")).sort(
    (a, b) => b.date.localeCompare(a.date) || (b.completedAt || "").localeCompare(a.completedAt || "")
  );
  const vol = stats.weeklyVolume(sessions);
  const chartHtml = vol.weeks.length
    ? `<div class="card"><h2>Weekly Volume</h2><div class="chart-wrap"><canvas id="chart-history-volume"></canvas></div></div>`
    : "";
  const listHtml = sessions.length
    ? `<div class="card">${sessions.map(sessionListItem).join("")}</div>`
    : `<div class="empty-state">No workouts logged yet.<br>Start one from your program.</div>`;

  appContent.innerHTML = `${chartHtml}${listHtml}`;
  if (vol.weeks.length) charts.renderBarChart("chart-history-volume", vol.weeks, vol.volume, "#2f6fed");
}

function exerciseListItem(e) {
  return `
    <a class="list-item" href="#/exercise/${e.id}/progress">
      <div>
        <div class="title">${escapeHtml(e.name)}</div>
        <div class="muted">${titleCase(e.muscleGroup)} · ${titleCase(e.equipment)}</div>
      </div>
      <div class="muted">→</div>
    </a>`;
}

async function viewExercises() {
  setTitle("Exercise Library");
  const exercises = await ensureExercisesList();
  appContent.innerHTML = `
    <div class="tabs">
      <select id="filter-muscle"><option value="">Any muscle group</option>${MUSCLE_GROUPS.map((m) => `<option value="${m}">${titleCase(m)}</option>`).join("")}</select>
      <select id="filter-equipment"><option value="">Any equipment</option>${EQUIPMENT_TYPES.map((m) => `<option value="${m}">${titleCase(m)}</option>`).join("")}</select>
    </div>
    <div class="card" id="exercise-list">${exercises.map(exerciseListItem).join("")}</div>
    <div class="card">
      <h2>Add Custom Exercise</h2>
      <form data-form="add-exercise">
        <label>Name</label>
        <input name="name" required>
        <label>Muscle group</label>
        <select name="muscleGroup">${MUSCLE_GROUPS.map((m) => `<option value="${m}">${titleCase(m)}</option>`).join("")}</select>
        <label>Equipment</label>
        <select name="equipment">${EQUIPMENT_TYPES.map((m) => `<option value="${m}">${titleCase(m)}</option>`).join("")}</select>
        <label style="display:flex;align-items:center;gap:6px;margin-top:10px">
          <input type="checkbox" name="isBodyweight" style="width:auto"> Bodyweight exercise
        </label>
        <div style="margin-top:14px"><button class="btn" type="submit">Add Exercise</button></div>
      </form>
    </div>`;

  const applyFilters = () => {
    const muscle = document.getElementById("filter-muscle").value;
    const equip = document.getElementById("filter-equipment").value;
    const filtered = exercises.filter((e) => (!muscle || e.muscleGroup === muscle) && (!equip || e.equipment === equip));
    document.getElementById("exercise-list").innerHTML =
      filtered.map(exerciseListItem).join("") || `<div class="empty-state">No matches.</div>`;
  };
  document.getElementById("filter-muscle").addEventListener("change", applyFilters);
  document.getElementById("filter-equipment").addEventListener("change", applyFilters);
}

async function viewExerciseProgress(id) {
  await ensureExercisesList();
  const ex = exercisesById.get(id);
  setTitle(ex ? ex.name : "Progress");
  const sessions = await store.getAll("sessions");
  const data = stats.exerciseProgress(sessions, id);
  appContent.innerHTML = `
    <div class="card">
      <h2>${escapeHtml(ex ? ex.name : "Exercise")}</h2>
      ${data.dates.length ? `<div class="chart-wrap"><canvas id="chart-ex-progress"></canvas></div>` : `<div class="empty-state">No logged sets yet for this exercise.</div>`}
    </div>`;
  if (data.dates.length) {
    charts.renderLineChart(
      "chart-ex-progress",
      data.dates.map(formatDate),
      [
        { label: "Est. 1RM", data: data.estimated1Rm, borderColor: "#2f6fed", backgroundColor: "#2f6fed" },
        { label: "Top Weight", data: data.topWeight, borderColor: "#1a9c5c", backgroundColor: "#1a9c5c" },
      ]
    );
  }
}

// --------------------------------------------------------------- router --

const routes = [
  { pattern: /^#\/?$/, view: viewDashboard },
  { pattern: /^#\/onboarding$/, view: viewOnboarding },
  { pattern: /^#\/programs$/, view: viewPrograms },
  { pattern: /^#\/programs\/([^/]+)\/edit$/, view: viewProgramEdit },
  { pattern: /^#\/programs\/([^/]+)$/, view: viewProgramDetail },
  { pattern: /^#\/log\/([^/]+)\/([^/]+)$/, view: viewWorkoutLog },
  { pattern: /^#\/session\/([^/]+)$/, view: viewSessionDetail },
  { pattern: /^#\/history$/, view: viewHistory },
  { pattern: /^#\/exercise\/([^/]+)\/progress$/, view: viewExerciseProgress },
  { pattern: /^#\/exercises$/, view: viewExercises },
];

async function router() {
  const hash = location.hash || "#/";
  for (const r of routes) {
    const m = hash.match(r.pattern);
    if (m) {
      setNavActive(hash);
      try {
        await r.view(...m.slice(1));
      } catch (err) {
        console.error(err);
        appContent.innerHTML = `<div class="card"><p>Something went wrong loading this page.</p><p class="muted">${escapeHtml(err.message)}</p></div>`;
      }
      window.scrollTo(0, 0);
      return;
    }
  }
  location.hash = "#/";
}

window.addEventListener("hashchange", router);

// ------------------------------------------------------------- actions --

document.addEventListener("click", async (e) => {
  const target = e.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  try {
    if (action === "use-program") {
      const program = await catalog.getProgram(target.dataset.programId);
      const profile = await getProfile();
      const clone = await catalog.cloneProgramForProfile(program, profile);
      location.hash = `#/programs/${clone.id}`;
    } else if (action === "activate-program") {
      const profile = await getProfile();
      profile.activeProgramId = target.dataset.programId;
      await saveProfile(profile);
      await router();
    } else if (action === "delete-session") {
      if (confirm("Delete this logged workout? This can't be undone.")) {
        await store.delete("sessions", target.dataset.sessionId);
        location.hash = "#/history";
      }
    } else if (action === "add-day") {
      const container = document.getElementById("days-container");
      const newDay = { id: uid(), name: `Day ${container.children.length + 1}`, exercises: [] };
      container.insertAdjacentHTML("beforeend", dayEditBlock(newDay));
    } else if (action === "remove-day") {
      target.closest(".day-block").remove();
    } else if (action === "add-day-exercise") {
      const dayBlock = target.closest(".day-block");
      const select = dayBlock.querySelector(".add-ex-select");
      const exId = select.value;
      const ex = exercisesById.get(exId);
      const profile = await getProfile();
      const newPe = {
        id: uid(),
        exerciseId: exId,
        sets: 3,
        repMin: 8,
        repMax: 12,
        targetWeight: ex && ex.isBodyweight ? null : 0,
        weightUnit: profile.weightUnit,
        progressionType: ex && ex.isBodyweight ? "bodyweight_reps" : "double_progression",
        increment: 2.5,
        restSeconds: 90,
        notes: null,
      };
      dayBlock.querySelector(".ex-rows").insertAdjacentHTML("beforeend", exEditRow(newPe));
    } else if (action === "remove-day-exercise") {
      target.closest(".ex-row").remove();
    }
  } catch (err) {
    console.error(err);
    alert("Something went wrong: " + err.message);
  }
});

document.addEventListener("submit", async (e) => {
  const form = e.target.closest("form[data-form]");
  if (!form) return;
  e.preventDefault();
  try {
    if (form.dataset.form === "onboarding") {
      const fd = new FormData(form);
      const profile = await getProfile();
      profile.name = fd.get("name") || "Me";
      profile.experienceLevel = fd.get("experienceLevel");
      profile.primaryGoal = fd.get("primaryGoal");
      profile.locationPreference = fd.get("locationPreference");
      profile.daysPerWeek = parseInt(fd.get("daysPerWeek"), 10) || 3;
      profile.weightUnit = fd.get("weightUnit");
      profile.onboarded = true;
      await saveProfile(profile);
      location.hash = "#/programs";
    } else if (form.dataset.form === "program-edit") {
      const programId = form.dataset.programId;
      const program = await catalog.getProgram(programId);
      const profile = await getProfile();
      const dayBlocks = Array.from(form.querySelectorAll(".day-block"));
      const newDays = dayBlocks.map((block, dayIndex) => {
        const dayId = block.dataset.dayId;
        const existingDay = program.days.find((d) => d.id === dayId);
        const name = block.querySelector(".day-name-input").value.trim() || `Day ${dayIndex + 1}`;
        const rows = Array.from(block.querySelectorAll(".ex-row"));
        const exercises = rows.map((row, exIndex) => {
          const exId = row.dataset.exId;
          const exerciseIdVal = row.dataset.exerciseId;
          const existingPe = existingDay && existingDay.exercises.find((p) => p.id === exId);
          const weightVal = row.querySelector(".f-weight").value;
          return {
            id: exId,
            exerciseId: exerciseIdVal,
            order: exIndex,
            sets: Math.max(1, parseInt(row.querySelector(".f-sets").value, 10) || 1),
            repMin: Math.max(1, parseInt(row.querySelector(".f-repmin").value, 10) || 1),
            repMax: Math.max(1, parseInt(row.querySelector(".f-repmax").value, 10) || 1),
            targetWeight: weightVal === "" ? null : parseFloat(weightVal),
            weightUnit: existingPe ? existingPe.weightUnit : profile.weightUnit,
            progressionType: row.querySelector(".f-progtype").value,
            increment: parseFloat(row.querySelector(".f-increment").value) || 2.5,
            restSeconds: parseInt(row.querySelector(".f-rest").value, 10) || 60,
            notes: existingPe ? existingPe.notes : null,
            consecutiveMisses: existingPe ? existingPe.consecutiveMisses : 0,
            lastStatus: existingPe ? existingPe.lastStatus : null,
            lastMessage: existingPe ? existingPe.lastMessage : null,
          };
        });
        return { id: dayId, name, order: dayIndex, exercises };
      });
      program.days = newDays;
      await catalog.saveProgram(program);
      location.hash = `#/programs/${program.id}`;
    } else if (form.dataset.form === "workout-log") {
      const programId = form.dataset.programId;
      const dayId = form.dataset.dayId;
      const program = await catalog.getProgram(programId);
      const day = program.days.find((d) => d.id === dayId);
      const profile = await getProfile();
      const fd = new FormData(form);
      const date = fd.get("date") || todayIso();
      const notes = fd.get("notes") || null;

      const allSets = [];
      const progressionNotes = [];
      const blocks = Array.from(form.querySelectorAll(".ex-log-block"));
      for (const block of blocks) {
        const peId = block.dataset.peId;
        const exId = block.dataset.exerciseId;
        const pe = day.exercises.find((p) => p.id === peId);
        const setRows = Array.from(block.querySelectorAll(".set-row"));
        const workingSets = [];
        setRows.forEach((row) => {
          const setNumber = parseInt(row.dataset.setNumber, 10);
          const weight = parseFloat(row.querySelector(".f-weight").value) || 0;
          const repsCompleted = parseInt(row.querySelector(".f-reps").value, 10) || 0;
          const rpeVal = row.querySelector(".f-rpe").value;
          const rpe = rpeVal === "" ? null : parseFloat(rpeVal);
          const isWarmup = row.querySelector(".f-warmup").checked;
          const setLog = {
            exerciseId: exId,
            programExerciseId: peId,
            setNumber,
            targetRepMin: pe.repMin,
            targetRepMax: pe.repMax,
            repsCompleted,
            weight,
            rpe,
            isWarmup,
          };
          allSets.push(setLog);
          if (!isWarmup) workingSets.push(setLog);
        });
        const result = evaluateSession(pe, workingSets);
        applyResult(pe, result);
        const exName = (exercisesById.get(exId) || {}).name || "Exercise";
        progressionNotes.push({ exerciseId: exId, exerciseName: exName, status: result.status, message: result.message });
      }

      await catalog.saveProgram(program);

      const session = {
        id: uid(),
        profileId: profile.id,
        programId: program.id,
        programDayId: day.id,
        dayName: day.name,
        date,
        completedAt: new Date().toISOString(),
        notes,
        sets: allSets,
        progressionNotes,
      };
      await store.put("sessions", session);
      location.hash = `#/session/${session.id}`;
    } else if (form.dataset.form === "add-exercise") {
      const fd = new FormData(form);
      const name = (fd.get("name") || "").trim();
      if (!name) return;
      const id = exerciseId(name);
      const existing = await store.get("exercises", id);
      if (existing) {
        alert("An exercise with that name already exists.");
        return;
      }
      const newEx = {
        id,
        name,
        muscleGroup: fd.get("muscleGroup"),
        equipment: fd.get("equipment"),
        isBodyweight: fd.get("isBodyweight") === "on",
        isCompound: false,
        isCustom: true,
      };
      await store.put("exercises", newEx);
      await ensureExercisesCache();
      await router();
    }
  } catch (err) {
    console.error(err);
    alert("Couldn't save: " + err.message);
  }
});

// ---------------------------------------------------------------- boot --

async function boot() {
  await init();
  await ensureExercisesCache();
  await router();
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch((err) => console.error("SW registration failed", err));
  }
}

boot();
