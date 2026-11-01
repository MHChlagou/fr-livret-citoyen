import { escapeHtml, percent, celebrate, formatDate } from "../util.js";
import { recordExam, getExams, getUserName } from "../store.js";
import { runQuiz, renderReview } from "../quiz.js";
import {
  buildExam, scoreByTheme, readinessVerdict,
  EXAM_DURATION_SEC, EXAM_PASS_RATIO, EXAM_QUESTION_COUNT,
} from "../exam.js";

const LEVEL_PILL = { ready: "ok", almost: "warn", "not-yet": "bad" };

export function renderExam(root, ctx) {
  function intro() {
    const exams = getExams();
    root.innerHTML = `
      <div class="view">
        <section class="card exam-intro">
          <span class="eyebrow">Étape finale</span>
          <h1>Examen blanc</h1>
          <p>Mettez-vous dans les conditions de l'examen civique : des questions tirées au hasard dans tout le livret, sans correction avant la fin. Les mises en situation vous demandent de choisir le bon comportement face à un cas concret.</p>
          <div class="rules">
            <div><b>${EXAM_QUESTION_COUNT}</b><span>questions (QCM)</span></div>
            <div><b>${EXAM_DURATION_SEC / 60} min</b><span>chronométrées</span></div>
            <div><b>${percent(EXAM_PASS_RATIO)} %</b><span>pour réussir (${Math.ceil(EXAM_QUESTION_COUNT * EXAM_PASS_RATIO)} / ${EXAM_QUESTION_COUNT})</span></div>
          </div>
          <div class="btn-row"><button class="btn btn-red" type="button" data-start>Commencer l'examen →</button></div>
          ${exams.length ? `
            <div class="history">
              <strong>Vos derniers essais</strong>
              <ul>${exams.map((exam) => `
                <li><span>${escapeHtml(formatDate(exam.at))}</span>
                <span class="pill ${exam.correct / exam.total >= EXAM_PASS_RATIO ? "ok" : "bad"}">${exam.correct} / ${exam.total}</span></li>`).join("")}
              </ul>
            </div>` : ""}
        </section>
      </div>`;
    root.querySelector("[data-start]").addEventListener("click", start);
  }

  function start() {
    const questions = buildExam(ctx.course.questions);
    const dispose = runQuiz(root, questions, {
      mode: "exam",
      heading: "Examen blanc",
      timeLimitSec: EXAM_DURATION_SEC,
      onFinish: showResult,
    });
    ctx.onLeave(dispose);
    ctx.guardLeave(() => "Quitter l'examen en cours ? Le chrono et vos réponses seront perdus.");
  }

  function showResult({ answers, correct, total }) {
    ctx.guardLeave(null);
    recordExam(correct, total);
    const themes = scoreByTheme(answers);
    const verdict = readinessVerdict(correct, total, themes);
    if (verdict.level === "ready") celebrate();

    root.innerHTML = `
      <div class="quiz view">
        <section class="card result">
          <span class="eyebrow">Résultat de l'examen blanc${getUserName() ? ` · ${escapeHtml(getUserName())}` : ""}</span>
          <div class="score">${correct} / ${total}</div>
          <p><span class="pill ${LEVEL_PILL[verdict.level] ?? ""}">${percent(correct / total)} % · ${escapeHtml(verdict.title)}</span></p>
          <p class="verdict">${escapeHtml(verdict.message)}</p>
          <div class="btn-row">
            <button class="btn btn-primary" type="button" data-again>Nouvel examen</button>
            <a class="btn btn-ghost" href="#/memo">Réviser l'essentiel</a>
            <a class="btn btn-ghost" href="#/">Retour au parcours</a>
          </div>
          <div class="breakdown">
            <h2 style="font-size:1.3rem">Par thème</h2>
            ${themes.map((theme) => `
              <div class="breakdown-row">
                <span>${escapeHtml(theme.label)}</span><span>${theme.correct} / ${theme.total}</span>
                <div class="progress-bar"><span style="width:${theme.total ? percent(theme.correct / theme.total) : 0}%"></span></div>
              </div>`).join("")}
          </div>
          ${renderReview(answers)}
        </section>
      </div>`;
    root.querySelector("[data-again]").addEventListener("click", start);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  intro();
}
