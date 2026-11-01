import { escapeHtml, inline, shuffle, formatClock } from "./util.js";

const KEYS = ["A", "B", "C", "D", "E", "F"];

/**
 * Runs a quiz inside `root`.
 * mode "practice": immediate correction and explanation after each answer.
 * mode "exam": no correction until the end, optional countdown that auto-submits.
 * Returns a dispose function that stops the timer and keyboard listener.
 */
export function runQuiz(root, questions, { mode, heading, timeLimitSec = null, onFinish }) {
  const isExam = mode === "exam";
  const items = shuffle(questions).map((question) => ({ question, order: shuffle(question.choices.map((_, i) => i)) }));
  const chosen = new Array(items.length).fill(null);
  let current = 0;
  let isLocked = false;
  let isFinished = false;
  let timerId = null;
  const deadline = timeLimitSec ? Date.now() + timeLimitSec * 1000 : null;

  function finish() {
    if (isFinished) return;
    isFinished = true;
    dispose();
    const answers = items.map(({ question }, i) => ({
      question,
      chosenIndex: chosen[i],
      isCorrect: chosen[i] === question.answer,
    }));
    onFinish({ answers, correct: answers.filter((a) => a.isCorrect).length, total: answers.length });
  }

  function goNext() {
    if (current < items.length - 1) {
      current += 1;
      isLocked = false;
      render();
    } else {
      finish();
    }
  }

  function choose(displayIndex) {
    if (isLocked || isFinished) return;
    const { question, order } = items[current];
    if (displayIndex >= order.length) return;
    chosen[current] = order[displayIndex];
    root.querySelectorAll(".choice").forEach((button, i) => button.setAttribute("aria-pressed", String(i === displayIndex)));
    if (!isExam) {
      isLocked = true;
      showCorrection(question, order);
    } else {
      root.querySelector("[data-next]").disabled = false;
    }
  }

  function showCorrection(question, order) {
    const isCorrect = chosen[current] === question.answer;
    root.querySelectorAll(".choice").forEach((button, i) => {
      button.disabled = true;
      if (order[i] === question.answer) {
        button.classList.add("correct");
        button.setAttribute("aria-label", `Bonne réponse : ${button.textContent.trim().slice(1).trim()}`);
      } else if (order[i] === chosen[current]) {
        button.classList.add("wrong");
        button.setAttribute("aria-label", `Mauvaise réponse : ${button.textContent.trim().slice(1).trim()}`);
      }
    });
    const feedback = root.querySelector(".feedback-slot");
    feedback.innerHTML = `
      <div class="feedback ${isCorrect ? "ok" : "ko"}" role="status">
        <b>${isCorrect ? "Bonne réponse !" : "Pas tout à fait."}</b>
        ${question.explain ? inline(question.explain) : ""}
      </div>`;
    const next = root.querySelector("[data-next]");
    next.disabled = false;
    next.focus();
  }

  function render() {
    const { question, order } = items[current];
    const isLast = current === items.length - 1;
    const answeredRatio = (current / items.length) * 100;
    root.innerHTML = `
      <div class="quiz">
        <div class="quiz-top">
          <span>${escapeHtml(heading)}</span>
          <span>${deadline ? `<span class="timer" data-timer></span> · ` : ""}Question ${current + 1} / ${items.length}</span>
        </div>
        <div class="progress-bar" aria-hidden="true"><span style="width:${answeredRatio}%"></span></div>
        <section class="card quiz-card view" aria-live="polite">
          ${question.kind === "situation" ? `<span class="pill warn">Mise en situation</span>` : ""}
          <h2 style="margin-top:12px">${inline(question.q)}</h2>
          <ul class="choices">
            ${order.map((original, i) => `
              <li><button class="choice" type="button" data-choice="${i}" aria-pressed="false">
                <span class="k">${KEYS[i]}</span><span>${inline(question.choices[original])}</span>
              </button></li>`).join("")}
          </ul>
          <div class="feedback-slot"></div>
          <div class="quiz-actions">
            <button class="btn btn-primary" type="button" data-next disabled>
              ${isLast ? (isExam ? "Terminer l'examen" : "Voir mon résultat") : (isExam ? "Valider et continuer" : "Question suivante")} →
            </button>
          </div>
        </section>
        <p class="kbd-hint">Astuce : touches A à D ou 1 à 4 pour répondre, Entrée pour continuer.</p>
      </div>`;
    root.querySelectorAll("[data-choice]").forEach((button) => {
      button.addEventListener("click", () => choose(Number(button.dataset.choice)));
    });
    root.querySelector("[data-next]").addEventListener("click", goNext);
    tick();
  }

  function tick() {
    if (!deadline) return;
    const remaining = (deadline - Date.now()) / 1000;
    const label = root.querySelector("[data-timer]");
    if (label) {
      label.textContent = formatClock(remaining);
      label.classList.toggle("low", remaining < 300);
    }
    if (remaining <= 0) finish();
  }

  function onKey(event) {
    if (event.target instanceof HTMLInputElement || event.metaKey || event.ctrlKey || event.altKey) return;
    const key = event.key.toUpperCase();
    const letterIndex = KEYS.indexOf(key);
    const digitIndex = /^[1-6]$/.test(key) ? Number(key) - 1 : -1;
    const index = letterIndex >= 0 ? letterIndex : digitIndex;
    if (index >= 0) {
      choose(index);
      return;
    }
    if (event.key === "Enter") {
      const next = root.querySelector("[data-next]");
      if (next && !next.disabled && document.activeElement !== next) {
        event.preventDefault();
        next.click();
      }
    }
  }

  function dispose() {
    document.removeEventListener("keydown", onKey);
    if (timerId) clearInterval(timerId);
  }

  document.addEventListener("keydown", onKey);
  if (deadline) timerId = setInterval(tick, 1000);
  render();
  return dispose;
}

export function renderReview(answers) {
  const mistakes = answers.filter((a) => !a.isCorrect);
  if (mistakes.length === 0) return "";
  return `
    <div class="review">
      <h2 style="font-size:1.3rem">À revoir (${mistakes.length})</h2>
      ${mistakes.map(({ question, chosenIndex }) => `
        <div class="review-item">
          <p class="q">${inline(question.q)}</p>
          <p class="yours">✗ ${chosenIndex === null ? "Pas de réponse" : inline(question.choices[chosenIndex])}</p>
          <p class="right">✓ ${inline(question.choices[question.answer])}</p>
          ${question.explain ? `<p class="why">${inline(question.explain)}</p>` : ""}
        </div>`).join("")}
    </div>`;
}
