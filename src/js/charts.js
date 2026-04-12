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
            labels: items.map(i => i.label),
            datasets: [
                {
                    label: 'Actual',
                    data: items.map(i => (i.val / i.target) * 100),
                    backgroundColor: items.map(i => i.color),
                    borderRadius: 6,
                    barThickness: 16
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { max: 150, min: 0, ticks: { callback: v => v + '%' } },
                y: { grid: { display: false } }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const item = items[ctx.dataIndex];
                            return `${item.val.toFixed(1)} / ${item.target.toFixed(1)}${item.unit} (${ctx.raw.toFixed(1)}%)`;
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

/**
 * Nutri-Vision gemini.js - AI Analysis Engine (Manual Start)
 */
async function analyzeMealWithGemini(file, note) {
    const key = state.settings.geminiApiKey;
    if (!key) throw new Error("APIキーが設定されていません。設定画面で登録してください。");

    // 画像とプロンプトを準備してAPIリクエストを投げるロジック
    // (ここでは構造のみ示す)
    const prompt = `分析してください。外食か自炊かも踏まえ、以下の8項目をJSONで返して。
    項目: calories, p, f, c, salt, veg, gyveg, fiber
    注意点: 自炊よりも外食の場合は脂質と塩分を多めに推定すること。
    ユーザーのメモ: ${note}`;
    
    // APIコール (fetch) ...
    return {
        calories: 650, p: 25, f: 18, c: 85, salt: 3.2, veg: 120, gyveg: 40, fiber: 5.5
    }; // ダミー返却
}
