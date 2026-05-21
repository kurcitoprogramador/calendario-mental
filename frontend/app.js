const state = {
  tab: "study",
  lesson: null,
  progress: null,
  challenge: null,
  level: "base",
  challengeStartedAt: performance.now(),
  studyStartedAt: performance.now(),
  timerId: null,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const api = async (path, options = {}) => {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Error");
  }
  return payload;
};

const titleCase = (value) => {
  if (!value) return "--";
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const seconds = (ms) => {
  if (!ms) return "--";
  return `${(ms / 1000).toFixed(1)}s`;
};

const todayIso = () => new Date().toISOString().slice(0, 10);

const toast = (message) => {
  const node = $("#toast");
  node.textContent = message;
  node.classList.add("is-visible");
  window.clearTimeout(node.dataset.timer);
  node.dataset.timer = window.setTimeout(() => {
    node.classList.remove("is-visible");
  }, 2200);
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
          (item) => `
            <article class="recent-item">
              <b>${item.date} · ${titleCase(item.answer)}</b>
              <span class="${item.correct ? "ok" : ""}">${item.correct ? "ok" : "no"}</span>
            </article>
          `,
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
  $("#analysis-anchor").textContent = `${analysis.anchorLabel} · ${titleCase(analysis.anchorWeekday)}`;
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
  $$(".segmented button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.level === level);
  });
  await loadChallenge();
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

  $(".segmented").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-level]");
    if (button) {
      setLevel(button.dataset.level).catch((error) => toast(error.message));
    }
  });

  $("#answer-grid").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-answer]");
    if (button && !button.disabled) {
      answerChallenge(button.dataset.answer).catch((error) => toast(error.message));
    }
  });

  $("#next-challenge").addEventListener("click", () => {
    loadChallenge().catch((error) => toast(error.message));
  });

  $("#skip-challenge").addEventListener("click", () => {
    loadChallenge().catch((error) => toast(error.message));
  });
};

const startTimer = () => {
  state.timerId = window.setInterval(() => {
    const elapsed = performance.now() - state.challengeStartedAt;
    $("#challenge-timer").textContent = `${(elapsed / 1000).toFixed(1)}s`;
  }, 120);
};

const init = async () => {
  wireEvents();
  $("#study-date").value = todayIso();
  const [lesson] = await Promise.all([api("/api/lesson"), loadProgress(), loadChallenge()]);
  state.lesson = lesson;
  renderLesson();
  await analyzeCurrentDate();
  startTimer();
};

init().catch((error) => {
  toast(error.message);
  console.error(error);
});
