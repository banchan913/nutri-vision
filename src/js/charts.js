let intakeChart = null;
let balanceChart = null;
let weightChart = null;
let vegFiberChart = null;

function getBMR() {
    const { gender, age, height, weight } = state.profile;
    if (gender === 'male') {
        return (0.0481 * weight + 0.0234 * height - 0.0138 * age - 0.4235) * 1000 / 4.186;
    } else {
        return (0.0481 * weight + 0.0234 * height - 0.0138 * age - 0.9708) * 1000 / 4.186;
    }
}

function updateDashboardStats() {
    const today = toCanonical(new Date().toLocaleDateString('ja-JP'));
    const todayMeals = state.history.filter(h => toCanonical(h.date) === today);
    const todayActs = state.activities.filter(a => toCanonical(a.date) === today);

    const totals = todayMeals.reduce((acc, meal) => ({
        calories: acc.calories + meal.calories,
        p: acc.p + meal.p,
        f: acc.f + meal.f,
        c: acc.c + meal.c,
        salt: acc.salt + (meal.salt || 0),
        fiber: acc.fiber + (meal.fiber || 0),
        veg: acc.veg + (meal.veg || 0),
        gyVeg: acc.gyVeg + (meal.gyVeg || 0)
    }), { calories: 0, p: 0, f: 0, c: 0, salt: 0, fiber: 0, veg: 0, gyVeg: 0 });

    const totalBurned = todayActs.reduce((acc, act) => acc + act.calories, 0);
    const bmr = getBMR();
    const pal = parseFloat(state.profile.pal || 1.75);
    const dailyTarget = Math.round(bmr * pal) + totalBurned;

    const targets = {
        p: (dailyTarget * 0.15) / 4,
        f: (dailyTarget * 0.25) / 9,
        c: (dailyTarget * 0.60) / 4,
        salt: state.profile.gender === 'male' ? 7.5 : 6.5,
        fiber: state.profile.gender === 'male' ? 21 : 18,
        veg: 350,
        gyVeg: 120
    };

    // [Phase 26] 充足度グラフを横棒グラフで統一
    const fulfillmentItems = [
        { label: t('cal_intake'), val: totals.calories, target: dailyTarget, unit: 'kcal', color: '#60a5fa' },
        { label: t('dash_protein'), val: totals.p, target: targets.p, unit: 'g', color: '#60a5fa' },
        { label: t('dash_fat'), val: totals.f, target: targets.f, unit: 'g', color: '#facc15' },
        { label: t('dash_carbs'), val: totals.c, target: targets.c, unit: 'g', color: '#fb923c' },
        { label: t('dash_salt_today'), val: totals.salt, target: targets.salt, unit: 'g', color: '#f87171' }
    ];
    renderFulfillmentChart('dashboardNutrientChart', fulfillmentItems);
    renderVegFiberChart(totals, targets);
}


function updateCharts() {
    const labels = [];
    const datasets = {
        intake: [], target: [],
        pRatio: [], fRatio: [], cRatio: [],
        weight: []
    };

    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = toCanonical(d.toLocaleDateString('ja-JP'));
        labels.push(`${d.getMonth() + 1}/${d.getDate()}`);

        const dayMeals = state.history.filter(h => toCanonical(h.date) === dateStr);
        const dayActs = state.activities.filter(a => toCanonical(a.date) === dateStr);

        const intake = dayMeals.reduce((s, e) => s + e.calories, 0);
        datasets.intake.push(intake);

        const totalBurned = dayActs.reduce((s, a) => s + a.calories, 0);
        const dailyTarget = Math.round(getBMR() * parseFloat(state.profile.pal || 1.75)) + totalBurned;
        datasets.target.push(dailyTarget);

        const totalCals = dayMeals.reduce((s, e) => s + e.calories, 0);
        if (totalCals > 0) {
            const p = (dayMeals.reduce((s, e) => s + e.p, 0) * 4 / totalCals) * 100;
            const f = (dayMeals.reduce((s, e) => s + e.f, 0) * 9 / totalCals) * 100;
            const c = (dayMeals.reduce((s, e) => s + e.c, 0) * 4 / totalCals) * 100;
            datasets.pRatio.push(p); datasets.fRatio.push(f); datasets.cRatio.push(c);
        } else {
            datasets.pRatio.push(0); datasets.fRatio.push(0); datasets.cRatio.push(0);
        }

        const weightEntry = dayMeals.find(h => h.weight);
        datasets.weight.push(weightEntry ? weightEntry.weight : null);
    }

    renderIntakeChart(labels, datasets.intake, datasets.target);
    renderPfcChart(labels, datasets.pRatio, datasets.fRatio, datasets.cRatio);
    renderWeightChart(labels, datasets.weight);
    updateAnalysisText(datasets.intake, datasets.target);
}

