/**
 * Nutri-Vision Global Controller (Master Edition)
 * 全ての機能をシームレスに接続し、細部まで磨き上げます。
 */

window.state = {
    activeTab: 'dashboard',
    history: JSON.parse(localStorage.getItem('nutri_history') || '[]'),
    activities: JSON.parse(localStorage.getItem('nutri_activities') || '[]'),
    settings: JSON.parse(localStorage.getItem('nutri_settings') || '{"geminiApiKey":"","model":"gemini-1.5-flash"}'),
    profile: JSON.parse(localStorage.getItem('nutri_profile') || 'null'),
    currentMealImage: null,
    isInitializing: true,
    viewDate: new Date()
};
const state = window.state;

document.addEventListener('DOMContentLoaded', () => initApp());

async function initApp() {
    translatePage();
    initNavigation();
    initRecordingFunctions();
    initActivityButtons();
    initTimePresets();
    initTypeSelector();
    initPickers();
    initProfileSelectors();
    initApiTest();
    initProfileFields();
    initProfileSummary();

    if (!state.profile) {
        switchTab('settings');
        toggleProfileEdit(true);
        showAiMessage("まずはプロフィールを設定しましょう！");
    } else {
        renderApp();
        showAiMessage(t(getGreetKey()));
    }

    state.isInitializing = false;
}

function renderApp() {
    if (!state.profile) return;
    const targets = calculateDailyTargets(state.profile);
    const totals = calculateCurrentTotals();

    if (typeof renderDashboardCharts === 'function') renderDashboardCharts(totals, targets);
    const prediction = predictWeightTrend(state.history, state.activities, state.profile);
    if (typeof renderPredictionChart === 'function') renderPredictionChart(prediction);

    if (state.activeTab === 'calendar') renderCalendar();
}

/**
 * スクロールピッカーの初期化
 */
function initPickers() {
    const pickers = [
        { id: 'picker-age', min: 10, max: 100, suffix: '歳', target: 'profile-age' },
        { id: 'picker-height', min: 100, max: 230, suffix: 'cm', target: 'profile-height' },
        { id: 'picker-weight', min: 30, max: 200, suffix: 'kg', target: 'profile-weight' }
    ];

    pickers.forEach(p => {
        const el = document.getElementById(p.id);
        if (!el) return;
        el.innerHTML = '';

        // 空白
        el.innerHTML += '<div class="picker-item"></div>';
        for (let i = p.min; i <= p.max; i++) {
            const item = document.createElement('div');
            item.className = 'picker-item';
            item.textContent = `${i}${p.suffix}`;
            item.dataset.val = i;
            el.appendChild(item);
        }
        el.innerHTML += '<div class="picker-item"></div>';

        el.onscroll = () => {
            const itemHeight = 40;
            const index = Math.round(el.scrollTop / itemHeight);
            const items = el.querySelectorAll('.picker-item[data-val]');

            items.forEach((item, i) => {
                item.classList.toggle('selected', i === index);
                if (i === index) {
                    const targetEl = document.getElementById(p.target);
                    if (targetEl) targetEl.value = item.dataset.val;
                }
            });
        };

        const defaultIdx = Math.floor((p.max - p.min) / 2);
        setTimeout(() => el.scrollTo({ top: defaultIdx * 40, behavior: 'instant' }), 100);
    });
}

/**
 * 性別・活動レベルのボタンセレクター初期化
 */
function initProfileSelectors() {
    const genderBtns = document.querySelectorAll('#profile-gender-selector .segment-btn');
    genderBtns.forEach(btn => {
        btn.onclick = () => {
            genderBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('profile-gender').value = btn.dataset.val;
        };
    });

    const palOptions = document.querySelectorAll('.pal-option');
    palOptions.forEach(opt => {
        opt.onclick = () => {
            palOptions.forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            document.getElementById('profile-pal').value = opt.dataset.val;
        };
    });
}

/**
 * 運動時間のプリセット初期化
 */
function initTimePresets() {
    const btns = document.querySelectorAll('.time-btn');
    const hiddenInput = document.getElementById('act-manual-min');

    btns.forEach(btn => {
        btn.onclick = () => {
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            hiddenInput.value = btn.dataset.min;
        };
    });
}

