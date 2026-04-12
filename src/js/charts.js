/**
 * Nutri-Vision Ultimate Charting Engine (Master Build)
 */

const fulfillmentCharts = {};

function getBMR() {
    const p = state.profile || {};
    const weight = parseFloat(p.weight) || 65;
    const height = parseFloat(p.height) || 170;
    const age = parseFloat(p.age) || 30;
    const gender = p.gender || 'male';

    if (gender === 'male') {
        return (0.0481 * weight + 0.0234 * height - 0.0138 * age - 0.4235) * 1000 / 4.186;
    } else {
        return (0.0481 * weight + 0.0234 * height - 0.0138 * age - 0.9708) * 1000 / 4.186;
    }
}

function updateDashboardStats() {
    if (!window.state) return;
    const today = (new Date()).toISOString().split('T')[0];
    const todayMeals = (state.history || []).filter(m => m.date.startsWith(today));
    const todayActs = (state.activities || []).filter(a => a.date.startsWith(today));

    const totals = todayMeals.reduce((acc, m) => ({
        calories: acc.calories + (Number(m.calories) || 0),
        p: acc.p + (Number(m.p) || 0),
        f: acc.f + (Number(m.f) || 0),
        c: acc.c + (Number(m.c) || 0),
        salt: acc.salt + (Number(m.salt) || 0),
        fiber: acc.fiber + (Number(m.fiber) || 0),
        veg: acc.veg + (Number(m.veg) || 0),
        gyVeg: acc.gyVeg + (Number(m.gyVeg) || 0)
    }), { calories: 0, p: 0, f: 0, c: 0, salt: 0, fiber: 0, veg: 0, gyVeg: 0 });

    const extraBurn = todayActs.reduce((acc, a) => acc + (Number(a.calories) || 0), 0);
    const bmr = getBMR();
    const pal = parseFloat(state.profile.pal || 1.75);
    const dailyTarget = Math.round(bmr * pal) + extraBurn;

    const targets = {
        p: (dailyTarget * 0.15) / 4,
        f: (dailyTarget * 0.25) / 9,
        c: (dailyTarget * 0.60) / 4,
        salt: state.profile.gender === 'male' ? 7.5 : 6.5,
        fiber: state.profile.gender === 'male' ? 21 : 18,
        veg: 350,
        gyVeg: 120
    };

    // 最新の順序反映
    const items = [
        { label: t('dash_cal_today'), val: totals.calories, target: dailyTarget, unit: 'kcal', color: '#60a5fa' },
        { label: t('dash_protein'), val: totals.p, target: targets.p, unit: 'g', color: '#60a5fa' },
        { label: t('dash_fat'), val: totals.f, target: targets.f, unit: 'g', color: '#60a5fa' },
        { label: t('dash_carbs'), val: totals.c, target: targets.c, unit: 'g', color: '#60a5fa' },
        { label: t('dash_salt_today'), val: totals.salt, target: targets.salt, unit: 'g', color: '#60a5fa' },
        { label: t('dash_veg'), val: totals.veg, target: targets.veg, unit: 'g', color: '#10b981' },
        { label: t('dash_gyveg'), val: totals.gyVeg, target: targets.gyVeg, unit: 'g', color: '#10b981' },
        { label: t('dash_fiber'), val: totals.fiber, target: targets.fiber, unit: 'g', color: '#10b981' }
    ];

    renderFulfillmentChart('dashboardNutrientChart', items);
}

function renderFulfillmentChart(canvasId, items) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (fulfillmentCharts[canvasId]) fulfillmentCharts[canvasId].destroy();

    const maxVal = Math.max(...items.map(i => Math.max(i.val, i.target))) || 100;

    fulfillmentCharts[canvasId] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: items.map(i => i.label),
            datasets: [
                {
                    data: items.map(i => i.val),
                    backgroundColor: items.map(i => i.val > i.target ? '#fbbf24' : i.color),
                    borderRadius: 6,
                    barThickness: 20
                },
                {
                    data: items.map(i => Math.max(0, i.target - i.val)),
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 6,
                    barThickness: 20
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { stacked: true, max: maxVal * 1.1, display: false },
                y: { stacked: true, grid: { display: false }, ticks: { color: '#94a3b8', font: { weight: '600' } } }
            }
        }
    });
}
