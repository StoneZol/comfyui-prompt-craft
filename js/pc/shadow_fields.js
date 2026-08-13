const FIELD_RE = /^(pc_.+)_(positive|negative)$/;

export function hideOnCanvasKeepInPanel(widget) {
  if (!widget) return;
  // Vue node body uses widget.hidden. The side panel uses options.hidden /
  // options.canvasOnly — leave those unset so Inputs still shows the field.
  widget.hidden = true;
  widget.hasLayoutSize = false;
  widget.serialize = false;
  widget.computeSize = () => [0, -4];
  widget.draw = () => {};
  widget.mouse = () => false;
  widget.computeLayoutSize = () => ({ minHeight: 0, maxHeight: 0, minWidth: 0 });
  widget.options = {
    ...(widget.options || {}),
    serialize: false,
    multiline: true,
    minNodeSize: [0, 0],
  };
  delete widget.options.hidden;
  delete widget.options.canvasOnly;
  const el = widget.element || widget.inputEl || widget.textEl || widget.domElement;
  if (el?.style) {
    el.style.display = "none";
    el.style.opacity = "0";
    el.style.pointerEvents = "none";
    el.style.position = "absolute";
    el.style.width = "0";
    el.style.height = "0";
    el.style.overflow = "hidden";
  }
}

export function createShadowString(node, name, value, label) {
  const widget = node.addWidget("text", name, value || "", () => {}, { multiline: true });
  widget.label = label;
  widget.value = value || "";
  hideOnCanvasKeepInPanel(widget);
  // Keep a real type so the side panel can mount a textarea. Empty type
  // skips Vue rendering everywhere (`shouldRenderAsVue`).
  widget.type = "customtext";
  return widget;
}

export function isShadowFieldName(name) {
  return FIELD_RE.test(name || "");
}

export function parseShadowFieldName(name) {
  const match = FIELD_RE.exec(name || "");
  if (!match) return null;
  return { id: match[1], key: match[2] };
}
