// App State & UI Controller (Exposed globally for inter-script access)
window.state = {
    activeTab: 'dashboard',
    history: JSON.parse(localStorage.getItem('nutri_history') || '[]'),
    activities: JSON.parse(localStorage.getItem('nutri_activities') || '[]'),
    profile: JSON.parse(localStorage.getItem('nutri_profile') || '{"gender":"male","age":30,"height":170,"weight":65,"pal":1.75}'),
    geminiKey: localStorage.getItem('gemini_api_key') || '',
    gasUrl: localStorage.getItem('gas_url') || '',
    detectedModel: localStorage.getItem('detected_model') || 'gemini-1.5-flash',
    setupComplete: localStorage.getItem('nutri_setup_complete') === 'true',
    viewDate: new Date(),
    isUpdating: false,
    isInitializing: true,
    calendarScope: 'day',
    selectedDateKey: (new Date()).getFullYear() + '-' + String((new Date()).getMonth() + 1).padStart(2, '0') + '-' + String((new Date()).getDate()).padStart(2, '0')
};
const state = window.state;

const METS_MAP = { walking: 3.5, jogging: 7.0, cycling: 4.0, cleaning: 3.3, stairs: 4.0, training: 5.0 };

/**
 * 賢明なるマスター、状態の変更はすべてこの関数を通じて行われます。
 * これにより、データの一貫性とUIの同期を聖杯の如く守護します。
 */
function setState(newState) {
    Object.assign(state, newState);
    
    // 永続化が必要なキーの同期
    if (newState.history) localStorage.setItem('nutri_history', JSON.stringify(state.history));
    if (newState.activities) localStorage.setItem('nutri_activities', JSON.stringify(state.activities));
    if (newState.profile) localStorage.setItem('nutri_profile', JSON.stringify(state.profile));
    
    renderApp();
}

/**
 * 賢明なるマスター、各コンポーネントの再描画を一手に引き受ける枢要なる関数です。
 */
function renderApp() {
    // 1. 各統計の更新（依存関係があるためwindow経由で存在確認）
    if (window.updateDashboardStats) {
        window.updateDashboardStats();
    }

    // 2. アクティブなタブに応じた更新
    if (state.activeTab === 'dashboard') {
        if (window.updateCharts) window.updateCharts();
    } else if (state.activeTab === 'calendar') {
        if (window.renderCalendar) window.renderCalendar();
    } else if (state.activeTab === 'history') {
        if (window.renderHistoryList) window.renderHistoryList();
    }

    // 3. その他同期
    if (window.updateUserStatus) window.updateUserStatus();
}

/**
 * 寄り添うスタッフからのメッセージを表示します
 */
function showAiMessage(text, duration = 5000) {
    let container = document.getElementById('ai-message-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'ai-message-container';
        container.style = 'position:fixed; bottom:85px; left:50%; transform:translateX(-50%); z-index:9999; width:90%; max-width:400px; pointer-events:none;';
        document.body.appendChild(container);
    }

    const msg = document.createElement('div');
    msg.className = 'ai-toast';
    msg.style = 'background:rgba(30,41,59,0.95); backdrop-filter:blur(10px); color:white; padding:12px 16px; border-radius:16px; margin-top:10px; border:1px solid rgba(255,255,255,0.1); box-shadow:0 10px 25px rgba(0,0,0,0.3); display:flex; align-items:flex-start; gap:12px; animation: slideUp 0.4s ease-out; pointer-events:auto;';
    
    // 寄り添うスタッフのアイコン（絵文字）
    const icon = '👩‍⚕️'; 
    msg.innerHTML = `
        <div style="font-size:24px;">${icon}</div>
        <div style="font-size:13px; line-height:1.5; font-weight:500;">${text}</div>
    `;

    container.appendChild(msg);

    // フェードアウトと削除
    setTimeout(() => {
        msg.style.opacity = '0';
        msg.style.transform = 'translateY(10px)';
        msg.style.transition = 'all 0.5s ease-in';
        setTimeout(() => msg.remove(), 500);
    }, duration);
}

/**
 * BMIに基づいたアドバイスを表示します
 */
