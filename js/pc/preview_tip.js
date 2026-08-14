let activeTip = null;
let activeAnchor = null;

function onViewportChange() {
  hidePromptTip();
}

function onDocDown(e) {
  if (!activeTip) return;
  if (activeTip.contains(e.target)) return;
  if (activeAnchor?.contains?.(e.target)) return;
  hidePromptTip();
}

function onKey(e) {
  if (e.key !== "Escape" || !activeTip) return;
  e.preventDefault();
  e.stopPropagation();
  hidePromptTip();
}

export function hidePromptTip() {
  window.removeEventListener("resize", onViewportChange);
  document.removeEventListener("pointerdown", onDocDown, true);
  window.removeEventListener("keydown", onKey, true);
  if (!activeTip) {
    activeAnchor = null;
    return;
  }
  activeTip.remove();
  activeTip = null;
  activeAnchor = null;
}

function placeTip(tip, anchor) {
  const margin = 8;
  const gap = 8;
  const rect = anchor.getBoundingClientRect();
  const box = tip.getBoundingClientRect();
  let left = rect.left + (rect.width - box.width) / 2;
  let top = rect.bottom + gap;
  if (top + box.height > window.innerHeight - margin) {
    top = rect.top - box.height - gap;
  }
  left = Math.max(margin, Math.min(left, window.innerWidth - box.width - margin));
  top = Math.max(margin, Math.min(top, window.innerHeight - box.height - margin));
  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
}

export function showPromptTip(anchor, { positive = "", negative = "" } = {}) {
  hidePromptTip();
  if (!anchor) return;
  const pos = (positive || "").trim();
  const neg = (negative || "").trim();
  if (!pos && !neg) return;

  const tip = document.createElement("div");
  tip.className = "pc-prompt-tip";
  tip.addEventListener("pointerdown", (e) => e.stopPropagation());
  tip.addEventListener("wheel", (e) => e.stopPropagation(), { passive: true });

  if (pos) {
    const label = document.createElement("div");
    label.className = "pc-prompt-tip-label pc-prompt-tip-pos";
    label.textContent = "positive";
    const text = document.createElement("div");
    text.className = "pc-prompt-tip-text";
    text.textContent = pos;
    tip.append(label, text);
  }
  if (neg) {
    const label = document.createElement("div");
    label.className = "pc-prompt-tip-label pc-prompt-tip-neg";
    label.textContent = "negative";
    const text = document.createElement("div");
    text.className = "pc-prompt-tip-text";
    text.textContent = neg;
    tip.append(label, text);
  }

  document.body.appendChild(tip);
  activeTip = tip;
  activeAnchor = anchor;
  placeTip(tip, anchor);
  window.addEventListener("resize", onViewportChange);
  document.addEventListener("pointerdown", onDocDown, true);
  // window capture runs before popup's document listener, so Escape closes tip first.
  window.addEventListener("keydown", onKey, true);
}

export function bindPromptTip(btn, getPair) {
  btn.addEventListener("pointerdown", (e) => e.stopPropagation());
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (activeTip && activeAnchor === btn) {
      hidePromptTip();
      return;
    }
    const pair = typeof getPair === "function" ? getPair() : getPair;
    showPromptTip(btn, pair || {});
  });
}
