import { allPages, months, navigationGroups, pageDefinitions, weekDays } from "./data.js";
import { createBackup, loadState, parseBackup, saveState, storageDiagnostics } from "./storage.js";
import {
  parseMoney, formatMoney, daysBetween, unpaidBillsTotal as unpaidBillsTotalOf,
  totalSpends as totalSpendsOf, computeStretch, perDayAmount, savingsProgress,
  effectiveBillDue, totalDebts,
} from "./money.js";
import { detectEdition, canAdd, editionBannerHtml } from "./edition.js";

const content = document.querySelector("#appContent");
const sidebarNav = document.querySelector("#sidebarNav");
const mobileNav = document.querySelector("#mobileNav");
const saveStatus = document.querySelector("#saveStatus");
const todayLabel = document.querySelector("#todayLabel");
const importFile = document.querySelector("#importFile");
const toast = document.querySelector("#toast");
let state = loadState();
let toastTimer;
let focusAfterRoute = false;
if (!Array.isArray(state.debts)) state.debts = [];
if (!Array.isArray(state.tasks)) state.tasks = [];
if (!Array.isArray(state.quickCapture)) state.quickCapture = [];

const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));

const localIsoDate = (date = new Date()) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

const readableDate = (date = new Date(), options = { weekday: "long", month: "long", day: "numeric" }) =>
  new Intl.DateTimeFormat(undefined, options).format(date);

