const STYLE_ID = "pc-popup-styles";

const CSS = `
.pc-popup-root {
  position: fixed;
  z-index: 11000;
  min-width: 240px;
  max-width: min(420px, calc(100vw - 16px));
  box-sizing: border-box;
  padding: 8px;
  border-radius: 10px;
  border: 1px solid var(--border-color, #444);
  background: var(--comfy-menu-bg, #1e1e1e);
  color: var(--input-text, #ddd);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
  font-family: inherit;
  font-size: 12px;
}

.pc-popup-title {
  font-size: 11px;
  letter-spacing: 0.02em;
  color: var(--descrip-text, #aaa);
  padding: 2px 4px 8px;
  user-select: none;
}

.pc-popup-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pc-popup-input {
  box-sizing: border-box;
  width: 100%;
  height: 30px;
  padding: 0 8px;
  border-radius: 6px;
  border: 1px solid var(--border-color, #444);
  background: var(--comfy-input-bg, #222);
  color: var(--input-text, #ddd);
  font-family: inherit;
  font-size: 12px;
  outline: none;
}

.pc-popup-input:focus {
  border-color: var(--descrip-text, #888);
}

.pc-popup-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

.pc-popup-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  padding: 0 10px;
  border-radius: 6px;
  border: 1px solid var(--border-color, #444);
  background: var(--comfy-input-bg, #2a2a2e);
  color: var(--input-text, #ddd);
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
}

.pc-popup-btn:hover {
  filter: brightness(1.15);
}

.pc-popup-btn.primary {
  background: #2f2b3d;
  border-color: #6d5aa8;
  color: #e8e4f5;
}
`;

function injectPopupStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

let activePopup = null;

function placePopup(el, { anchor, position }) {
  const margin = 8;
  let x = position?.x ?? 0;
  let y = position?.y ?? 0;
  if (anchor?.getBoundingClientRect) {
    const rect = anchor.getBoundingClientRect();
    x = rect.left;
    y = rect.bottom + 4;
  }

  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.visibility = "hidden";
  document.body.appendChild(el);

  const box = el.getBoundingClientRect();
  const maxX = window.innerWidth - box.width - margin;
  const maxY = window.innerHeight - box.height - margin;
  el.style.left = `${Math.max(margin, Math.min(x, maxX))}px`;
  el.style.top = `${Math.max(margin, Math.min(y, maxY))}px`;
  el.style.visibility = "visible";
}

/**
 * Floating popup anchored to an element or screen point.
 * One instance at a time; next open closes the previous.
 *
 * @param {object} opts
 * @param {HTMLElement} [opts.anchor]
 * @param {{x:number,y:number}} [opts.position]
 * @param {string} [opts.title]
 * @param {number} [opts.width]
 * @param {(body: HTMLElement, api: { close: () => void, root: HTMLElement, setTitle: (t: string) => void }) => void} opts.render
 * @param {() => void} [opts.onClose]
 */
export function openPopup(opts) {
  injectPopupStyles();
  activePopup?.close();

  const root = document.createElement("div");
  root.className = "pc-popup-root";
  if (opts.width) root.style.width = `${opts.width}px`;
  root.addEventListener("pointerdown", (e) => e.stopPropagation());
  root.addEventListener("wheel", (e) => e.stopPropagation(), { passive: true });

  const titleEl = document.createElement("div");
  titleEl.className = "pc-popup-title";
  if (opts.title) titleEl.textContent = opts.title;
  else titleEl.style.display = "none";

  const body = document.createElement("div");
  body.className = "pc-popup-body";

  root.append(titleEl, body);

  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    document.removeEventListener("pointerdown", onDocDown, true);
    document.removeEventListener("keydown", onKey, true);
    root.remove();
    if (activePopup === api) activePopup = null;
    opts.onClose?.();
  }

  function onDocDown(e) {
    if (!root.contains(e.target) && e.target !== opts.anchor) close();
  }

  function onKey(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  }

  const api = {
    close,
    root,
    setTitle(text) {
      titleEl.style.display = text ? "" : "none";
      titleEl.textContent = text || "";
    },
  };

  opts.render?.(body, api);
  placePopup(root, opts);
  document.addEventListener("pointerdown", onDocDown, true);
  document.addEventListener("keydown", onKey, true);
  activePopup = api;
  return api;
}

/**
 * Name/value prompt built on openPopup.
 */
export function openInputPopup({
  anchor,
  position,
  title = "Name",
  placeholder = "",
  confirmLabel = "Add",
  initialValue = "",
  onSubmit,
} = {}) {
  return openPopup({
    anchor,
    position,
    title,
    width: 280,
    render(body, { close }) {
      const input = document.createElement("input");
      input.className = "pc-popup-input";
      input.type = "text";
      input.placeholder = placeholder;
      input.value = initialValue;

      const actions = document.createElement("div");
      actions.className = "pc-popup-actions";

      const confirm = document.createElement("button");
      confirm.type = "button";
      confirm.className = "pc-popup-btn primary";
      confirm.textContent = confirmLabel;

      function submit() {
        const value = input.value.trim();
        close();
        onSubmit?.(value);
      }

      confirm.addEventListener("click", (e) => {
        e.stopPropagation();
        submit();
      });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          submit();
        }
      });

      actions.appendChild(confirm);
      body.append(input, actions);
      requestAnimationFrame(() => input.focus());
    },
  });
}