/**
 * API接続テストの実装
 */
function initApiTest() {
    const testBtn = document.getElementById('api-test-btn');
    const resultArea = document.getElementById('api-test-results');
    if (!testBtn || !resultArea) return;

    testBtn.onclick = async () => {
        const apiKey = document.getElementById('gemini-api-key').value;
        if (!apiKey) {
            showAiMessage("APIキーを入力してください。");
            return;
        }

        testBtn.disabled = true;
        const originalHTML = testBtn.innerHTML;
        testBtn.innerHTML = '<i class="ph ph-circle-notch animate-spin"></i> テスト中...';
        resultArea.classList.add('hidden');

        try {
            const models = await testApiKeyConnection(apiKey);
            showAiMessage("接続に成功しました！✨");

            let html = '<div style="margin-bottom:8px; font-weight:700;">利用可能なモデル:</div>';
            models.forEach(m => {
                const name = m.name.replace('models/', '');
                const isRec = name === 'gemini-1.5-flash';
                html += `
                    <div class="model-item">
                        <span>${name}</span>
                        ${isRec ? '<span class="badge-recommended">推奨</span>' : ''}
                    </div>
                `;
            });
            resultArea.innerHTML = html;
            resultArea.classList.remove('hidden');
        } catch (err) {
            showAiMessage(err.message);
            resultArea.innerHTML = `<div style="color:var(--accent-error); padding:10px;">Error: ${err.message}</div>`;
            resultArea.classList.remove('hidden');
        } finally {
            testBtn.disabled = false;
            testBtn.innerHTML = originalHTML;
        }
    };
}

/**
 * ナビゲーション制御
 */
function initNavigation() {
    const navItems = document.querySelectorAll('.bottom-nav li');
    navItems.forEach(item => {
        item.onclick = () => {
            const tabId = item.getAttribute('data-tab');
            switchTab(tabId);
        };
    });
}

function switchTab(tabId) {
    state.activeTab = tabId;
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.bottom-nav li').forEach(l => l.classList.remove('active'));

    const targetTab = document.getElementById(`${tabId}-tab`);
    const targetNav = document.querySelector(`.bottom-nav li[data-tab="${tabId}"]`);

    if (targetTab) targetTab.classList.add('active');
    if (targetNav) targetNav.classList.add('active');

    renderApp();
}

/**
 * 記録機能の初期化
 */
function initRecordingFunctions() {
    const fileInput = document.getElementById('meal-file-input');
    const previewImg = document.getElementById('meal-preview');
    const previewContainer = document.getElementById('meal-preview-container');
    const analyzeBtn = document.getElementById('start-analysis-btn');

    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (re) => {
            state.currentMealImage = re.target.result;
            previewImg.src = state.currentMealImage;
            previewContainer.classList.remove('hidden');
            document.querySelector('.upload-placeholder').classList.add('hidden');
        };
        reader.readAsDataURL(file);
    };

    document.getElementById('remove-img-btn').onclick = (e) => {
        e.stopPropagation();
        state.currentMealImage = null;
        previewContainer.classList.add('hidden');
        document.querySelector('.upload-placeholder').classList.remove('hidden');
        fileInput.value = '';
    };

    analyzeBtn.onclick = async () => {
        const note = document.getElementById('meal-note').value;
        if (!state.currentMealImage) {
            showAiMessage(t('ana_error_img'));
            return;
        }

        analyzeBtn.disabled = true;
        const originalText = analyzeBtn.innerHTML;
        analyzeBtn.innerHTML = `<i class="ph ph-circle-notch animate-spin"></i> ${t('ana_analyzing')}`;

        try {
            const result = await analyzeMeal(state.currentMealImage, note);
            const entry = {
                ...result,
                id: Date.now(),
                date: new Date().toISOString(),
                image: state.currentMealImage
            };
            state.history.push(entry);
            localStorage.setItem('nutri_history', JSON.stringify(state.history));

            showAiMessage(t('ana_success'));
            // フォームリセット
            state.currentMealImage = null;
            previewContainer.classList.add('hidden');
            document.querySelector('.upload-placeholder').classList.remove('hidden');
            document.getElementById('meal-note').value = '';

            switchTab('dashboard');
        } catch (err) {
            showAiMessage(err.message || t('ana_error'));
        } finally {
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = originalText;
        }
    };
}

