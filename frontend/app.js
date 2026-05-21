const WEEKDAYS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
const WEEKDAYS_SUNDAY_FIRST = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
const MONTHS = [
  "",
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const LESSON = {
  title: "Estudio",
  deck: [
    {
      key: "axis",
      title: "Eje",
      body: "Cada ano tiene un dia ancla. Varias fechas del ano caen en ese mismo dia.",
      chips: ["ano", "mes", "mod 7"],
    },
    {
      key: "pairs",
      title: "Pares",
      body: "4/4, 6/6, 8/8, 10/10 y 12/12 comparten el ancla del ano.",
      chips: ["4/4", "6/6", "8/8", "10/10", "12/12"],
    },
    {
      key: "odd",
      title: "Impares",
      body: "9/5, 5/9, 11/7 y 7/11 son las fechas raras que necesitas memorizar.",
      chips: ["9/5", "5/9", "11/7", "7/11"],
    },
    {
      key: "janfeb",
      title: "Inicio",
      body: "Enero usa 3 o 4. Febrero usa 28 o 29. Cambia si el ano es bisiesto.",
      chips: ["ene 3/4", "feb 28/29"],
    },
    {
      key: "move",
      title: "Salto",
      body: "Resta la fecha ancla del mes. Reduce el resultado con modulo 7. Avanza esos dias.",
      chips: ["resta", "mod 7", "avanza"],
    },
  ],
  anchors: [
    { month: "ene", normal: "3", leap: "4" },
    { month: "feb", normal: "28", leap: "29" },
    { month: "mar", normal: "14", leap: "14" },
    { month: "abr", normal: "4", leap: "4" },
    { month: "may", normal: "9", leap: "9" },
    { month: "jun", normal: "6", leap: "6" },
    { month: "jul", normal: "11", leap: "11" },
    { month: "ago", normal: "8", leap: "8" },
    { month: "sep", normal: "5", leap: "5" },
    { month: "oct", normal: "10", leap: "10" },
    { month: "nov", normal: "7", leap: "7" },
    { month: "dic", normal: "12", leap: "12" },
  ],
};

const state = {
  tab: "study",
  lesson: null,
  progress: null,
  challenge: null,
  yearChallenge: null,
  level: "base",
  yearLevel: "base",
  challengeStartedAt: performance.now(),
  yearStartedAt: performance.now(),
  studyStartedAt: performance.now(),
  timerId: null,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const staticMode =
  new URLSearchParams(location.search).has("static") ||
  location.hostname.endsWith("github.io") ||
  location.protocol === "file:";

const api = async (path, options = {}) => {
  if (staticMode) {
    return staticApi(path, options);
  }

  try {
    const response = await fetch(path, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Error");
    }
    return payload;
  } catch (error) {
    if (String(path).startsWith("/api/")) {
      return staticApi(path, options);
    }
    throw error;
  }
};

const titleCase = (value) => {
  if (!value) return "--";
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const seconds = (ms) => {
  if (!ms) return "--";
  return `${(ms / 1000).toFixed(1)}s`;
};

const localDateIso = (value = new Date()) => {
  const offset = value.getTimezoneOffset() * 60000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 10);
};

const todayIso = () => localDateIso();

const toast = (message) => {
  const node = $("#toast");
  node.textContent = message;
  node.classList.add("is-visible");
  window.clearTimeout(Number(node.dataset.timer || 0));
  node.dataset.timer = String(
    window.setTimeout(() => {
      node.classList.remove("is-visible");
    }, 2200),
  );
};

const setTab = (tab) => {
  state.tab = tab;
  $$(".tab").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tab === tab);
  });
  $$(".view").forEach((view) => {
    view.classList.toggle("is-active", view.id === `view-${tab}`);
  });
};

