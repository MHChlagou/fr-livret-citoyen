import { escapeHtml, inline } from "../util.js";

const RENDERERS = {
  p: (block) => `<p>${inline(block.text)}</p>`,
  list: (block) => `<ul>${block.items.map((item) => `<li>${inline(item)}</li>`).join("")}</ul>`,
  callout: (block) => `<div class="callout">${inline(block.text)}</div>`,
  quote: (block) => `
    <blockquote>${inline(block.text)}${block.source ? `<cite>${escapeHtml(block.source)}</cite>` : ""}</blockquote>`,
  table: (block) => `
    <div class="table-wrap"><table>
      <thead><tr>${block.headers.map((h) => `<th scope="col">${inline(h)}</th>`).join("")}</tr></thead>
      <tbody>${block.rows.map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
    </table></div>`,
  timeline: (block) => `
    <ol class="timeline">${block.items.map((item) => `
      <li><span class="date">${escapeHtml(item.date)}</span>${inline(item.text)}</li>`).join("")}
    </ol>`,
};

export function renderBlocks(blocks) {
  return blocks
    .map((block) => {
      const render = RENDERERS[block.type];
      if (!render) {
        console.warn("Type de bloc inconnu", block.type);
        return "";
      }
      return render(block);
    })
    .join("");
}

export function partLabel(part) {
  return part.number > 0 ? `Partie ${part.number}` : "Annexes";
}