function activePageId() {
  const id = location.hash.replace(/^#\/?/, "").split("?")[0];
  return allPages.some((page) => page.id === id) ? id : "overview";
}

function setRoute(id) {
  location.hash = `/${id}`;
}

function ensureSection(id) {
  if (!state.sections[id] || typeof state.sections[id] !== "object") state.sections[id] = {};
  return state.sections[id];
}


const edition = detectEdition();

function moneyText(amount) {
  return formatMoney(amount, undefined, state.settings.currency || "USD");
}

function relativeDueLabel(dueIso, today = localIsoDate()) {
  const days = daysBetween(today, dueIso);
  if (days == null) return "";
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  if (days > 1) return `in ${days} days`;
  return `${Math.abs(days)} days ago`;
}

function unpaidBillsTotal() {
  return unpaidBillsTotalOf(state.bills);
}

function totalSpends() {
  return totalSpendsOf(state.spends);
}

function moneySummary() {
  const money = ensureSection("money");
  const today = localIsoDate();
  const payday = state.settings.nextPayday || "";
  const daysLeft = payday ? daysBetween(today, payday) : null;
  const stretch = computeStretch({
    available: money.available,
    setAside: money.setAside,
    bills: state.bills,
    spends: state.spends,
    paycheck: state.settings.paycheckAmount,
    includePaycheckInStretch: state.settings.includePaycheckInStretch,
  });
  const unpaidCount = state.bills.filter((bill) => !bill.paid && (bill.name || bill.amount || bill.due || bill.dueDay)).length;
  const nextBill = [...state.bills]
    .map((bill, index) => ({ bill, index, due: effectiveBillDue(bill, today) }))
    .filter(({ bill, due }) => !bill.paid && due)
    .sort((a, b) => String(a.due).localeCompare(String(b.due)))[0];
  return {
    today,
    available: stretch.available ?? parseMoney(money.available),
    setAside: stretch.setAside,
    unpaid: stretch.unpaid,
    unpaidCount,
    spent: stretch.spent,
    left: stretch.left,
    payday,
    daysLeft,
    perDay: perDayAmount(stretch.left, daysLeft),
    nextBill,
    label: state.settings.moneyLabel || "Left for this stretch",
    paycheck: stretch.paycheck,
  };
}

function savingsSummary() {
  const money = ensureSection("money");
  const name = String(money.savingsName || "").trim();
  const result = savingsProgress({
    saved: money.savingsSaved,
    target: money.savingsTarget,
    byIso: money.savingsBy || "",
    todayIso: localIsoDate(),
  });
  if (!result && !name) return null;
  return { name, ...(result || { saved: 0, target: null, remaining: null, perMonth: null, progress: 0 }) };
}

function renderNavigation() {
  sidebarNav.innerHTML = navigationGroups.map((group) => `
    <section class="nav-group" aria-label="${escapeHtml(group.label)}">
      <h2>${escapeHtml(group.label)}</h2>
      <div class="nav-group-links">
        ${group.items.map((item) => `
          <a class="nav-link" href="#/${item.id}" data-nav-id="${item.id}">
            <span class="nav-mark" aria-hidden="true"></span>
            <span>${escapeHtml(item.title)}</span>
          </a>
        `).join("")}
      </div>
    </section>
  `).join("");

  mobileNav.innerHTML = navigationGroups.map((group) => `
    <optgroup label="${escapeHtml(group.label)}">
      ${group.items.map((item) => `<option value="${item.id}">${escapeHtml(item.title)}</option>`).join("")}
    </optgroup>
  `).join("");
}

function updateNavigation(activeId) {
  document.querySelectorAll("[data-nav-id]").forEach((link) => {
    if (link.dataset.navId === activeId) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  mobileNav.value = activeId;
}

function fieldHtml(sectionId, field, values = {}) {
  const id = `${sectionId}-${field.key}`;
  const value = values[field.key] ?? "";
  const label = escapeHtml(field.label);
  const width = field.width || "half";
  const hint = field.hint ? `<span class="field-hint">${escapeHtml(field.hint)}</span>` : "";
  const placeholder = field.placeholder ? ` placeholder="${escapeHtml(field.placeholder)}"` : "";

  if (field.type === "select") {
    const options = (field.options || []).map((option) => {
      const selected = option === value ? " selected" : "";
      return `<option value="${escapeHtml(option)}"${selected}>${escapeHtml(option)}</option>`;
    }).join("");
    return `<div class="field field-${width}">
      <label for="${id}">${label}</label>
      <select id="${id}" name="${id}" data-section="${sectionId}" data-field="${field.key}">${options}</select>
      ${hint}
    </div>`;
  }

  if (field.type === "textarea") {
    return `<div class="field field-${width}">
      <label for="${id}">${label}</label>
      <textarea id="${id}" name="${id}" rows="${field.rows || 3}" data-section="${sectionId}" data-field="${field.key}"${placeholder}>${escapeHtml(value)}</textarea>
      ${hint}
    </div>`;
  }

  const type = ["date", "number"].includes(field.type) ? field.type : "text";
  return `<div class="field field-${width}">
    <label for="${id}">${label}</label>
    <input id="${id}" name="${id}" type="${type}" data-section="${sectionId}" data-field="${field.key}" value="${escapeHtml(value)}"${placeholder}${type === "number" ? ' inputmode="decimal"' : ""} />
    ${hint}
  </div>`;
}

function groupHtml(sectionId, group, values = {}) {
  const tone = group.tone || "white";
  return `<section class="form-card tone-${tone}" aria-labelledby="group-${sectionId}-${group.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}">
    <div class="form-card-heading">
      <span class="tone-mark" aria-hidden="true"></span>
      <h2 id="group-${sectionId}-${group.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}">${escapeHtml(group.title)}</h2>
    </div>
    <div class="field-grid">${group.fields.map((field) => fieldHtml(sectionId, field, values)).join("")}</div>
  </section>`;
}

function renderGenericPage(id) {
  const page = pageDefinitions[id];
  const values = ensureSection(id);
  return `<div class="page-heading">
      <p class="eyebrow">${escapeHtml(page.eyebrow)}</p>
      <h1 tabindex="-1">${escapeHtml(page.title)}</h1>
      <p class="page-intro">${escapeHtml(page.intro)}</p>
    </div>
    <div class="page-stack">${page.groups.map((group) => groupHtml(id, group, values)).join("")}</div>`;
}

function renderOverview() {
  const overview = ensureSection("overview");
  const filledToday = ["priority1", "priority2", "priority3", "firstAction"].filter((key) => String(state.sections.today?.[key] || "").trim()).length;
  const captureText = String(state.sections.capture?.everything || "");
  const capturedLines = captureText.split(/\n/).filter((line) => line.trim()).length;
  return `<section class="welcome-panel">
      <div class="welcome-copy">
        <p class="eyebrow">A FLEXIBLE, UNDATED PLANNER</p>
        <h1 tabindex="-1">A gentle place to see what matters, start small, and pick up again.</h1>
        <p>There is no perfect way to use this space. Choose one page, leave the rest for later, and begin with the next step you can see.</p>
        <a class="button button-primary" href="#/today">Open today’s page <span aria-hidden="true">→</span></a>
      </div>
      <div class="welcome-orbit" aria-hidden="true"><span></span><span></span><span></span><i></i></div>
    </section>

    <section class="overview-section" aria-labelledby="start-title">
      <div class="section-heading-row">
        <div><p class="eyebrow">A SOFT START</p><h2 id="start-title">Pick a place to begin</h2></div>
        <p class="muted-copy">One useful page is enough.</p>
      </div>
      <div class="quick-start-grid">
        <a class="quick-card tone-lavender" href="#/today"><span class="quick-number">01</span><strong>Plan today</strong><small>${filledToday ? `${filledToday} small field${filledToday === 1 ? "" : "s"} started` : "Choose a tiny first action"}</small></a>
        <a class="quick-card tone-teal" href="#/week"><span class="quick-number">02</span><strong>See the week</strong><small>Keep it broad and flexible</small></a>
        <a class="quick-card tone-coral" href="#/capture"><span class="quick-number">03</span><strong>Clear your head</strong><small>${capturedLines ? `${capturedLines} thought${capturedLines === 1 ? "" : "s"} captured` : "Write first, sort later"}</small></a>
      </div>
    </section>

    <section class="overview-bottom">
      <article class="gentle-card tone-butter">
        <p class="eyebrow">IF YOU HAVE BEEN AWAY</p>
        <h2>Skip the catch-up.</h2>
        <p>Open today’s page and carry forward only what still matters. A restart can be one line.</p>
        <div class="restart-actions">
          <a class="button button-primary" href="#/today">Open Today</a>
          <a class="button button-outline" href="#/capture">Brain dump</a>
          <a class="button button-outline" href="#/help">Quick start</a>
        </div>
      </article>
      <article class="gentle-card privacy-card">
        <p class="eyebrow">YOUR NOTES, YOUR DEVICE</p>
        <h2>Saved in this browser</h2>
        <p>Your entries are stored on this device, not sent to a planner account. Use <strong>Download backup</strong> to move a copy between devices.</p>
        <label class="field compact-field" for="overviewQuickNote">A note to catch before you go</label>
        <textarea id="overviewQuickNote" rows="2" data-section="overview" data-field="quickNote" placeholder="One thought is plenty.">${escapeHtml(overview.quickNote || "")}</textarea>
      </article>
    </section>
    <p class="closing-note">Plan · Capture · Reset — no streaks to maintain.</p>`;
}

function billsOnDate(iso) {
  return state.bills
    .map((bill, index) => ({ bill, index }))
    .filter(({ bill }) => bill.due === iso);
}

function renderCalendar() {
  const settings = state.settings;
  const year = settings.calendarYear;
  const month = settings.calendarMonth;
  const firstDay = settings.weekStarts === "sunday" ? 0 : 1;
  const weekdays = settings.weekStarts === "sunday"
    ? ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
    : ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = (new Date(year, month, 1).getDay() - firstDay + 7) % 7;
  const cellCount = Math.ceil((offset + daysInMonth) / 7) * 7;
  const today = localIsoDate();
  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}-`;
  let selected = settings.selectedDate;
  if (!selected.startsWith(monthPrefix)) selected = `${monthPrefix}01`;
  settings.selectedDate = selected;
  const payday = settings.nextPayday || "";

  const cells = Array.from({ length: cellCount }, (_, index) => {
    const day = index - offset + 1;
    if (day < 1 || day > daysInMonth) return `<div class="calendar-cell calendar-cell-empty" aria-hidden="true"></div>`;
    const iso = `${monthPrefix}${String(day).padStart(2, "0")}`;
    const hasNote = Boolean(String(state.calendarNotes[iso] || "").trim());
    const dayBills = billsOnDate(iso);
    const hasUnpaid = dayBills.some(({ bill }) => !bill.paid);
    const hasPaid = dayBills.some(({ bill }) => bill.paid);
    const isPayday = payday === iso;
    const selectedClass = iso === selected ? " is-selected" : "";
    const todayClass = iso === today ? " is-today" : "";
    const noteClass = hasNote ? " has-note" : "";
    const billClass = hasUnpaid ? " has-bill" : hasPaid ? " has-bill-paid" : "";
    const paydayClass = isPayday ? " has-payday" : "";
    const markers = [
      hasUnpaid ? "unpaid bill" : "",
      hasPaid && !hasUnpaid ? "paid bill" : "",
      isPayday ? "payday" : "",
      hasNote ? "has a note" : "",
    ].filter(Boolean).join(", ");
    return `<button class="calendar-cell${selectedClass}${todayClass}${noteClass}${billClass}${paydayClass}" type="button" data-calendar-day="${iso}" aria-label="Select ${escapeHtml(readableDate(new Date(year, month, day), { month: "long", day: "numeric", year: "numeric" }))}${markers ? `, ${markers}` : ""}" aria-pressed="${iso === selected}">
      <span class="calendar-day-number">${day}</span>
      <span class="calendar-markers" aria-hidden="true">
        ${hasUnpaid ? '<i class="mark-bill"></i>' : ""}
        ${hasPaid && !hasUnpaid ? '<i class="mark-bill-paid"></i>' : ""}
        ${isPayday ? '<i class="mark-payday"></i>' : ""}
        ${hasNote ? '<i class="mark-note"></i>' : ""}
      </span>
    </button>`;
  }).join("");

  const selectedDateLabel = readableDate(new Date(`${selected}T12:00:00`), { weekday: "long", month: "long", day: "numeric" });
  const monthOptions = months.map((name, index) => `<option value="${index}"${index === month ? " selected" : ""}>${name}</option>`).join("");
  const yearOptions = Array.from({ length: 11 }, (_, index) => year - 5 + index)
    .map((value) => `<option value="${value}"${value === year ? " selected" : ""}>${value}</option>`).join("");
  const note = state.calendarNotes[selected] || "";
  const selectedBills = billsOnDate(selected);
  const billLines = selectedBills.length
    ? `<ul class="day-bill-list">${selectedBills.map(({ bill }) => {
      const rel = bill.due ? relativeDueLabel(bill.due, today) : "";
      return `<li><span class="day-bill-name">${escapeHtml(bill.name || "Bill")}</span><span class="day-bill-meta">${bill.paid ? "Paid" : "Still to pay"}${bill.amount ? ` · ${escapeHtml(String(bill.amount))}` : ""}${rel ? ` · ${escapeHtml(rel)}` : ""}</span></li>`;
    }).join("")}</ul>`
    : `<p class="empty-inline">No bills due this day. Add due dates on Money &amp; bills.</p>`;
  const paydayNote = payday === selected ? `<p class="day-payday-note">Payday lands here.</p>` : "";

  return `<section class="calendar-panel form-card tone-white" aria-labelledby="calendar-title">
      <div class="calendar-toolbar">
        <div class="calendar-selects">
          <label><span class="sr-only">Month</span><select data-setting="calendarMonth" aria-label="Calendar month">${monthOptions}</select></label>
          <label><span class="sr-only">Year</span><select data-setting="calendarYear" aria-label="Calendar year">${yearOptions}</select></label>
        </div>
        <label class="week-start-setting"><span>Week starts</span><select data-setting="weekStarts" aria-label="First day of the week"><option value="monday"${settings.weekStarts !== "sunday" ? " selected" : ""}>Monday</option><option value="sunday"${settings.weekStarts === "sunday" ? " selected" : ""}>Sunday</option></select></label>
      </div>
      <p class="calendar-legend" aria-hidden="true"><span><i class="mark-bill"></i> still to pay</span><span><i class="mark-bill-paid"></i> paid</span><span><i class="mark-payday"></i> payday</span><span><i class="mark-note"></i> note</span></p>
      <h2 id="calendar-title" class="sr-only">${escapeHtml(months[month])} ${year} calendar</h2>
      <div class="calendar-grid" role="grid" aria-label="${escapeHtml(months[month])} ${year}">
        ${weekdays.map((day) => `<div class="calendar-weekday" role="columnheader">${day}</div>`).join("")}
        ${cells}
      </div>
      <div class="calendar-editor">
        <div><p class="eyebrow">SELECTED DAY</p><h3>${escapeHtml(selectedDateLabel)}</h3>${paydayNote}${billLines}</div>
        <div>
          <label class="sr-only" for="calendarNote">Note for ${escapeHtml(selectedDateLabel)}</label>
          <textarea id="calendarNote" rows="2" data-calendar-note="${selected}" placeholder="An appointment, a reminder, or leave it blank.">${escapeHtml(note)}</textarea>
        </div>
      </div>
    </section>`;
}

function renderMonth() {
  const page = pageDefinitions.month;
  const values = ensureSection("month");
  return `<div class="page-heading"><p class="eyebrow">${page.eyebrow}</p><h1 tabindex="-1">${page.title}</h1><p class="page-intro">${page.intro}</p></div>
    <div class="page-stack">
      ${groupHtml("month", page.groups[0], values)}
      ${renderCalendar()}
      ${groupHtml("month", page.groups[1], values)}
      <p class="helper-note">Focus &amp; review is optional. A blank box is information, not a failed month.</p>
    </div>`;
}

function renderYear() {
  const page = pageDefinitions.year;
  const selected = state.settings.selectedYearMonth;
  const year = state.settings.calendarYear;
  return `<div class="page-heading"><p class="eyebrow">${page.eyebrow}</p><h1 tabindex="-1">${page.title}</h1><p class="page-intro">${page.intro}</p></div>
    <section class="year-panel form-card tone-white">
      <div class="year-toolbar"><label for="yearNumber">Year</label><input id="yearNumber" type="number" min="1900" max="2200" value="${year}" data-setting="calendarYear" /></div>
      <div class="month-picker" aria-label="Choose a month">
        ${months.map((name, index) => `<button type="button" class="month-chip${index === selected ? " is-selected" : ""}" data-year-month="${index}" aria-pressed="${index === selected}"><span>${escapeHtml(name.slice(0, 3))}</span><i aria-hidden="true"></i></button>`).join("")}
      </div>
      <div class="year-note-editor">
        <p class="eyebrow">${escapeHtml(months[selected])} · ${year}</p>
        <label class="sr-only" for="yearNote">Notes for ${escapeHtml(months[selected])} ${year}</label>
        <textarea id="yearNote" rows="4" data-year-note="${selected}" placeholder="A date, a season, or something you want to remember.">${escapeHtml(state.yearNotes[String(selected)] || "")}</textarea>
      </div>
    </section>
    <p class="helper-note">Leave any month blank. This is a glanceable reminder, not a list to complete.</p>`;
}

function renderMoneyHero(summary = moneySummary()) {
  const paydayLabel = summary.payday
    ? readableDate(new Date(`${summary.payday}T12:00:00`), { weekday: "short", month: "short", day: "numeric" })
    : "";
  const daysCopy = summary.daysLeft == null
    ? "Add a next payday below when you know it."
    : summary.daysLeft > 0
      ? `${summary.daysLeft} day${summary.daysLeft === 1 ? "" : "s"} until ${escapeHtml(paydayLabel)}`
      : summary.daysLeft === 0
        ? `Payday is today (${escapeHtml(paydayLabel)})`
        : `Payday date has passed · update it when you can`;
  const perDayCopy = summary.perDay != null
    ? ` · about ${moneyText(summary.perDay)} / day if you smooth it`
    : "";
  const nextBillCopy = summary.nextBill
    ? `${escapeHtml(summary.nextBill.bill.name || "A bill")} is next${summary.nextBill.bill.due ? ` · ${escapeHtml(relativeDueLabel(summary.nextBill.bill.due, summary.today))}` : ""}`
    : "No unpaid bills with dates yet";
  const workedOut = [
    summary.available != null ? `Starts from ${moneyText(summary.available)} available` : "Add money available to see a number",
    summary.setAside ? `minus ${moneyText(summary.setAside)} set aside` : null,
    summary.unpaid ? `minus ${moneyText(summary.unpaid)} still in unpaid bills` : null,
    summary.spent ? `minus ${moneyText(summary.spent)} logged spends` : null,
  ].filter(Boolean).join("; ");

  return `<section class="money-hero form-card tone-lavender" aria-labelledby="money-hero-title">
      <div class="money-hero-top">
        <div>
          <label class="money-label-field" for="moneyLabel">What to call this number</label>
          <input id="moneyLabel" type="text" data-setting-text="moneyLabel" value="${escapeHtml(summary.label)}" maxlength="48" />
          <h2 id="money-hero-title" class="money-hero-amount" data-money-left>${moneyText(summary.left)}</h2>
          <p class="money-hero-sub" data-money-days>${daysCopy}${perDayCopy}</p>
        </div>
        <div class="money-hero-aside">
          <p class="eyebrow">Still to pay</p>
          <p class="money-aside-figure" data-money-unpaid>${moneyText(summary.unpaid)}</p>
          <p class="money-aside-note" data-money-next>${nextBillCopy}</p>
        </div>
      </div>
      <details class="money-how">
        <summary>How this is worked out</summary>
        <p data-money-how>${escapeHtml(workedOut)}. Not advice—just your typed numbers.</p>
      </details>
    </section>`;
}

function renderPaydayField() {
  const currencies = ["USD", "EUR", "GBP", "KES", "CAD", "AUD", "ZAR"];
  const periods = [
    ["until-payday", "Until next payday"],
    ["weekly", "Weekly"],
    ["biweekly", "Biweekly"],
    ["twice-monthly", "Twice monthly"],
    ["monthly", "Monthly"],
  ];
  return `<div class="payday-row form-card tone-white">
      <div class="field field-third">
        <label for="nextPayday">Next payday</label>
        <input id="nextPayday" type="date" data-setting="nextPayday" value="${escapeHtml(state.settings.nextPayday || "")}" />
        <span class="field-hint">Actual landing date. Expected pay is not added to available unless you opt in below.</span>
      </div>
      <div class="field field-third">
        <label for="paycheckAmount">Usual paycheck (expected)</label>
        <input id="paycheckAmount" type="text" inputmode="decimal" data-setting-text="paycheckAmount" value="${escapeHtml(state.settings.paycheckAmount || "")}" placeholder="Optional" />
      </div>
      <div class="field field-third">
        <label for="currency">Currency display</label>
        <select id="currency" data-setting="currency">${currencies.map((c) => `<option value="${c}"${(state.settings.currency || "USD") === c ? " selected" : ""}>${c}</option>`).join("")}</select>
      </div>
      <div class="field field-third">
        <label for="budgetPeriod">Budget period</label>
        <select id="budgetPeriod" data-setting="budgetPeriod">${periods.map(([v,l]) => `<option value="${v}"${(state.settings.budgetPeriod || "until-payday") === v ? " selected" : ""}>${l}</option>`).join("")}</select>
      </div>
      <div class="field field-half">
        <label class="toggle-line" for="includePaycheckInStretch">
          <input id="includePaycheckInStretch" type="checkbox" data-setting-bool="includePaycheckInStretch"${state.settings.includePaycheckInStretch ? " checked" : ""} />
          <span>Add expected paycheck into stretch total (off by default — avoids counting money that has not arrived)</span>
        </label>
        <label class="toggle-line" for="showSavings">
          <input id="showSavings" type="checkbox" data-setting-bool="showSavings"${state.settings.showSavings !== false ? " checked" : ""} />
          <span>Show savings progress</span>
        </label>
        <label class="toggle-line" for="showDebt">
          <input id="showDebt" type="checkbox" data-setting-bool="showDebt"${state.settings.showDebt ? " checked" : ""} />
          <span>Show optional debt tracking</span>
        </label>
      </div>
    </div>`;
}

function renderBillList() {
  const today = localIsoDate();
  const ordered = state.bills
    .map((bill, index) => ({ bill, index }))
    .sort((a, b) => {
      if (Boolean(a.bill.paid) !== Boolean(b.bill.paid)) return a.bill.paid ? 1 : -1;
      return String(a.bill.due || "9999").localeCompare(String(b.bill.due || "9999"));
    });
  const summary = moneySummary();
  const summaryLine = summary.unpaidCount
    ? `${summary.unpaidCount} still to pay · ${moneyText(summary.unpaid)}${summary.nextBill ? ` · next: ${escapeHtml(summary.nextBill.bill.name || "bill")} (${escapeHtml(relativeDueLabel(summary.nextBill.bill.due, today))})` : ""}`
    : "No unpaid bills right now. Add one only if it helps.";

  const rows = ordered.map(({ bill, index }) => {
    const due = effectiveBillDue(bill, today) || bill.due || "";
    const rel = due ? relativeDueLabel(due, today) : "";
    return `<div class="bill-row${bill.paid ? " is-paid" : ""}" data-bill-row="${index}">
      <div class="bill-due-wrap">
        <label class="sr-only" for="bill-due-${index}">Due date for bill ${index + 1}</label>
        <input id="bill-due-${index}" type="date" data-list="bills" data-index="${index}" data-field="due" value="${escapeHtml(bill.due || "")}" />
        ${rel ? `<span class="bill-relative">${escapeHtml(rel)}</span>` : ""}
      </div>
      <label class="sr-only" for="bill-recurring-${index}">Repeat</label>
      <select id="bill-recurring-${index}" data-list="bills" data-index="${index}" data-field="recurring" aria-label="Repeat bill ${index + 1}">
        <option value="once"${(bill.recurring || "once") === "once" ? " selected" : ""}>Once</option>
        <option value="monthly"${bill.recurring === "monthly" ? " selected" : ""}>Monthly</option>
      </select>
      <label class="sr-only" for="bill-name-${index}">Bill name ${index + 1}</label>
      <input id="bill-name-${index}" type="text" data-list="bills" data-index="${index}" data-field="name" value="${escapeHtml(bill.name || "")}" placeholder="Bill / what for" />
      <label class="sr-only" for="bill-amount-${index}">Amount for bill ${index + 1}</label>
      <input id="bill-amount-${index}" type="text" inputmode="decimal" data-list="bills" data-index="${index}" data-field="amount" value="${escapeHtml(bill.amount || "")}" placeholder="Amount" />
      <button type="button" class="button button-quiet bill-paid-btn" data-action="toggle-bill-paid" data-index="${index}">${bill.paid ? "Paid ✓" : "Mark paid"}</button>
      <button type="button" class="icon-button remove-row" data-action="remove-bill" data-index="${index}" aria-label="Remove bill ${index + 1}">×</button>
    </div>`;
  }).join("");

  return `<section class="form-card tone-white" aria-labelledby="bill-title">
    <div class="form-card-heading"><span class="tone-mark" aria-hidden="true"></span><h2 id="bill-title">Bills · soonest first</h2></div>
    <p class="card-intro" data-bill-summary>${summaryLine}</p>
    <div class="bill-table-head" aria-hidden="true"><span>DUE</span><span>REPEAT</span><span>BILL</span><span>AMOUNT</span><span></span><span></span></div>
    <div class="bill-list">${rows || '<p class="empty-inline">No bills added. Add one only if it helps.</p>'}</div>
    <button class="button button-add" type="button" data-action="add-bill"><span aria-hidden="true">+</span> Add a bill</button>
  </section>`;
}

function renderSpendLog() {
  const today = localIsoDate();
  const rows = [...(state.spends || [])]
    .map((spend, index) => ({ spend, index }))
    .sort((a, b) => String(b.spend.date || "").localeCompare(String(a.spend.date || "")) || b.index - a.index)
    .slice(0, 40)
    .map(({ spend, index }) => `<div class="spend-row">
      <label class="sr-only" for="spend-date-${index}">Date for spend ${index + 1}</label>
      <input id="spend-date-${index}" type="date" data-list="spends" data-index="${index}" data-field="date" value="${escapeHtml(spend.date || "")}" />
      <label class="sr-only" for="spend-amount-${index}">Amount for spend ${index + 1}</label>
      <input id="spend-amount-${index}" type="text" inputmode="decimal" data-list="spends" data-index="${index}" data-field="amount" value="${escapeHtml(spend.amount || "")}" placeholder="Amount" />
      <label class="sr-only" for="spend-note-${index}">Note for spend ${index + 1}</label>
      <input id="spend-note-${index}" type="text" data-list="spends" data-index="${index}" data-field="note" value="${escapeHtml(spend.note || "")}" placeholder="What for (optional)" />
      <button type="button" class="icon-button remove-row" data-action="remove-spend" data-index="${index}" aria-label="Remove spend ${index + 1}">×</button>
    </div>`).join("");

  return `<section class="form-card tone-blue" aria-labelledby="spend-title">
    <div class="form-card-heading"><span class="tone-mark" aria-hidden="true"></span><h2 id="spend-title">Log a spend</h2></div>
    <p class="card-intro">Quick capture when you remember. It comes off the stretch number. No categories required.</p>
    <form class="spend-composer" data-spend-form>
      <label class="sr-only" for="spendQuickAmount">Amount</label>
      <input id="spendQuickAmount" name="amount" type="text" inputmode="decimal" placeholder="Amount" required />
      <label class="sr-only" for="spendQuickNote">Note</label>
      <input id="spendQuickNote" name="note" type="text" placeholder="Optional note" />
      <input type="hidden" name="date" value="${today}" />
      <button class="button button-primary" type="submit">Add</button>
    </form>
    <div class="spend-chips" aria-label="Quick amounts">
      ${[1, 5, 10, 20].map((chip) => `<button type="button" class="chip-button" data-action="spend-chip" data-amount="${chip}">+$${chip}</button>`).join("")}
    </div>
    <div class="spend-list">${rows || '<p class="empty-inline">Nothing logged yet. Anything you add lands here.</p>'}</div>
  </section>`;
}

function renderSavingsCard() {
  if (state.settings.showSavings === false) return "";
  const page = pageDefinitions.money;
  const savingsGroup = page.groups[2];
  const summary = savingsSummary();
  const bar = summary && summary.target != null
    ? `<div class="savings-progress" aria-hidden="true"><span style="width:${summary.progress.toFixed(1)}%"></span></div>
       <p class="savings-meta">${moneyText(summary.saved)}${summary.target != null ? ` of ${moneyText(summary.target)}` : ""}${summary.remaining != null ? ` · ${moneyText(summary.remaining)} to go` : ""}${summary.perMonth != null ? ` · about ${moneyText(summary.perMonth)} / month` : ""}</p>`
    : `<p class="card-intro">A soft target only. Leave blank if numbers do not help right now.</p>`;
  return `<section class="form-card tone-butter" aria-labelledby="savings-title">
    <div class="form-card-heading"><span class="tone-mark" aria-hidden="true"></span><h2 id="savings-title">${escapeHtml(savingsGroup.title)}</h2></div>
    ${bar}
    <div class="field-grid">${savingsGroup.fields.map((field) => fieldHtml("money", field, ensureSection("money"))).join("")}</div>
  </section>`;
}

function renderMoney() {
  const page = pageDefinitions.money;
  const values = ensureSection("money");
  return `<div class="page-heading"><p class="eyebrow">${page.eyebrow}</p><h1 tabindex="-1">${page.title}</h1><p class="page-intro">${page.intro}</p></div>
    <div class="page-stack">
      ${renderMoneyHero()}
      ${renderPaydayField()}
      ${groupHtml("money", page.groups[0], values)}
      ${renderBillList()}
      ${renderSpendLog()}
      ${groupHtml("money", page.groups[1], values)}
      ${renderSavingsCard()}
      ${renderDebtList()}
    </div>`;
}

function renderTodayMoneyChip() {
  const summary = moneySummary();
  const nudgeDone = state.settings.spendNudgeDone === summary.today;
  const leftCopy = summary.left == null
    ? "Add available money on Money & bills when you want a stretch number."
    : `${escapeHtml(summary.label)} ≈ ${moneyText(summary.left)}${summary.perDay != null ? ` · ~${moneyText(summary.perDay)}/day` : ""}`;
  return `<section class="today-money-chip form-card tone-sage" aria-label="Money glance">
      <div class="today-money-copy">
        <p class="eyebrow">Money glance</p>
        <p class="today-money-figure">${leftCopy}</p>
        <a class="text-link" href="#/money">Open Money &amp; bills <span aria-hidden="true">↗</span></a>
      </div>
      <label class="nudge-check">
        <input type="checkbox" data-setting-nudge="spendNudgeDone"${nudgeDone ? " checked" : ""} />
        <span>Log anything you spent today · ~30 sec</span>
      </label>
    </section>`;
}

function renderToday() {
  const page = pageDefinitions.today;
  const values = ensureSection("today");
  return `<div class="page-heading"><p class="eyebrow">${page.eyebrow}</p><h1 tabindex="-1">${page.title}</h1><p class="page-intro">${page.intro}</p></div>
    <div class="page-stack">${renderTodayMoneyChip()}${renderTodayTasks()}${page.groups.map((group) => groupHtml("today", group, values)).join("")}</div>`;
}

function renderProjectList() {
  const rows = state.projects.map((project, index) => `<article class="repeat-card tone-white">
    <div class="repeat-card-heading"><span class="repeat-index">${String(index + 1).padStart(2, "0")}</span><h2>Project ${index + 1}</h2><button type="button" class="icon-button" data-action="remove-project" data-index="${index}" aria-label="Remove project ${index + 1}">×</button></div>
    <div class="field-grid">
      ${repeatInput("projects", index, "name", "Project / outcome", project.name, "text", "half")}
      ${repeatInput("projects", index, "target", "Target date", project.target, "date", "half")}
      ${repeatInput("projects", index, "why", "Why it matters / done looks like", project.why, "textarea", "half", 3)}
      ${repeatInput("projects", index, "help", "Who / what could help?", project.help, "textarea", "half", 3)}
      ${repeatInput("projects", index, "next", "First visible step / next actions", project.next, "textarea", "full", 4)}
      ${repeatInput("projects", index, "stuck", "If I get stuck, I can…", project.stuck, "textarea", "half", 2)}
      ${repeatInput("projects", index, "reward", "A small reward / finish marker", project.reward, "textarea", "half", 2)}
    </div>
  </article>`).join("");
  return `<section class="form-card tone-lavender" aria-labelledby="project-list-title">
    <div class="form-card-heading"><span class="tone-mark" aria-hidden="true"></span><h2 id="project-list-title">Keep the next step visible</h2></div>
    <div class="repeat-list">${rows || '<p class="empty-inline">No project needs a card right now. You can add one when you are ready.</p>'}</div>
    <button class="button button-add" type="button" data-action="add-project"><span aria-hidden="true">+</span> Add a project</button>
  </section>`;
}

function repeatInput(list, index, key, label, value = "", type = "text", width = "half", rows = 3) {
  const id = `${list}-${index}-${key}`;
  if (type === "textarea") {
    return `<div class="field field-${width}"><label for="${id}">${escapeHtml(label)}</label><textarea id="${id}" rows="${rows}" data-list="${list}" data-index="${index}" data-field="${key}">${escapeHtml(value || "")}</textarea></div>`;
  }
  return `<div class="field field-${width}"><label for="${id}">${escapeHtml(label)}</label><input id="${id}" type="${type}" data-list="${list}" data-index="${index}" data-field="${key}" value="${escapeHtml(value || "")}" /></div>`;
}

function renderProjects() {
  const page = pageDefinitions.projects;
  return `<div class="page-heading"><p class="eyebrow">${page.eyebrow}</p><h1 tabindex="-1">${page.title}</h1><p class="page-intro">${page.intro}</p></div>
    <div class="page-stack">${renderProjectList()}<p class="helper-note">Write the next action, not the whole mountain. One project at a time is plenty.</p></div>`;
}

function renderCheckins() {
  const days = weekDays.map((day) => {
    const record = state.checkins[day.key] || {};
    return `<div class="checkin-row">
      <span class="checkin-day">${day.short}</span>
      <label class="sr-only" for="sleep-${day.key}">Sleep or rest note for ${day.label}</label><select id="sleep-${day.key}" data-checkin="${day.key}" data-field="sleep"><option value="">Sleep / rest</option>${["Rested", "Okay", "Low"].map((value) => `<option value="${value}"${record.sleep === value ? " selected" : ""}>${value}</option>`).join("")}</select>
      <label class="sr-only" for="energy-${day.key}">Energy for ${day.label}</label><select id="energy-${day.key}" data-checkin="${day.key}" data-field="energy"><option value="">Energy</option>${["Low", "Steady", "High"].map((value) => `<option value="${value}"${record.energy === value ? " selected" : ""}>${value}</option>`).join("")}</select>
      <label class="sr-only" for="mood-${day.key}">Mood or note for ${day.label}</label><input id="mood-${day.key}" type="text" data-checkin="${day.key}" data-field="note" value="${escapeHtml(record.note || "")}" placeholder="Mood / note" />
    </div>`;
  }).join("");
  return `<section class="form-card tone-white" aria-labelledby="checkin-title">
    <div class="form-card-heading"><span class="tone-mark" aria-hidden="true"></span><h2 id="checkin-title">A week of noticing, not scoring</h2></div>
    <div class="checkin-table"><div class="checkin-header" aria-hidden="true"><span>DAY</span><span>SLEEP</span><span>ENERGY</span><span>MOOD / NOTE</span></div>${days}</div>
  </section>`;
}

function renderWellbeing() {
  const page = pageDefinitions.wellbeing;
  return `<div class="page-heading"><p class="eyebrow">${page.eyebrow}</p><h1 tabindex="-1">${page.title}</h1><p class="page-intro">${page.intro}</p></div>
    <div class="page-stack">${renderCheckins()}${groupHtml("wellbeing", page.groups[0], ensureSection("wellbeing"))}</div>`;
}

function renderHabitGrid() {
  const names = state.habits.names;
  const header = `<div class="habit-row habit-header"><span>DAY</span>${names.map((name, index) => `<label class="habit-name"><span class="sr-only">Name for routine ${index + 1}</span><input type="text" data-routine-name="${index}" value="${escapeHtml(name)}" placeholder="${index + 1} · cue" /></label>`).join("")}</div>`;
  const rows = weekDays.map((day) => `<div class="habit-row"><span class="habit-day">${day.label}</span>${names.map((_, index) => {
    const checked = Boolean(state.habits.checks?.[day.key]?.[index]);
    return `<label class="habit-check"><input type="checkbox" data-habit-day="${day.key}" data-habit-index="${index}"${checked ? " checked" : ""} /><span class="sr-only">${day.label} · ${escapeHtml(names[index] || `routine ${index + 1}`)}</span></label>`;
  }).join("")}</div>`).join("");
  return `<section class="form-card tone-white" aria-labelledby="habit-title">
    <div class="form-card-heading"><span class="tone-mark" aria-hidden="true"></span><h2 id="habit-title">A gentle cue tracker</h2></div>
    <p class="card-intro">Choose up to three routines. A blank box is information, not failure.</p>
    <div class="habit-table">${header}${rows}</div>
  </section>`;
}

function renderRoutines() {
  const page = pageDefinitions.routines;
  return `<div class="page-heading"><p class="eyebrow">${page.eyebrow}</p><h1 tabindex="-1">${page.title}</h1><p class="page-intro">${page.intro}</p></div>
    <div class="page-stack">${renderHabitGrid()}${groupHtml("routines", page.groups[0], ensureSection("routines"))}<p class="helper-note">If you miss a day, continue at the next box. No streak to repair.</p></div>`;
}

function renderMilestones() {
  const rows = state.milestones.map((item, index) => `<div class="milestone-row">
    <label class="milestone-check"><input type="checkbox" data-list="milestones" data-index="${index}" data-field="done"${item.done ? " checked" : ""} /><span class="sr-only">Mark milestone ${index + 1} complete</span></label>
    <label class="sr-only" for="milestone-${index}">Milestone ${index + 1}</label><input id="milestone-${index}" type="text" data-list="milestones" data-index="${index}" data-field="text" value="${escapeHtml(item.text || "")}" placeholder="Step ${index + 1} · make it small" />
    <button type="button" class="icon-button remove-row" data-action="remove-milestone" data-index="${index}" aria-label="Remove milestone ${index + 1}">×</button>
  </div>`).join("");
  return `<section class="form-card tone-butter" aria-labelledby="milestone-title">
    <div class="form-card-heading"><span class="tone-mark" aria-hidden="true"></span><h2 id="milestone-title">Milestones · each step can be small</h2></div>
    <div class="milestone-list">${rows || '<p class="empty-inline">No milestones yet. Add one if it makes progress easier to see.</p>'}</div>
    <button class="button button-add" type="button" data-action="add-milestone"><span aria-hidden="true">+</span> Add a milestone</button>
  </section>`;
}

function renderGoals() {
  const page = pageDefinitions.goals;
  const savings = savingsSummary();
  const savingsNote = savings
    ? `<aside class="form-card tone-sage goals-savings-note">
        <p class="eyebrow">From Money &amp; bills</p>
        <p class="savings-meta">${escapeHtml(savings.name || "Savings")}${savings.target != null ? ` · ${moneyText(savings.saved)} of ${moneyText(savings.target)}` : ""}${savings.remaining != null ? ` · ${moneyText(savings.remaining)} to go` : ""}</p>
        <a class="text-link" href="#/money">Edit savings on Money &amp; bills <span aria-hidden="true">↗</span></a>
      </aside>`
    : "";
  return `<div class="page-heading"><p class="eyebrow">${page.eyebrow}</p><h1 tabindex="-1">${page.title}</h1><p class="page-intro">${page.intro}</p></div>
    <div class="page-stack">${groupHtml("goals", page.groups[0], ensureSection("goals"))}${savingsNote}${renderMilestones()}</div>`;
}


function renderEditionBanner() {
  const host = document.querySelector("#editionBanner");
  if (host) host.innerHTML = editionBannerHtml(edition);
}

function renderQuickCaptureList() {
  const host = document.querySelector("#quickCaptureList");
  if (!host) return;
  const items = state.quickCapture || [];
  if (!items.length) {
    host.hidden = true;
    host.innerHTML = "";
    return;
  }
  host.hidden = false;
  host.innerHTML = items.slice(0, 8).map((item, index) => `<div class="quick-capture-item">
    <input type="checkbox" data-action="promote-capture" data-index="${index}" aria-label="Move capture to today tasks" title="Move to today tasks" />
    <span>${escapeHtml(item.text || "")}</span>
    <button type="button" class="icon-button" data-action="remove-capture" data-index="${index}" aria-label="Remove capture">×</button>
  </div>`).join("");
}

function renderDebtList() {
  if (!state.settings.showDebt) return "";
  const rows = (state.debts || []).map((debt, index) => `<div class="debt-row">
    <input type="text" data-list="debts" data-index="${index}" data-field="name" value="${escapeHtml(debt.name || "")}" placeholder="Debt / balance name" aria-label="Debt name ${index + 1}" />
    <input type="text" inputmode="decimal" data-list="debts" data-index="${index}" data-field="balance" value="${escapeHtml(debt.balance || "")}" placeholder="Balance" aria-label="Debt balance ${index + 1}" />
    <input type="text" inputmode="decimal" data-list="debts" data-index="${index}" data-field="payment" value="${escapeHtml(debt.payment || "")}" placeholder="Payment" aria-label="Debt payment ${index + 1}" />
    <button type="button" class="icon-button remove-row" data-action="remove-debt" data-index="${index}" aria-label="Remove debt ${index + 1}">×</button>
  </div>`).join("");
  return `<section class="form-card tone-peach" aria-labelledby="debt-title">
    <div class="form-card-heading"><span class="tone-mark" aria-hidden="true"></span><h2 id="debt-title">Optional debt tracking</h2></div>
    <p class="card-intro">Balances are informational. Total still owed: <strong>${moneyText(totalDebts(state.debts))}</strong>. Not advice.</p>
    <div class="debt-list">${rows || '<p class="empty-inline">No debts listed.</p>'}</div>
    <button class="button button-add" type="button" data-action="add-debt"><span aria-hidden="true">+</span> Add a debt</button>
  </section>`;
}

function renderTodayTasks() {
  const rows = (state.tasks || []).map((task, index) => `<div class="task-row">
    <input type="checkbox" data-list="tasks" data-index="${index}" data-field="done"${task.done ? " checked" : ""} aria-label="Done ${index + 1}" />
    <input type="text" data-list="tasks" data-index="${index}" data-field="text" value="${escapeHtml(task.text || "")}" placeholder="A small task" />
    <input type="date" data-list="tasks" data-index="${index}" data-field="due" value="${escapeHtml(task.due || "")}" aria-label="Due ${index + 1}" />
    <button type="button" class="icon-button" data-action="remove-task" data-index="${index}" aria-label="Remove task">×</button>
  </div>`).join("");
  const done = (state.tasks || []).filter((t) => t.done).length;
  const total = (state.tasks || []).length;
  return `<section class="form-card tone-mint" aria-labelledby="task-title">
    <div class="form-card-heading"><span class="tone-mark" aria-hidden="true"></span><h2 id="task-title">Today’s checklist</h2>
      <span class="progress-pill">${done}/${total || 0} done</span></div>
    <p class="card-intro">Optional tiny tasks. Blank is fine.</p>
    <div class="task-list">${rows || '<p class="empty-inline">No checklist items yet.</p>'}</div>
    <button class="button button-add" type="button" data-action="add-task"><span aria-hidden="true">+</span> Add a task</button>
  </section>`;
}

function maybeNotifyDueBills() {
  if (!state.settings.remindersEnabled || Notification.permission !== "granted") return;
  const today = localIsoDate();
  if (state.settings.lastReminderDate === today) return;
  const dueToday = state.bills.filter((bill) => !bill.paid && effectiveBillDue(bill, today) === today);
  if (!dueToday.length) return;
  const names = dueToday.map((b) => b.name || "A bill").slice(0, 3).join(", ");
  new Notification("Calm ADHD Planner", { body: `Due today: ${names}` });
  state.settings.lastReminderDate = today;
  persist();
}

async function toggleReminders() {
  if (!("Notification" in window)) {
    announce("This browser does not support notifications.");
    return;
  }
  if (!state.settings.remindersEnabled) {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      announce("Reminders need notification permission.");
      return;
    }
    state.settings.remindersEnabled = true;
    persist();
    announce("Reminders on — we’ll nudge for bills due today when you open the planner.");
    maybeNotifyDueBills();
  } else {
    state.settings.remindersEnabled = false;
    persist();
    announce("Reminders off.");
  }
}


function renderHelp() {
  const page = pageDefinitions.help;
  return `<div class="page-heading"><p class="eyebrow">${page.eyebrow}</p><h1 tabindex="-1">${page.title}</h1><p class="page-intro">${page.intro}</p></div>
    <div class="page-stack">
      <section class="form-card tone-lavender"><div class="form-card-heading"><span class="tone-mark"></span><h2>1 · Capture</h2></div><p class="card-intro">Write the thought, task, or date before organizing. Use Quick capture at the bottom of any page.</p></section>
      <section class="form-card tone-mint"><div class="form-card-heading"><span class="tone-mark"></span><h2>2 · Choose</h2></div><p class="card-intro">Pick up to three priorities on Today. One thing is also a valid plan.</p></section>
      <section class="form-card tone-peach"><div class="form-card-heading"><span class="tone-mark"></span><h2>3 · Begin</h2></div><p class="card-intro">Write the smallest visible next action, then start there.</p></section>
      <section class="form-card tone-sand"><div class="form-card-heading"><span class="tone-mark"></span><h2>If you have been away</h2></div><p class="card-intro">Skip the catch-up. Open Today and carry forward only what still matters.</p>
        <div class="restart-actions"><a class="button button-primary" href="#/today">Open Today</a><a class="button button-outline" href="#/capture">Brain dump</a><a class="button button-outline" href="#/backup">Backup &amp; restore</a></div>
      </section>
      <p class="helper-note">This is an ADHD-friendly planner companion — not medical treatment and not a guarantee of symptom change. Printable expanded PDFs are a separate product (20 core sheets + repeats, not 225 unique layouts).</p>
    </div>`;
}

function renderBackupPage() {
  const page = pageDefinitions.backup;
  const diag = storageDiagnostics();
  const counts = {
    bills: (state.bills || []).length,
    spends: (state.spends || []).length,
    projects: (state.projects || []).length,
    tasks: (state.tasks || []).length,
  };
  return `<div class="page-heading"><p class="eyebrow">${page.eyebrow}</p><h1 tabindex="-1">${page.title}</h1><p class="page-intro">${page.intro}</p></div>
    <div class="page-stack">
      <section class="form-card tone-white">
        <div class="form-card-heading"><span class="tone-mark"></span><h2>This browser right now</h2></div>
        <p class="card-intro">Storage ${diag.ok ? "looks available" : "may be blocked"} · ${counts.bills} bills · ${counts.spends} spends · ${counts.projects} projects · ${counts.tasks} tasks${state.savedAt ? ` · last saved ${escapeHtml(state.savedAt)}` : ""}.</p>
        <p class="helper-note">Nothing is uploaded to a planner account. Safari and some browsers may clear site data after inactivity — keep JSON backups somewhere private.</p>
        <div class="restart-actions">
          <button class="button button-primary" type="button" data-action="download-backup">Download JSON backup</button>
          <button class="button button-outline" type="button" data-action="pick-restore">Choose backup to restore</button>
        </div>
      </section>
      <section class="form-card tone-lavender">
        <div class="form-card-heading"><span class="tone-mark"></span><h2>Safe restore</h2></div>
        <p class="card-intro">Restore validates the file, shows a short summary, and asks for confirmation before replacing data in this browser. Invalid files are rejected.</p>
      </section>
    </div>`;
}

function renderView(id) {
  if (id === "overview") return renderOverview();
  if (id === "help") return renderHelp();
  if (id === "backup") return renderBackupPage();
  if (id === "today") return renderToday();
  if (id === "month") return renderMonth();
  if (id === "year") return renderYear();
  if (id === "money") return renderMoney();
  if (id === "projects") return renderProjects();
  if (id === "wellbeing") return renderWellbeing();
  if (id === "routines") return renderRoutines();
  if (id === "goals") return renderGoals();
  return renderGenericPage(id);
}

function refreshMoneyHeroDom() {
  if (activePageId() !== "money" && activePageId() !== "today") return;
  const summary = moneySummary();
  const leftEl = document.querySelector("[data-money-left]");
  if (leftEl) leftEl.textContent = moneyText(summary.left);
  const unpaidEl = document.querySelector("[data-money-unpaid]");
  if (unpaidEl) unpaidEl.textContent = moneyText(summary.unpaid);
  const daysEl = document.querySelector("[data-money-days]");
  if (daysEl) {
    const paydayLabel = summary.payday
      ? readableDate(new Date(`${summary.payday}T12:00:00`), { weekday: "short", month: "short", day: "numeric" })
      : "";
    const daysCopy = summary.daysLeft == null
      ? "Add a next payday below when you know it."
      : summary.daysLeft > 0
        ? `${summary.daysLeft} day${summary.daysLeft === 1 ? "" : "s"} until ${paydayLabel}`
        : summary.daysLeft === 0
          ? `Payday is today (${paydayLabel})`
          : "Payday date has passed · update it when you can";
    const perDayCopy = summary.perDay != null
      ? ` · about ${moneyText(summary.perDay)} / day if you smooth it`
      : "";
    daysEl.textContent = `${daysCopy}${perDayCopy}`;
  }
  const nextEl = document.querySelector("[data-money-next]");
  if (nextEl) {
    nextEl.textContent = summary.nextBill
      ? `${summary.nextBill.bill.name || "A bill"} is next${summary.nextBill.bill.due ? ` · ${relativeDueLabel(summary.nextBill.bill.due, summary.today)}` : ""}`
      : "No unpaid bills with dates yet";
  }
  const billSummary = document.querySelector("[data-bill-summary]");
  if (billSummary) {
    billSummary.textContent = summary.unpaidCount
      ? `${summary.unpaidCount} still to pay · ${moneyText(summary.unpaid)}${summary.nextBill ? ` · next: ${summary.nextBill.bill.name || "bill"} (${relativeDueLabel(summary.nextBill.bill.due, summary.today)})` : ""}`
      : "No unpaid bills right now. Add one only if it helps.";
  }
  const figure = document.querySelector(".today-money-figure");
  if (figure) {
    figure.textContent = summary.left == null
      ? "Add available money on Money & bills when you want a stretch number."
      : `${summary.label} ≈ ${moneyText(summary.left)}${summary.perDay != null ? ` · ~${moneyText(summary.perDay)}/day` : ""}`;
  }
}

function updateSaveStatus(saved = true) {
  if (!saved) {
    saveStatus.textContent = "Could not save here · download a backup";
    saveStatus.classList.add("is-warning");
    return;
  }
  saveStatus.classList.remove("is-warning");
  saveStatus.textContent = state.savedAt
    ? `Saved ${new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(state.savedAt))}`
    : "Saved on this device";
}

function persist() {
  updateSaveStatus(saveState(state));
}

function announce(message) {
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { toast.hidden = true; }, 2800);
}

function renderPage({ moveFocus = false } = {}) {
  const id = activePageId();
  updateNavigation(id);
  todayLabel.textContent = readableDate();
  renderEditionBanner();
  content.innerHTML = renderView(id);
  content.setAttribute("aria-busy", "false");
  document.title = `${pageDefinitions[id]?.title || "Overview"} · The Calm ADHD Planner`;
  renderQuickCaptureList();
  maybeNotifyDueBills();
  if (moveFocus) {
    requestAnimationFrame(() => content.querySelector("h1")?.focus({ preventScroll: true }));
  }
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() || `entry-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function removeAt(list, index) {
  if (!Array.isArray(list) || index < 0 || index >= list.length) return;
  list.splice(index, 1);
}

function handleInput(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  if (target.matches("[data-calendar-note]")) {
    state.calendarNotes[target.dataset.calendarNote] = target.value;
    persist();
    document.querySelectorAll(`[data-calendar-day="${target.dataset.calendarNote}"]`).forEach((day) => {
      day.classList.toggle("has-note", Boolean(target.value.trim()));
    });
    return;
  }

  if (target.matches("[data-year-note]")) {
    state.yearNotes[String(target.dataset.yearNote)] = target.value;
    persist();
    return;
  }

  if (target.matches("[data-checkin]")) {
    const { checkin, field } = target.dataset;
    state.checkins[checkin] ||= {};
    state.checkins[checkin][field] = target.value;
    persist();
    return;
  }

  if (target.matches("[data-routine-name]")) {
    state.habits.names[Number(target.dataset.routineName)] = target.value;
    persist();
    return;
  }

  if (target.matches("[data-habit-day]")) {
    const day = target.dataset.habitDay;
    const index = Number(target.dataset.habitIndex);
    state.habits.checks[day] ||= {};
    state.habits.checks[day][index] = target.checked;
    persist();
    return;
  }

  if (target.matches("[data-setting-text]")) {
    state.settings[target.dataset.settingText] = target.value;
    persist();
    refreshMoneyHeroDom();
    return;
  }

  if (target.matches("[data-list]")) {
    const list = target.dataset.list;
    const index = Number(target.dataset.index);
    const key = target.dataset.field;
    const collection = state[list];
    if (!Array.isArray(collection) || !collection[index]) return;
    collection[index][key] = target.type === "checkbox" ? target.checked : target.value;
    persist();
    if (list === "bills" || list === "spends") refreshMoneyHeroDom();
    return;
  }

  if (target.matches("[data-section][data-field]")) {
    const section = ensureSection(target.dataset.section);
    section[target.dataset.field] = target.value;
    persist();
    if (target.dataset.section === "money") refreshMoneyHeroDom();
  }
}

function handleChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (target.matches("[data-setting]")) {
    const setting = target.dataset.setting;
    if (setting === "calendarMonth" || setting === "calendarYear") state.settings[setting] = Number(target.value);
    else state.settings[setting] = target.value;
    if (setting === "calendarMonth" || setting === "calendarYear") state.settings.selectedDate = "";
    persist();
    renderPage();
    return;
  }
  if (target.matches("[data-setting-bool]")) {
    state.settings[target.dataset.settingBool] = target.checked;
    persist();
    renderPage();
    return;
  }
  if (target.matches("[data-setting-nudge]")) {
    state.settings.spendNudgeDone = target.checked ? localIsoDate() : "";
    persist();
    return;
  }
  if (target.matches("select, input[type=checkbox], input[type=date], input[type=number]")) {
    handleInput(event);
    if (target.matches("[data-list][data-field='due'], [data-list][data-field='paid']")) renderPage();
  }
}

function addSpend({ amount, note = "", date = localIsoDate() }) {
  if (!state.spends) state.spends = [];
  const parsed = parseMoney(amount);
  if (parsed == null) {
    announce("Add an amount to log a spend.");
    return false;
  }
  state.spends.unshift({
    id: makeId(),
    date: date || localIsoDate(),
    amount: String(amount).trim(),
    note: String(note || "").trim(),
  });
  persist();
  return true;
}

function handleClick(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const button = target.closest("[data-action]");
  if (button) {
    const index = Number(button.dataset.index);
    if (button.dataset.action === "add-bill") {
      if (!canAdd(edition, "bills", state.bills.length)) { announce("Demo limit reached for bills. Full edition removes caps."); return; }
      state.bills.push({ id: makeId(), due: "", name: "", amount: "", paid: false, recurring: "once", dueDay: "" });
    }
    if (button.dataset.action === "remove-bill") removeAt(state.bills, index);
    if (button.dataset.action === "add-debt") {
      if (!canAdd(edition, "debts", state.debts.length)) { announce("Demo limit reached for debts."); return; }
      state.debts.push({ id: makeId(), name: "", balance: "", payment: "" });
    }
    if (button.dataset.action === "remove-debt") removeAt(state.debts, index);
    if (button.dataset.action === "add-task") {
      if (!canAdd(edition, "tasks", state.tasks.length)) { announce("Demo limit reached for tasks."); return; }
      state.tasks.push({ id: makeId(), text: "", due: localIsoDate(), done: false });
    }
    if (button.dataset.action === "remove-task") removeAt(state.tasks, index);
    if (button.dataset.action === "remove-capture") removeAt(state.quickCapture, index);
    if (button.dataset.action === "promote-capture") {
      const item = state.quickCapture[index];
      if (item) {
        state.tasks.push({ id: makeId(), text: item.text || "", due: localIsoDate(), done: false });
        removeAt(state.quickCapture, index);
        announce("Moved into today’s checklist.");
      }
    }
    if (button.dataset.action === "download-backup") { downloadBackup(); return; }
    if (button.dataset.action === "pick-restore") { importFile.click(); return; }
    if (button.dataset.action === "toggle-bill-paid") {
      if (state.bills[index]) state.bills[index].paid = !state.bills[index].paid;
    }
    if (button.dataset.action === "add-spend") {
      /* handled by form */
    }
    if (button.dataset.action === "remove-spend") removeAt(state.spends, index);
    if (button.dataset.action === "spend-chip") {
      const amountInput = document.querySelector("#spendQuickAmount");
      if (amountInput) {
        const current = parseMoney(amountInput.value) ?? 0;
        amountInput.value = String(current + Number(button.dataset.amount || 0));
        amountInput.focus();
      }
      return;
    }
    if (button.dataset.action === "add-project") state.projects.push({ id: makeId(), name: "", target: "", why: "", help: "", next: "", stuck: "", reward: "" });
    if (button.dataset.action === "remove-project") removeAt(state.projects, index);
    if (button.dataset.action === "add-milestone") state.milestones.push({ id: makeId(), text: "", done: false });
    if (button.dataset.action === "remove-milestone") removeAt(state.milestones, index);
    if (
      button.dataset.action.startsWith("add-")
      || button.dataset.action.startsWith("remove-")
      || button.dataset.action === "toggle-bill-paid"
    ) {
      persist();
      renderPage();
      return;
    }
  }

  const dayButton = target.closest("[data-calendar-day]");
  if (dayButton) {
    state.settings.selectedDate = dayButton.dataset.calendarDay;
    renderPage();
    document.querySelector("#calendarNote")?.focus({ preventScroll: true });
    return;
  }

  const monthButton = target.closest("[data-year-month]");
  if (monthButton) {
    state.settings.selectedYearMonth = Number(monthButton.dataset.yearMonth);
    persist();
    renderPage();
    document.querySelector("#yearNote")?.focus({ preventScroll: true });
  }
}

function handleSubmit(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || !form.matches("[data-spend-form]")) return;
  event.preventDefault();
  const data = new FormData(form);
  if (!addSpend({ amount: data.get("amount"), note: data.get("note"), date: data.get("date") })) return;
  renderPage();
  announce("Spend logged.");
  document.querySelector("#spendQuickAmount")?.focus({ preventScroll: true });
}

