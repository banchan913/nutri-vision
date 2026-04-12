/**
 * Nutri-Vision charts.js - Visualization Engine
 */
let fulfillmentChart = null;
let predictionChart = null;

/**
 * ホームの8大栄養素チャート描画
 * @param {Object} totals - 現在の合計
 * @param {Object} targets - 目標値
 */
function renderDashboardCharts(totals, targets) {
    const ctx = document.getElementById('nutrientFulfillmentChart');
    if (!ctx) return;

    if (fulfillmentChart) fulfillmentChart.destroy();

    const items = [
        { label: t('dash_cal_intake'), val: totals.calories, target: targets.calories, unit: 'kcal', color: '#3b82f6' },
        { label: t('dash_protein'), val: totals.p, target: targets.p, unit: 'g', color: '#60a5fa' },
        { label: t('dash_fat'), val: totals.f, target: targets.f, unit: 'g', color: '#93c5fd' },
        { label: t('dash_carbs'), val: totals.c, target: targets.c, unit: 'g', color: '#bfdbfe' },
        { label: t('dash_salt'), val: totals.salt, target: targets.salt, unit: 'g', color: '#f59e0b' },
        { label: t('dash_veg'), val: totals.veg, target: targets.veg, unit: 'g', color: '#10b981' },
        { label: t('dash_gyveg'), val: totals.gyveg, target: targets.gyveg, unit: 'g', color: '#34d399' },
        { label: t('dash_fiber'), val: totals.fiber, target: targets.fiber, unit: 'g', color: '#6ee7b7' }
    ];

    fulfillmentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: items.map(i => `${i.label} (${Math.round(i.val)}${i.unit})`),
            datasets: [
                {
                    label: 'Actual %',
                    data: items.map(i => (i.val / i.target) * 100),
                    backgroundColor: items.map(i => (i.val / i.target) * 100 > 100 ? '#ef4444' : i.color),
                    borderRadius: 6,
                    barThickness: 18
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { 
                    max: 150, 
                    min: 0, 
                    grid: {
                        color: (context) => context.tick.value === 100 ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.05)',
                        lineWidth: (context) => context.tick.value === 100 ? 2 : 1
                    },
                    ticks: { 
                        stepSize: 20,
                        callback: v => v + '%' 
                    } 
                },
                y: { 
                    grid: { display: false },
                    ticks: {
                        font: { size: 11, weight: '600' },
                        color: '#94a3b8'
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(30, 41, 59, 0.9)',
                    titleFont: { size: 14 },
                    bodyFont: { size: 13 },
                    callbacks: {
                        label: (ctx) => {
                            const item = items[ctx.dataIndex];
                            return `実績: ${item.val.toFixed(1)}${item.unit} / 目標: ${item.target.toFixed(1)}${item.unit} (${ctx.raw.toFixed(1)}%)`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * 体重推移予測グラフの描画
 */
function renderPredictionChart(predictionData) {
    const ctx = document.getElementById('weightPredictionChart');
    if (!ctx) return;

    if (predictionChart) predictionChart.destroy();

    predictionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: predictionData.map(d => d.day),
            datasets: [{
                label: 'Projected Weight',
                data: predictionData.map(d => d.weight),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { display: false }, ticks: { maxTicksLimit: 7 } },
                y: { beginAtZero: false }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