/**
 * 任意の期間の栄養素合計・平均を算出します。
 */
function getRangeStats(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dayMeals = state.history.filter(h => {
        const d = new Date(toCanonical(h.date));
        return d >= start && d <= end;
    });

    const days = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);

    const totals = dayMeals.reduce((acc, meal) => ({
        calories: acc.calories + meal.calories,
        p: acc.p + meal.p, f: acc.f + meal.f, c: acc.c + meal.c,
        salt: acc.salt + (meal.salt || 0),
        fiber: acc.fiber + (meal.fiber || 0),
        veg: acc.veg + (meal.veg || 0),
        gyVeg: acc.gyVeg + (meal.gyVeg || 0)
    }), { calories: 0, p: 0, f: 0, c: 0, salt: 0, fiber: 0, veg: 0, gyVeg: 0 });

    const avgs = {};
    Object.keys(totals).forEach(k => avgs[k] = totals[k] / days);

    return { totals, avgs, days };
}

/**
 * カレンダータブの期間分析を実行します。
 */
function updatePeriodAnalysis() {
    if (!state.selectedDateKey) return;
    const scope = state.calendarScope || 'day';
    const targetDate = new Date(state.selectedDateKey);

    let start, end;
    if (scope === 'day') {
        start = end = targetDate;
    } else if (scope === 'week') {
        start = new Date(targetDate);
        start.setDate(targetDate.getDate() - targetDate.getDay()); // 日曜日から
        end = new Date(start);
        end.setDate(start.getDate() + 6);
    } else if (scope === 'month') {
        start = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
        end = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
    }

    const { avgs, totals } = getRangeStats(start, end);
    const targetBMR = getBMR() * parseFloat(state.profile.pal || 1.75);

    const targets = {
        p: (targetBMR * 0.15) / 4,
        f: (targetBMR * 0.25) / 9,
        c: (targetBMR * 0.60) / 4,
        salt: state.profile.gender === 'male' ? 7.5 : 6.5,
        fiber: state.profile.gender === 'male' ? 21 : 18,
        veg: 350,
        gyVeg: 120
    };

    const fulfillmentItems = [
        { label: t('cal_intake_detailed'), val: avgs.calories, target: targetBMR, unit: 'kcal', color: '#60a5fa' },
        { label: t('dash_protein'), val: avgs.p, target: targets.p, unit: 'g', color: '#60a5fa' },
        { label: t('dash_fat'), val: avgs.f, target: targets.f, unit: 'g', color: '#facc15' },
        { label: t('dash_carbs'), val: avgs.c, target: targets.c, unit: 'g', color: '#fb923c' },
        { label: t('dash_salt_today'), val: avgs.salt, target: targets.salt, unit: 'g', color: '#f87171' },
        { label: t('dash_veg'), val: avgs.veg, target: targets.veg, unit: 'g', color: '#4ade80' },
        { label: t('dash_fiber'), val: avgs.fiber, target: targets.fiber, unit: 'g', color: '#3b82f6' },
        { label: t('dash_gyveg'), val: avgs.gyVeg, target: targets.gyVeg, unit: 'g', color: '#10b981' }
    ];

    const container = document.getElementById('cal-charts-container');
    if (container) container.style.display = 'flex';

    renderFulfillmentChart('calNutrientChart', fulfillmentItems);

    // 数値サマリーの更新 (マスター指定の8項目・色分け形式)
    const summary = document.getElementById('cal-summary-stats');
    if (summary) {
        summary.style.display = 'grid';
        summary.style.gridTemplateColumns = 'repeat(auto-fill, minmax(140px, 1fr))';
        summary.innerHTML = `
            <div style="font-size:12px;">${nLabel('cal_intake_detailed', Math.round(avgs.calories), ' kcal')}</div>
            <div style="font-size:12px;">${nLabel('dash_protein', avgs.p.toFixed(1))}</div>
            <div style="font-size:12px;">${nLabel('dash_fat', avgs.f.toFixed(1))}</div>
            <div style="font-size:12px;">${nLabel('dash_carbs', avgs.c.toFixed(1))}</div>
            <div style="font-size:12px;">${nLabel('dash_salt_today', avgs.salt.toFixed(1))}</div>
            <div style="font-size:12px;">${nLabel('dash_veg', avgs.veg.toFixed(0))}</div>
            <div style="font-size:12px;">${nLabel('dash_fiber', avgs.fiber.toFixed(1))}</div>
            <div style="font-size:12px;">${nLabel('dash_gyveg', avgs.gyVeg.toFixed(0))}</div>
        `;
    }
}

const fulfillmentCharts = {};
/**
 * 高度な横棒充足率グラフ（gと%を同時表示）
 */
