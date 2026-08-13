import { CHEVRON_ICON_SVG, TRASH_ICON_SVG } from "./icons.js";
import { openConfirmPopup } from "./popup.js";

function makeField(group, key, labelText, { onChange, onPrompt }) {
  const wrap = document.createElement("div");
  wrap.className = "pc-field";

  const label = document.createElement("div");
  label.className = "pc-field-label";
  label.textContent = labelText;

  const area = document.createElement("textarea");
  area.className = "pc-textarea";
  area.placeholder = labelText;
  area.value = group[key] || "";
  area.addEventListener("pointerdown", (e) => e.stopPropagation());
  area.addEventListener("input", () => {
    group[key] = area.value;
    onPrompt?.(key, area.value);
    onChange?.();
  });

  wrap.append(label, area);
  return { wrap, area };
}

export function makeGroupCard(group, { onChange, onRemove, onPrompt, onRename }) {
  const card = document.createElement("div");
  card.className = "pc-group";
  card.dataset.groupId = group.id;
  card.addEventListener("pointerdown", (e) => e.stopPropagation());

  const head = document.createElement("div");
  head.className = "pc-group-head";

  const title = document.createElement("input");
  title.className = "pc-title-input";
  title.type = "text";
  title.placeholder = "title";
  title.value = group.title || "";
  title.addEventListener("pointerdown", (e) => e.stopPropagation());

  function commitTitle() {
    const next = title.value.trim();
    if (next === (group.title || "").trim()) {
      title.value = group.title || "";
      title.classList.remove("invalid");
      return;
    }
    const error = onRename?.(next);
    if (error) {
      title.value = group.title || "";
      title.title = error;
      title.classList.add("invalid");
      setTimeout(() => title.classList.remove("invalid"), 900);
      return;
    }
    title.classList.remove("invalid");
    title.removeAttribute("title");
    group.title = next;
    title.value = next;
    onChange?.();
  }

  title.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      title.blur();
    }
    if (e.key === "Escape") {
      title.value = group.title || "";
      title.classList.remove("invalid");
      title.blur();
    }
  });
  title.addEventListener("blur", commitTitle);

  const collapseBtn = document.createElement("button");
  collapseBtn.type = "button";
  collapseBtn.className = "pc-collapse-btn";
  collapseBtn.innerHTML = CHEVRON_ICON_SVG;

  function applyCollapsed() {
    const collapsed = !!group.collapsed;
    card.classList.toggle("collapsed", collapsed);
    collapseBtn.title = collapsed ? "Expand group" : "Collapse group";
    collapseBtn.setAttribute("aria-expanded", collapsed ? "false" : "true");
  }

  collapseBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    group.collapsed = !group.collapsed;
    applyCollapsed();
    onChange?.();
  });

  head.append(title, collapseBtn);

  const body = document.createElement("div");
  body.className = "pc-group-body";

  const toolbar = document.createElement("div");
  toolbar.className = "pc-group-toolbar";

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "pc-remove-btn";
  removeBtn.title = "Remove group";
  removeBtn.innerHTML = TRASH_ICON_SVG;
  removeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const name = (group.title || "").trim() || "this group";
    openConfirmPopup({
      anchor: removeBtn,
      title: "Remove group",
      message: `Delete “${name}”? This cannot be undone.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      onConfirm: () => onRemove?.(),
    });
  });
  toolbar.appendChild(removeBtn);

  const pos = makeField(group, "positive", "positive", { onChange, onPrompt });
  const neg = makeField(group, "negative", "negative", { onChange, onPrompt });

  body.append(toolbar, pos.wrap, neg.wrap);
  card.append(head, body);
  applyCollapsed();

  return {
    el: card,
    setField(key, value) {
      const area = key === "positive" ? pos.area : neg.area;
      if (!area || area.value === value) return;
      area.value = value ?? "";
    },
  };
}