function showBmiAdvice() {
    const { weight, height } = state.profile;
    const hMeter = height / 100;
    const bmi = weight / (hMeter * hMeter);
    
    let adviceKey = 'ai_bmi_normal';
    if (bmi < 18.5) adviceKey = 'ai_bmi_under';
    else if (bmi >= 25) adviceKey = 'ai_bmi_over';
    
    setTimeout(() => {
        showAiMessage(t(adviceKey));
    }, 1500);
}

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    try {
        translatePage(); // [New] i18n
        // [New] URLハッシュによる設定復元魔法
        checkUrlHashForConfig();

        // [New] 初回ガイドの判定
        checkOnboarding();

        initNavigation();
        initSettings();
        initProfileSegmentLogic(); // [Phase 25] 先に要素を作る
        initProfileFields();        // その後に値を流し込む
        initActivitySegmentLogic();
        initCalendarSegmentLogic();
        
        // [Phase 31] 初期プロフィールサマリーの更新
        updateProfileSummary();
        if (state.setupComplete) toggleProfileEdit(false);
        
        renderApp();
        
        // [Phase 16] 起動時のタブを確実に反映（初回は settings、2回目以降は dashboard）
        switchTab(state.activeTab);

        // [New] 寄り添う挨拶
        const hour = new Date().getHours();
        let greetKey = 'ai_greet_morning';
        if (hour >= 11 && hour < 17) greetKey = 'ai_greet_noon';
        else if (hour >= 17 && hour < 22) greetKey = 'ai_greet_evening';
        else if (hour >= 22 || hour < 5) greetKey = 'ai_greet_night';
        
        setTimeout(() => {
            showAiMessage(t(greetKey));
        }, 800);

        // [Phase 24] ピッカーの初期スクロールが完了するまで待ってから初期化フラグを解除
        setTimeout(() => {
            state.isInitializing = false;
            console.log("Master, initialization stabilized.");
        }, 1500); 
    } catch (e) {
        console.error("Master, initialization failed:", e);
    }
}

function checkOnboarding() {
    if (!state.setupComplete) {
        state.activeTab = 'settings';
        // HTML要素の制御は renderApp で行う
    }
}

function finishSetup() {
    // [Phase 18] 完了前に現在の各フィールドの値を確実に保存
    saveProfile(false);
    
    // APIキーやURLも念のため現在の入力から確定させる
    const keyInput = document.getElementById('gemini-key');
    if (keyInput) {
        state.geminiKey = keyInput.value;
        localStorage.setItem('gemini_api_key', keyInput.value);
    }
    const gasInput = document.getElementById('gas-url');
    if (gasInput) {
        state.gasUrl = gasInput.value;
        localStorage.setItem('gas_url', gasInput.value);
    }

    state.setupComplete = true;
    localStorage.setItem('nutri_setup_complete', 'true');
    switchTab('dashboard');
    alert(t('msg_setup_done'));
}

function checkUrlHashForConfig() {
    const hash = window.location.hash;
    if (hash && hash.includes('gas=')) {
        try {
            const params = new URLSearchParams(hash.substring(1));
            const gas = params.get('gas');
            const gemini = params.get('gemini');
            
            if (gas) {
                state.gasUrl = gas;
                localStorage.setItem('gas_url', gas);
            }
            if (gemini) {
                state.geminiKey = gemini;
                localStorage.setItem('gemini_api_key', gemini);
            }
            
            // 復元後はURLを綺麗にする
            window.history.replaceState(null, null, window.location.pathname);
            alert(t('msg_qr_restored'));
        } catch(e) { console.error('Hash config restore failed', e); }
    }
}

function showTransferQR() {
    const gas = state.gasUrl;
    const gemini = state.geminiKey;
    
    if (!gas) {
        alert('先にGASのURLを設定してください。');
        return;
    }
    
    // [Phase 14] 公開URL（GitHub Pages）を優先するように指示
    let baseUrl = window.location.href.split('#')[0];
    if (baseUrl.startsWith('file:')) {
        baseUrl = 'https://banchan913.github.io/nutri-vision/';
    }
    
    const params = new URLSearchParams({ gas: gas, gemini: gemini });
    const transferUrl = baseUrl + '#' + params.toString();
    
    const qrContainer = document.getElementById('qr-container');
    const qrModal = document.getElementById('qr-modal');
    
    // コンテンツの文言も更新
    const modalTitle = qrModal.querySelector('h3');
    if (modalTitle) modalTitle.textContent = t('set_transfer_title');
    
    // QRコードAPIを利用
    qrContainer.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(transferUrl)}" alt="Transfer QR" style="display:block; width:220px; height:220px;">`;
    qrModal.classList.remove('hidden');
}


function closeQRModal() {
    document.getElementById('qr-modal').classList.add('hidden');
}

function renderApp() {
    if (state.isUpdating) return;
    state.isUpdating = true;
    
    updateDashboardStats();
    renderCalendar();
    updateUserStatus();
    
    if (state.activeTab === 'history') renderHistoryList();
    if (window.updateCharts) window.updateCharts();

    // オンボーディングバナーの表示制御
    const guide = document.getElementById('onboarding-guide');
    if (guide) guide.classList.toggle('hidden', state.setupComplete);
    
    state.isUpdating = false;
}

function initProfileFields() {
    const p = state.profile;
    document.getElementById('profile-gender').value = p.gender;
    document.getElementById('profile-age').value = p.age;
    document.getElementById('profile-height').value = p.height;
    document.getElementById('profile-weight').value = p.weight;
    document.getElementById('profile-pal').value = p.pal;

    // ボタンの選択状態を更新（年齢・性別のみ）
    syncSegmentButton('profile-gender-selector', p.gender);
    syncSegmentButton('profile-age-selector', Math.floor(p.age / 10) * 10);
    syncSegmentButton('profile-pal-selector', p.pal);
    
    // ピッカーの位置を同期
    syncAllPickers();

    // [Phase 31] サマリー表示も最新にする
    updateProfileSummary();
}

