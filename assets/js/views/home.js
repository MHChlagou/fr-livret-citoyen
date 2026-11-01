import { escapeHtml, inline, percent, plural, formatDate } from "../util.js";
import { sectionState, getSection, getExams, getUserName } from "../store.js";
import { EXAM_QUESTION_COUNT } from "../exam.js";
import { partLabel } from "./blocks.js";
import { mountInstallCard } from "../install.js";

const STATE_LABEL = { todo: "À découvrir", read: "Leçon lue", passed: "Quiz réussi" };

function stopMarkup(section, index) {
  const state = sectionState(section.id);
  const best = getSection(section.id).best;
  const meta = [
    plural(section.lessons.length, "leçon"),
    section.quiz.length ? plural(section.quiz.length, "question") : null,
    best !== null ? `meilleur score ${percent(best)} %` : STATE_LABEL[state],
  ].filter(Boolean).join(" · ");
  return `
    <li class="stop" data-state="${state}">
      <a href="#/section/${encodeURIComponent(section.id)}">
        <span class="stop-dot" aria-hidden="true">${state === "passed" ? "✓" : index + 1}</span>
        <span class="stop-title">${escapeHtml(section.title)}<span class="stop-meta">${escapeHtml(meta)}</span></span>
        <span aria-hidden="true">→</span>
      </a>
    </li>`;
}

function partMarkup(part, delayIndex) {
  const passed = part.sections.filter((s) => sectionState(s.id) === "passed").length;
  const quizSections = part.sections.filter((s) => s.quiz.length > 0).length;
  return `
    <article class="card part" style="animation-delay:${delayIndex * 60}ms">
      <div class="part-badge" aria-hidden="true">${escapeHtml(part.icon)}</div>
      <div>
        <div class="part-head">
          <div>
            <span class="eyebrow">${partLabel(part)}</span>
            <h3>${escapeHtml(part.title)}</h3>
          </div>
          ${quizSections ? `<span class="pill ${passed === quizSections ? "ok" : ""}">${passed} / ${quizSections} réussis</span>` : ""}
        </div>
        <p class="intro">${inline(part.intro)}</p>
        <ol class="stops">${part.sections.map(stopMarkup).join("")}</ol>
      </div>
    </article>`;
}

function nextStep(course) {
  return course.sections.find((s) => s.quiz.length > 0 && sectionState(s.id) !== "passed") ?? null;
}

export function renderHome(root, { course, onLeave }) {
  const quizSections = course.sections.filter((s) => s.quiz.length > 0);
  const passedCount = quizSections.filter((s) => sectionState(s.id) === "passed").length;
  const ratio = quizSections.length ? passedCount / quizSections.length : 0;
  const next = nextStep(course);
  const lastExam = getExams()[0];
  const factCount = course.sections.reduce((sum, s) => sum + s.keyFacts.length, 0);
  const userName = getUserName();
  const greeting = userName
    ? `<p class="greeting">Bonjour <strong>${escapeHtml(userName)}</strong> 👋 <button class="link-btn" type="button" data-edit-name>modifier</button></p>`
    : `<p class="greeting"><button class="link-btn" type="button" data-edit-name>Ajouter mon prénom</button></p>`;

  root.innerHTML = `
    <div class="view">
      <section class="card hero">
        <div>
          ${greeting}
          <span class="eyebrow">Naturalisation · Examen civique · Entretien</span>
          <h1>Le Livret du citoyen, <em>pas à pas</em>.</h1>
          <p>Toutes les connaissances du livret officiel, découpées en courtes leçons. Après chaque section, un quiz vérifie ce que vous avez retenu. À la fin, un examen blanc vous dit si vous êtes prêt(e).</p>
          <div class="hero-stats">
            <span><b>${course.parts.filter((p) => p.number > 0).length}</b>parties</span>
            <span><b>${course.sections.length}</b>sections</span>
            <span><b>${course.questions.length}</b>questions</span>
            <span><b>${factCount}</b>points à retenir</span>
          </div>
          <div class="btn-row">
            ${next
              ? `<a class="btn btn-primary" href="#/section/${encodeURIComponent(next.id)}">${passedCount ? "Continuer" : "Commencer"} : ${escapeHtml(next.title)} →</a>`
              : `<a class="btn btn-primary" href="#/exam">Passer l'examen blanc →</a>`}
            <a class="btn btn-ghost" href="#/memo">Réviser l'essentiel</a>
          </div>
        </div>
        <div class="ring" style="--p:${percent(ratio)}" role="img" aria-label="Progression : ${percent(ratio)} %">
          <svg viewBox="0 0 40 40"><circle class="track" cx="20" cy="20" r="15.9155"/><circle class="fill" cx="20" cy="20" r="15.9155" pathLength="100"/></svg>
          <div class="ring-label">${percent(ratio)}%<small>${passedCount} / ${quizSections.length} quiz</small></div>
        </div>
      </section>

      <div data-install-slot></div>

      <ol class="how">
        <li><b>Lisez</b>une leçon courte, une notion à la fois.</li>
        <li><b>Retenez</b>les points clés résumés en fin de section.</li>
        <li><b>Vérifiez</b>avec le quiz : 80 % pour valider.</li>
        <li><b>Testez-vous</b>avec l'examen blanc de ${EXAM_QUESTION_COUNT} questions.</li>
      </ol>

      <div class="path-title">
        <h2>Votre parcours</h2>
        <span class="pill">${passedCount} / ${quizSections.length} sections validées</span>
      </div>
      <div class="path">
        ${course.parts.map(partMarkup).join("")}
        <article class="card final">
          <div>
            <span class="eyebrow" style="color:#ff8a80">Étape finale</span>
            <h3>Examen blanc</h3>
            <p>${EXAM_QUESTION_COUNT} questions tirées au hasard dans tout le livret, 45 minutes, 80 % pour réussir : comme le vrai examen civique.
            ${lastExam ? `<br>Dernier essai : <strong style="color:inherit">${lastExam.correct} / ${lastExam.total}</strong> (${escapeHtml(formatDate(lastExam.at))}).` : ""}</p>
          </div>
          <a class="btn btn-primary" href="#/exam">${lastExam ? "Retenter" : "Je me lance"} →</a>
        </article>
      </div>
    </div>`;
  mountInstallCard(root.querySelector("[data-install-slot]"), onLeave);
}