const renderProgress = () => {
  const progress = state.progress || {};
  $("#metric-accuracy").textContent = `${progress.accuracy || 0}%`;
  $("#metric-streak").textContent = progress.streak || 0;
  $("#metric-total").textContent = `${progress.attempts || 0} intentos`;
  $("#metric-correct").textContent = progress.correct || 0;
  $("#metric-best").textContent = seconds(progress.bestMs);
  $("#metric-average").textContent = seconds(progress.avgCorrectMs);
  $("#metric-study").textContent = `${progress.studyMinutes || 0}m`;

  const recent = progress.recent || [];
  $("#recent-list").innerHTML = recent.length
    ? recent
        .map(
          (item) => {
            const label = item.kind === "year" ? item.year || item.date : item.date;
            return `
            <article class="recent-item">
              <b>${label} - ${titleCase(item.answer)}</b>
              <span class="${item.correct ? "ok" : ""}">${item.correct ? "ok" : "no"}</span>
            </article>
          `;
          },
        )
        .join("")
    : `<article class="recent-item"><b>Sin intentos</b><span>--</span></article>`;
};

const renderLesson = () => {
  if (!state.lesson) return;
  const accents = ["#c9462c", "#24736f", "#c8a33a", "#384d91", "#2f7659"];
  $("#lesson-cards").innerHTML = state.lesson.deck
    .map(
      (card, index) => `
        <article class="lesson-card" style="--accent:${accents[index % accents.length]}">
          <div>
            <p class="eyebrow">${String(index + 1).padStart(2, "0")}</p>
            <h2>${card.title}</h2>
          </div>
          <p>${card.body}</p>
          <div class="chip-row">
            ${card.chips.map((chip) => `<span class="chip">${chip}</span>`).join("")}
          </div>
        </article>
      `,
    )
    .join("");

  $("#anchor-grid").innerHTML = state.lesson.anchors
    .map(
      (anchor) => `
        <div class="anchor-cell">
          <span>${anchor.month}</span>
          <b>${anchor.normal}</b>
          <small>${anchor.leap === anchor.normal ? "" : `bis ${anchor.leap}`}</small>
        </div>
      `,
    )
    .join("");
};

const renderAnalysis = (analysis) => {
  $("#analysis-weekday").textContent = titleCase(analysis.weekday);
  $("#analysis-anchor").textContent = `${analysis.anchorLabel} - ${titleCase(analysis.anchorWeekday)}`;
  $("#analysis-delta").textContent = `${analysis.deltaDays} dias`;
  $("#analysis-mod").textContent = analysis.deltaMod;
  $("#anchor-mode").textContent = analysis.leapYear ? "bisiesto" : "normal";
};

const analyzeCurrentDate = async () => {
  const value = $("#study-date").value || todayIso();
  const analysis = await api(`/api/date/analyze?date=${encodeURIComponent(value)}`);
  renderAnalysis(analysis);
};

const loadProgress = async () => {
  state.progress = await api("/api/progress");
  renderProgress();
};

const loadChallenge = async () => {
  const seed = Date.now();
  const payload = await api(
    `/api/practice/challenge?level=${encodeURIComponent(state.level)}&count=1&seed=${seed}`,
  );
  state.challenge = payload.challenges[0];
  state.challengeStartedAt = performance.now();
  renderChallenge();
  renderResult(null);
};

const renderChallenge = () => {
  const challenge = state.challenge;
  if (!challenge) return;
  $("#challenge-level").textContent = state.level;
  $("#challenge-date").textContent = challenge.label;
  $("#answer-grid").innerHTML = challenge.options
    .map(
      (option) => `
        <button type="button" data-answer="${option}">
          ${titleCase(option)}
        </button>
      `,
    )
    .join("");
};

