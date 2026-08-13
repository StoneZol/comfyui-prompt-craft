import { CHEVRON_ICON_SVG, LOAD_ICON_SVG } from "./icons.js";
import { openConfirmPopup, openPopup } from "./popup.js";
import { listLayouts } from "./api.js";

const DESC_CLAMP_LINES = 2;

function makePresetCard(layout, { onLoad }) {
  const card = document.createElement("div");
  card.className = "pc-preset-item";

  const head = document.createElement("div");
  head.className = "pc-preset-head";

  const name = document.createElement("div");
  name.className = "pc-preset-name";
  name.textContent = layout.name || "Untitled";

  const loadBtn = document.createElement("button");
  loadBtn.type = "button";
  loadBtn.className = "pc-preset-load";
  loadBtn.title = "Load";
  loadBtn.innerHTML = LOAD_ICON_SVG;
  loadBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    onLoad?.(layout);
  });

  head.append(name, loadBtn);

  const slots = document.createElement("div");
  slots.className = "pc-preset-slots";
  const slotNames = (layout.slots || []).map((slot) => String(slot || "").trim()).filter(Boolean);
  slots.textContent = slotNames.join(" · ") || "No fields";

  card.append(head, slots);

  const description = (layout.description || "").trim();
  if (!description) return card;

  const descRow = document.createElement("div");
  descRow.className = "pc-preset-desc-row";

  const desc = document.createElement("div");
  desc.className = "pc-preset-desc";
  desc.textContent = description;

  const collapseBtn = document.createElement("button");
  collapseBtn.type = "button";
  collapseBtn.className = "pc-preset-collapse";
  collapseBtn.innerHTML = CHEVRON_ICON_SVG;
  collapseBtn.hidden = true;

  function applyCollapsed() {
    const collapsed = card.classList.contains("desc-collapsed");
    collapseBtn.title = collapsed ? "Expand description" : "Collapse description";
    collapseBtn.setAttribute("aria-expanded", collapsed ? "false" : "true");
  }

  collapseBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    card.classList.toggle("desc-collapsed");
    applyCollapsed();
  });

  descRow.append(desc, collapseBtn);
  card.appendChild(descRow);
  return card;
}

function clampPresetDescriptions(list) {
  list.querySelectorAll(".pc-preset-item").forEach((card) => {
    const desc = card.querySelector(".pc-preset-desc");
    const collapseBtn = card.querySelector(".pc-preset-collapse");
    if (!desc || !collapseBtn) return;
    const lineHeight = parseFloat(getComputedStyle(desc).lineHeight) || 16;
    if (desc.scrollHeight <= lineHeight * DESC_CLAMP_LINES + 2) return;
    card.classList.add("desc-long", "desc-collapsed");
    collapseBtn.hidden = false;
    collapseBtn.title = "Expand description";
    collapseBtn.setAttribute("aria-expanded", "false");
  });
}

export function openLoadPresetPopup({ anchor, onPick }) {
  return openPopup({
    anchor,
    title: "Load preset",
    width: 340,
    render(body, { close }) {
      const status = document.createElement("div");
      status.className = "pc-popup-message";
      status.textContent = "Loading…";
      body.appendChild(status);

      listLayouts()
        .then((result) => {
          const layouts = result.layouts || [];
          if (!result.ok) {
            status.textContent = result.error || "Failed to load presets";
            return;
          }
          if (!layouts.length) {
            status.textContent = "No saved presets yet.";
            return;
          }
          status.remove();
          const list = document.createElement("div");
          list.className = "pc-preset-list";
          for (const layout of layouts) {
            list.appendChild(
              makePresetCard(layout, {
                onLoad: (picked) => {
                  close();
                  onPick?.(picked);
                },
              }),
            );
          }
          body.appendChild(list);
          requestAnimationFrame(() => clampPresetDescriptions(list));
        })
        .catch((err) => {
          status.textContent = err?.message || "Failed to load presets";
        });
    },
  });
}

export function confirmReplaceGroups({ anchor, onConfirm }) {
  openConfirmPopup({
    anchor,
    title: "Load preset",
    message: "Replace current groups with this preset?",
    confirmLabel: "Replace",
    cancelLabel: "Cancel",
    danger: true,
    onConfirm,
  });
}