/**
 * 運動記録保存
 */
function saveActivity(actId) {
    if (!state.profile) return;

    const minutes = parseInt(document.getElementById('act-manual-min').value) || 15;
    const mets = METS_DB[actId] || 3.0;

    // 消費カロリー = METs * 体重kg * (時間min/60) * 1.05
    const caloriesBurned = mets * state.profile.weight * (minutes / 60) * 1.05;

    const activity = {
        id: Date.now(),
        type: actId,
        minutes: minutes,
        calories: Math.round(caloriesBurned),
        date: new Date().toISOString()
    };

    state.activities.push(activity);
    localStorage.setItem('nutri_activities', JSON.stringify(state.activities));

    showAiMessage(`${t('act_' + actId)} (${minutes}分) を記録しました！`);
    renderApp();
}

/**
 * 今日の合計栄養素を計算
 */
function calculateCurrentTotals() {
    const today = new Date().toISOString().split('T')[0];
    const todaysMeals = state.history.filter(h => h.date.startsWith(today));

    const totals = {
        calories: 0, p: 0, f: 0, c: 0, salt: 0, veg: 0, gyveg: 0, fiber: 0
    };

    todaysMeals.forEach(m => {
        totals.calories += m.calories || 0;
        totals.p += m.p || 0;
        totals.f += m.f || 0;
        totals.c += m.c || 0;
        totals.salt += m.salt || 0;
        totals.veg += m.veg || 0;
        totals.gyveg += m.gyveg || 0;
        totals.fiber += m.fiber || 0;
    });

    return totals;
}

/**
 * ユーティリティ
 */
function showAiMessage(msg) {
    const container = document.getElementById('ai-message-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'ai-toast';
    toast.innerHTML = `<i class="ph ph-sparkle"></i><p>${msg}</p>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function getGreetKey() {
    const h = new Date().getHours();
    if (h < 11) return 'ai_greet_morning';
    if (h < 17) return 'ai_greet_noon';
    return 'ai_greet_evening';
}

function initProfileFields() {
    if (!state.profile) return;
    document.getElementById('profile-age').value = state.profile.age;
    document.getElementById('profile-height').value = state.profile.height;
    document.getElementById('profile-weight').value = state.profile.weight;
    document.getElementById('profile-gender').value = state.profile.gender;
    document.getElementById('profile-pal').value = state.profile.pal;
}

function initProfileSummary() {
    const summary = document.getElementById('profile-summary');
    if (!summary || !state.profile) return;

    const targets = calculateDailyTargets(state.profile);
    summary.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px;">
            <div><strong>性別:</strong> ${t('set_' + state.profile.gender)}</div>
            <div><strong>年齢:</strong> ${state.profile.age}歳</div>
            <div><strong>目標摂取:</strong> ${targets.calories}kcal</div>
            <div><strong>活動レベル:</strong> ${state.profile.pal}</div>
        </div>
    `;
}

/**
 * 記録タブ内：食事と運動の切り替えロジック
 */
function initTypeSelector() {
    const btns = document.querySelectorAll('#record-type-selector .segment-btn');
    const mealArea = document.getElementById('meal-record-area');
    const activityArea = document.getElementById('activity-record-area');

    btns.forEach(btn => {
        btn.onclick = () => {
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const type = btn.getAttribute('data-type');

            if (type === 'meal') {
                mealArea.classList.remove('hidden');
                activityArea.classList.add('hidden');
            } else {
                mealArea.classList.add('hidden');
                activityArea.classList.remove('hidden');
                initActivityButtons();
            }
        };
    });
}

/**
 * カレンダー生成エンジン
 */
function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    const firstDay = new Date(year, month, 1);
    const dayOfWeek = firstDay.getDay();
    const lastDayNum = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < dayOfWeek; i++) {
        const empty = document.createElement('div');
        empty.className = 'calendar-day empty';
        grid.appendChild(empty);
    }

    for (let i = 1; i <= lastDayNum; i++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const hasMeal = state.history.some(h => h.date.startsWith(dateStr));
        const hasAct = state.activities.some(a => a.date.startsWith(dateStr));

        const dayEl = document.createElement('div');
        const isToday = i === today.getDate();
        dayEl.className = `calendar-day ${isToday ? 'today' : ''}`;
        dayEl.innerHTML = `
            <span class="day-num">${i}</span>
            <div class="marks">
                ${hasMeal ? '<span class="mark meal"></span>' : ''}
                ${hasAct ? '<span class="mark act"></span>' : ''}
            </div>
        `;
        dayEl.onclick = () => {
            document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
            dayEl.classList.add('selected');
            showDayDetails(dateStr);
        };
        grid.appendChild(dayEl);
    }
}

