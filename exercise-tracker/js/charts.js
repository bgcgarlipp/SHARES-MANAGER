// Thin wrapper around the vendored Chart.js UMD build (window.Chart).

const chartInstances = new Map();

function destroyExisting(canvasId) {
  const existing = chartInstances.get(canvasId);
  if (existing) {
    existing.destroy();
    chartInstances.delete(canvasId);
  }
}

const AXIS_COLOR = getComputedStyle(document.documentElement).getPropertyValue("--muted") || "#888";

function baseOptions(extra = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: AXIS_COLOR, maxRotation: 0 }, grid: { display: false } },
      y: { ticks: { color: AXIS_COLOR }, grid: { color: "rgba(128,128,128,0.15)" }, beginAtZero: true },
    },
    ...extra,
  };
}

export function renderLineChart(canvasId, labels, datasets) {
  destroyExisting(canvasId);
  const el = document.getElementById(canvasId);
  if (!el) return null;
  const chart = new window.Chart(el, {
    type: "line",
    data: {
      labels,
      datasets: datasets.map((d) => ({
        tension: 0.3,
        pointRadius: 3,
        borderWidth: 2,
        fill: false,
        ...d,
      })),
    },
    options: baseOptions({ plugins: { legend: { display: datasets.length > 1, labels: { color: AXIS_COLOR } } } }),
  });
  chartInstances.set(canvasId, chart);
  return chart;
}

export function renderBarChart(canvasId, labels, data, color) {
  destroyExisting(canvasId);
  const el = document.getElementById(canvasId);
  if (!el) return null;
  const chart = new window.Chart(el, {
    type: "bar",
    data: { labels, datasets: [{ data, backgroundColor: color || "#4f8cff" }] },
    options: baseOptions(),
  });
  chartInstances.set(canvasId, chart);
  return chart;
}
