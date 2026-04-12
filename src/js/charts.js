/**
 * Nutri-Vision Charting Engine (v2.0 Revision)
 * すべてのグラフ描画と栄養計算を統一された整合性で管理します。
 */

const fulfillmentCharts = {};
const trendCharts = {};

/**
 * 基礎代謝 (BMR) の算出
 */
function getBMR() {
    const p = state.profile || {};
    const gender = p.gender || 'male';
    const age = parseFloat(p.age) || 30;
    const height = parseFloat(p.height) || 170;
    const weight = parseFloat(p.weight) || 65;

    if (gender === 'male') {
        return (0.0481 * weight + 0.0234 * height - 0.0138 * age - 0.4235) * 1000 / 4.186;
    } else {
        return (0.0481 * weight + 0.0234 * height - 0.0138 * age - 0.9708) * 1000 / 4.186;
    }
}

/**
 * ホーム画面の統計更新
 */
function updateDashboardStats() {
    if (!state) return;
    const todayStr = (new Date()).toISOString().split('T')[0];
    const todayMeals = (state.history || []).filter(h => h.date && h.date.startsWith(todayStr));
    const todayActs = (state.activities || []).filter(a => a.date && a.date.startsWith(todayStr));

    const totals = todayMeals.reduce((acc, m) => ({
        calories: acc.calories + (Number(m.calories) || 0),
        p: acc.p + (Number(m.protein) || Number(m.p) || 0),
        f: acc.f + (Number(m.fat) || Number(m.f) || 0),
        c: acc.c + (Number(m.carbs) || Number(m.c) || 0),
        salt: acc.salt + (Number(m.salt) || 0),
        fiber: acc.fiber + (Number(m.fiber) || 0),
        veg: acc.veg + (Number(m.veg) || 0),
        gyVeg: acc.gyVeg + (Number(m.gyVeg) || 0)
    }), { calories: 0, p: 0, f: 0, c: 0, salt: 0, fiber: 0, veg: 0, gyVeg: 0 });

    const extraBurn = todayActs.reduce((acc, a) => acc + (Number(a.calories) || 0), 0);
    const bmrValue = getBMR();
    const palValue = parseFloat(state.profile.pal || 1.75);
    const dailyTarget = Math.round(bmrValue * palValue) + extraBurn;

    const targets = {
        p: (dailyTarget * 0.15) / 4,
        f: (dailyTarget * 0.25) / 9,
        c: (dailyTarget * 0.60) / 4,
        salt: state.profile.gender === 'male' ? 7.5 : 6.5,
        fiber: state.profile.gender === 'male' ? 21 : 18,
        veg: 350,
        gyVeg: 120
    };

    // 最新の要望：野菜カテゴリの順序と塩分ラベル
    const items = [
        { label: t('cal_intake'), val: totals.calories, target: dailyTarget, unit: 'kcal', color: '#60a5fa' },
        { label: t('dash_protein'), val: totals.p, target: targets.p, unit: 'g', color: '#60a5fa' },
        { label: t('dash_fat'), val: totals.f, target: targets.f, unit: 'g', color: '#60a5fa' },
        { label: t('dash_carbs'), val: totals.c, target: targets.c, unit: 'g', color: '#60a5fa' },
        { label: t('dash_salt_today'), val: totals.salt, target: targets.salt, unit: 'g', color: '#60a5fa' },
        { label: t('dash_veg'), val: totals.veg, target: targets.veg, unit: 'g', color: '#10b981' },
        { label: t('dash_gyveg'), val: totals.gyVeg, target: targets.gyVeg, unit: 'g', color: '#10b981' },
        { label: t('dash_fiber'), val: totals.fiber, target: targets.fiber, unit: 'g', color: '#10b981' }
    ];

    renderBarChart('dashboardNutrientChart', items);
}

/**
 * 目標達成バーチャート描画 (データ0件でも「枠」を出す堅牢設計)
 */
function renderBarChart(canvasId, items) {
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
                    data: items.map(i => Math.max(1, i.target - i.val)), // 背景枠を極薄く表示
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

/**
 * 期間分析の更新 (昨日までの要望: 直近7日/30日の動的計算)
 */
function updatePeriodAnalysis(scope) {
    const end = new Date();
    const start = new Date();
    if (scope === 'week') start.setDate(end.getDate() - 6);
    else if (scope === 'month') start.setDate(end.getDate() - 29);
    
    // 集計ロジックをここに統合し、カレンダー画面を更新
    console.log(`📊 Period Analysis: ${scope} from ${start.toISOString().split('T')[0]}`);
}