function showDayDetails(dateStr) {
    const detailEl = document.getElementById('selected-day-details');
    if (!detailEl) return;

    const meals = state.history.filter(h => h.date.startsWith(dateStr));
    const acts = state.activities.filter(a => a.date.startsWith(dateStr));

    if (meals.length === 0 && acts.length === 0) {
        detailEl.innerHTML = `<p>${t('cal_no_data')}</p>`;
    } else {
        let html = `<h4 style="margin-bottom:10px;">${dateStr} の記録</h4>`;
        if (meals.length > 0) {
            html += `<h5>食事</h5><ul>` + meals.map(m => `<li>${m.name} (${m.calories}kcal)</li>`).join('') + `</ul>`;
        }
        if (acts.length > 0) {
            html += `<h5 style="margin-top:10px;">運動</h5><ul>` + acts.map(a => `<li>${t('act_' + a.type)} (${a.minutes}分: ${a.calories}kcal)</li>`).join('') + `</ul>`;
        }
        detailEl.innerHTML = html;
    }
    detailEl.classList.remove('hidden');
}

/**
 * プロフィール・設定の管理
 */
function toggleProfileEdit(show) {
    const summary = document.getElementById('profile-summary');
    const editArea = document.getElementById('profile-edit-area');
    const editBtn = document.querySelector('[data-i18n="set_btn_edit"]');

    if (summary && editArea) {
        summary.style.display = show ? 'none' : 'block';
        editArea.style.display = show ? 'flex' : 'none';
        if (editBtn) editBtn.style.display = show ? 'none' : 'block';
    }
}

function saveProfile() {
    const age = parseInt(document.getElementById('profile-age').value);
    const height = parseInt(document.getElementById('profile-height').value);
    const weight = parseInt(document.getElementById('profile-weight').value);
    const gender = state.profile?.gender || 'male'; // ラジオボタン等のロジックは別途
    const pal = parseFloat(document.getElementById('profile-pal').value) || 1.5;

    if (!age || !height || !weight) {
        alert("入力が不足しています");
        return;
    }

    state.profile = { age, height, weight, gender, pal };
    localStorage.setItem('nutri_profile', JSON.stringify(state.profile));

    initProfileSummary();
    toggleProfileEdit(false);
    showAiMessage("設定を更新しました！");
    renderApp();
}

function saveSettings() {
    const key = document.getElementById('gemini-api-key').value;
    state.settings.geminiApiKey = key;
    localStorage.setItem('nutri_settings', JSON.stringify(state.settings));
    showAiMessage("API設定を保存しました✨");
}

function initActivityButtons() {
    const container = document.getElementById('activity-buttons');
    if (!container || container.children.length > 0) return;

    const acts = [
        { id: 'walking', icon: 'ph-walking' },
        { id: 'jogging', icon: 'ph-person-running' },
        { id: 'cycling', icon: 'ph-bicycle' },
        { id: 'swimming', icon: 'ph-waves' },
        { id: 'gym', icon: 'ph-barbell' },
        { id: 'yoga', icon: 'ph-leaf' },
        { id: 'stretching', icon: 'ph-person-arms-spread' },
        { id: 'cleaning', icon: 'ph-broom' }
    ];

    acts.forEach(act => {
        const btn = document.createElement('div');
        btn.className = 'act-btn';
        btn.innerHTML = `<i class="ph ${act.icon}"></i><p>${t('act_' + act.id)}</p>`;
        btn.onclick = () => saveActivity(act.id);
        container.appendChild(btn);
    });
}
