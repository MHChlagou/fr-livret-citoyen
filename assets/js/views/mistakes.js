import { escapeHtml, plural, shuffle } from "../util.js";
import { getMistakeIds, clearMistakes, recordAnswers } from "../store.js";
import { runQuiz, renderReview } from "../quiz.js";

const SESSION_SIZE = 20;

export function renderMistakes(root, ctx) {
  function pool() {
    const ids = new Set(getMistakeIds());
    return ctx.course.questions.filter((question) => ids.has(question.id));
  }

  function countsByPart(questions) {
    return ctx.course.parts
      .map((part) => ({ part, count: questions.filter((q) => q.partId === part.id).length }))
      .filter(({ count }) => count > 0);
  }

  function intro() {
    const questions = pool();
    if (questions.length === 0) {
      root.innerHTML = `
        <div class="view"><section class="card result">
          <span class="eyebrow">Mes erreurs</span>
          <h1>Rien à revoir 🎉</h1>
          <p class="verdict">Aucune question ratée en attente. Les questions auxquelles vous répondez mal, en quiz ou à l'examen blanc, apparaîtront ici jusqu'à ce que vous les réussissiez.</p>
          <div class="btn-row"><a class="btn btn-primary" href="#/exam">Examen blanc →</a><a class="btn btn-ghost" href="#/">Retour au parcours</a></div>
        </section></div>`;
      return;
    }
    root.innerHTML = `
      <div class="view"><section class="card exam-intro">
        <span class="eyebrow">Mes erreurs</span>
        <h1>${plural(questions.length, "question")} à revoir</h1>
        <p>Ce sont les questions que vous avez ratées la dernière fois qu'elles vous ont été posées, en quiz ou à l'examen blanc. Une question réussie ici sort de la liste.</p>
        <ul class="memo-list" style="margin-bottom:20px">
          ${countsByPart(questions).map(({ part, count }) => `<li style="padding:6px 12px">${escapeHtml(part.icon)} ${escapeHtml(part.title)} <span class="pill bad">${count}</span></li>`).join("")}
        </ul>
        <div class="btn-row">
          <button class="btn btn-primary" type="button" data-start>Rejouer mes erreurs${questions.length > SESSION_SIZE ? ` (${SESSION_SIZE} à la fois)` : ""} →</button>
          <button class="btn btn-ghost" type="button" data-clear>Vider la liste</button>
        </div>
      </section></div>`;
    root.querySelector("[data-start]").addEventListener("click", start);
    root.querySelector("[data-clear]").addEventListener("click", () => {
      if (!window.confirm("Vider la liste de vos erreurs ?")) return;
      clearMistakes();
      intro();
    });
  }

  function start() {
    const questions = shuffle(pool()).slice(0, SESSION_SIZE);
    const dispose = runQuiz(root, questions, { mode: "practice", heading: "Mes erreurs", onFinish: showResult });
    ctx.onLeave(dispose);
  }

  function showResult({ answers, correct, total }) {
    recordAnswers(answers);
    const remaining = pool().length;
    root.innerHTML = `
      <div class="quiz view"><section class="card result">
        <span class="eyebrow">Mes erreurs</span>
        <div class="score">${correct} / ${total}</div>
        <p><span class="pill ${remaining === 0 ? "ok" : "warn"}">${remaining === 0 ? "Liste vidée, bravo !" : `${plural(remaining, "question")} encore à revoir`}</span></p>
        <p class="verdict">${correct === total ? "Toutes corrigées : elles sortent de la liste." : "Les questions ratées restent dans la liste : relisez l'explication, puis retentez."}</p>
        <div class="btn-row">
          ${remaining > 0 ? `<button class="btn btn-primary" type="button" data-again>Continuer →</button>` : `<a class="btn btn-primary" href="#/exam">Examen blanc →</a>`}
          <a class="btn btn-ghost" href="#/">Retour au parcours</a>
        </div>
        ${renderReview(answers)}
      </section></div>`;
    root.querySelector("[data-again]")?.addEventListener("click", start);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  intro();
}