/**
 * プロフィールの閲覧・編集モードを切り替えます。
 */
function toggleProfileEdit(isEditing) {
    const summaryArea = document.getElementById('profile-summary-area');
    const editArea = document.getElementById('profile-edit-area');
    if (!summaryArea || !editArea) return;

    if (isEditing) {
        summaryArea.classList.add('hidden');
        editArea.style.display = 'flex';
        // 編集に入る瞬間にピッカーを再同期して、ズレがないようにする
        syncAllPickers();
    } else {
        summaryArea.classList.remove('hidden');
        editArea.style.display = 'none';
        updateProfileSummary();
    }
}

/**
 * 現在のプロフィール設定値を読み取り、サマリー画面に反映させます。
 */
function updateProfileSummary() {
    const p = state.profile;
    const genderEl = document.getElementById('summary-gender');
    const ageEl = document.getElementById('summary-age');
    const heightEl = document.getElementById('summary-height');
    const weightEl = document.getElementById('summary-weight');
    const bmrEl = document.getElementById('summary-bmr');
    const targetEl = document.getElementById('summary-target');

    if (!genderEl) return;

    genderEl.textContent = p.gender === 'male' ? t('set_male') : t('set_female');
    ageEl.textContent = p.age;
    heightEl.textContent = p.height;
    weightEl.textContent = p.weight;

    // BMRと目標カロリーの計算
    if (window.getBMR) {
        const bmr = Math.round(window.getBMR());
        const target = Math.round(bmr * parseFloat(p.pal || 1.75));
        bmrEl.textContent = bmr;
        targetEl.textContent = target;
    }
}

/**
 * 栄養素ごとのカラー付きラベルを生成します。
 */
function nLabel(key, val, unit = 'g') {
    const colors = {
        'dash_cal_today': '#60a5fa', // Blue (intake)
        'cal_intake_detailed': '#60a5fa', // Blue (detailed)
        'dash_protein': '#60a5fa', // Blue
        'dash_fat': '#facc15',     // Yellow
        'dash_carbs': '#fb923c',   // Orange
        'dash_salt_today': '#f87171', // Red/Warning
        'dash_veg': '#4ade80',     // Green
        'dash_fiber': '#3b82f6',   // Sky Blue
        'dash_gyveg': '#10b981'    // Deep Green
    };
    const color = colors[key] || 'inherit';
    return `<span style="color: ${color}; font-weight: 500;">${t(key)}</span>: ${val}${unit}`;
}

function syncSegmentButton(parentId, val) {
    document.querySelectorAll(`#${parentId} .segment-btn`).forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-val') == val);
    });
}

function syncAllPickers() {
    const p = state.profile;
    scrollToValue(document.getElementById('picker-age'), p.age);
    scrollToValue(document.getElementById('picker-height'), p.height);
    scrollToValue(document.getElementById('picker-weight'), p.weight);
}

// 身長・体重のプリセットボタンは一本化に伴い廃止されました

function initProfileSegmentLogic() {
    // ピッカーの初期化
    initScrollPicker('picker-age', 10, 100, state.profile.age, (v) => {
        document.getElementById('profile-age').value = v;
        saveProfile(false);
    });
    initScrollPicker('picker-height', 100, 220, state.profile.height, (v) => {
        document.getElementById('profile-height').value = v;
        saveProfile(false);
    });
    initScrollPicker('picker-weight', 30, 150, state.profile.weight, (v) => {
        document.getElementById('profile-weight').value = v;
        saveProfile(false);
    });

    bindSegmentClicks('profile-gender-selector', (v) => {
        const defaults = v === 'male' ? { height: 170, weight: 65 } : { height: 155, weight: 50 };
        
        // 即座に隠しフィールドとstateを更新
        const genderInput = document.getElementById('profile-gender');
        if (genderInput) genderInput.value = v;
        
        state.profile.gender = v;
        state.profile.height = defaults.height;
        state.profile.weight = defaults.weight;
        
        // 1. 保存処理
        saveProfile(false);
        
        // 2. スクロール処理 (DOMの更新を待つために10msだけ待機)
        setTimeout(() => {
            syncAllPickers(); 
        }, 10);
    });
    
    bindSegmentClicks('profile-age-selector', (v) => {
        document.getElementById('profile-age').value = v;
        state.profile.age = parseInt(v);
        saveProfile(false);
        scrollToValue(document.getElementById('picker-age'), v);
    });
    
    bindSegmentClicks('profile-pal-selector', (v) => {
        document.getElementById('profile-pal').value = v;
        saveProfile(false);
    });
}

