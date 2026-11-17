export const navigationGroups = [
  {
    label: "Start",
    items: [
      { id: "overview", title: "Overview", short: "Home" },
      { id: "help", title: "Quick start & help", short: "Help" },
      { id: "backup", title: "Backup & restore", short: "Backup" },
    ],
  },
  {
    label: "Plan",
    items: [
      { id: "today", title: "Today", short: "Today" },
      { id: "week", title: "Week", short: "Week" },
      { id: "month", title: "Month", short: "Month" },
      { id: "year", title: "Year", short: "Year" },
    ],
  },
  {
    label: "Capture",
    items: [
      { id: "capture", title: "Brain dump", short: "Capture" },
      { id: "projects", title: "Projects", short: "Projects" },
    ],
  },
  {
    label: "Life",
    items: [
      { id: "home", title: "Home & errands", short: "Home" },
      { id: "meals", title: "Meals & groceries", short: "Meals" },
      { id: "money", title: "Money & bills", short: "Money" },
      { id: "wellbeing", title: "Well-being", short: "Well-being" },
      { id: "routines", title: "Routines & habits", short: "Routines" },
    ],
  },
  {
    label: "Work & reflection",
    items: [
      { id: "work", title: "Work & study", short: "Work" },
      { id: "goals", title: "Goals & milestones", short: "Goals" },
      { id: "notes", title: "Notes", short: "Notes" },
    ],
  },
];

export const allPages = navigationGroups.flatMap((group) => group.items);

export const weekDays = [
  { key: "monday", label: "Monday", short: "MON" },
  { key: "tuesday", label: "Tuesday", short: "TUE" },
  { key: "wednesday", label: "Wednesday", short: "WED" },
  { key: "thursday", label: "Thursday", short: "THU" },
  { key: "friday", label: "Friday", short: "FRI" },
  { key: "saturday", label: "Saturday", short: "SAT" },
  { key: "sunday", label: "Sunday", short: "SUN" },
];