const renderResult = (payload, selected = "") => {
  const stateNode = $("#result-state");
  const word = $("#result-word");
  const steps = $("#result-steps");

  if (!payload) {
    stateNode.textContent = "listo";
    word.textContent = "--";
    steps.innerHTML = "";
    return;
  }

  stateNode.textContent = payload.correct ? "bien" : "fallo";
  word.textContent = titleCase(payload.correctWeekday);
  steps.innerHTML = payload.analysis.steps.map((step) => `<li>${step}</li>`).join("");

  $$("#answer-grid button").forEach((button) => {
    const answer = button.dataset.answer;
    button.disabled = true;
    button.classList.toggle("is-correct", answer === payload.correctWeekday);
    button.classList.toggle("is-wrong", answer === selected && !payload.correct);
  });
};

const answerChallenge = async (answer) => {
  if (!state.challenge) return;
  const elapsedMs = Math.round(performance.now() - state.challengeStartedAt);
  const payload = await api("/api/practice/attempt", {
    method: "POST",
    body: JSON.stringify({
      date: state.challenge.date,
      answer,
      elapsedMs,
      level: state.level,
    }),
  });
  state.progress = payload.progress;
  renderResult(payload, answer);
  renderProgress();
};

const setLevel = async (level) => {
  state.level = level;
  $$("#date-levels button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.level === level);
  });
  await loadChallenge();
};

const loadYearChallenge = async () => {
  const seed = Date.now();
  const payload = await api(
    `/api/year/challenge?level=${encodeURIComponent(state.yearLevel)}&count=1&seed=${seed}`,
  );
  state.yearChallenge = payload.challenges[0];
  state.yearStartedAt = performance.now();
  renderYearChallenge();
  renderYearResult(null);
};

const renderYearChallenge = () => {
  const challenge = state.yearChallenge;
  if (!challenge) return;
  $("#year-level").textContent = state.yearLevel;
  $("#year-value").textContent = challenge.label;
  $("#year-answer-grid").innerHTML = challenge.options
    .map(
      (option) => `
        <button type="button" data-year-answer="${option}">
          ${titleCase(option)}
        </button>
      `,
    )
    .join("");
};

const renderYearFormula = (analysis = null) => {
  $("#year-century").textContent = analysis ? `${analysis.century} - ${titleCase(analysis.centuryAnchor)}` : "--";
  $("#year-tail").textContent = analysis ? analysis.yearPart : "--";
  $("#year-jump").textContent = analysis ? `${analysis.yearPart} + ${analysis.leapCount} = ${analysis.jump}` : "--";
  $("#year-mod").textContent = analysis ? analysis.jumpMod : "--";
};

const renderYearResult = (payload, selected = "") => {
  const stateNode = $("#year-result-state");
  const word = $("#year-result-word");
  const steps = $("#year-result-steps");

  if (!payload) {
    stateNode.textContent = "listo";
    word.textContent = "--";
    steps.innerHTML = "";
    renderYearFormula(null);
    return;
  }

  stateNode.textContent = payload.correct ? "bien" : "fallo";
  word.textContent = titleCase(payload.correctWeekday);
  steps.innerHTML = payload.analysis.steps.map((step) => `<li>${step}</li>`).join("");
  renderYearFormula(payload.analysis);

  $$("#year-answer-grid button").forEach((button) => {
    const answer = button.dataset.yearAnswer;
    button.disabled = true;
    button.classList.toggle("is-correct", answer === payload.correctWeekday);
    button.classList.toggle("is-wrong", answer === selected && !payload.correct);
  });
};

const answerYearChallenge = async (answer) => {
  if (!state.yearChallenge) return;
  const elapsedMs = Math.round(performance.now() - state.yearStartedAt);
  const payload = await api("/api/year/attempt", {
    method: "POST",
    body: JSON.stringify({
      year: state.yearChallenge.year,
      answer,
      elapsedMs,
      level: state.yearLevel,
    }),
  });
  state.progress = payload.progress;
  renderYearResult(payload, answer);
  renderProgress();
};

const setYearLevel = async (level) => {
  state.yearLevel = level;
  $$("#year-levels button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.yearLevel === level);
  });
  await loadYearChallenge();
};

