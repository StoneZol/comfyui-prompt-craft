import { app } from "../../../scripts/app.js";

const BUTTON_HEIGHT = 48;
const MARGIN = 15;
const REMOVE_WIDTH = 92;

function roundRectPath(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
        ctx.roundRect(x, y, w, h, radius);
        return;
    }
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
}

function canvasElement(node) {
    return (
        app.canvas?.canvas ||
        node?.graph?.list_of_graphcanvas?.[0]?.canvas ||
        globalThis.LGraphCanvas?.active_canvas?.canvas ||
        null
    );
}

function setCursor(node, cursor) {
    const el = canvasElement(node);
    if (el) el.style.cursor = cursor;
}

function hitTest(widget, pos) {
    const box = widget._hit;
    if (!box || !pos) return true;
    return (
        pos[0] >= box.x &&
        pos[0] <= box.x + box.w &&
        pos[1] >= box.y &&
        pos[1] <= box.y + box.h
    );
}

function isMove(type) {
    return (
        type === "pointermove" ||
        type === "mousemove" ||
        type === "pointerover"
    );
}

function isDown(type) {
    return type === "pointerdown" || type === "mousedown";
}

/**
 * Restyle a LiteGraph button widget and show pointer cursor on hover.
 * @param {"add" | "remove"} kind
 */
export function styleButton(
    widget,
    { label, kind = "add" } = {},
) {
    if (!widget) return widget;
    widget.label = label;
    widget.computeSize = (width) => [
        width || 400,
        BUTTON_HEIGHT,
    ];

    widget.draw = function (ctx, _node, widgetWidth, y, H) {
        const compact = kind === "remove";
        const bw = compact
            ? REMOVE_WIDTH
            : widgetWidth - MARGIN * 2;
        const bh = Math.min(H - 4, 26);
        const x = compact
            ? widgetWidth - MARGIN - bw
            : MARGIN;
        const yy = y + (H - bh) / 2;
        this._hit = { x, y: yy - y, w: bw, h: bh };

        const clicked = !!this.clicked;
        const hover = !!this._hover;

        ctx.save();
        if (kind === "remove") {
            ctx.fillStyle = clicked
                ? "#4a2a2a"
                : hover
                  ? "#3d2a2e"
                  : "#322428";
            ctx.strokeStyle = hover ? "#c05a5a" : "#8a4a4a";
        } else {
            ctx.fillStyle = clicked
                ? "#3d3560"
                : hover
                  ? "#3a3454"
                  : "#2f2b3d";
            ctx.strokeStyle = hover ? "#8b78c9" : "#6d5aa8";
        }
        ctx.lineWidth = 1;
        roundRectPath(ctx, x, yy, bw, bh, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle =
            kind === "remove" ? "#ffb4ae" : "#e8e4f5";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, x + bw / 2, yy + bh / 2 + 0.5);
        ctx.restore();
        this.clicked = false;
    };

    const origMouse = widget.mouse?.bind(widget);
    widget.mouse = function (event, pos, node) {
        const hover = hitTest(this, pos);
        if (hover !== this._hover) {
            this._hover = hover;
            node?.setDirtyCanvas?.(true, false);
        }
        if (hover) setCursor(node, "pointer");
        else setCursor(node, "default");

        if (isMove(event.type)) return hover;

        if (hover && isDown(event.type)) {
            this.clicked = true;
            this.callback?.(
                this.value,
                this,
                node,
                pos,
                event,
            );
            node?.setDirtyCanvas?.(true, true);
            return true;
        }

        if (origMouse && kind !== "remove") {
            return origMouse(event, pos, node);
        }
        return hover;
    };

    return widget;
}

export { BUTTON_HEIGHT };
