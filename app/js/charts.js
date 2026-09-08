/**
 * LA Real Estate Alerts — Charts (Chart.js)
 * Renders timeline, category distribution, and source charts.
 */

let chartsInitialized = false;
let chartTimeline = null;
let chartCategories = null;
let chartSources = null;

const CHART_COLORS = {
  zoning:       '#887bb5',
  rent:         '#b87a91',
  adu:          '#6aa19a',
  construction: '#b58c58',
  tax:          '#a6924b',
  policy:       '#68947a',
  legal:        '#a35f5f',
  other:        '#6a6870',
};

const CHART_LABELS = {
  zoning:       'Zonificación',
  rent:         'Rentas',
  adu:          'ADU',
  construction: 'Construcción',
  tax:          'Impuestos',
  policy:       'Política',
  legal:        'Legal',
  other:        'Otros',
};

// Chart.js global defaults for dark theme
function setChartDefaults() {
  Chart.defaults.color = '#5a5761';
  Chart.defaults.borderColor = 'rgba(196, 167, 126, 0.08)';
  Chart.defaults.font.family = "'Outfit', sans-serif";
  Chart.defaults.font.size = 12;
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.pointStyleWidth = 10;
  Chart.defaults.plugins.legend.labels.padding = 16;
}

// ──────────────────────────────────────────────
// Timeline chart (alerts per day)
// ──────────────────────────────────────────────
function buildTimelineChart(alerts) {
  const ctx = document.getElementById('chart-timeline');
  if (!ctx) return;

  // Group by date
  const countByDate = {};
  alerts.forEach(a => {
    if (!a.published) return;
    const dateKey = new Date(a.published).toISOString().slice(0, 10);
    countByDate[dateKey] = (countByDate[dateKey] || 0) + 1;
  });

  // Sort dates and fill gaps
  const dates = Object.keys(countByDate).sort();
  if (dates.length === 0) return;

  const filledDates = [];
  const filledCounts = [];
  const start = new Date(dates[0]);
  const end = new Date(dates[dates.length - 1]);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    filledDates.push(key);
    filledCounts.push(countByDate[key] || 0);
  }

  // Format labels
  const labels = filledDates.map(d => {
    const date = new Date(d + 'T00:00:00');
    return date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
  });

  if (chartTimeline) chartTimeline.destroy();

  chartTimeline = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Alertas',
        data: filledCounts,
        borderColor: '#b39263',
        backgroundColor: 'rgba(179, 146, 99, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: '#b39263',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          titleColor: '#232128',
          bodyColor: '#5a5761',
          borderColor: 'rgba(196, 167, 126, 0.3)',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 },
          grid: { color: 'rgba(196, 167, 126, 0.05)' },
        },
        x: {
          grid: { display: false },
        },
      },
    },
  });
}

// ──────────────────────────────────────────────
// Category distribution (doughnut)
// ──────────────────────────────────────────────
function buildCategoryChart(alerts) {
  const ctx = document.getElementById('chart-categories');
  if (!ctx) return;

  const countByCat = {};
  alerts.forEach(a => {
    const cat = a.category || 'other';
    countByCat[cat] = (countByCat[cat] || 0) + 1;
  });

  const cats = Object.keys(countByCat).sort((a, b) => countByCat[b] - countByCat[a]);
  const labels = cats.map(c => CHART_LABELS[c] || c);
  const data = cats.map(c => countByCat[c]);
  const colors = cats.map(c => CHART_COLORS[c] || '#6b7280');

  if (chartCategories) chartCategories.destroy();

  chartCategories = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderColor: '#ffffff',
        borderWidth: 3,
        hoverOffset: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'right',
        },
        tooltip: {
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          titleColor: '#232128',
          bodyColor: '#5a5761',
          borderColor: 'rgba(196, 167, 126, 0.3)',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${ctx.parsed} alertas`,
          },
        },
      },
    },
  });
}

// ──────────────────────────────────────────────
// Sources bar chart
// ──────────────────────────────────────────────
function buildSourcesChart(alerts) {
  const ctx = document.getElementById('chart-sources');
  if (!ctx) return;

  const countBySource = {};
  alerts.forEach(a => {
    const src = a.source || 'Desconocido';
    countBySource[src] = (countBySource[src] || 0) + 1;
  });

  // Top 8 sources
  const sorted = Object.entries(countBySource)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const labels = sorted.map(s => s[0]);
  const data = sorted.map(s => s[1]);

  if (chartSources) chartSources.destroy();

  chartSources = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Alertas',
        data,
        backgroundColor: 'rgba(179, 146, 99, 0.5)',
        hoverBackgroundColor: '#b39263',
        borderRadius: 4,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          titleColor: '#232128',
          bodyColor: '#5a5761',
          borderColor: 'rgba(196, 167, 126, 0.3)',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { stepSize: 1 },
          grid: { color: 'rgba(196, 167, 126, 0.05)' },
        },
        y: {
          grid: { display: false },
          ticks: {
            font: { size: 11 },
          },
        },
      },
    },
  });
}

// ──────────────────────────────────────────────
// Public init function (called from app.js)
// ──────────────────────────────────────────────
function initCharts(alerts) {
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js not loaded');
    return;
  }

  if (!chartsInitialized) {
    setChartDefaults();
    chartsInitialized = true;
  }

  buildTimelineChart(alerts);
  buildCategoryChart(alerts);
  buildSourcesChart(alerts);
}