const recordStudy = async () => {
  const minutes = Math.max(1, Math.round((performance.now() - state.studyStartedAt) / 60000));
  const payload = await api("/api/progress/study", {
    method: "POST",
    body: JSON.stringify({ lessonKey: "estudio", minutes, completed: true }),
  });
  state.progress = payload.progress;
  state.studyStartedAt = performance.now();
  renderProgress();
  toast("Sesion guardada");
};

const wireEvents = () => {
  $$(".tab").forEach((button) => {
    button.addEventListener("click", () => setTab(button.dataset.tab));
  });

  $("#analyze-date").addEventListener("click", () => {
    analyzeCurrentDate().catch((error) => toast(error.message));
  });

  $("#study-date").addEventListener("change", () => {
    analyzeCurrentDate().catch((error) => toast(error.message));
  });

  $("#study-done").addEventListener("click", () => {
    recordStudy().catch((error) => toast(error.message));
  });

  $("#date-levels").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-level]");
    if (button) {
      setLevel(button.dataset.level).catch((error) => toast(error.message));
    }
  });

  $("#year-levels").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-year-level]");
    if (button) {
      setYearLevel(button.dataset.yearLevel).catch((error) => toast(error.message));
    }
  });

  $("#answer-grid").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-answer]");
    if (button && !button.disabled) {
      answerChallenge(button.dataset.answer).catch((error) => toast(error.message));
    }
  });

  $("#year-answer-grid").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-year-answer]");
    if (button && !button.disabled) {
      answerYearChallenge(button.dataset.yearAnswer).catch((error) => toast(error.message));
    }
  });

  $("#next-challenge").addEventListener("click", () => {
    loadChallenge().catch((error) => toast(error.message));
  });

  $("#skip-challenge").addEventListener("click", () => {
    loadChallenge().catch((error) => toast(error.message));
  });

  $("#next-year").addEventListener("click", () => {
    loadYearChallenge().catch((error) => toast(error.message));
  });

  $("#skip-year").addEventListener("click", () => {
    loadYearChallenge().catch((error) => toast(error.message));
  });
};

const startTimer = () => {
  state.timerId = window.setInterval(() => {
    const elapsed = performance.now() - state.challengeStartedAt;
    $("#challenge-timer").textContent = `${(elapsed / 1000).toFixed(1)}s`;
    const yearElapsed = performance.now() - state.yearStartedAt;
    $("#year-timer").textContent = `${(yearElapsed / 1000).toFixed(1)}s`;
  }, 120);
};

const init = async () => {
  wireEvents();
  $("#study-date").value = todayIso();
  const [lesson] = await Promise.all([
    api("/api/lesson"),
    loadProgress(),
    loadChallenge(),
    loadYearChallenge(),
  ]);
  state.lesson = lesson;
  renderLesson();
  await analyzeCurrentDate();
  startTimer();
};

const parseIsoDate = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  if (!match) {
    throw new Error("Fecha invalida. Usa YYYY-MM-DD.");
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (month < 1 || month > 12 || day < 1 || day > maxDay) {
    throw new Error("Fecha invalida. Usa YYYY-MM-DD.");
  }
  return { year, month, day };
};

const isoFromParts = ({ year, month, day }) =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const dateLabel = ({ year, month, day }) => `${day} ${MONTHS[month]} ${year}`;

const isLeapYear = (year) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

const weekdayForParts = ({ year, month, day }) =>
  WEEKDAYS_SUNDAY_FIRST[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];

const doomsdayDayForMonth = (year, month) => {
  if (month === 1) return isLeapYear(year) ? 4 : 3;
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return { 3: 14, 4: 4, 5: 9, 6: 6, 7: 11, 8: 8, 9: 5, 10: 10, 11: 7, 12: 12 }[month];
};

const doomsdayForYear = (year) => new Date(Date.UTC(year, 2, 14)).getUTCDay();

