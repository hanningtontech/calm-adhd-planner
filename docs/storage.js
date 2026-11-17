const STORAGE_KEY = "the-calm-adhd-planner:v1";

export function createEmptyState() {
  return {
    version: 1,
    sections: {},
    calendarNotes: {},
    yearNotes: {},
    bills: [],
    spends: [],
    projects: [],
    milestones: [],
    checkins: {},
    habits: { names: ["", "", ""], checks: {} },
    settings: {
      weekStarts: "monday",
      calendarMonth: new Date().getMonth(),
      calendarYear: new Date().getFullYear(),
      selectedDate: "",
      selectedYearMonth: new Date().getMonth(),
      nextPayday: "",
      moneyLabel: "Left for this stretch",
      showSavings: true,
      spendNudgeDone: "",
    },
    savedAt: null,
  };
}

function normalizeState(candidate) {
  const base = createEmptyState();
  if (!candidate || typeof candidate !== "object" || candidate.version !== 1) {
    throw new Error("This backup is not a compatible Calm ADHD Planner file.");
  }
  for (const key of ["sections", "calendarNotes", "yearNotes", "checkins"]) {
    if (candidate[key] && typeof candidate[key] === "object" && !Array.isArray(candidate[key])) {
      base[key] = candidate[key];
    }
  }
  for (const key of ["bills", "projects", "milestones", "spends"]) {
    if (Array.isArray(candidate[key])) base[key] = candidate[key];
  }
  if (candidate.habits && typeof candidate.habits === "object") {
    base.habits.names = Array.isArray(candidate.habits.names)
      ? candidate.habits.names.slice(0, 3).map((item) => String(item ?? ""))
      : base.habits.names;
    base.habits.checks = candidate.habits.checks && typeof candidate.habits.checks === "object"
      ? candidate.habits.checks
      : {};
  }
  if (candidate.settings && typeof candidate.settings === "object") {
    const start = candidate.settings.weekStarts === "sunday" ? "sunday" : "monday";
    const month = Number(candidate.settings.calendarMonth);
    const year = Number(candidate.settings.calendarYear);
    const selectedMonth = Number(candidate.settings.selectedYearMonth);
    const moneyLabel = typeof candidate.settings.moneyLabel === "string" && candidate.settings.moneyLabel.trim()
      ? candidate.settings.moneyLabel.trim().slice(0, 48)
      : base.settings.moneyLabel;
    base.settings = {
      weekStarts: start,
      calendarMonth: Number.isInteger(month) && month >= 0 && month <= 11 ? month : base.settings.calendarMonth,
      calendarYear: Number.isInteger(year) && year >= 1900 && year <= 2200 ? year : base.settings.calendarYear,
      selectedDate: typeof candidate.settings.selectedDate === "string" ? candidate.settings.selectedDate : "",
      selectedYearMonth: Number.isInteger(selectedMonth) && selectedMonth >= 0 && selectedMonth <= 11
        ? selectedMonth
        : base.settings.selectedYearMonth,
      nextPayday: typeof candidate.settings.nextPayday === "string" ? candidate.settings.nextPayday : "",
      moneyLabel,
      showSavings: candidate.settings.showSavings !== false,
      spendNudgeDone: typeof candidate.settings.spendNudgeDone === "string" ? candidate.settings.spendNudgeDone : "",
    };
  }
  base.savedAt = typeof candidate.savedAt === "string" ? candidate.savedAt : null;
  return base;
}

export function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? normalizeState(JSON.parse(saved)) : createEmptyState();
  } catch (error) {
    console.warn("Planner data could not be loaded.", error);
    return createEmptyState();
  }
}

export function saveState(state) {
  try {
    state.savedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.warn("Planner data could not be saved.", error);
    return false;
  }
}

export function parseBackup(text) {
  const parsed = JSON.parse(text);
  return normalizeState(parsed.state ?? parsed);
}

export function createBackup(state) {
  return {
    app: "The Calm ADHD Planner",
    version: 1,
    exportedAt: new Date().toISOString(),
    state: structuredClone(state),
  };
}
