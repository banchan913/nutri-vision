/**
 * Nutri-Vision app.js - Main Application Controller
 */

// Global App State
window.state = {
    activeTab: 'dashboard',
    history: JSON.parse(localStorage.getItem('nutri_history') || '[]'),
    activities: JSON.parse(localStorage.getItem('nutri_activities') || '[]'),
    settings: JSON.parse(localStorage.getItem('nutri_settings') || '{"geminiApiKey":"","model":"gemini-1.5-flash"}'),
    profile: JSON.parse(localStorage.getItem('nutri_profile') || 'null'),
    currentMealImage: null,
    isInitializing: true
};

/**
 * 初期化処理
 */
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    translatePage();
    initNavigation();
    initRecordingFunctions();
    initActivityButtons();

    // 初回起動チェック: プロフィールがなければ設定タブへ
    if (!state.profile) {
        switchTab('settings');
        showAiMessage("Nutri-Visionへようこそ！まずはプロフィールを設定しましょう。");
    } else {
        renderApp();
        showAiMessage(t(getGreetKey()));
    }
    
    state.isInitializing = false;
}

/**
 * メイン描画エンジン
 */
function renderApp() {
    if (!state.profile) return;

    const targets = calculateDailyTargets(state.profile);
    const totals = calculateCurrentTotals();
    
    renderDashboardCharts(totals, targets);
    
    // 体重予測の描画
    const prediction = predictWeightTrend(state.history, state.activities, state.profile);
    renderPredictionChart(prediction);
}

/**
 * 栄養合計の計算
 */
function calculateCurrentTotals() {
    const today = new Date().toISOString().split('T')[0];
    const todayMeals = state.history.filter(h => h.date.startsWith(today));
    
    return todayMeals.reduce((acc, m) => ({
        calories: acc.calories + (m.calories || 0),
        p: acc.p + (m.p || 0),
        f: acc.f + (m.f || 0),
        c: acc.c + (m.c || 0),
        salt: acc.salt + (m.salt || 0),
        veg: acc.veg + (m.veg || 0),
        gyveg: acc.gyveg + (m.gyveg || 0),
        fiber: acc.fiber + (m.fiber || 0)
    }), { calories: 0, p: 0, f: 0, c: 0, salt: 0, veg: 0, gyveg: 0, fiber: 0 });
}

/**
 * タブ切り替え
 */
function switchTab(tabId) {
    state.activeTab = tabId;
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.getElementById(`${tabId}-tab`).classList.add('active');
    
    document.querySelectorAll('.bottom-nav li').forEach(li => {
        li.classList.toggle('active', li.getAttribute('data-tab') === tabId);
    });

    if (!state.isInitializing) renderApp();
}

/**
 * ナビゲーション初期化
 */
function initNavigation() {
    document.querySelectorAll('.bottom-nav li').forEach(li => {
        li.onclick = () => switchTab(li.getAttribute('data-tab'));
    });
}

/**
 * 運動ボタン（15分単位）の初期化
 */
function initActivityButtons() {
    const container = document.getElementById('activity-buttons');
    if (!container) return;

    const activities = [
        { id: 'walking', icon: 'ph-walking', label: '歩行' },
        { id: 'cycling', icon: 'ph-bicycle', label: 'サイクリング' },
        { id: 'cleaning', icon: 'ph-broom', label: '家事' },
        { id: 'gym', icon: 'ph-barbell', label: 'ジム' }
    ];

    activities.forEach(act => {
        const btn = document.createElement('div');
        btn.className = 'act-btn';
        btn.innerHTML = `<i class="ph ${act.icon}"></i><p>${act.label}</p>`;
        btn.onclick = () => saveActivity(act.id);
        container.appendChild(btn);
    });
}

/**
 * 運動の保存
 */
function saveActivity(id) {
    const min = parseInt(document.getElementById('act-manual-min').value) || 15;
    const mets = METS_DB[id] || 3.0;
    const weight = state.profile ? state.profile.weight : 60;
    
    // カロリー = METs * 体重(kg) * 時間(h) * 1.05
    const cals = Math.round(mets * weight * (min / 60) * 1.05);
    
    const newAct = {
        id: Date.now(),
        date: new Date().toISOString(),
        type: id,
        minutes: min,
        calories: cals
    };
    
    state.activities.push(newAct);
    localStorage.setItem('nutri_activities', JSON.stringify(state.activities));
    showAiMessage(`${min}分の活動を記録しました。-${cals}kcal！`);
    renderApp();
}

/**
 * 食事記録フロー (解析開始ボタン制御)
 */
function initRecordingFunctions() {
    const fileInput = document.getElementById('meal-file-input');
    const startBtn = document.getElementById('start-analysis-btn');
    
    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (re) => {
            document.getElementById('meal-preview').src = re.target.result;
            document.getElementById('meal-preview-container').classList.remove('hidden');
            state.currentMealImage = file;
        };
        reader.readAsDataURL(file);
    };
    
    startBtn.onclick = async () => {
        const note = document.getElementById('meal-note').value;
        if (!state.currentMealImage && !note) {
            alert("画像または文章を入力してください。");
            return;
        }
        
        startBtn.disabled = true;
        startBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> 解析中...';
        
        try {
            const result = await analyzeMealWithGemini(state.currentMealImage, note);
            saveMeal(result);
            showAiMessage("解析が完了しました！栄養素を記録しました。");
            switchTab('dashboard');
        } catch (e) {
            alert(e.message);
        } finally {
            startBtn.disabled = false;
            startBtn.innerHTML = `<i class="ph ph-sparkle"></i> ${t('rec_btn_analyze')}`;
        }
    };
}

/**
 * 食事の保存
 */
function saveMeal(data) {
    const newMeal = {
        id: Date.now(),
        date: new Date().toISOString(),
        ...data
    };
    state.history.push(newMeal);
    localStorage.setItem('nutri_history', JSON.stringify(state.history));
    renderApp();
}

/**
 * 寄り添うスタッフのメッセージ
 */
function showAiMessage(text) {
    const container = document.getElementById('ai-message-container');
    const toast = document.createElement('div');
    toast.className = 'ai-toast';
    toast.innerHTML = `<div style="font-size:24px;">👩‍⚕️</div><div style="font-size:13px; font-weight:500;">${text}</div>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function getGreetKey() {
    const hour = new Date().getHours();
    if (hour < 11) return 'ai_greet_morning';
    if (hour < 17) return 'ai_greet_noon';
    return 'ai_greet_evening';
}