function renderFulfillmentChart(canvasId, items) {
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    if (fulfillmentCharts[canvasId]) fulfillmentCharts[canvasId].destroy();

    const maxVal = Math.max(...items.map(d => Math.max(d.val, d.target))) * 1.35; // 数値見切れ防止を強化

    fulfillmentCharts[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: items.map(d => d.label),
            datasets: [{
                data: items.map(d => d.val),
                backgroundColor: items.map(d => d.color),
                borderRadius: 6,
                barThickness: 16
            }, {
                // 背景用のターゲットバー
                data: items.map(d => d.target),
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderRadius: 6,
                barThickness: 16
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true, maintainAspectRatio: false,
            scales: {
                x: { max: maxVal, display: false, grid: { display: false } },
                y: {
                    stacked: true,
                    grid: { display: false },
                    ticks: { color: '#cbd5e1', font: { weight: 'bold', size: 12 } }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false } // 常時表示のため無効化
            }
        },
        plugins: [{
            id: 'fulfillmentLabels',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                ctx.save();
                ctx.font = 'bold 11px Inter, sans-serif';
                ctx.textAlign = 'left';
                const meta = chart.getDatasetMeta(0);
                meta.data.forEach((element, index) => {
                    const d = items[index];
                    const ratio = Math.round((d.val / d.target) * 100);
                    ctx.fillStyle = d.color;
                    // バーの横に 「現在値 / 目標値 (比率)」 を表示
                    const labelText = `${d.val.toFixed(1)}${d.unit} / ${Math.round(d.target)}${d.unit} (${ratio}%)`;
                    ctx.fillText(labelText, element.x + 8, element.y + 5);
                });
                ctx.restore();
            }
        }]
    });
}

function renderIntakeChart(labels, intake, target) {
    const ctx = document.getElementById('intakeTargetChart')?.getContext('2d');
    if (!ctx) return;
    if (intakeChart) intakeChart.destroy();

    const maxVal = Math.max(...intake, ...target) * 1.25; // ユーザー要望：2500の時に2700まで表示できるようマージンを確保
    intakeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: t('cal_intake'), data: intake, backgroundColor: intake.map((v, i) => v > target[i] ? '#f87171' : '#60a5fa'), borderRadius: 4 },
                { label: currentLang === 'ja' ? '目標' : 'Target', data: target, backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.3)', borderWidth: 1, borderRadius: 4 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
                y: { 
                    max: maxVal, 
                    grid: { color: 'rgba(255,255,255,0.05)' }, 
                    ticks: { 
                        color: '#94a3b8',
                        callback: function(value, index, ticks) {
                            // 一番上の数字は表示しない
                            if (index === ticks.length - 1) return '';
                            return value;
                        }
                    } 
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }, // 棒の上にラベルを出すのでツールチップ不要
                // 数値を表示するカスタムプラグイン
                datalabels: {
                    display: true,
                    color: '#94a3b8',
                    align: 'top',
                    anchor: 'end',
                    font: { weight: 'bold', size: 10 },
                    formatter: v => Math.round(v)
                }
            }
        },
        plugins: [{
            id: 'valueLabel',
            afterDatasetsDraw(chart) {
                const { ctx, data } = chart;
                ctx.save();
                ctx.font = 'bold 10px Inter, sans-serif';
                ctx.fillStyle = '#cbd5e1';
                ctx.textAlign = 'center';
                data.datasets.forEach((dataset, i) => {
                    const meta = chart.getDatasetMeta(i);
                    meta.data.forEach((element, index) => {
                        const dataVal = dataset.data[index];
                        if (dataVal > 0) {
                            ctx.fillText(Math.round(dataVal), element.x, element.y - 5);
                        }
                    });
                });
                ctx.restore();
            }
        }]
    });
}