function bindSegmentClicks(parentId, callback) {
    document.querySelectorAll(`#${parentId} .segment-btn`).forEach(btn => {
        btn.onclick = () => {
            const val = btn.getAttribute('data-val');
            // アクティブクラスの切り替え
            document.querySelectorAll(`#${parentId} .segment-btn`).forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            callback(val);
        };
    });
}

function initScrollPicker(containerId, min, max, initialValue, callback) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = ''; // クリア
    for (let i = min; i <= max; i++) {
        const item = document.createElement('div');
        item.className = 'picker-item';
        item.textContent = i;
        item.setAttribute('data-val', i);
        item.onclick = () => scrollToValue(container, i);
        container.appendChild(item);
    }

    let isScrolling;
    let lastValue = initialValue;

    container.addEventListener('scroll', () => {
        if (container.isInternalScroll) return;

        window.clearTimeout(isScrolling);
        isScrolling = setTimeout(() => {
            if (container.isInternalScroll) return;

            const rect = container.getBoundingClientRect();
            const center = rect.left + (rect.width / 2);
            let closest = null;
            let minDiff = Infinity;
            
            const items = container.querySelectorAll('.picker-item');
            items.forEach(item => {
                const itemRect = item.getBoundingClientRect();
                const itemCenter = itemRect.left + (itemRect.width / 2);
                const diff = Math.abs(center - itemCenter);
                if (diff < minDiff) {
                    minDiff = diff;
                    closest = item;
                }
            });

            if (closest) {
                const val = closest.getAttribute('data-val');
                if (val !== lastValue && minDiff < 40) {
                    lastValue = val;
                    items.forEach(i => i.classList.remove('selected'));
                    closest.classList.add('selected');
                    callback(val);
                    scrollToValue(container, val, false);
                }
            }
        }, 150);
    });

    // 初期位置へ即座に（behavior: 'auto'）移動
    setTimeout(() => scrollToValue(container, initialValue, true), 50);
}

function scrollToValue(container, val, isInitial = false) {
    if (!container) return;
    const target = container.querySelector(`.picker-item[data-val="${val}"]`);
    if (target) {
        container.isInternalScroll = true;
        
        // 厳密な中央寄せ計算: コンテナの中心座標とターゲットの中心座標を一致させる
        const containerRect = container.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        
        // 画面上での中心位置の差分を求める
        const centerDiff = (targetRect.left + targetRect.width / 2) - (containerRect.left + containerRect.width / 2);
        
        // 現在のスクロール位置を起点に、差分だけ動かす
        container.scrollTo({ 
            left: container.scrollLeft + centerDiff, 
            behavior: isInitial ? 'auto' : 'smooth' 
        });
        
        container.querySelectorAll('.picker-item').forEach(item => item.classList.remove('selected'));
        target.classList.add('selected');
        
        const timeout = isInitial ? 300 : 800;
        setTimeout(() => { 
            container.isInternalScroll = false; 
        }, timeout);
    }
}

function saveProfile(showAlert = true) {
    if (state.isInitializing) return;

    // 不確実なinput.valueではなく、ピッカーの現在の「選択中(中央)」要素から直接取得する
    const ageVal = parseInt(document.querySelector('#picker-age .selected')?.getAttribute('data-val') || state.profile.age);
    const heightVal = parseFloat(document.querySelector('#picker-height .selected')?.getAttribute('data-val') || state.profile.height);
    const weightVal = parseFloat(document.querySelector('#picker-weight .selected')?.getAttribute('data-val') || state.profile.weight);
    const genderVal = document.getElementById('profile-gender').value;
    const palVal = parseFloat(document.getElementById('profile-pal').value);

    // バリデーション
    if (!ageVal || ageVal < 10 || !heightVal || !weightVal) return;

    const profile = {
        gender: genderVal,
        age: ageVal,
        height: heightVal,
        weight: weightVal,
        pal: palVal
    };
    setState({ profile });
    
    // 保存後はサマリーのみ更新し、表示モードの切り替えは呼び出し元（ボタン等）に任せる
    updateProfileSummary();
    
    if (showAlert) {
        alert(t('msg_saved_prof'));
        showBmiAdvice(); 
        toggleProfileEdit(false); // アラートが出る＝確定ボタン押下時のみ閉じる
    }
}

function initSettings() {
    const geminiKeyInput = document.getElementById('gemini-key');
    const gasUrlInput = document.getElementById('gas-url');
    if (geminiKeyInput) geminiKeyInput.value = state.geminiKey;
    if (gasUrlInput) gasUrlInput.value = state.gasUrl;
    geminiKeyInput?.addEventListener('change', (e) => { state.geminiKey = e.target.value; localStorage.setItem('gemini_api_key', state.geminiKey); });
    gasUrlInput?.addEventListener('change', (e) => { state.gasUrl = e.target.value; localStorage.setItem('gas_url', state.gasUrl); });
    updateUserStatus();
}

