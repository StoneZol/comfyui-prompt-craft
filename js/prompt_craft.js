import { app } from "../../../scripts/app.js";
import { loadConfig } from "./pc/config.js";
import { injectStyles } from "./pc/styles.js";
import { PLUS_ICON_SVG } from "./pc/icons.js";
import { makeGroupCard } from "./pc/group_card.js";
import { openInputPopup } from "./pc/popup.js";
import {
  createShadowString,
  hideOnCanvasKeepInPanel,
  isShadowFieldName,
  parseShadowFieldName,
} from "./pc/shadow_fields.js";

const config = await loadConfig();
injectStyles(config.style_id);

const MIN_NODE_WIDTH = 400;
const SOCKET_ROWS_HEIGHT = 56;
const ADD_BTN_HEIGHT = 28;
const CONTAINER_PADDING_V = 10;
const GAP_BETWEEN_SECTIONS = 8;
const GROUP_HEIGHT = 266;
const GROUP_GAP = 8;
const EMPTY_HINT_HEIGHT = 28;
const BOTTOM_SLACK = 12;
const MIN_VISIBLE_GROUPS = 1;
const LEFT_PULL = 10;
const KEPT_WIDGETS = new Set(["blocks_data", "prompt_craft_ui"]);

function newGroupId() {
  return `pc_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
}

function parseGroups(raw) {
  try {
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function stampLabels(title) {
  const name = (title || "").trim() || "Group";
  return {
    label_pos: `${name} | positive`,
    label_neg: `${name} | negative`,
  };
}

function groupTitleError(groups, title, exceptId) {
  const name = (title || "").trim();
  if (!name) return "Name is required";
  const key = name.toLowerCase();
  const taken = groups.some(
    (group) => group.id !== exceptId && (group.title || "").trim().toLowerCase() === key,
  );
  if (taken) return "Name already used";
  return "";
}

function hideDataWidget(widget) {
  if (!widget) return;
  widget.hidden = true;
  widget.computeSize = () => [0, -4];
  widget.draw = () => {};
  widget.mouse = () => false;
  widget.options = { ...(widget.options || {}), hidden: true };
  widget.type = "";
  const el = widget.element || widget.inputEl || widget.textEl || widget.domElement;
  if (el?.style) el.style.display = "none";
}

app.registerExtension({
  name: config.extension_name,

  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name !== config.node_class) return;

    const required = nodeData.input?.required;
    if (required?.blocks_data) {
      nodeData.input.hidden ??= {};
      nodeData.input.hidden.blocks_data = required.blocks_data;
      delete required.blocks_data;
    }

    const onNodeCreated = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function () {
      const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
      const node = this;

      if (node.size?.[0]) {
        const defaultHeight =
          SOCKET_ROWS_HEIGHT + ADD_BTN_HEIGHT + GAP_BETWEEN_SECTIONS + CONTAINER_PADDING_V + BOTTOM_SLACK + GROUP_HEIGHT;
        node.setSize([Math.max(node.size[0], MIN_NODE_WIDTH), Math.max(node.size[1] || 0, defaultHeight)]);
      }

      let dataWidget = node.widgets?.find((w) => w.name === "blocks_data");
      if (!dataWidget) {
        dataWidget = node.addWidget("text", "blocks_data", "[]", () => {}, {});
      }
      hideDataWidget(dataWidget);
      dataWidget.type = "";

      let groups = parseGroups(dataWidget?.value);
      const cards = new Map();

      const root = document.createElement("div");
      root.className = "pc-root";
      root.addEventListener("pointerdown", (e) => e.stopPropagation());
      root.addEventListener("wheel", (e) => e.stopPropagation());

      const header = document.createElement("div");
      header.className = "pc-header";

      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "pc-add-btn";
      addBtn.innerHTML = `${PLUS_ICON_SVG}<span>Add group</span>`;

      header.appendChild(addBtn);

      const groupsWrap = document.createElement("div");
      groupsWrap.className = "pc-groups";
      root.append(header, groupsWrap);

      function persist() {
        if (!dataWidget) return;
        dataWidget.value = JSON.stringify(groups);
        node.setDirtyCanvas(true, true);
      }

      function collectFromShadows() {
        for (const widget of node.widgets || []) {
          const parsed = parseShadowFieldName(widget.name);
          if (!parsed) continue;
          const group = groups.find((g) => g.id === parsed.id);
          if (group) group[parsed.key] = widget.value ?? "";
        }
      }

      function findShadow(name) {
        return node.widgets?.find((w) => w.name === name);
      }

      function bindShadow(widget, group, key) {
        const prev = widget.callback;
        widget.callback = function () {
          prev?.apply(this, arguments);
          const value = widget.value ?? "";
          group[key] = value;
          cards.get(group.id)?.setField(key, value);
          persist();
        };
      }

      function addShadows(group) {
        const labels = {
          pos: group.label_pos || stampLabels(group.title).label_pos,
          neg: group.label_neg || stampLabels(group.title).label_neg,
        };
        const pos = createShadowString(node, `${group.id}_positive`, group.positive, labels.pos);
        const neg = createShadowString(node, `${group.id}_negative`, group.negative, labels.neg);
        bindShadow(pos, group, "positive");
        bindShadow(neg, group, "negative");
        hideOnCanvasKeepInPanel(pos);
        hideOnCanvasKeepInPanel(neg);
      }

      function removeShadows(id) {
        const drop = new Set([`${id}_positive`, `${id}_negative`]);
        const widgets = node.widgets || [];
        for (let i = widgets.length - 1; i >= 0; i--) {
          if (!drop.has(widgets[i].name)) continue;
          widgets[i].onRemove?.();
          widgets.splice(i, 1);
        }
        if (node.inputs) {
          for (let i = node.inputs.length - 1; i >= 0; i--) {
            if (drop.has(node.inputs[i]?.name)) node.removeInput(i);
          }
        }
      }

      function writeShadow(group, key, value) {
        const widget = findShadow(`${group.id}_${key}`);
        if (!widget || widget.value === value) return;
        widget.value = value;
      }

      function computeRequiredHeights() {
        const count = groups.length;
        const chromeHeight = ADD_BTN_HEIGHT + GAP_BETWEEN_SECTIONS + CONTAINER_PADDING_V + BOTTOM_SLACK;
        const minVisible = count > 0 ? Math.min(count, MIN_VISIBLE_GROUPS) : 0;
        const floorGroupsHeight =
          minVisible > 0
            ? minVisible * GROUP_HEIGHT + (minVisible - 1) * GROUP_GAP
            : EMPTY_HINT_HEIGHT;
        return {
          floorNodeHeight: SOCKET_ROWS_HEIGHT + chromeHeight + floorGroupsHeight,
          chromeHeight,
        };
      }

      function syncWidth() {
        const nodeWidth = node.size?.[0] || MIN_NODE_WIDTH;
        root.style.width = `${nodeWidth}px`;
        root.style.maxWidth = `${nodeWidth}px`;
        root.style.marginLeft = `${-LEFT_PULL}px`;
        root.style.marginBottom = "0";
      }

      let isProgrammaticResize = false;

      function resizeNode() {
        syncWidth();
        const { floorNodeHeight, chromeHeight } = computeRequiredHeights();
        if ((node.size?.[1] || 0) < floorNodeHeight) {
          isProgrammaticResize = true;
          node.setSize([Math.max(node.size[0], MIN_NODE_WIDTH), floorNodeHeight]);
          isProgrammaticResize = false;
        }

        const bodyH = Math.max(
          (node.size[1] || 0) - SOCKET_ROWS_HEIGHT,
          chromeHeight + (groups.length ? GROUP_HEIGHT : EMPTY_HINT_HEIGHT),
        );
        root.style.height = `${bodyH}px`;
        root.style.maxHeight = `${bodyH}px`;
        root.style.minHeight = `${bodyH}px`;

        const available = bodyH - chromeHeight;
        const minList = groups.length ? GROUP_HEIGHT : EMPTY_HINT_HEIGHT;
        groupsWrap.style.maxHeight = `${Math.max(available, minList)}px`;
        groupsWrap.style.overflowY = "auto";
        node.setDirtyCanvas(true, true);
      }

      function renderCards() {
        groupsWrap.replaceChildren();
        cards.clear();
        if (groups.length === 0) {
          const empty = document.createElement("div");
          empty.className = "pc-empty";
          empty.textContent = "No groups yet";
          groupsWrap.appendChild(empty);
          return;
        }
        for (const group of groups) {
          const card = makeGroupCard(group, {
            onChange: persist,
            onRemove: () => removeGroup(group.id),
            onPrompt: (key, value) => writeShadow(group, key, value),
            onRename: (name) => groupTitleError(groups, name, group.id),
          });
          cards.set(group.id, card);
          groupsWrap.appendChild(card.el);
        }
      }

      function rebuildShadows() {
        collectFromShadows();
        const widgets = node.widgets || [];
        for (let i = widgets.length - 1; i >= 0; i--) {
          if (KEPT_WIDGETS.has(widgets[i].name) || !isShadowFieldName(widgets[i].name)) continue;
          widgets[i].onRemove?.();
          widgets.splice(i, 1);
        }
        for (const group of groups) addShadows(group);
        hideDataWidget(dataWidget);
      }

      function addGroup(title) {
        const error = groupTitleError(groups, title);
        if (error) return error;
        const name = title.trim();
        const group = {
          id: newGroupId(),
          title: name,
          positive: "",
          negative: "",
          ...stampLabels(name),
        };
        groups.push(group);
        persist();
        addShadows(group);
        renderCards();
        resizeNode();
        hideDataWidget(dataWidget);
        return "";
      }

      function removeGroup(id) {
        collectFromShadows();
        groups = groups.filter((g) => g.id !== id);
        persist();
        removeShadows(id);
        renderCards();
        resizeNode();
        hideDataWidget(dataWidget);
      }

      addBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openInputPopup({
          anchor: addBtn,
          title: "Add group",
          placeholder: "pair name",
          confirmLabel: "Add",
          validate: (value) => groupTitleError(groups, value),
          onSubmit: (value) => addGroup(value),
        });
      });

      const onResize = node.onResize;
      node.onResize = function () {
        const result = onResize ? onResize.apply(this, arguments) : undefined;
        hideDataWidget(dataWidget);
        for (const w of node.widgets || []) {
          if (isShadowFieldName(w.name)) hideOnCanvasKeepInPanel(w);
        }
        if (isProgrammaticResize) {
          syncWidth();
          return result;
        }
        resizeNode();
        return result;
      };

      const onConfigure = node.onConfigure;
      node.onConfigure = function () {
        const result = onConfigure ? onConfigure.apply(this, arguments) : undefined;
        const w = node.widgets?.find((x) => x.name === "blocks_data");
        hideDataWidget(w);
        groups = parseGroups(w?.value);
        rebuildShadows();
        renderCards();
        resizeNode();
        return result;
      };

      const uiWidget = node.addDOMWidget("prompt_craft_ui", "div", root, {
        serialize: false,
        hideOnZoom: false,
      });
      if (uiWidget) {
        uiWidget.serialize = false;
        uiWidget.options = {
          ...(uiWidget.options || {}),
          serialize: false,
          hideInPanel: true,
        };
      }

      function scanAndHideBlocksData() {
        hideDataWidget(dataWidget);
        const el = dataWidget?.element || dataWidget?.inputEl || dataWidget?.textEl || dataWidget?.domElement;
        if (el?.style) el.style.display = "none";
        let parent = root.parentElement;
        for (let i = 0; i < 8 && parent; i++) {
          parent.querySelectorAll?.("input, textarea").forEach((elm) => {
            if (root.contains(elm)) return;
            const val = elm.value;
            if (
              typeof val === "string" &&
              val.trim().startsWith("[") &&
              val.includes('"label_pos"')
            ) {
              const wrap = elm.closest?.("[data-testid='node-widget'], .lg-node-widget, label, .comfy-widget-row") || elm;
              wrap.style.display = "none";
            }
          });
          parent = parent.parentElement;
        }
      }

      renderCards();
      if (groups.length) rebuildShadows();
      syncWidth();
      setTimeout(() => {
        scanAndHideBlocksData();
        resizeNode();
      }, 0);
      [50, 150, 400, 1000].forEach((delay) => setTimeout(scanAndHideBlocksData, delay));

      return r;
    };
  },
});