function renderPfcChart(labels, p, f, c) {
    const ctx = document.getElementById('pfcBalanceChart')?.getContext('2d');
    if (!ctx) return;
    if (balanceChart) balanceChart.destroy();
    balanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { label: t('dash_carbs'), data: c, fill: true, backgroundColor: 'rgba(251, 146, 60, 0.2)', borderColor: '#fb923c', tension: 0.4 },
                { label: t('dash_fat'), data: f, fill: true, backgroundColor: 'rgba(250, 204, 21, 0.2)', borderColor: '#facc15', tension: 0.4 },
                { label: t('dash_protein'), data: p, fill: true, backgroundColor: 'rgba(96, 165, 250, 0.2)', borderColor: '#60a5fa', tension: 0.4 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
                y: { stacked: true, max: 100, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', callback: v => v + '%' } }
            },
            plugins: {
                legend: { position: 'bottom', labels: { color: '#94a3b8', boxWidth: 10, font: { size: 10 } } },
                tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${c.raw.toFixed(1)}%` } }
            }
        },
        plugins: [{
            id: 'pfcLabel',
            afterDatasetsDraw(chart) {
                const { ctx, data } = chart;
                ctx.save();
                ctx.font = 'bold 9px Inter, sans-serif';
                ctx.fillStyle = '#cbd5e1';
                ctx.textAlign = 'center';
                data.datasets.forEach((dataset, i) => {
                    const meta = chart.getDatasetMeta(i);
                    meta.data.forEach((element, index) => {
                        const dataVal = dataset.data[index];
                        if (dataVal > 5) { // 小さすぎる値は非表示
                            ctx.fillText(Math.round(dataVal) + '%', element.x, element.y - 5);
                        }
                    });
                });
                ctx.restore();
            }
        }]
    });
}

function renderWeightChart(labels, weights) {
    const ctx = document.getElementById('weightTrendChart')?.getContext('2d');
    if (!ctx) return;
    if (weightChart) weightChart.destroy();

    const validWeights = weights.filter(w => w !== null);
    const minW = Math.min(...validWeights) * 0.98;
    const maxW = Math.max(...validWeights) * 1.05;

    weightChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{ label: currentLang === 'ja' ? '体重' : 'Weight', data: weights, borderColor: '#2dd4bf', backgroundColor: 'rgba(45, 212, 191, 0.1)', fill: true, tension: 0.4, spanGaps: true, pointRadius: 4, pointBackgroundColor: '#2dd4bf' }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
                y: { 
                    min: Math.floor(minW),
                    max: Math.ceil(maxW),
                    grid: { color: 'rgba(255,255,255,0.05)' }, 
                    ticks: { color: '#94a3b8' } 
                }
            },
            plugins: { legend: { display: false } }
        },
        plugins: [{
            id: 'weightLabel',
            afterDatasetsDraw(chart) {
                const { ctx, data } = chart;
                ctx.save();
                ctx.font = 'bold 10px Inter, sans-serif';
                ctx.fillStyle = '#2dd4bf';
                ctx.textAlign = 'center';
                const dataset = data.datasets[0];
                const meta = chart.getDatasetMeta(0);
                meta.data.forEach((element, index) => {
                    const dataVal = dataset.data[index];
                    if (dataVal) {
                        ctx.fillText(dataVal + 'kg', element.x, element.y - 8);
                    }
                });
                ctx.restore();
            }
        }]
    });
}

function renderVegFiberChart(totals, targets, canvasId = 'vegFiberChart') {
    const dataArr = [
        { label: t('dash_veg'), val: totals.veg, target: targets.veg, unit: 'g', color: '#4ade80' },
        { label: t('dash_fiber'), val: totals.fiber, target: targets.fiber, unit: 'g', color: '#3b82f6' },
        { label: t('dash_gyveg'), val: totals.gyVeg, target: targets.gyVeg, unit: 'g', color: '#10b981' }
    ];
    renderFulfillmentChart(canvasId, dataArr);
}

function updateWeightTrend(labels, weights) { // 既存の renderWeightChart への橋渡し用など
    renderWeightChart(labels, weights);
}

function updateAnalysisText(intakeArr, targetArr) {
    const intakeAvg = Math.round(intakeArr.reduce((a, b) => a + b, 0) / 7);
    const targetAvg = Math.round(targetArr.reduce((a, b) => a + b, 0) / 7);
    const achievement = Math.round((intakeAvg / targetAvg) * 100);

    const weeklyAvg = document.getElementById('weekly-avg-cal');
    const weeklyAchieve = document.getElementById('weekly-achievement');
    if (weeklyAvg) weeklyAvg.innerHTML = `${intakeAvg} <span class="unit">kcal</span>`;
    if (weeklyAchieve) weeklyAchieve.innerHTML = `${achievement} <span class="unit">%</span>`;

    const surplusPerDay = intakeAvg - targetAvg;
    const predictedChange = (surplusPerDay * 30) / 7200;
    const predictedWeight = (state.profile.weight + predictedChange).toFixed(1);
    const predictEl = document.getElementById('predicted-weight');
    if (predictEl) {
        predictEl.textContent = predictedWeight;
        predictEl.style.color = predictedChange > 0 ? '#f87171' : '#4ade80';
    }
}

function toCanonical(dStr) {
    if (!dStr) return '';
    try {
        const d = new Date(dStr.replace(/\//g, '-'));
        if (isNaN(d.getTime())) return dStr;
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    } catch (e) { return dStr; }
}

window.updateCharts = updateCharts;
window.updateDashboardStats = updateDashboardStats;
window.updatePeriodAnalysis = updatePeriodAnalysis;
window.getBMR = getBMR;
