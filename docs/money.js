/** Pure money helpers — no DOM. Used by the app and by Node tests. */

export function parseMoney(value) {
  if (value == null || value === "") return null;
  const cleaned = String(value).replace(/[^0-9.,-]/g, "").replace(/,/g, "");
  if (!cleaned || cleaned === "-" || cleaned === "." || cleaned === "-.") return null;
  const amount = Number.parseFloat(cleaned);
  return Number.isFinite(amount) ? amount : null;
}

export function formatMoney(amount, locale = undefined, currencyCode = "") {
  if (amount == null || !Number.isFinite(amount)) return "—";
  if (currencyCode) {
    try {
      return new Intl.NumberFormat(locale, { style: "currency", currency: currencyCode, maximumFractionDigits: 2 }).format(amount);
    } catch {
      /* fall through */
    }
  }
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
}

export function daysBetween(fromIso, toIso) {
  if (!fromIso || !toIso) return null;
  const start = new Date(`${fromIso}T12:00:00`);
  const end = new Date(`${toIso}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

export function sumAmounts(items, amountKey = "amount", predicate = () => true) {
  return (items || []).reduce((sum, item) => {
    if (!predicate(item)) return sum;
    const amount = parseMoney(item?.[amountKey]);
    return amount == null ? sum : sum + amount;
  }, 0);
}

export function unpaidBillsTotal(bills) {
  return sumAmounts(bills, "amount", (bill) => !bill?.paid);
}

export function totalSpends(spends) {
  return sumAmounts(spends, "amount");
}

export function totalDebts(debts) {
  return sumAmounts(debts, "balance");
}

/**
 * Stretch left = available - setAside - unpaidBills - spends (+ optional paycheck not added to "left" until it lands).
 * Paycheck is informational for planning unless `includePaycheck` is true.
 */
export function computeStretch({
  available,
  setAside = 0,
  bills = [],
  spends = [],
  paycheck = null,
  includePaycheck = false,
}) {
  const avail = parseMoney(available);
  if (avail == null) {
    return { left: null, unpaid: unpaidBillsTotal(bills), spent: totalSpends(spends), setAside: parseMoney(setAside) ?? 0, paycheck: parseMoney(paycheck) };
  }
  const aside = parseMoney(setAside) ?? 0;
  const unpaid = unpaidBillsTotal(bills);
  const spent = totalSpends(spends);
  const pay = parseMoney(paycheck) ?? 0;
  const left = avail - aside - unpaid - spent + (includePaycheck ? pay : 0);
  return { left, unpaid, spent, setAside: aside, paycheck: parseMoney(paycheck), available: avail };
}

export function perDayAmount(left, daysLeft) {
  if (left == null || daysLeft == null || daysLeft <= 0) return null;
  return left / daysLeft;
}

export function savingsProgress({ saved, target, byIso, todayIso }) {
  const targetN = parseMoney(target);
  const savedN = parseMoney(saved) ?? 0;
  if (targetN == null && savedN === 0) return null;
  const remaining = targetN == null ? null : Math.max(targetN - savedN, 0);
  const daysLeft = byIso && todayIso ? daysBetween(todayIso, byIso) : null;
  const monthsLeft = daysLeft != null && daysLeft > 0 ? daysLeft / 30.44 : null;
  const perMonth = remaining != null && monthsLeft != null && monthsLeft > 0 ? remaining / monthsLeft : null;
  const progress = targetN != null && targetN > 0 ? Math.min(100, Math.max(0, (savedN / targetN) * 100)) : 0;
  return { saved: savedN, target: targetN, remaining, perMonth, progress, daysLeft };
}

/** Next due date for a recurring monthly bill anchored on day-of-month. */
export function nextMonthlyDue(fromIso, dayOfMonth) {
  const day = Number(dayOfMonth);
  if (!fromIso || !Number.isInteger(day) || day < 1 || day > 31) return null;
  const from = new Date(`${fromIso}T12:00:00`);
  if (Number.isNaN(from.getTime())) return null;
  let year = from.getFullYear();
  let month = from.getMonth();
  const tryDate = (y, m, d) => {
    const last = new Date(y, m + 1, 0).getDate();
    return new Date(y, m, Math.min(d, last), 12);
  };
  let candidate = tryDate(year, month, day);
  if (candidate < from) {
    month += 1;
    if (month > 11) { month = 0; year += 1; }
    candidate = tryDate(year, month, day);
  }
  const iso = new Date(candidate.getTime() - candidate.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  return iso;
}

export function effectiveBillDue(bill, todayIso) {
  if (bill?.due) return bill.due;
  if (bill?.recurring === "monthly" && bill?.dueDay) {
    return nextMonthlyDue(todayIso, Number(bill.dueDay));
  }
  return "";
}