const parseYear = (value) => {
  const year = Number(value);
  if (!Number.isInteger(year)) {
    throw new Error("Ano invalido.");
  }
  if (year < 1600 || year > 9999) {
    throw new Error("Usa un ano entre 1600 y 9999.");
  }
  return year;
};

const diffDays = (a, b) =>
  Math.round(
    (Date.UTC(a.year, a.month - 1, a.day) - Date.UTC(b.year, b.month - 1, b.day)) /
      86400000,
  );

const mod = (value, size = 7) => ((value % size) + size) % size;

const analyzeDateStatic = (isoDate) => {
  const target = parseIsoDate(isoDate);
  const anchorDay = doomsdayDayForMonth(target.year, target.month);
  const anchor = { year: target.year, month: target.month, day: anchorDay };
  const anchorWeekdayIndex = doomsdayForYear(target.year);
  const deltaDays = diffDays(target, anchor);
  const deltaMod = mod(deltaDays);
  const calculatedWeekday = WEEKDAYS_SUNDAY_FIRST[(anchorWeekdayIndex + deltaMod) % 7];
  const weekday = weekdayForParts(target);

  return {
    isoDate: isoFromParts(target),
    label: dateLabel(target),
    weekday,
    weekdayIndex: WEEKDAYS.indexOf(weekday),
    anchorDate: isoFromParts(anchor),
    anchorLabel: dateLabel(anchor),
    anchorWeekday: WEEKDAYS_SUNDAY_FIRST[anchorWeekdayIndex],
    deltaDays,
    deltaMod,
    leapYear: isLeapYear(target.year),
    calculatedWeekday,
    steps: [
      `Ancla del ano: ${WEEKDAYS_SUNDAY_FIRST[anchorWeekdayIndex]}`,
      `Ancla del mes: ${anchor.day} ${MONTHS[anchor.month]}`,
      `Diferencia: ${deltaDays} dias`,
      `Modulo 7: ${deltaMod}`,
    ],
  };
};

const analyzeYearStatic = (value) => {
  const year = parseYear(value);
  const century = year - (year % 100);
  const yearPart = year % 100;
  const leapCount = Math.floor(yearPart / 4);
  const jump = yearPart + leapCount;
  const jumpMod = mod(jump);
  const centuryAnchorIndex = doomsdayForYear(century);
  const anchorIndex = doomsdayForYear(year);
  const calculatedIndex = (centuryAnchorIndex + jumpMod) % 7;

  return {
    year,
    label: String(year),
    anchorWeekday: WEEKDAYS_SUNDAY_FIRST[anchorIndex],
    anchorIndex,
    century,
    centuryAnchor: WEEKDAYS_SUNDAY_FIRST[centuryAnchorIndex],
    yearPart,
    leapCount,
    jump,
    jumpMod,
    leapYear: isLeapYear(year),
    calculatedWeekday: WEEKDAYS_SUNDAY_FIRST[calculatedIndex],
    steps: [
      `Siglo ${century}: ${WEEKDAYS_SUNDAY_FIRST[centuryAnchorIndex]}`,
      `Final del ano: ${yearPart}`,
      `Bisiestos: ${yearPart} // 4 = ${leapCount}`,
      `Salto: ${yearPart} + ${leapCount} = ${jump}`,
      `Modulo 7: ${jumpMod}`,
      `Ancla: ${WEEKDAYS_SUNDAY_FIRST[calculatedIndex]}`,
    ],
  };
};

const normalizeWeekday = (answer) => {
  const normalized = String(answer || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!WEEKDAYS.includes(normalized)) {
    throw new Error("Dia invalido.");
  }
  return normalized;
};

const randomFromSeed = (seed) => {
  let value = Number(seed) || Date.now();
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
};

const rangeForLevel = (level) => {
  const ranges = {
    base: [2024, 2029],
    medio: [2000, 2040],
    duro: [1900, 2099],
  };
  return ranges[level] || ranges.base;
};

