let intakeChart = null;
let balanceChart = null;
let weightChart = null;

function getBMR() {
    const { gender, age, height, weight } = state.profile;
    if (gender === 'male') {
        return (0.0481 * weight + 0.0234 * height - 0.0138 * age - 0.4235) * 1000 / 4.186;
    } else {
        return (0.0481 * weight + 0.0234 * height - 0.0138 * age - 0.9708) * 1000 / 4.186;
    }
}

function calculateAndDisplayStats() {
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

    const applyStatusColor = (val, target, type) => {
        if (type === 'salt') {
            if (val > target * 1.5) return 'status-red';
            if (val > target) return 'status-yellow';
            return 'status-blue';
        }
        if (type === 'fiber' || type === 'veg' || type === 'gyVeg') {
            if (val >= target) return 'status-blue';
            if (val >= target * 0.5) return 'status-yellow';
            return 'status-red';
        }
        const diff = (val / target);
        if (diff >= 0.8 && diff <= 1.2) return 'status-blue';
        if (diff > 1.2) return 'status-yellow';
        return '';
    };

    const calEl = document.getElementById('today-calories');
    const burnEl = document.getElementById('today-burned');
    if (calEl) calEl.innerHTML = `${totals.calories} <span class="unit">/ ${dailyTarget} kcal</span>`;
    if (burnEl) burnEl.innerHTML = `${totalBurned} <span class="unit">kcal</span>`;

    const calProgress = document.getElementById('calorie-progress');
    const saltProgress = document.getElementById('salt-progress');
    const calTargetLink = document.getElementById('calorie-target-display');
    const saltTargetLink = document.getElementById('salt-target-display');

    if (calProgress) calProgress.style.width = Math.min((totals.calories / dailyTarget) * 100, 100) + '%';
    if (saltProgress) saltProgress.style.width = Math.min((totals.salt / targets.salt) * 100, 100) + '%';
    if (calTargetLink) calTargetLink.textContent = `${t('target_prefix')}${dailyTarget} kcal`;
    if (saltTargetLink) saltTargetLink.textContent = `${t('target_prefix')}${targets.salt.toFixed(1)} g`;

    const updateCard = (id, val, target, unit, type) => {
        const el = document.getElementById(id); if (!el) return;
        el.innerHTML = `${val.toFixed(1)} <span class="unit">/ ${Math.round(target)}${unit}</span>`;
        el.className = 'card-value ' + applyStatusColor(val, target, type);
    };

    updateCard('today-p', totals.p, targets.p, 'g', 'p');
    updateCard('today-f', totals.f, targets.f, 'g', 'f');
    updateCard('today-c', totals.c, targets.c, 'g', 'c');
    updateCard('today-salt', totals.salt, targets.salt, 'g', 'salt');
    updateCard('today-fiber', totals.fiber, targets.fiber, 'g', 'fiber');
    updateCard('today-veg', totals.veg, targets.veg, 'g', 'veg');
    updateCard('today-gyveg', totals.gyVeg, targets.gyVeg, 'g', 'gyVeg');
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

function renderIntakeChart(labels, intake, target) {
    const ctx = document.getElementById('intakeTargetChart')?.getContext('2d');
    if (!ctx) return;
    if (intakeChart) intakeChart.destroy();
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
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }
            },
            plugins: {
                legend: { display: false },
                tooltip: { mode: 'index', intersect: false },
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
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }
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
window.calculateAndDisplayStats = calculateAndDisplayStats;