function downloadBackup() {
  const backup = createBackup(state, { edition });
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `calm-adhd-planner-backup-${localIsoDate()}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  announce("Backup downloaded. Keep it somewhere you can find it.");
}

async function restoreBackup(file) {
  if (!file) return;
  try {
    const restored = parseBackup(await file.text());
    const summary = [
      `${(restored.bills || []).length} bills`,
      `${(restored.spends || []).length} spends`,
      `${(restored.projects || []).length} projects`,
      `version ${restored.version}`,
    ].join(", ");
    const replace = window.confirm(`Restore this backup and replace data in this browser?\n\nIncoming: ${summary}\n\nDownload a backup first if you are unsure.`);
    if (!replace) return;
    state = restored;
    if (!Array.isArray(state.debts)) state.debts = [];
    if (!Array.isArray(state.tasks)) state.tasks = [];
    if (!Array.isArray(state.quickCapture)) state.quickCapture = [];
    persist();
    renderPage();
    announce("Backup restored in this browser.");
  } catch (error) {
    announce(error instanceof Error ? error.message : "That backup could not be opened.");
  } finally {
    importFile.value = "";
  }
}

renderNavigation();
if (!location.hash) history.replaceState(null, "", `${location.pathname}${location.search}#/overview`);
renderPage();
document.addEventListener("input", handleInput);
document.addEventListener("change", handleChange);
document.addEventListener("click", handleClick);
document.addEventListener("submit", handleSubmit);
document.addEventListener("click", (event) => {
  const link = event.target instanceof Element ? event.target.closest('a[href^="#/"]') : null;
  if (link) focusAfterRoute = true;
});
window.addEventListener("hashchange", () => {
  renderPage({ moveFocus: focusAfterRoute });
  focusAfterRoute = false;
});
mobileNav.addEventListener("change", () => setRoute(mobileNav.value));
document.querySelector("#exportButton").addEventListener("click", downloadBackup);
document.querySelector("#importButton").addEventListener("click", () => importFile.click());
importFile.addEventListener("change", () => restoreBackup(importFile.files?.[0]));

document.querySelector("#reminderButton")?.addEventListener("click", () => toggleReminders());
document.querySelector("#quickCaptureForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.querySelector("#quickCaptureInput");
  const text = String(input?.value || "").trim();
  if (!text) return;
  if (!canAdd(edition, "quickCapture", state.quickCapture.length)) {
    announce("Demo limit reached for quick capture.");
    return;
  }
  state.quickCapture.unshift({ id: makeId(), text, at: new Date().toISOString() });
  if (input) input.value = "";
  persist();
  renderQuickCaptureList();
  announce("Parked in quick capture.");
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {
    /* Offline shell unavailable — ignore silently */
  });
}

