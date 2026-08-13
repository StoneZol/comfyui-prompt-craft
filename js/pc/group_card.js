import { TRASH_ICON_SVG } from "./icons.js";

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

export function makeGroupCard(group, { onChange, onRemove, onPrompt }) {
  const card = document.createElement("div");
  card.className = "pc-group";
  card.dataset.groupId = group.id;
  card.addEventListener("pointerdown", (e) => e.stopPropagation());

  const title = document.createElement("input");
  title.className = "pc-title-input";
  title.type = "text";
  title.placeholder = "title";
  title.value = group.title || "";
  title.addEventListener("input", () => {
    group.title = title.value;
    onChange?.();
  });

  const toolbar = document.createElement("div");
  toolbar.className = "pc-group-toolbar";

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "pc-remove-btn";
  removeBtn.title = "Remove group";
  removeBtn.innerHTML = TRASH_ICON_SVG;
  removeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    onRemove?.();
  });
  toolbar.appendChild(removeBtn);

  const pos = makeField(group, "positive", "positive", { onChange, onPrompt });
  const neg = makeField(group, "negative", "negative", { onChange, onPrompt });

  card.append(title, toolbar, pos.wrap, neg.wrap);

  return {
    el: card,
    setField(key, value) {
      const area = key === "positive" ? pos.area : neg.area;
      if (!area || area.value === value) return;
      area.value = value ?? "";
    },
  };
}
