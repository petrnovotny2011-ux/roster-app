function toBool(v) {
  if (!v) return false;
  const s = String(v).trim().toLowerCase();
  return ["1", "true", "ano", "yes", "y"].includes(s);
}

module.exports = { toBool };