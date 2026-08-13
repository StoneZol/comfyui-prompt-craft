const FIELD_RE = /^(pc_.+)_(positive|negative)$/;

export function hideOnCanvasKeepInPanel(widget) {
  if (!widget) return;
  widget.hidden = true;
  widget.hasLayoutSize = false;
  widget.serialize = false;
  widget.computeSize = () => [0, -4];
  widget.draw = () => {};
  widget.mouse = () => false;
  widget.options = {
    ...(widget.options || {}),
    serialize: false,
    minNodeSize: [0, 0],
  };
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
  const widget = node.addWidget("text", name, value || "", () => {}, {});
  widget.label = label;
  widget.value = value || "";
  hideOnCanvasKeepInPanel(widget);
  // Nodes 2.0 skips Vue rendering when type is falsy (`shouldRenderAsVue`).
  // Keep name/label/value so the side panel can still pin the field.
  widget.type = "";
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