function initActivitySegmentLogic() {
    const timeBtns = document.querySelectorAll('#act-time-selector .segment-btn');
    timeBtns.forEach(btn => {
        btn.onclick = () => {
            timeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        };
    });
    const durBtns = document.querySelectorAll('#act-duration-selector .segment-btn');
    durBtns.forEach(btn => {
        btn.onclick = () => {
            durBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('act-duration').value = btn.getAttribute('data-val');
        };
    });
}

function saveActivity() {
    const type = document.getElementById('act-type').value;
    const durationControl = document.getElementById('act-duration');
    const duration = parseInt(durationControl.value) || 0;
    const dateInput = document.getElementById('act-date').value;
    const activeTimeBtn = document.querySelector('#act-time-selector .segment-btn.active');
    const timeCategory = activeTimeBtn ? activeTimeBtn.getAttribute('data-val') : '不明';

    if (duration <= 0) { alert('時間を入力してください。'); return; }
    const burned = Math.round(1.05 * METS_MAP[type] * state.profile.weight * (duration / 60));
    const activity = { id: Date.now(), date: dateInput.replace(/-/g, '/'), time: timeCategory, type: type, typeName: document.querySelector(`#act-type option[value="${type}"]`).textContent.trim(), duration: duration, calories: burned };
    
    const newActivities = [...state.activities, activity];
    setState({ activities: newActivities });
    
    closeModal();
    alert(`${activity.typeName} ${t('msg_saved_act')} ${burned} kcal`);
}

function deleteActivity(id) {
    if (!confirm(t('msg_delete_act'))) return;
    const activities = state.activities.filter(a => a.id !== id);
    setState({ activities });
}

function updateDashboardStats() { if (window.calculateAndDisplayStats) window.calculateAndDisplayStats(); }

function initNavigation() {
    document.querySelectorAll('.nav-links li').forEach(link => { link.addEventListener('click', () => switchTab(link.getAttribute('data-tab'))); });
    document.getElementById('prev-month')?.addEventListener('click', () => { state.viewDate.setMonth(state.viewDate.getMonth() - 1); renderCalendar(); });
    document.getElementById('next-month')?.addEventListener('click', () => { state.viewDate.setMonth(state.viewDate.getMonth() + 1); renderCalendar(); });
    document.getElementById('sync-btn')?.addEventListener('click', async () => { 
        if (!state.gasUrl) { alert(t('msg_need_gas')); return; }
        const btn = document.getElementById('sync-btn');
        const icon = btn.querySelector('i');
        icon.classList.add('ph-spin');
        btn.disabled = true;
        
        try {
            const result = await callGAS({ type: 'fetch' });
            if (result && result.status === 'success') {
                const cloudHistory = result.history || [];
                const cloudActivities = result.activities || [];
                
                // 1. クラウド側の新しいデータを取り込む
                const newHistory = [...state.history];
                const newActivities = [...state.activities];
                let downloadedCount = 0;
                
                cloudHistory.forEach(h => {
                    if (!newHistory.find(lh => lh.id === h.id)) {
                        newHistory.push(h);
                        downloadedCount++;
                    }
                });
                cloudActivities.forEach(a => {
                    if (!newActivities.find(la => la.id === a.id)) {
                        newActivities.push(a);
                        downloadedCount++;
                    }
                });
                
                // 2. クラウドに存在しないローカルデータを特定して一括アップロード（復元）
                const missingHistory = newHistory.filter(lh => !cloudHistory.find(ch => ch.id === lh.id));
                const missingActivities = newActivities.filter(la => !cloudActivities.find(ca => ca.id === la.id));
                let uploadedCount = 0;
                
                if (missingHistory.length > 0 || missingActivities.length > 0) {
                    await callGAS({ type: 'batch', history: missingHistory, activities: missingActivities });
                    uploadedCount = missingHistory.length + missingActivities.length;
                }
                
                setState({ history: newHistory, activities: newActivities });
                
                let msg = t('msg_sync_done');
                if (downloadedCount > 0 || uploadedCount > 0) {
                    msg += `\n- Sync: ${downloadedCount}\n- Restore: ${uploadedCount}`;
                }
                alert(msg);
            } else {
                alert(t('msg_sync_fail'));
            }
        } catch (e) {
            console.error('Sync failed', e);
            alert(t('msg_sync_error'));
        } finally {
            icon.classList.remove('ph-spin');
            btn.disabled = false;
        }
    });
}

function switchTab(tabId) {
    state.activeTab = tabId;
    document.querySelectorAll('.nav-links li').forEach(link => { link.classList.toggle('active', link.getAttribute('data-tab') === tabId); if (link.classList.contains('active')) document.getElementById('page-title').textContent = link.querySelector('span').textContent; });
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.id === `${tabId}-tab`));
    if (tabId === 'history') renderHistoryList();
    if (tabId === 'calendar') renderCalendar();
    if (tabId === 'dashboard' && window.updateCharts) updateCharts();
}

