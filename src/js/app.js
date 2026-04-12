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
    initScopeSelector(); // 追加
    initPickers();
    initProfileSelectors();
    initApiTest();
    initProfileFields();
    initSettingsFields(); // 追加
    initProfileSummary();
    initConfirmationModal(); // 追加

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

        // PC向け：クリックで選択可能にする
        el.onclick = (e) => {
            const item = e.target.closest('.picker-item[data-val]');
            if (item) {
                const items = Array.from(el.querySelectorAll('.picker-item[data-val]'));
                const idx = items.indexOf(item);
                el.scrollTo({ top: idx * 40, behavior: 'smooth' });
            }
        };
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

            let html = '<div style="margin-bottom:12px; font-weight:700;">利用可能なモデル (タップして選択):</div>';
            models.forEach(m => {
                const name = m.name.replace('models/', '');
                const isFlash = name.includes('flash') || name.includes('lite');
                const isCurrent = name === (state.settings.model || "gemini-1.5-flash");
                
                html += `
                    <div class="model-item ${isCurrent ? 'active' : ''}" onclick="selectModel('${name}')">
                        <span style="font-family: monospace;">${name}</span>
                        <div class="model-badges">
                            ${isFlash ? '<span class="badge-recommended">推奨</span>' : ''}
                            ${isCurrent ? '<span class="badge-active">使用中</span>' : ''}
                        </div>
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
 * モデルを選択して保存する
 */
function selectModel(modelName) {
    state.settings.model = modelName;
    localStorage.setItem('nutri_settings', JSON.stringify(state.settings));
    
    // UI更新
    document.querySelectorAll('.model-item').forEach(el => {
        const name = el.querySelector('span').textContent;
        el.classList.toggle('active', name === modelName);
        
        // バッジ更新
        const badges = el.querySelector('.model-badges');
        const hasActiveBadge = badges.querySelector('.badge-active');
        if (name === modelName) {
            if (!hasActiveBadge) badges.insertAdjacentHTML('beforeend', '<span class="badge-active">使用中</span>');
        } else {
            if (hasActiveBadge) hasActiveBadge.remove();
        }
    });

    showAiMessage(`使用モデルを ${modelName} に変更しました！`);
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

    if (tabId !== 'record') closeConfirmModal(); // 記録以外では確認画面を閉じる
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

        const loader = document.getElementById('analysis-loading');
        const progress = document.getElementById('analysis-progress');
        const stepText = document.getElementById('analysis-step-text');
        
        loader.classList.remove('hidden');
        analyzeBtn.disabled = true;

        // フェイク進捗のアニメーション
        let p = 0;
        const pInterval = setInterval(() => {
            p += (100 - p) * 0.1;
            progress.style.width = `${p}%`;
            if (p > 30) stepText.textContent = "画像から料理を特定中...";
            if (p > 70) stepText.textContent = "栄養成分を精密に計算中...";
        }, 500);

        try {
            const result = await analyzeMeal(state.currentMealImage, note);
            clearInterval(pInterval);
            progress.style.width = '100%';
            
            setTimeout(() => {
                loader.classList.add('hidden');
                showConfirmModal(result);
            }, 500);

        } catch (err) {
            clearInterval(pInterval);
            loader.classList.add('hidden');
            if (err.message && err.message.includes("QUOTA_EXHAUSTED")) {
                showAiMessage(`<strong>【利用限度超過】</strong><br>${err.message}<br><br>※設定画面から <strong>gemini-1.5-flash</strong> に戻すと解決する場合があります。`);
            } else {
                showAiMessage(err.message || t('ana_error'));
            }
        } finally {
            analyzeBtn.disabled = false;
        }
    };
}

let pendingAnalysisResult = null;

function showConfirmModal(result) {
    pendingAnalysisResult = result;
    const modal = document.getElementById('confirm-modal');
    
    document.getElementById('conf-name').value = result.name;
    document.getElementById('conf-calories').value = result.calories;
    document.getElementById('conf-salt').value = result.salt;
    document.getElementById('conf-p').value = result.p;
    document.getElementById('conf-f').value = result.f;
    document.getElementById('conf-c').value = result.c;
    document.getElementById('conf-date').value = new Date().toISOString().split('T')[0];
    
    modal.classList.remove('hidden');
}

function closeConfirmModal() {
    document.getElementById('confirm-modal').classList.add('hidden');
    pendingAnalysisResult = null;
}

function initConfirmationModal() {
    const btns = document.querySelectorAll('.cat-btn');
    btns.forEach(btn => {
        btn.onclick = () => {
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // カテゴリに応じて数値を自動調整
            const cat = btn.dataset.val;
            if (!pendingAnalysisResult) return;

            let multiplier = 1.0;
            let saltMultiplier = 1.0;
            let fatMultiplier = 1.0;

            if (cat === 'eating_out') { multiplier = 1.3; saltMultiplier = 1.8; fatMultiplier = 1.5; }
            if (cat === 'convenience') { multiplier = 1.15; saltMultiplier = 1.4; fatMultiplier = 1.25; }
            if (cat === 'home') { multiplier = 0.9; saltMultiplier = 0.85; fatMultiplier = 0.85; }

            document.getElementById('conf-calories').value = Math.round(pendingAnalysisResult.calories * multiplier);
            document.getElementById('conf-salt').value = (pendingAnalysisResult.salt * saltMultiplier).toFixed(1);
            document.getElementById('conf-p').value = Math.round(pendingAnalysisResult.p * multiplier);
            document.getElementById('conf-f').value = Math.round(pendingAnalysisResult.f * fatMultiplier);
            document.getElementById('conf-c').value = Math.round(pendingAnalysisResult.c * multiplier);
        };
    });
}

function confirmSaveMeal() {
    const category = document.querySelector('.cat-btn.active').dataset.val;
    const name = document.getElementById('conf-name').value;
    const date = document.getElementById('conf-date').value;
    
    const entry = {
        ...pendingAnalysisResult,
        name: name,
        calories: parseInt(document.getElementById('conf-calories').value),
        salt: parseFloat(document.getElementById('conf-salt').value),
        p: parseInt(document.getElementById('conf-p').value),
        f: parseInt(document.getElementById('conf-f').value),
        c: parseInt(document.getElementById('conf-c').value),
        category: category,
        id: Date.now(),
        date: date, // ユーザーが変更した日付を使用
        image: state.currentMealImage
    };

    state.history.push(entry);
    localStorage.setItem('nutri_history', JSON.stringify(state.history));

    showAiMessage(`${name} を記録しました！✨`);
    
    // フォームリセット
    state.currentMealImage = null;
    document.getElementById('meal-preview-container').classList.add('hidden');
    document.querySelector('.upload-placeholder').classList.remove('hidden');
    document.getElementById('meal-note').value = '';

    closeConfirmModal();
    switchTab('dashboard');
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
 * カレンダーのスコープ切り替え (日/週/月)
 */
function initScopeSelector() {
    const btns = document.querySelectorAll('#analysis-scope-selector .segment-btn');
    btns.forEach(btn => {
        btn.onclick = () => {
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderCalendarTab();
        };
    });
}

function renderCalendarTab() {
    const scope = document.querySelector('#analysis-scope-selector .segment-btn.active').dataset.scope;
    const calendarView = document.getElementById('calendar-view-container');
    const navView = document.getElementById('calendar-header');
    const reportView = document.getElementById('aggregation-report');

    if (scope === 'day') {
        calendarView.classList.remove('hidden');
        navView.classList.remove('hidden');
        reportView.classList.add('hidden');
        renderCalendar();
    } else {
        calendarView.classList.add('hidden');
        navView.classList.add('hidden');
        reportView.classList.remove('hidden');
        renderAggregateReport(scope);
    }
}

/**
 * カレンダー生成エンジン
 */
function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const monthDisplay = document.getElementById('current-month-display');
    if (!grid || !monthDisplay) return;

    grid.innerHTML = '';
    
    // 現在の表示月をセット
    const year = state.viewDate.getFullYear();
    const month = state.viewDate.getMonth();
    monthDisplay.textContent = `${year}年 ${month + 1}月`;

    const firstDay = new Date(year, month, 1);
    const dayOfWeek = firstDay.getDay();
    const lastDayNum = new Date(year, month + 1, 0).getDate();

    // 空白埋め
    for (let i = 0; i < dayOfWeek; i++) {
        const empty = document.createElement('div');
        empty.className = 'calendar-day empty';
        grid.appendChild(empty);
    }

    const todayStr = new Date().toISOString().split('T')[0];

    for (let i = 1; i <= lastDayNum; i++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const hasMeal = state.history.some(h => h.date.startsWith(dateStr));
        const hasAct = state.activities.some(a => a.date.startsWith(dateStr));

        const dayEl = document.createElement('div');
        const isToday = dateStr === todayStr;
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

function changeMonth(offset) {
    state.viewDate.setMonth(state.viewDate.getMonth() + offset);
    renderCalendar();
}

/**
 * 集計レポートの描画 (週次/月次)
 */
function renderAggregateReport(scope) {
    const reportEl = document.getElementById('aggregation-report');
    if (!reportEl) return;

    // データのフィルタリング (週次: 直近7日, 月次: 表示月の全データ)
    let filteredHistory = [];
    let title = "";
    
    if (scope === 'week') {
        const start = new Date();
        start.setDate(start.getDate() - 7);
        filteredHistory = state.history.filter(h => new Date(h.date) >= start);
        title = "直近7日間の分析レポート";
    } else {
        // 今日から30日前を範囲にする
        const start = new Date();
        start.setDate(start.getDate() - 30);
        filteredHistory = state.history.filter(h => new Date(h.date) >= start);
        title = `直近30日間の分析レポート`;
    }

    const avg = calculateAverageNutrients(filteredHistory);
    const targets = calculateDailyTargets(state.profile);

    reportEl.innerHTML = `
        <h3 style="margin-bottom:20px; font-family:var(--font-accent);">${title}</h3>
        <div class="report-grid">
            <div class="report-card">
                <span>平均摂取カロリー</span>
                <div class="val">${Math.round(avg.calories)} kcal</div>
            </div>
            <div class="report-card">
                <span>目標カロリー</span>
                <div class="val">${targets.calories} kcal</div>
            </div>
            <div class="report-card full">
                <span>1日あたりの平均バランス</span>
                <div class="report-chart-container">
                    <canvas id="aggregateChart"></canvas>
                </div>
            </div>
        </div>
        <div class="report-card full" style="border-left: 4px solid var(--accent-success);">
            <p style="font-size:13px; color:var(--text-main); font-weight:600;">AIによる分析トピック</p>
            <p style="font-size:12px; color:var(--text-secondary); margin-top:5px;">
                ${filteredHistory.length > 0 ? 
                  `この期間は平均して目標の ${Math.round((avg.calories / targets.calories) * 100)}% のエネルギーを摂取しています。
                   ${avg.veg > 300 ? '野菜の摂取量が非常に安定しています！' : 'もう少し意識的に野菜を増やすとさらに良くなります。'}` 
                  : '十分なデータがありません。毎日の食事を記録しましょう！'}
            </p>
        </div>
    `;

    // 分析用グラフの描画
    setTimeout(() => {
        const ctx = document.getElementById('aggregateChart');
        if (ctx) renderSummaryChart(ctx, avg, targets);
    }, 100);
}

function calculateAverageNutrients(history) {
    if (history.length === 0) return { calories: 0, p: 0, f: 0, c: 0, salt: 0, veg: 0, gyveg: 0, fiber: 0 };
    
    // 日付ごとに集計
    const dailyTotals = {};
    history.forEach(h => {
        const date = h.date.split('T')[0];
        if (!dailyTotals[date]) dailyTotals[date] = { calories: 0, p: 0, f: 0, c: 0, salt: 0, veg: 0, gyveg: 0, fiber: 0 };
        dailyTotals[date].calories += h.calories || 0;
        dailyTotals[date].p += h.p || 0;
        dailyTotals[date].f += h.f || 0;
        dailyTotals[date].c += h.c || 0;
        dailyTotals[date].salt += h.salt || 0;
        dailyTotals[date].veg += h.veg || 0;
        dailyTotals[date].gyveg += h.gyveg || 0;
        dailyTotals[date].fiber += h.fiber || 0;
    });

    const dates = Object.keys(dailyTotals);
    const sum = { calories: 0, p: 0, f: 0, c: 0, salt: 0, veg: 0, gyveg: 0, fiber: 0 };
    dates.forEach(d => {
        for (let k in sum) sum[k] += dailyTotals[d][k];
    });

    for (let k in sum) sum[k] /= dates.length;
    return sum;
}

function renderSummaryChart(ctx, avg, targets) {
    new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['カロリー', 'P', 'F', 'C', '塩分', '野菜', '緑黄色', '繊維'],
            datasets: [{
                label: '平均達成度(%)',
                data: [
                    (avg.calories / targets.calories) * 100,
                    (avg.p / targets.p) * 100,
                    (avg.f / targets.f) * 100,
                    (avg.c / targets.c) * 100,
                    (avg.salt / targets.salt) * 100,
                    (avg.veg / targets.veg) * 100,
                    (avg.gyveg / targets.gyveg) * 100,
                    (avg.fiber / targets.fiber) * 100
                ],
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                borderColor: '#3b82f6',
                pointBackgroundColor: '#3b82f6'
            }]
        },
        options: {
            scales: {
                r: {
                    min: 0,
                    max: 120,
                    ticks: { display: false },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    angleLines: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function showDayDetails(dateStr) {
    const detailEl = document.getElementById('selected-day-details');
    if (!detailEl) return;

    const meals = state.history.filter(h => h.date.startsWith(dateStr));
    const acts = state.activities.filter(a => a.date.startsWith(dateStr));

    if (meals.length === 0 && acts.length === 0) {
        detailEl.innerHTML = `<p style="text-align:center; color:var(--text-secondary); padding:20px;">${t('cal_no_data')}</p>`;
    } else {
        let html = `<h4 style="margin-bottom:15px; font-family:var(--font-accent);">${dateStr} の詳細</h4>`;
        
        const dayTotals = { calories: 0, p: 0, f: 0, c: 0, salt: 0, veg: 0, gyveg: 0, fiber: 0 };

        if (meals.length > 0) {
            html += `<h5 style="margin:10px 0;">🥗 食事の記録</h5>`;
            html += meals.map(m => {
                dayTotals.calories += m.calories || 0;
                dayTotals.p += m.p || 0;
                dayTotals.f += m.f || 0;
                dayTotals.c += m.c || 0;
                dayTotals.salt += m.salt || 0;
                dayTotals.veg += m.veg || 0;
                dayTotals.gyveg += m.gyveg || 0;
                dayTotals.fiber += m.fiber || 0;

                return `
                <div class="detail-item-card">
                    <div class="detail-item-header">
                        <span class="detail-item-name">${m.name}</span>
                        <span style="color:var(--accent-success); font-weight:700;">${m.calories} kcal</span>
                    </div>
                    <div class="detail-nutrient-list">
                        <div class="detail-nutrient-row"><span class="detail-n-label">${t('n_protein')}</span><span class="detail-n-val">${m.p}g</span></div>
                        <div class="detail-nutrient-row"><span class="detail-n-label">${t('n_fat')}</span><span class="detail-n-val">${m.f}g</span></div>
                        <div class="detail-nutrient-row"><span class="detail-n-label">${t('n_carbs')}</span><span class="detail-n-val">${m.c}g</span></div>
                        <div class="detail-nutrient-row"><span class="detail-n-label">${t('n_salt')}</span><span class="detail-n-val">${m.salt}g</span></div>
                    </div>
                </div>`;
            }).join('');

            // 1日の合計達成度グラフ
            html += `<h5 style="margin:20px 0 10px;">📊 1日の栄養達成度</h5>
                     <div class="day-detail-chart-wrapper"><canvas id="dayDetailChart"></canvas></div>`;
        }
        
        if (acts.length > 0) {
            html += `<h5 style="margin:20px 0 10px;">🏃 運動の記録</h5>`;
            html += acts.map(a => `
                <div class="detail-item-card">
                    <div class="detail-item-header">
                        <span class="detail-item-name">${t('act_' + a.type)}</span>
                        <span style="color:var(--accent-warning); font-weight:700;">-${a.calories} kcal</span>
                    </div>
                    <div style="font-size:12px; color:var(--text-secondary);">${a.minutes} 分間</div>
                </div>
            `).join('');
        }
        detailEl.innerHTML = html;

        // グラフ描画
        if (meals.length > 0) {
            setTimeout(() => {
                const targets = calculateDailyTargets(state.profile);
                renderDayDetailChart('dayDetailChart', dayTotals, targets);
            }, 100);
        }
    }
    detailEl.classList.remove('hidden');
}

/**
 * 設定値の復元
 */
function initSettingsFields() {
    const keyInput = document.getElementById('gemini-api-key');
    if (keyInput && state.settings.geminiApiKey) {
        keyInput.value = state.settings.geminiApiKey;
    }
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
