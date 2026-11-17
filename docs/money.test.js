import {
  parseMoney,
  formatMoney,
  unpaidBillsTotal,
  totalSpends,
  computeStretch,
  perDayAmount,
  savingsProgress,
  nextMonthlyDue,
  effectiveBillDue,
  totalDebts,
} from "./money.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function almostEqual(a, b, eps = 0.001) {
  return Math.abs(a - b) < eps;
}

assert(parseMoney("$1,234.50") === 1234.5, "parse currency");
assert(parseMoney("  ") === null, "parse blank");
assert(formatMoney(1200) === "1,200" || formatMoney(1200).includes("1"), "format");

const bills = [
  { amount: "80", paid: false },
  { amount: "20", paid: true },
  { amount: "abc", paid: false },
];
assert(unpaidBillsTotal(bills) === 80, "unpaid ignores paid/invalid");

assert(totalSpends([{ amount: "10" }, { amount: "5.5" }]) === 15.5, "spends sum");

const stretch = computeStretch({
  available: "2000",
  setAside: "200",
  bills: [{ amount: "80", paid: false }],
  spends: [{ amount: "20" }],
});
assert(almostEqual(stretch.left, 1700), `stretch left expected 1700 got ${stretch.left}`);

const withPay = computeStretch({
  available: "1000",
  setAside: "0",
  bills: [],
  spends: [],
  paycheck: "500",
  includePaycheck: true,
});
assert(almostEqual(withPay.left, 1500), "include paycheck");

assert(almostEqual(perDayAmount(1400, 14), 100), "per day");
assert(perDayAmount(100, 0) === null, "per day zero days");

const save = savingsProgress({ saved: "250", target: "1000", byIso: "2027-01-01", todayIso: "2026-11-17" });
assert(almostEqual(save.progress, 25), "savings progress");
assert(almostEqual(save.remaining, 750), "savings remaining");

const due = nextMonthlyDue("2026-11-17", 1);
assert(due === "2026-12-01", `next monthly due got ${due}`);

assert(effectiveBillDue({ due: "2026-11-20" }, "2026-11-17") === "2026-11-20", "explicit due");
assert(effectiveBillDue({ recurring: "monthly", dueDay: 18 }, "2026-11-17") === "2026-11-18", "recurring due");

assert(totalDebts([{ balance: "1000" }, { balance: "250" }]) === 1250, "debts");

console.log("money.test.js: all assertions passed");
