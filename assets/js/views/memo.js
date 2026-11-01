import { escapeHtml, inline, normalizeForSearch } from "../util.js";
import { isFactKnown, setFactKnown } from "../store.js";
import { partLabel } from "./blocks.js";

export function renderMemo(root, { course }) {
  const facts = course.sections.flatMap((section) =>
    section.keyFacts.map((text, i) => ({ key: `${section.id}-${i}`, text, section, haystack: normalizeForSearch(text) })),
  );
  let query = "";
  let isHidingKnown = false;

  root.innerHTML = `
    <div class="view">
      <span class="eyebrow">Révision express</span>
      <h1 style="font-size:clamp(1.8rem,4vw,2.6rem)">L'essentiel à retenir</h1>
      <p style="color:var(--ink-soft);max-width:60ch">Tous les points clés du livret sur une seule page. Cochez ceux que vous savez par cœur : il ne restera que ce qu'il faut encore travailler.</p>
      <div class="memo-tools">
        <input class="search" type="search" placeholder="Rechercher (ex. 1905, Marianne, maire…)" aria-label="Rechercher un point à retenir">
        <label class="pill" style="cursor:pointer;min-height:40px;padding:8px 14px">
          <input type="checkbox" data-hide-known style="accent-color:var(--green)"> Masquer ce que je sais
        </label>
        <span class="pill ok" data-count></span>
      </div>
      <div data-list></div>
    </div>`;

  const list = root.querySelector("[data-list]");
  const count = root.querySelector("[data-count]");

  function updateCount() {
    const known = facts.filter((fact) => isFactKnown(fact.key)).length;
    count.textContent = `${known} / ${facts.length} mémorisés`;
  }

  /** Builds a pattern where each letter also matches its accented forms, so "egalite" highlights "Égalité". */
  function accentInsensitivePattern(needle) {
    const variants = { a: "aàâä", e: "eéèêë", i: "iîï", o: "oôö", u: "uùûü", c: "cç", y: "yÿ" };
    return [...normalizeForSearch(needle)].map((char) => {
      if (variants[char]) return `[${variants[char]}${variants[char].toUpperCase()}]`;
      if (char === " ") return "[\\s\\u00a0]";
      return char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }).join("");
  }

  function highlight(text) {
    const html = inline(text);
    if (!query) return html;
    return html.replace(new RegExp(`(${accentInsensitivePattern(query)})(?![^<]*>)`, "gi"), "<mark>$1</mark>");
  }

  function render() {
    const needle = normalizeForSearch(query);
    const visible = facts.filter((fact) =>
      (!needle || fact.haystack.includes(needle)) && !(isHidingKnown && isFactKnown(fact.key)));
    if (visible.length === 0) {
      list.innerHTML = `<p class="empty">${isHidingKnown && !needle ? "Tout est mémorisé. Bravo ! 🎉" : "Aucun résultat."}</p>`;
      return;
    }
    const html = course.parts.map((part) => {
      const sections = part.sections
        .map((section) => ({ section, items: visible.filter((fact) => fact.section.id === section.id) }))
        .filter(({ items }) => items.length > 0);
      if (sections.length === 0) return "";
      return `
        <section class="memo-part">
          <h2><span aria-hidden="true">${escapeHtml(part.icon)}</span> ${part.number > 0 ? `${partLabel(part)} · ` : ""}${escapeHtml(part.title)}</h2>
          ${sections.map(({ section, items }) => `
            <div class="card memo-section">
              <h3><a href="#/section/${encodeURIComponent(section.id)}">${escapeHtml(section.title)}</a></h3>
              <ul class="memo-list">
                ${items.map((fact) => `
                  <li><label>
                    <input type="checkbox" data-fact="${escapeHtml(fact.key)}" ${isFactKnown(fact.key) ? "checked" : ""}>
                    <span>${highlight(fact.text)}</span>
                  </label></li>`).join("")}
              </ul>
            </div>`).join("")}
        </section>`;
    }).join("");
    list.innerHTML = html;
  }

  list.addEventListener("change", (event) => {
    const key = event.target.dataset?.fact;
    if (!key) return;
    setFactKnown(key, event.target.checked);
    updateCount();
    if (isHidingKnown) render();
  });
  root.querySelector(".search").addEventListener("input", (event) => {
    query = event.target.value.trim();
    render();
  });
  root.querySelector("[data-hide-known]").addEventListener("change", (event) => {
    isHidingKnown = event.target.checked;
    render();
  });

  updateCount();
  render();
}
