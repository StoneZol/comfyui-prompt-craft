import { openConfirmPopup, openPopup } from "./popup.js";
import { saveLayout } from "./api.js";

export function openSavePresetsPopup({ anchor, groups }) {
  const slots = (groups || [])
    .map((group) => (group.title || "").trim())
    .filter(Boolean);

  if (!slots.length) {
    openConfirmPopup({
      anchor,
      title: "Save presets",
      message: "Add a group first.",
      confirmLabel: "OK",
      showCancel: false,
      danger: false,
    });
    return;
  }

  return openPopup({
    anchor,
    title: "Save presets",
    width: 320,
    render(body, { close }) {
      const hint = document.createElement("div");
      hint.className = "pc-save-slots";
      hint.textContent = slots.join(" · ");

      const title = document.createElement("input");
      title.className = "pc-popup-input";
      title.type = "text";
      title.placeholder = "preset name";

      const desc = document.createElement("textarea");
      desc.className = "pc-popup-textarea";
      desc.placeholder = "description (optional)";
      desc.rows = 3;

      const errorEl = document.createElement("div");
      errorEl.className = "pc-popup-error";

      const actions = document.createElement("div");
      actions.className = "pc-popup-actions";

      const confirm = document.createElement("button");
      confirm.type = "button";
      confirm.className = "pc-popup-btn primary";
      confirm.textContent = "Save";

      let overwrite = false;

      function resetOverwrite() {
        if (!overwrite) return;
        overwrite = false;
        confirm.textContent = "Save";
        confirm.classList.remove("danger");
        confirm.classList.add("primary");
      }

      async function submit() {
        const name = title.value.trim();
        title.classList.toggle("invalid", !name);
        if (!name) {
          errorEl.textContent = "Name is required";
          title.focus();
          return;
        }
        confirm.disabled = true;
        try {
          const result = await saveLayout({
            name,
            description: desc.value.trim(),
            slots,
            overwrite,
          });
          if (result.conflicts?.length) {
            errorEl.textContent = `Already exists: ${name}`;
            confirm.textContent = "Overwrite";
            confirm.classList.add("danger");
            confirm.classList.remove("primary");
            overwrite = true;
            return;
          }
          if (!result.ok) {
            errorEl.textContent = result.error || "Save failed";
            return;
          }
          close();
        } catch (err) {
          errorEl.textContent = err?.message || "Save failed";
        } finally {
          confirm.disabled = false;
        }
      }

      confirm.addEventListener("click", (e) => {
        e.stopPropagation();
        submit();
      });
      title.addEventListener("input", () => {
        title.classList.remove("invalid");
        if (errorEl.textContent) errorEl.textContent = "";
        resetOverwrite();
      });
      title.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          submit();
        }
      });

      actions.appendChild(confirm);
      body.append(hint, title, desc, errorEl, actions);
      requestAnimationFrame(() => title.focus());
    },
  });
}
