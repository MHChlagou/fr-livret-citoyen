import { escapeHtml, percent, celebrate, shuffle } from "../util.js";

/** Long sections draw a different sample at each attempt, so every question gets seen over time. */
const SESSION_SIZE = 20;
import { findSection, nextSection } from "../data.js";
import { recordQuiz, recordAnswers, getMistakeIds, getSection, getUserName, PASS_RATIO } from "../store.js";
import { runQuiz, renderReview } from "../quiz.js";

export function renderSectionQuiz(root, ctx, sectionId) {
  const section = findSection(ctx.course, sectionId);
  if (!section || section.quiz.length === 0) {
    location.replace(section ? `#/section/${encodeURIComponent(section.id)}` : "#/");
    return;
  }
  const questions = ctx.course.questions.filter((question) => question.sectionId === section.id);
  const following = nextSection(ctx.course, section.id);

  function start() {
    const sample = questions.length > SESSION_SIZE ? shuffle(questions).slice(0, SESSION_SIZE) : questions;
    const heading = sample.length < questions.length
      ? `${section.title} · ${sample.length} sur ${questions.length}`
      : section.title;
    const dispose = runQuiz(root, sample, { mode: "practice", heading, onFinish: showResult });
    ctx.onLeave(dispose);
  }

  function showResult({ answers, correct, total }) {
    const ratio = correct / total;
    const previousBest = getSection(section.id).best;
    recordQuiz(section.id, ratio);
    recordAnswers(answers);
    const mistakeCount = getMistakeIds().length;
    const isPassed = ratio >= PASS_RATIO;
    if (isPassed) celebrate();
    const isNewRecord = previousBest !== null && ratio > previousBest;

    root.innerHTML = `
      <div class="quiz view">
        <section class="card result">
          <span class="eyebrow">${escapeHtml(section.title)}</span>
          <div class="score">${correct} / ${total}</div>
          <p><span class="pill ${isPassed ? "ok" : "bad"}">${percent(ratio)} % · ${isPassed ? "Section validée" : "Seuil : 80 %"}</span>
          ${isNewRecord ? ` <span class="pill warn">Nouveau record</span>` : ""}</p>
          <p class="verdict">${isPassed
            ? `Bravo${getUserName() ? ` ${escapeHtml(getUserName())}` : ""} ! Vous maîtrisez cette section. Passez à la suite.`
            : "Encore un effort : relisez les points à retenir puis retentez le quiz. L'ordre des questions et des réponses change à chaque essai."}</p>
          <div class="btn-row">
            ${isPassed && following
              ? `<a class="btn btn-primary" href="#/section/${encodeURIComponent(following.id)}">Section suivante →</a>`
              : ""}
            ${isPassed && !following ? `<a class="btn btn-primary" href="#/exam">Examen blanc →</a>` : ""}
            <button class="btn ${isPassed ? "btn-ghost" : "btn-primary"}" type="button" data-retry>Recommencer le quiz</button>
            <a class="btn btn-ghost" href="#/section/${encodeURIComponent(section.id)}">Revoir la leçon</a>
            ${mistakeCount ? `<a class="btn btn-ghost" href="#/erreurs">Mes erreurs (${mistakeCount})</a>` : ""}
          </div>
          ${renderReview(answers)}
        </section>
      </div>`;
    root.querySelector("[data-retry]").addEventListener("click", start);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  start();
}
