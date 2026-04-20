export const formatDate = (value) => {
  if (!value) {
    return "N/A";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
};

export const formatPercent = (value) => `${Math.round((value ?? 0) * 100)}%`;

export const formatCompactNumber = (value) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value ?? 0);

export const statusToLabel = (status) => status?.replace(/_/g, " ") ?? "Unknown";