function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const monthTitle = document.getElementById('calendar-month');
    if (!grid || !monthTitle) return;
    const year = state.viewDate.getFullYear();
    const month = state.viewDate.getMonth();
    monthTitle.textContent = currentLang === 'ja' ? `${year}年 ${month + 1}月` : `${new Date(year, month).toLocaleString('en-us', { month: 'short' })} ${year}`;
    grid.innerHTML = '';
    [t('day_sun'), t('day_mon'), t('day_tue'), t('day_wed'), t('day_thu'), t('day_fri'), t('day_sat')].forEach(d => { const h = document.createElement('div'); h.className = 'calendar-day-label'; h.textContent = d; grid.appendChild(h); });
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const historyMap = {}; state.history.forEach(h => { const d = toCanonical(h.date); if (!historyMap[d]) historyMap[d] = []; historyMap[d].push(h); });
    const activityMap = {}; (state.activities || []).forEach(a => { const d = toCanonical(a.date); if (!activityMap[d]) activityMap[d] = []; activityMap[d].push(a); });
    for (let i = 0; i < firstDay; i++) { const empty = document.createElement('div'); empty.className = 'day-cell other-month'; grid.appendChild(empty); }
    for (let d = 1; d <= daysInMonth; d++) {
        const cell = document.createElement('div'); cell.className = 'day-cell';
        const dateObj = new Date(year, month, d);
        const keyHyphen = toCanonical(`${year}-${month+1}-${d}`);
        const dayMeals = historyMap[keyHyphen] || [];
        const dayActs = activityMap[keyHyphen] || [];
        const isToday = new Date().toDateString() === dateObj.toDateString();
        if (isToday) cell.classList.add('today');
        const totalCal = dayMeals.reduce((s,e)=>s+e.calories,0);
        const totalBurn = dayActs.reduce((s,a)=>s+a.calories,0);
        cell.innerHTML = `
            <div class="day-num">${d}</div>
            <div class="day-info-mini">
                ${totalCal > 0 ? `<div style="color:var(--accent-primary)">${Math.round(totalCal)}</div>` : ''}
                ${totalBurn > 0 ? `<div style="color:var(--accent-success); font-size:9px;">🔥${Math.round(totalBurn)}</div>` : ''}
            </div>
            ${dayMeals.length > 0 || dayActs.length > 0 ? `<div class="day-dot"></div>` : ''}
        `;
        cell.onclick = () => renderDayDetailsByDate(keyHyphen, `${month+1}/${d}`);
        grid.appendChild(cell);
        if (isToday) renderDayDetailsByDate(keyHyphen, `${month+1}/${d}`);
    }
}

// toCanonical is now provided by charts.js (global scope)

function renderDayDetailsByDate(dateKey, label) {
    const targetKey = toCanonical(dateKey);
    const meals = state.history.filter(h => toCanonical(h.date) === targetKey);
    const acts = state.activities.filter(a => toCanonical(a.date) === targetKey);
    const panel = document.getElementById('day-meals-list'); if (!panel) return;
    if (meals.length === 0 && acts.length === 0) { panel.innerHTML = `<p class="help-text">${label} ${t('cal_no_record')}</p>`; return; }
    const mTotal = meals.reduce((s, e) => ({ cal: s.cal + e.calories, p: s.p + e.p, f: s.f + e.f, c: s.c + e.c, salt: s.salt + (e.salt || 0) }), { cal: 0, p: 0, f: 0, c: 0, salt: 0 });
    const aBurn = acts.reduce((s, a) => s + a.calories, 0);
    panel.innerHTML = `
        <h4 style="margin: 15px 0 10px; font-size:14px; color:var(--text-secondary);">記録詳細</h4>
        <div class="history-list detailed">
            ${meals.map(e => `
                <div class="history-item-detailed">
                    <div class="h-header">
                        <span>${e.name} (${e.time})</span>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <button class="btn-icon" title="編集" onclick="openEditMeal(${e.id})"><i class="ph ph-pencil-simple"></i></button>
                            <button class="btn-delete" title="削除" onclick="deleteEntry(${e.id || 0}, '${e.date}', '${e.time}', '${e.name}')"><i class="ph ph-trash"></i></button>
                        </div>
                    </div>
                    <div class="h-stats-grid">
                        <div style="grid-column: span 2; font-weight:700;">${e.calories} kcal</div>
                        <div>${nLabel('dash_protein', e.p)}</div>
                        <div>${nLabel('dash_fat', e.f)}</div>
                        <div>${nLabel('dash_carbs', e.c)}</div>
                        <div>${nLabel('dash_salt_today', e.salt || 0)}</div>
                        <div>${nLabel('dash_veg', e.veg || 0)}</div>
                        <div>${nLabel('dash_fiber', e.fiber || 0)}</div>
                        <div>${nLabel('dash_gyveg', e.gyVeg || 0)}</div>
                    </div>
                </div>
            `).join('')}
        </div>
        ${acts.length > 0 ? `
            <h4 style="margin: 20px 0 10px; font-size:14px; color:var(--accent-success);">運動の記録</h4>
            <div class="history-list detailed">
                ${acts.map(a => `<div class="history-item-detailed" style="border-left: 3px solid var(--accent-success);"><div class="h-header"><span>${a.typeName} (${a.time})</span><button class="btn-delete" title="削除" onclick="deleteActivity(${a.id || 0})"><i class="ph ph-trash"></i></button></div><div class="h-stats-grid"><div><strong>${a.calories}</strong> kcal</div><div>${a.duration} 分</div></div></div>`).join('')}
            </div>
        ` : ''}
    `;
    
    // [Phase 23] 期間分析の実行
    state.selectedDateKey = targetKey;
    if (window.updatePeriodAnalysis) window.updatePeriodAnalysis();
}

