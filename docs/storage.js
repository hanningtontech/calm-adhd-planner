const STORAGE_KEY_V2 = "the-calm-adhd-planner:v2";
const STORAGE_KEY_V1 = "the-calm-adhd-planner:v1";

export function createEmptyState() {
  return {
    version: 2,
    sections: {},
    calendarNotes: {},
    yearNotes: {},
    bills: [],
    spends: [],
    debts: [],
    projects: [],
    milestones: [],
    tasks: [],
    quickCapture: [],
    checkins: {},
    habits: { names: ["", "", ""], checks: {} },
    settings: {
      weekStarts: "monday",
      calendarMonth: new Date().getMonth(),
      calendarYear: new Date().getFullYear(),
      selectedDate: "",
      selectedYearMonth: new Date().getMonth(),
      nextPayday: "",
      paycheckAmount: "",
      includePaycheckInStretch: false,
      moneyLabel: "Left for this stretch",
      currency: "USD",
      budgetPeriod: "until-payday",
      showSavings: true,
      showDebt: false,
      spendNudgeDone: "",
      remindersEnabled: false,
      lastReminderDate: "",
      editionAck: false,
    },
    savedAt: null,
    migratedFrom: null,
  };
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function asArray(value) {
  return Array.isArray(value) ? value : null;
}

function migrateBill(bill) {
  if (!bill || typeof bill !== "object") return null;
  return {
    id: bill.id || `bill-${Math.random().toString(16).slice(2)}`,
    due: typeof bill.due === "string" ? bill.due : "",
    name: typeof bill.name === "string" ? bill.name : "",
    amount: bill.amount != null ? String(bill.amount) : "",
    paid: Boolean(bill.paid),
    recurring: bill.recurring === "monthly" ? "monthly" : "once",
    dueDay: Number.isInteger(Number(bill.dueDay)) ? Number(bill.dueDay) : "",
  };
}

export function normalizeState(candidate) {
  const base = createEmptyState();
  if (!candidate || typeof candidate !== "object") {
    throw new Error("This backup is not a compatible Calm ADHD Planner file.");
  }
  const version = Number(candidate.version);
  if (version !== 1 && version !== 2) {
    throw new Error("This backup is not a compatible Calm ADHD Planner file.");
  }

  for (const key of ["sections", "calendarNotes", "yearNotes", "checkins"]) {
    const obj = asObject(candidate[key]);
    if (obj) base[key] = obj;
  }
  for (const key of ["bills", "projects", "milestones", "spends", "debts", "tasks", "quickCapture"]) {
    const list = asArray(candidate[key]);
    if (!list) continue;
    if (key === "bills") base.bills = list.map(migrateBill).filter(Boolean);
    else base[key] = list;
  }

  if (asObject(candidate.habits)) {
    base.habits.names = Array.isArray(candidate.habits.names)
      ? candidate.habits.names.slice(0, 3).map((item) => String(item ?? ""))
      : base.habits.names;
    base.habits.checks = asObject(candidate.habits.checks) || {};
  }

  const settings = asObject(candidate.settings) || {};
  const start = settings.weekStarts === "sunday" ? "sunday" : "monday";
  const month = Number(settings.calendarMonth);
  const year = Number(settings.calendarYear);
  const selectedMonth = Number(settings.selectedYearMonth);
  const moneyLabel = typeof settings.moneyLabel === "string" && settings.moneyLabel.trim()
    ? settings.moneyLabel.trim().slice(0, 48)
    : base.settings.moneyLabel;

  base.settings = {
    ...base.settings,
    weekStarts: start,
    calendarMonth: Number.isInteger(month) && month >= 0 && month <= 11 ? month : base.settings.calendarMonth,
    calendarYear: Number.isInteger(year) && year >= 1900 && year <= 2200 ? year : base.settings.calendarYear,
    selectedDate: typeof settings.selectedDate === "string" ? settings.selectedDate : "",
    selectedYearMonth: Number.isInteger(selectedMonth) && selectedMonth >= 0 && selectedMonth <= 11
      ? selectedMonth
      : base.settings.selectedYearMonth,
    nextPayday: typeof settings.nextPayday === "string" ? settings.nextPayday : "",
    paycheckAmount: settings.paycheckAmount != null ? String(settings.paycheckAmount) : "",
    includePaycheckInStretch: Boolean(settings.includePaycheckInStretch),
    moneyLabel,
    currency: typeof settings.currency === "string" && settings.currency.trim() ? settings.currency.trim().slice(0, 3).toUpperCase() : base.settings.currency,
    budgetPeriod: ["until-payday","weekly","biweekly","twice-monthly","monthly"].includes(settings.budgetPeriod) ? settings.budgetPeriod : base.settings.budgetPeriod,
    showSavings: settings.showSavings !== false,
    showDebt: Boolean(settings.showDebt),
    spendNudgeDone: typeof settings.spendNudgeDone === "string" ? settings.spendNudgeDone : "",
    remindersEnabled: Boolean(settings.remindersEnabled),
    lastReminderDate: typeof settings.lastReminderDate === "string" ? settings.lastReminderDate : "",
    editionAck: Boolean(settings.editionAck),
  };

  base.savedAt = typeof candidate.savedAt === "string" ? candidate.savedAt : null;
  base.migratedFrom = version === 1 ? 1 : (candidate.migratedFrom ?? null);
  base.version = 2;
  return base;
}

function readRaw() {
  const v2 = localStorage.getItem(STORAGE_KEY_V2);
  if (v2) return { raw: v2, source: "v2" };
  const v1 = localStorage.getItem(STORAGE_KEY_V1);
  if (v1) return { raw: v1, source: "v1" };
  return null;
}

export function loadState() {
  try {
    const found = readRaw();
    if (!found) return createEmptyState();
    const state = normalizeState(JSON.parse(found.raw));
    if (found.source === "v1") {
      state.migratedFrom = 1;
      saveState(state);
    }
    return state;
  } catch (error) {
    console.warn("Planner data could not be loaded.", error);
    return createEmptyState();
  }
}

export function saveState(state) {
  try {
    state.version = 2;
    state.savedAt = new Date().toISOString();
    const payload = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY_V2, payload);
    // Keep v1 key in sync for older tabs, but store version 2 JSON so migrate on read works.
    localStorage.setItem(STORAGE_KEY_V1, payload);
    return true;
  } catch (error) {
    console.warn("Planner data could not be saved.", error);
    return false;
  }
}

export function parseBackup(text) {
  const parsed = JSON.parse(text);
  if (parsed?.app && parsed.app !== "The Calm ADHD Planner" && parsed.app !== "The Calm ADHD Planner Demo") {
    throw new Error("This file does not look like a Calm ADHD Planner backup.");
  }
  return normalizeState(parsed.state ?? parsed);
}

export function createBackup(state, { edition = "full" } = {}) {
  return {
    app: edition === "demo" ? "The Calm ADHD Planner Demo" : "The Calm ADHD Planner",
    version: 2,
    exportedAt: new Date().toISOString(),
    state: structuredClone({ ...state, version: 2 }),
  };
}

export function storageDiagnostics() {
  try {
    const probe = `__calm_probe_${Date.now()}`;
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return { ok: true, bytesEstimate: JSON.stringify(localStorage).length };
  } catch (error) {
    return { ok: false, error: String(error?.message || error) };
  }
}
