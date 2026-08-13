const CSS = `
.pc-root {
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-sizing: border-box;
  padding: 4px 2px 6px;
  width: 100%;
  overflow: hidden;
}

.pc-header {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
}

.pc-title-input,
.pc-textarea {
  box-sizing: border-box;
  width: 100%;
  color: var(--input-text, #ddd);
  background: var(--comfy-input-bg, #222);
  border: 1px solid var(--border-color, #444);
  border-radius: 6px;
  font-family: inherit;
  font-size: 12px;
}

.pc-title-input {
  height: 28px;
  padding: 0 8px;
  outline: none;
}

.pc-title-input:focus,
.pc-textarea:focus {
  border-color: var(--descrip-text, #888);
}

.pc-title-input.invalid {
  border-color: #c0392b;
}

.pc-add-btn {
  flex: 1 1 auto;
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 28px;
  padding: 0 10px;
  border-radius: 6px;
  border: 1px solid #6d5aa8;
  background: #2f2b3d;
  color: #e8e4f5;
  cursor: pointer;
  font-size: 12px;
  font-family: inherit;
  white-space: nowrap;
}

.pc-add-btn:hover {
  filter: brightness(1.15);
}

.pc-add-btn svg {
  width: 14px;
  height: 14px;
  display: block;
}

.pc-groups {
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-sizing: border-box;
  min-height: 0;
  overscroll-behavior: contain;
}

.pc-groups::-webkit-scrollbar {
  width: 8px;
}

.pc-groups::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 4px;
}

.pc-empty {
  color: var(--descrip-text, #888);
  font-size: 11px;
  padding: 8px 2px;
}

.pc-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid var(--border-color, #3a3a3a);
  background: color-mix(in srgb, var(--comfy-menu-bg, #1e1e1e) 88%, #000);
}

.pc-group-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
}

.pc-group-head {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pc-group-head .pc-title-input {
  flex: 1 1 auto;
  width: auto;
  min-width: 0;
}

.pc-group-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pc-group.collapsed .pc-group-body {
  display: none;
}

.pc-collapse-btn {
  flex: 0 0 28px;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--descrip-text, #888);
  cursor: pointer;
  padding: 0;
}

.pc-collapse-btn:hover {
  color: var(--input-text, #ddd);
  background: var(--comfy-input-bg, #2a2a2e);
  border-color: var(--border-color, #444);
}

.pc-collapse-btn svg {
  width: 14px;
  height: 14px;
  display: block;
  transition: transform 0.15s ease;
}

.pc-group.collapsed .pc-collapse-btn svg {
  transform: rotate(-90deg);
}

.pc-remove-btn {
  flex: 0 0 28px;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--descrip-text, #888);
  cursor: pointer;
  padding: 0;
}

.pc-remove-btn:hover {
  color: #ff8a80;
  background: #3a2323;
  border-color: #c0392b;
}

.pc-remove-btn svg {
  width: 14px;
  height: 14px;
  display: block;
}

.pc-field {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.pc-field-label {
  font-size: 10px;
  letter-spacing: 0.02em;
  color: var(--descrip-text, #888);
  user-select: none;
}

.pc-textarea {
  min-height: 72px;
  padding: 6px 8px;
  resize: vertical;
  line-height: 1.35;
  outline: none;
}

.lg-node [data-testid="node-widget"]:has([name="blocks_data"]),
.lg-node-widget:has([name="blocks_data"]),
[data-testid="node-widgets"] [data-testid="node-widget"]:has([name="blocks_data"]),
.lg-node [data-testid="node-widget"]:has([name^="pc_"][name$="_positive"]),
.lg-node [data-testid="node-widget"]:has([name^="pc_"][name$="_negative"]),
.lg-node-widget:has([name^="pc_"][name$="_positive"]),
.lg-node-widget:has([name^="pc_"][name$="_negative"]) {
  display: none !important;
  height: 0 !important;
  min-height: 0 !important;
  overflow: hidden !important;
  pointer-events: none !important;
}
`;

export function injectStyles(styleId) {
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = CSS;
    document.head.appendChild(style);
}