export const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const pageDefinitions = {
  help: {
    eyebrow: "QUICK START",
    title: "Start small. Restart any time.",
    intro: "This is a support tool, not a test. Capture → choose up to three priorities → begin one tiny action.",
    groups: [],
  },
  backup: {
    eyebrow: "YOUR DATA",
    title: "Backup & restore",
    intro: "Entries stay in this browser only. A JSON backup is the copy that survives clearing storage or switching devices.",
    groups: [],
  },
  today: {
    eyebrow: "DAILY PAGE",
    title: "Today, one step at a time",
    intro: "Use as much or as little of this page as helps.",
    groups: [
      {
        title: "Start with today",
        tone: "lavender",
        fields: [
          { key: "date", label: "Date", type: "date", width: "third" },
          {
            key: "energy",
            label: "Energy",
            type: "select",
            width: "third",
            options: ["Not sure yet", "Low", "Steady", "High"],
          },
          { key: "anchor", label: "Anchor / appointment", type: "text", width: "third" },
        ],
      },
      {
        title: "Three things I could move forward",
        tone: "teal",
        fields: [
          { key: "priority1", label: "Priority 1", type: "textarea", width: "third", rows: 3 },
          { key: "priority2", label: "Priority 2", type: "textarea", width: "third", rows: 3 },
          { key: "priority3", label: "Priority 3", type: "textarea", width: "third", rows: 3 },
        ],
      },
      {
        title: "Make the start smaller",
        tone: "butter",
        fields: [{ key: "firstAction", label: "My first tiny action", type: "textarea", width: "full", rows: 2 }],
      },
      {
        title: "A loose map of the day",
        tone: "blue",
        fields: [
          { key: "morning", label: "Morning · start / do", type: "textarea", width: "third", rows: 3 },
          { key: "midday", label: "Midday · pause / do", type: "textarea", width: "third", rows: 3 },
          { key: "evening", label: "Evening · finish / reset", type: "textarea", width: "third", rows: 3 },
        ],
      },
      {
        title: "Leave room for real life",
        tone: "sage",
        fields: [
          { key: "energyShift", label: "If my energy changes, I can…", type: "textarea", width: "half", rows: 3 },
          { key: "remember", label: "Must remember / bring", type: "textarea", width: "half", rows: 3 },
          { key: "thoughts", label: "Other thoughts / brain dump", type: "textarea", width: "half", rows: 4 },
          { key: "win", label: "Done is done · one small win", type: "textarea", width: "half", rows: 4 },
        ],
      },
    ],
  },
  week: {
    eyebrow: "WEEK VIEW",
    title: "A week with room to move",
    intro: "Broad blocks and anchors are optional. Leave space between plans for transitions.",
    groups: [
      {
        title: "Set a gentle direction",
        tone: "lavender",
        fields: [
          { key: "weekOf", label: "Week of", type: "date", width: "half" },
          { key: "remember", label: "One thing to remember", type: "text", width: "half" },
          { key: "priority1", label: "Priority 1", type: "textarea", width: "third", rows: 2 },
          { key: "priority2", label: "Priority 2", type: "textarea", width: "third", rows: 2 },
          { key: "priority3", label: "Priority 3", type: "textarea", width: "third", rows: 2 },
          { key: "anchors", label: "Anchors / appointments already fixed", type: "textarea", width: "full", rows: 2 },
        ],
      },
      {
        title: "One anchor or next step per day is enough",
        tone: "teal",
        fields: weekDays.map((day) => ({
          key: day.key,
          label: day.label,
          type: "textarea",
          width: "half",
          rows: 2,
          placeholder: "One anchor · one next step",
        })),
      },
      {
        title: "Carry forward only what still matters",
        tone: "sage",
        fields: [{ key: "carryForward", label: "A note for later in the week", type: "textarea", width: "full", rows: 2 }],
      },
    ],
  },
  month: {
    eyebrow: "MONTH VIEW",
    title: "This month",
    intro: "Add dates as they arrive. Leave unused days blank. Use the focus & review when you want a small monthly reset.",
    groups: [
      {
        title: "Keep the important bits visible",
        tone: "teal",
        fields: [
          { key: "focus", label: "What matters most this month?", type: "textarea", width: "full", rows: 2 },
          { key: "keyDates", label: "Key dates / appointments", type: "textarea", width: "half", rows: 3 },
          { key: "deadlines", label: "Bills / deadlines", type: "textarea", width: "half", rows: 3 },
        ],
      },
      {
        title: "Focus & review",
        tone: "lavender",
        fields: [
          {
            key: "moveForward",
            label: "Three things I would like to move forward",
            type: "textarea",
            width: "full",
            rows: 3,
            placeholder: "Up to three is plenty — one thing is also a plan.",
          },
          {
            key: "upcoming",
            label: "Upcoming dates and commitments",
            type: "textarea",
            width: "half",
            rows: 3,
          },
          {
            key: "easier",
            label: "What would make this month easier?",
            type: "textarea",
            width: "half",
            rows: 3,
          },
          { key: "keep", label: "Keep", type: "textarea", width: "third", rows: 4, placeholder: "What still helps" },
          { key: "change", label: "Change", type: "textarea", width: "third", rows: 4, placeholder: "What to adjust" },
          { key: "letGo", label: "Let go", type: "textarea", width: "third", rows: 4, placeholder: "What can wait or drop" },
        ],
      },
    ],
  },
  year: {
    eyebrow: "BIG PICTURE",
    title: "Year at a glance",
    intro: "Add a few dates or intentions. This is a visible reminder, not a full task list.",
    groups: [],
  },
  capture: {
    eyebrow: "CAPTURE & SORT",
    title: "Brain dump",
    intro: "Get it out first. Sorting can happen later—or not at all.",
    groups: [
      {
        title: "Everything on my mind",
        tone: "white",
        fields: [{ key: "everything", label: "Capture without organizing", type: "textarea", width: "full", rows: 8 }],
      },
      {
        title: "Only sort if sorting helps",
        tone: "coral",
        fields: [
          { key: "now", label: "Now · needs attention", type: "textarea", width: "third", rows: 4 },
          { key: "next", label: "Next · soon, not now", type: "textarea", width: "third", rows: 4 },
          { key: "later", label: "Later · safe to park", type: "textarea", width: "third", rows: 4 },
          { key: "nextAction", label: "One next action I can see", type: "textarea", width: "full", rows: 2 },
        ],
      },
    ],
  },
  projects: {
    eyebrow: "PROJECT SUPPORT",
    title: "Turn a project into small steps",
    intro: "A project can stay on one page until it needs more room.",
    groups: [],
  },
  home: {
    eyebrow: "HOME & ADMIN",
    title: "Home reset & errands",
    intro: "Choose a small zone or a short list; this is not a whole-house checklist.",
    groups: [
      {
        title: "A small, visible list",
        tone: "teal",
        fields: [
          { key: "homeZone", label: "Home · choose a zone", type: "textarea", width: "half", rows: 7 },
          { key: "errands", label: "Errands / calls / admin", type: "textarea", width: "half", rows: 7 },
          { key: "tenMinuteReset", label: "A 10-minute reset could be…", type: "textarea", width: "half", rows: 4 },
          { key: "waiting", label: "Waiting / delegate / buy", type: "textarea", width: "half", rows: 4 },
        ],
      },
    ],
  },
  meals: {
    eyebrow: "FOOD & SHOPPING",
    title: "Meals & groceries",
    intro: "Plan a few easy options. Repeating a meal is allowed.",
    groups: [
      {
        title: "Meals and backups",
        tone: "teal",
        fields: [
          ...weekDays.map((day) => ({ key: `meal_${day.key}`, label: `${day.label} · meal / backup`, type: "textarea", width: "half", rows: 2 })),
          { key: "easyBackup", label: "Easy backup meal", type: "text", width: "half" },
        ],
      },
      {
        title: "Make the next shop easier",
        tone: "butter",
        fields: [
          { key: "groceries", label: "Grocery list", type: "textarea", width: "half", rows: 7 },
          { key: "prep", label: "Prep / thaw / take out", type: "textarea", width: "half", rows: 6 },
        ],
      },
    ],
  },
  money: {
    eyebrow: "MONEY & BILLS",
    title: "A calm money snapshot",
    intro: "One useful number, bills to remember, and a light spend log—not financial advice.",
    groups: [
      {
        title: "A snapshot, not a judgment",
        tone: "teal",
        fields: [
          { key: "available", label: "Money available / in checking", type: "text", width: "third", placeholder: "Type from your bank", hint: "Everything else counts down from this." },
          { key: "comingIn", label: "Coming in (optional)", type: "text", width: "third", placeholder: "Pay or other income" },
          { key: "setAside", label: "Already set aside", type: "text", width: "third", placeholder: "0 if none", hint: "Spoken-for money in checking—comes off the stretch total." },
        ],
      },
      {
        title: "This pay period",
        tone: "sage",
        fields: [
          { key: "payPeriodPriority", label: "One priority", type: "textarea", width: "half", rows: 3 },
          { key: "spendingNote", label: "Spending / money note", type: "textarea", width: "half", rows: 3 },
        ],
      },
      {
        title: "Saving toward something (optional)",
        tone: "butter",
        fields: [
          { key: "savingsName", label: "What I’m saving for", type: "text", width: "half", placeholder: "A trip, buffer, or gift" },
          { key: "savingsTarget", label: "Target amount", type: "text", width: "third", placeholder: "e.g. 1000" },
          { key: "savingsSaved", label: "Put away so far", type: "text", width: "third", placeholder: "e.g. 200" },
          { key: "savingsBy", label: "Hope to reach by", type: "date", width: "third" },
        ],
      },
    ],
  },
  wellbeing: {
    eyebrow: "WELL-BEING",
    title: "Notice what supports you",
    intro: "Optional personal check-in. Skip any measure that does not feel useful.",
    groups: [
      {
        title: "A week of noticing, not scoring",
        tone: "teal",
        fields: [
          { key: "helped", label: "Things that helped this week", type: "textarea", width: "half", rows: 4 },
          { key: "kindStep", label: "A kind next step for me", type: "textarea", width: "half", rows: 4 },
          { key: "roomFor", label: "Rest, movement, connection, or quiet I want to make room for", type: "textarea", width: "full", rows: 3 },
        ],
      },
    ],
  },
  routines: {
    eyebrow: "ROUTINES & HABITS",
    title: "Small cues, not perfect streaks",
    intro: "Choose up to three habits or routines. A blank box is information, not failure.",
    groups: [
      {
        title: "Choose cues that fit your week",
        tone: "lavender",
        fields: [
          { key: "morningAnchor", label: "Morning anchor", type: "textarea", width: "third", rows: 3 },
          { key: "middayAnchor", label: "Midday anchor", type: "textarea", width: "third", rows: 3 },
          { key: "eveningAnchor", label: "Evening anchor", type: "textarea", width: "third", rows: 3 },
        ],
      },
    ],
  },
  work: {
    eyebrow: "WORK / STUDY",
    title: "Make the next session easier to start",
    intro: "Use this page for one assignment, shift, or focused work block.",
    groups: [
      {
        title: "Know what the next session is for",
        tone: "lavender",
        fields: [
          { key: "task", label: "Task / project", type: "text", width: "half" },
          { key: "due", label: "Due / check-in date", type: "date", width: "half" },
          { key: "finishedEnough", label: "What does “finished enough” look like?", type: "textarea", width: "full", rows: 3 },
          { key: "steps", label: "Break it into small steps", type: "textarea", width: "full", rows: 8 },
          { key: "focus1", label: "Focus block 1 · task / timer", type: "textarea", width: "third", rows: 3 },
          { key: "pause", label: "Pause · stretch / reset", type: "textarea", width: "third", rows: 3 },
          { key: "focus2", label: "Focus block 2 · task / timer", type: "textarea", width: "third", rows: 3 },
          { key: "nextVisible", label: "If I lose the thread, my next visible action is…", type: "textarea", width: "full", rows: 2 },
        ],
      },
    ],
  },
  goals: {
    eyebrow: "GOALS & MILESTONES",
    title: "Make progress visible",
    intro: "Pick one goal to keep in view. Change it when your priorities change. Money savings live on Money & bills if you want numbers.",
    groups: [
      {
        title: "Keep the goal close to what matters",
        tone: "lavender",
        fields: [
          { key: "goal", label: "A goal I care about", type: "textarea", width: "full", rows: 2 },
          { key: "why", label: "Why this matters to me", type: "textarea", width: "half", rows: 3 },
          { key: "support", label: "What support / resources could help?", type: "textarea", width: "half", rows: 3 },
          { key: "nextAction", label: "Next tiny action", type: "textarea", width: "half", rows: 3 },
          { key: "celebrate", label: "How I’ll notice / celebrate progress", type: "textarea", width: "half", rows: 3 },
        ],
      },
    ],
  },
  notes: {
    eyebrow: "NOTES",
    title: "A page for whatever needs space",
    intro: "Print another copy whenever you need one. This space is yours.",
    groups: [
      {
        title: "No sorting required",
        tone: "white",
        fields: [{ key: "notes", label: "Notes", type: "textarea", width: "full", rows: 16 }],
      },
    ],
  },
};
