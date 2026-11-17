import { createEmptyState, normalizeState, createBackup, parseBackup } from "./storage.js";

function assert(c, m) { if (!c) throw new Error(m); }

const v1 = {
  version: 1,
  sections: { today: { priority1: "Walk" } },
  bills: [{ id: "b1", due: "2026-11-18", name: "Net", amount: "80", paid: false }],
  spends: [{ amount: "20" }],
  projects: [],
  milestones: [],
  checkins: {},
  habits: { names: ["", "", ""], checks: {} },
  settings: { weekStarts: "monday", calendarMonth: 10, calendarYear: 2026, selectedDate: "", selectedYearMonth: 10 },
  savedAt: "2026-11-17T00:00:00.000Z",
};
const migrated = normalizeState(v1);
assert(migrated.version === 2, "migrates to v2");
assert(migrated.sections.today.priority1 === "Walk", "keeps sections");
assert(migrated.bills[0].recurring === "once", "bill defaults");
assert(Array.isArray(migrated.debts), "debts array");

const backup = createBackup(migrated, { edition: "full" });
assert(backup.version === 2, "backup v2");
const roundTrip = parseBackup(JSON.stringify(backup));
assert(roundTrip.bills[0].name === "Net", "backup roundtrip");

let rejected = false;
try { parseBackup(JSON.stringify({ app: "Other App", version: 2, state: createEmptyState() })); }
catch { rejected = true; }
assert(rejected, "rejects foreign app");

console.log("storage.test.js: all assertions passed");
