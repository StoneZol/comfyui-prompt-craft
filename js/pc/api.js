const LAYOUTS_URL = "/prompt_craft/layouts";

async function readJson(res) {
  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok && !data.error && !data.conflicts) {
    data.error = `Request failed (HTTP ${res.status})`;
  }
  return data;
}

export async function saveLayout({ name, description, slots, overwrite = false }) {
  const res = await fetch(LAYOUTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description, slots, overwrite }),
  });
  return readJson(res);
}

export async function listLayouts() {
  const res = await fetch(LAYOUTS_URL);
  return readJson(res);
}