const yearRangeForLevel = (level) => {
  const ranges = {
    base: [2024, 2035],
    medio: [2000, 2099],
    duro: [1600, 2399],
  };
  return ranges[level] || ranges.base;
};

const shuffle = (items, random) => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
};

const generateChallengesStatic = ({ count = 1, level = "base", seed = Date.now() }) => {
  const random = randomFromSeed(seed);
  const [startYear, endYear] = rangeForLevel(level);
  const total = Math.max(1, Math.min(Number(count) || 1, 20));
  const challenges = [];

  for (let index = 0; index < total; index += 1) {
    const year = startYear + Math.floor(random() * (endYear - startYear + 1));
    const month = 1 + Math.floor(random() * 12);
    const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const day = 1 + Math.floor(random() * maxDay);
    const target = { year, month, day };
    const analysis = analyzeDateStatic(isoFromParts(target));
    const options = new Set([analysis.weekday]);

    while (options.size < 4) {
      options.add(WEEKDAYS[Math.floor(random() * WEEKDAYS.length)]);
    }

    challenges.push({
      date: isoFromParts(target),
      label: dateLabel(target),
      level,
      options: shuffle([...options], random),
    });
  }

  return { level, challenges };
};

const generateYearChallengesStatic = ({ count = 1, level = "base", seed = Date.now() }) => {
  const random = randomFromSeed(seed);
  const [startYear, endYear] = yearRangeForLevel(level);
  const total = Math.max(1, Math.min(Number(count) || 1, 20));
  const challenges = [];

  for (let index = 0; index < total; index += 1) {
    const year = startYear + Math.floor(random() * (endYear - startYear + 1));
    challenges.push({
      year,
      label: String(year),
      level,
      options: shuffle(WEEKDAYS, random),
    });
  }

  return { level, challenges };
};

const storageKey = "calendario-mental-progress-v1";

const readStore = () => {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || "{}");
  } catch {
    return {};
  }
};

const writeStore = (data) => {
  localStorage.setItem(storageKey, JSON.stringify(data));
};

const progressStatic = () => {
  const store = readStore();
  const attempts = store.attempts || [];
  const studyEvents = store.studyEvents || [];
  const correctAttempts = attempts.filter((item) => item.correct);
  const total = attempts.length;
  const correct = correctAttempts.length;
  const bestMs = correctAttempts.length
    ? Math.min(...correctAttempts.map((item) => Number(item.elapsedMs) || 0))
    : 0;
  const avgCorrectMs = correctAttempts.length
    ? Math.round(
        correctAttempts.reduce((sum, item) => sum + (Number(item.elapsedMs) || 0), 0) /
          correctAttempts.length,
      )
    : 0;
  const days = [...new Set(attempts.map((item) => String(item.createdAt).slice(0, 10)))];
  const levels = [...new Set(attempts.map((item) => item.level || "base"))].map((level) => {
    const levelAttempts = attempts.filter((item) => (item.level || "base") === level);
    const levelCorrect = levelAttempts.filter((item) => item.correct).length;
    return {
      level,
      attempts: levelAttempts.length,
      accuracy: levelAttempts.length ? Math.round((levelCorrect / levelAttempts.length) * 100) : 0,
    };
  });

  return {
    attempts: total,
    correct,
    accuracy: total ? Math.round((correct / total) * 100) : 0,
    bestMs,
    avgCorrectMs,
    streak: streakFromDays(days),
    studySessions: studyEvents.length,
    studyMinutes: studyEvents.reduce((sum, item) => sum + (Number(item.minutes) || 0), 0),
    studyCompleted: studyEvents.filter((item) => item.completed).length,
    levels,
    recent: attempts.slice(-12).reverse(),
  };
};

