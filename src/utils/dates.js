function daysBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const ms = end - start;
  if (Number.isNaN(ms) || ms < 0) return null;
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

module.exports = { daysBetween };