function initCalendarSegmentLogic() {
    const btns = document.querySelectorAll('#cal-scope-selector .segment-btn');
    const customRange = document.getElementById('cal-custom-range');
    const startInput = document.getElementById('cal-range-start');
    const endInput = document.getElementById('cal-range-end');

    // 初期値の設定 (直近1週間)
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 7);
    if (startInput) startInput.value = start.toISOString().split('T')[0];
    if (endInput) endInput.value = end.toISOString().split('T')[0];

    [startInput, endInput].forEach(el => {
        el?.addEventListener('change', () => {
            if (state.calendarScope === 'custom' && window.updatePeriodAnalysis) {
                window.updatePeriodAnalysis();
            }
        });
    });

    btns.forEach(btn => {
        btn.onclick = () => {
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.calendarScope = btn.getAttribute('data-val');
            
            if (customRange) {
                customRange.style.display = (state.calendarScope === 'custom') ? 'flex' : 'none';
            }

            if (window.updatePeriodAnalysis) window.updatePeriodAnalysis();
            
            const list = document.getElementById('day-meals-list');
            if (list) {
                list.style.display = (state.calendarScope === 'day') ? 'block' : 'none';
            }
        };
    });
}

function renderHistoryList() {
    const list = document.getElementById('history-list');
    const meals = state.history.map(m => ({ ...m, type: 'meal' }));
    const acts = (state.activities || []).map(a => ({ ...a, type: 'activity', name: a.typeName }));
    const combined = [...meals, ...acts].sort((a, b) => new Date(toCanonical(b.date) + ' ' + (b.time.includes(':') ? b.time : '00:00')) - new Date(toCanonical(a.date) + ' ' + (a.time.includes(':') ? a.time : '00:00')));
    if (combined.length === 0) { list.innerHTML = '<p class="help-text">履歴はありません。</p>'; return; }
    list.innerHTML = combined.map(h => `
        <div class="history-item-detailed" style="margin-bottom: 12px; border-left: 3px solid ${h.type === 'meal' ? 'var(--accent-primary)' : 'var(--accent-success)'}">
            <div class="h-header">
                <span>${h.name} (${h.time})</span>
                <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:12px; opacity:0.6;">${h.date}</span>
                    ${h.type === 'meal' ? `<button class="btn-icon" title="編集" onclick="openEditMeal(${h.id})"><i class="ph ph-pencil-simple"></i></button>` : ''}
                    <button class="btn-delete" title="削除" onclick="${h.type === 'meal' ? `deleteEntry(${h.id || 0}, '${h.date}', '${h.time}', '${h.name}')` : `deleteActivity(${h.id || 0})`}"><i class="ph ph-trash"></i></button>
                </div>
            </div>
            <div class="h-stats-grid">
                ${h.type === 'meal' 
                    ? `<div style="grid-column: span 2; font-weight:700;">${h.calories} kcal</div>
                       <div>${nLabel('dash_protein', h.p)}</div><div>${nLabel('dash_fat', h.f)}</div><div>${nLabel('dash_carbs', h.c)}</div>
                       <div>${nLabel('dash_salt_today', h.salt || 0)}</div>
                       <div>${nLabel('dash_veg', h.veg || 0)}</div>
                       <div>${nLabel('dash_fiber', h.fiber || 0)}</div>
                       <div>${nLabel('dash_gyveg', h.gyVeg || 0)}</div>` 
                    : `<div>${t('cal_burn')}: <strong>${h.calories}</strong> kcal</div><div>${h.duration} min</div>`
                }
            </div>
        </div>
    `).join('');
}

function saveEntry(entry) {
    if (!entry.id) entry.id = Date.now();
    // [Phase 20] 既存IDがあれば上書き、なければ追加
    const idx = state.history.findIndex(h => h.id === entry.id);
    let history;
    if (idx > -1) {
        history = [...state.history];
        history[idx] = entry;
    } else {
        history = [...state.history, entry];
    }
    setState({ history });
}

