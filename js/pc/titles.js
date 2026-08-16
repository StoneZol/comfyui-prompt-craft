/** Strip trailing " (N)" so Pose (2) → Pose for library shelves. */
export function baseShelfName(title) {
  return (title || "").trim().replace(/\s+\(\d+\)$/, "");
}

/** Next free title: Pose → Pose (2) → Pose (3). */
export function nextDuplicateTitle(groups, title) {
  const base = baseShelfName(title) || "Group";
  const taken = new Set(
    (groups || []).map((group) => (group.title || "").trim().toLowerCase()).filter(Boolean),
  );
  let n = 2;
  while (taken.has(`${base} (${n})`.toLowerCase())) n += 1;
  return `${base} (${n})`;
}
