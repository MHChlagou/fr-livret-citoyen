import { escapeHtml, inline, shuffle } from "../util.js";
import { getInterviewRating, setInterviewRating } from "../store.js";

const ALL_THEMES = "Tous les thèmes";

/** Interview simulation: one question at a time, answer aloud, reveal the expected points, rate yourself. */
export function renderInterview(root, ctx) {
  const drills = ctx.course.drills;
  const themes = [ALL_THEMES, ...new Set(drills.map((drill) => drill.theme))];
  let theme = ALL_THEMES;
  let queue = [];
  let current = null;
  let isRevealed = false;

  function selected() {
    return drills.filter((drill) => theme === ALL_THEMES || drill.theme === theme);
  }

  /** Unrated and "retry" cards first, mastered ones last, random inside each group. */
  function buildQueue() {
    const cards = selected();
    const todo = cards.filter((drill) => getInterviewRating(drill.id) !== "ok");
    const done = cards.filter((drill) => getInterviewRating(drill.id) === "ok");
    queue = [...shuffle(todo), ...shuffle(done)];
  }

  function next() {
    if (queue.length === 0) buildQueue();
    current = queue.shift();
    isRevealed = false;
    render();
  }

  function stats() {
    const cards = selected();
    const ok = cards.filter((drill) => getInterviewRating(drill.id) === "ok").length;
    const retry = cards.filter((drill) => getInterviewRating(drill.id) === "retry").length;
    return { total: cards.length, ok, retry };
  }

  function render() {
    const { total, ok, retry } = stats();
    root.innerHTML = `
      <div class="quiz view">
        <nav class="crumbs" aria-label="Fil d'Ariane"><a href="#/">Parcours</a><span aria-hidden="true">/</span><a href="#/section/e2">Préparer l'entretien</a></nav>
        <div class="quiz-top">
          <span>Simulation d'entretien</span>
          <span><span class="pill ok">${ok} / ${total} maîtrisées</span> ${retry ? `<span class="pill warn">${retry} à retravailler</span>` : ""}</span>
        </div>
        <div class="theme-row" role="group" aria-label="Thème">
          ${themes.map((t) => `<button type="button" class="theme-chip" data-theme="${escapeHtml(t)}" aria-pressed="${t === theme}">${escapeHtml(t)}</button>`).join("")}
        </div>
        <section class="card quiz-card drill" aria-live="polite">
          <span class="pill">${escapeHtml(current.theme)}</span>
          <h2 class="drill-q">${inline(current.q)}</h2>
          <p class="drill-hint">Répondez à voix haute, en français, avec des phrases complètes. Puis comparez avec les points attendus.</p>
          ${isRevealed ? `
            <div class="drill-reveal view">
              <p><strong>Ce que l'agent cherche :</strong> ${inline(current.why)}</p>
              <p><strong>Les points à donner :</strong></p>
              <ul>${current.points.map((point) => `<li>${inline(point)}</li>`).join("")}</ul>
              <blockquote>${inline(current.example)}<cite>Exemple de réponse, à adapter à votre situation</cite></blockquote>
            </div>
            <div class="quiz-actions drill-rating">
              <button class="btn btn-ghost" type="button" data-rate="retry">À retravailler</button>
              <button class="btn btn-primary" type="button" data-rate="ok">Je sais répondre ✓</button>
            </div>`
          : `
            <div class="quiz-actions">
              <button class="btn btn-ghost" type="button" data-skip>Passer</button>
              <button class="btn btn-primary" type="button" data-reveal>Voir les points attendus</button>
            </div>`}
        </section>
        <p class="kbd-hint">Les fiches « à retravailler » reviennent en premier. Votre auto-évaluation est enregistrée sur cet appareil.</p>
      </div>`;
    root.querySelectorAll("[data-theme]").forEach((button) => button.addEventListener("click", () => {
      theme = button.dataset.theme;
      buildQueue();
      next();
    }));
    root.querySelector("[data-reveal]")?.addEventListener("click", () => { isRevealed = true; render(); });
    root.querySelector("[data-skip]")?.addEventListener("click", next);
    root.querySelectorAll("[data-rate]").forEach((button) => button.addEventListener("click", () => {
      setInterviewRating(current.id, button.dataset.rate);
      next();
    }));
  }

  buildQueue();
  next();
}