function openEditMeal(id) {
    const entry = state.history.find(h => h.id === id);
    if (entry && window.showEditModal) {
        window.showEditModal(entry);
    }
}

function deleteEntry(id, date, time, name) {
    if (!confirm(t('msg_delete_meal'))) return;
    let history;
    if (id) {
        history = state.history.filter(h => h.id !== id);
    } else {
        const idx = state.history.findIndex(h => h.date === date && h.time === time && h.name === name);
        if (idx > -1) {
            history = [...state.history];
            history.splice(idx, 1);
        } else {
            history = state.history;
        }
    }
    setState({ history });
}

function updateUserStatus() { const statusText = document.querySelector('.user-email'); if (statusText) statusText.textContent = state.gasUrl ? t('cloud_mode') : t('local_mode'); }

function openModal(id) { 
    const modal = document.getElementById(id); modal.style.display = 'flex'; 
    if (id === 'activity-modal') {
        const now = new Date(); document.getElementById('act-date').value = now.toISOString().split('T')[0];
        const hour = now.getHours(); let cat = "朝"; if (hour >= 11 && hour < 17) cat = "昼"; else if (hour >= 17 && hour < 22) cat = "夕"; else if (hour >= 22 || hour < 5) cat = "夜";
        document.querySelectorAll('#act-time-selector .segment-btn').forEach(b => { b.classList.toggle('active', b.getAttribute('data-val') === cat); });
    }
    // Re-ensure category buttons work if modal was opened
    initActivitySegmentLogic();
}
function closeModal() { 
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'); 
    // 消し忘れ防止のため解析バーも隠す
    const statusGlobal = document.getElementById('analysis-status-global');
    if (statusGlobal) statusGlobal.classList.add('hidden');
}
document.getElementById('quick-add-btn')?.addEventListener('click', () => switchTab('meal-log'));

async function testGeminiConnection() {
    const key = state.geminiKey; if (!key) { alert(t('msg_need_apikey')); return; }
    const resDiv = document.getElementById('api-status-result'); resDiv.style.display = 'block'; resDiv.innerHTML = currentLang === 'ja' ? '接続確認中...' : 'Checking...';
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const data = await res.json(); if (data.error) throw new Error(data.error.message);
        const flashModels = (data.models || []).filter(m => m.name.includes('flash')).sort((a,b)=>a.name.includes('1.5')?-1:1);
        resDiv.innerHTML = currentLang === 'ja' ? '接続成功！利用可能なモデル：<br><br>' : 'Success! Available models:<br><br>';
        flashModels.forEach(m => {
            const mName = m.name.replace('models/', ''); const isRec = mName.includes('lite') || mName.includes('1.5');
            const mBtn = document.createElement('button'); mBtn.className = isRec ? 'btn btn-recommended' : 'btn btn-secondary'; mBtn.style.margin = '4px'; mBtn.textContent = isRec ? `${mName}${currentLang === 'ja' ? '（推奨）' : ' (Rec)'}` : mName;
            mBtn.setAttribute('data-model', mName);
            if (mName === state.detectedModel) mBtn.style.boxShadow = '0 0 0 2px var(--accent-primary)';
            mBtn.onclick = () => { 
                state.detectedModel = mName; 
                localStorage.setItem('detected_model', mName);
                // 全描画し直すとチラつくため、クラス/スタイルだけ更新
                resDiv.querySelectorAll('button').forEach(b => b.style.boxShadow = '');
                mBtn.style.boxShadow = '0 0 0 2px var(--accent-primary)';
            }; resDiv.appendChild(mBtn);
        });
    } catch (e) { resDiv.innerHTML = `${currentLang === 'ja' ? '接続失敗' : 'Failed'}: ${e.message}`; }
}
async function copyGasScript() {
    // 無料版では案内のみを表示
    showAiMessage(t('msg_gas_pro_only'), 8000);
}
function exportToCSV() {
    const isJa = currentLang === 'ja';
    const h = isJa ? ['日付', '時間', '項目', 'カロリー', 'たんぱく質', '脂質', '炭水化物', '塩分', '体重', '食物繊維', '野菜', '緑黄色野菜']
                   : ['Date', 'Time', 'Item', 'Calories', 'Protein', 'Fat', 'Carbs', 'Salt', 'Weight', 'Fiber', 'Veggies', 'GreenY_Veggies'];
    const r = state.history.map(x => [x.date, x.time, x.name, x.calories, x.p, x.f, x.c, x.salt || 0, x.weight || '', x.fiber || 0, x.veg || 0, x.gyVeg || 0]);
    const c = "\uFEFF" + [h.join(','), ...r.map(x => x.join(','))].join('\n');
    const b = new Blob([c], { type: 'text/csv;charset=utf-8;' }); const l = document.createElement("a"); l.href = URL.createObjectURL(b); l.download = `NutriVision_${new Date().toISOString().slice(0,10)}.csv`; l.click();
}
