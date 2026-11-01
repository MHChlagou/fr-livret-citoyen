import { escapeHtml, inline } from "../util.js";
import { findSection, nextSection } from "../data.js";
import { markRead, sectionState } from "../store.js";
import { renderBlocks, partLabel } from "./blocks.js";

export function renderSection(root, { course, onLeave }, sectionId) {
  const section = findSection(course, sectionId);
  if (!section) {
    location.replace("#/");
    return;
  }
  const hasKeyFacts = section.keyFacts.length > 0;
  const steps = [
    ...section.lessons.map((lesson) => ({ title: lesson.title, lesson })),
    ...(hasKeyFacts ? [{ title: "À retenir", isKeyFacts: true }] : []),
  ];
  const following = nextSection(course, section.id);
  let current = 0;
  let furthest = 0;

  function finalActions() {
    const practice = section.practice
      ? `<a class="btn btn-ghost" href="${escapeHtml(section.practice.href)}">${escapeHtml(section.practice.label)}</a>`
      : "";
    if (section.quiz.length > 0) {
      const count = Math.min(section.quiz.length, 20);
      return `${practice}<a class="btn btn-primary" href="#/quiz/${encodeURIComponent(section.id)}">Passer le quiz (${count} questions) →</a>`;
    }
    return following
      ? `<a class="btn btn-primary" href="#/section/${encodeURIComponent(following.id)}">Section suivante →</a>`
      : `<a class="btn btn-primary" href="#/exam">Examen blanc →</a>`;
  }

  function stepBody(step) {
    if (step.isKeyFacts) {
      return `
        <div class="card keyfacts view">
          <span class="eyebrow">Fin de section</span>
          <h2 tabindex="-1">📌 À retenir absolument</h2>
          <ol>${section.keyFacts.map((fact) => `<li><span>${inline(fact)}</span></li>`).join("")}</ol>
          <div class="lesson-nav">
            <button class="btn btn-ghost" type="button" data-prev>← Leçon précédente</button>
            ${finalActions()}
          </div>
        </div>`;
    }
    const isLast = current === steps.length - 1;
    return `
      <article class="card lesson view">
        <header class="lesson-head">
          <span class="lesson-step">Leçon ${current + 1} sur ${section.lessons.length}</span>
          <h1 tabindex="-1">${escapeHtml(step.title)}</h1>
        </header>
        <div class="lesson-body">${renderBlocks(step.lesson.blocks)}</div>
        <div class="lesson-nav">
          ${current > 0 ? `<button class="btn btn-ghost" type="button" data-prev>← Précédent</button>` : "<span></span>"}
          ${isLast
            ? finalActions()
            : `<button class="btn btn-primary" type="button" data-next>${steps[current + 1].isKeyFacts ? "Les points à retenir" : "Suivant"} →</button>`}
        </div>
      </article>`;
  }

  function goTo(index) {
    current = Math.max(0, Math.min(steps.length - 1, index));
    furthest = Math.max(furthest, current);
    if (current === steps.length - 1) markRead(section.id);
    render();
    root.querySelector(".lesson-main").scrollIntoView({ behavior: "smooth", block: "start" });
    root.querySelector(".lesson-main h1, .lesson-main h2")?.focus({ preventScroll: true });
  }

  function markScrollableTables() {
    root.querySelectorAll(".table-wrap").forEach((wrap) => {
      wrap.classList.toggle("is-scrollable", wrap.scrollWidth > wrap.clientWidth + 4);
    });
  }

  function render() {
    root.innerHTML = `
      <div class="view">
        <nav class="crumbs" aria-label="Fil d'Ariane">
          <a href="#/">Parcours</a><span aria-hidden="true">/</span>
          <span>${partLabel(section.part)} · ${escapeHtml(section.part.title)}</span>
        </nav>
        <div class="lesson-layout">
          <aside class="card toc">
            <h2>${escapeHtml(section.title)}</h2>
            <ol>
              ${steps.map((step, i) => `
                <li><button type="button" data-step="${i}" class="${i < furthest || sectionState(section.id) !== "todo" ? "done" : ""}" ${i === current ? 'aria-current="step"' : ""}>
                  <span class="n">${step.isKeyFacts ? "★" : i + 1}</span><span>${escapeHtml(step.title)}</span>
                </button></li>`).join("")}
            </ol>
          </aside>
          <div class="lesson-main" style="scroll-margin-top:90px">${stepBody(steps[current])}</div>
        </div>
      </div>`;
    root.querySelectorAll("[data-step]").forEach((button) => {
      button.addEventListener("click", () => goTo(Number(button.dataset.step)));
    });
    root.querySelector("[data-prev]")?.addEventListener("click", () => goTo(current - 1));
    root.querySelector("[data-next]")?.addEventListener("click", () => goTo(current + 1));
    markScrollableTables();
  }

  if (steps.length === 1) markRead(section.id);
  render();
  window.addEventListener("resize", markScrollableTables);
  onLeave(() => window.removeEventListener("resize", markScrollableTables));
}