const streakFromDays = (days) => {
  const set = new Set(days);
  let cursor = localDateIso();
  let current = new Date(`${cursor}T12:00:00`);
  if (!set.has(cursor)) {
    current.setDate(current.getDate() - 1);
    cursor = localDateIso(current);
  }

  let streak = 0;
  while (set.has(cursor)) {
    streak += 1;
    current.setDate(current.getDate() - 1);
    cursor = localDateIso(current);
  }
  return streak;
};

const createdAtLocal = () => {
  const now = new Date();
  const date = localDateIso(now);
  return `${date}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
};

const staticApi = async (path, options = {}) => {
  const url = new URL(path, location.href);
  const body = options.body ? JSON.parse(options.body) : {};

  if (url.pathname === "/api/health") {
    return { ok: true, name: "calendario-mental-static" };
  }

  if (url.pathname === "/api/lesson") {
    return LESSON;
  }

  if (url.pathname === "/api/progress") {
    return progressStatic();
  }

  if (url.pathname === "/api/date/analyze") {
    return analyzeDateStatic(url.searchParams.get("date"));
  }

  if (url.pathname === "/api/year/analyze") {
    return analyzeYearStatic(url.searchParams.get("year"));
  }

  if (url.pathname === "/api/practice/challenge") {
    return generateChallengesStatic({
      level: url.searchParams.get("level") || "base",
      count: Number(url.searchParams.get("count") || 1),
      seed: Number(url.searchParams.get("seed") || Date.now()),
    });
  }

  if (url.pathname === "/api/year/challenge") {
    return generateYearChallengesStatic({
      level: url.searchParams.get("level") || "base",
      count: Number(url.searchParams.get("count") || 1),
      seed: Number(url.searchParams.get("seed") || Date.now()),
    });
  }

  if (url.pathname === "/api/practice/attempt") {
    const target = parseIsoDate(body.date);
    const answer = normalizeWeekday(body.answer);
    const correctAnswer = weekdayForParts(target);
    const attempt = {
      id: Date.now(),
      date: isoFromParts(target),
      answer,
      correctAnswer,
      correct: answer === correctAnswer,
      elapsedMs: Math.max(0, Number(body.elapsedMs) || 0),
      level: body.level || "base",
      createdAt: createdAtLocal(),
    };
    const store = readStore();
    store.attempts = [...(store.attempts || []), attempt].slice(-500);
    writeStore(store);

    return {
      attempt,
      correct: attempt.correct,
      correctWeekday: correctAnswer,
      analysis: analyzeDateStatic(body.date),
      progress: progressStatic(),
    };
  }

  if (url.pathname === "/api/year/attempt") {
    const year = parseYear(body.year);
    const answer = normalizeWeekday(body.answer);
    const analysis = analyzeYearStatic(year);
    const attempt = {
      id: Date.now(),
      kind: "year",
      year,
      date: String(year),
      answer,
      correctAnswer: analysis.anchorWeekday,
      correct: answer === analysis.anchorWeekday,
      elapsedMs: Math.max(0, Number(body.elapsedMs) || 0),
      level: `year:${body.level || "base"}`,
      createdAt: createdAtLocal(),
    };
    const store = readStore();
    store.attempts = [...(store.attempts || []), attempt].slice(-500);
    writeStore(store);

    return {
      attempt,
      correct: attempt.correct,
      correctWeekday: analysis.anchorWeekday,
      analysis,
      progress: progressStatic(),
    };
  }

  if (url.pathname === "/api/progress/study") {
    const event = {
      id: Date.now(),
      lessonKey: body.lessonKey || "estudio",
      minutes: Math.max(0, Number(body.minutes) || 0),
      completed: Boolean(body.completed),
      createdAt: createdAtLocal(),
    };
    const store = readStore();
    store.studyEvents = [...(store.studyEvents || []), event].slice(-500);
    writeStore(store);

    return { event, progress: progressStatic() };
  }

  throw new Error("Ruta no encontrada.");
};

init().catch((error) => {
  toast(error.message);
  console.error(error);
});
