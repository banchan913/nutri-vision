// App State & UI Controller
const state = {
    activeTab: 'dashboard',
    history: JSON.parse(localStorage.getItem('nutri_history') || '[]'),
    activities: JSON.parse(localStorage.getItem('nutri_activities') || '[]'),
    profile: JSON.parse(localStorage.getItem('nutri_profile') || '{"gender":"male","age":30,"height":170,"weight":65,"pal":1.75}'),
    geminiKey: localStorage.getItem('gemini_api_key') || '',
    gasUrl: localStorage.getItem('gas_url') || '',
    detectedModel: localStorage.getItem('detected_model') || 'gemini-1.5-flash',
    setupComplete: localStorage.getItem('nutri_setup_complete') === 'true',
    viewDate: new Date(),
    isUpdating: false
};

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
        initProfileFields();
        initProfileSegmentLogic();
        initActivitySegmentLogic();
        renderApp();
        
        // [Phase 16] 起動時のタブを確実に反映（初回は settings、2回目以降は dashboard）
        switchTab(state.activeTab);
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
        document.getElementById('profile-gender').value = v;
        document.getElementById('profile-height').value = defaults.height;
        document.getElementById('profile-weight').value = defaults.weight;
        
        saveProfile(false);
        syncAllPickers(); // ピッカーを適切な推奨値へスクロール
    });
    
    bindSegmentClicks('profile-age-selector', (v) => {
        document.getElementById('profile-age').value = v;
        saveProfile(false);
        scrollToValue(document.getElementById('picker-age'), v); // ピッカーをスクロールさせる
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
    const picker = document.createElement('div');
    picker.className = 'picker-content';
    picker.style.display = 'flex';
    picker.style.gap = '15px';
    
    for (let i = min; i <= max; i++) {
        const item = document.createElement('div');
        item.className = 'picker-item';
        item.textContent = i;
        item.setAttribute('data-val', i);
        item.onclick = () => scrollToValue(container, i);
        picker.appendChild(item);
    }
    container.appendChild(picker);

    let isScrolling;
    container.addEventListener('scroll', () => {
        window.clearTimeout(isScrolling);
        isScrolling = setTimeout(() => {
            const center = container.scrollLeft + (container.offsetWidth / 2);
            let closest = null;
            let minDiff = Infinity;
            
            container.querySelectorAll('.picker-item').forEach(item => {
                const itemCenter = item.offsetLeft + (item.offsetWidth / 2);
                const diff = Math.abs(center - itemCenter);
                if (diff < minDiff) {
                    minDiff = diff;
                    closest = item;
                }
                item.classList.remove('selected');
            });

            if (closest) {
                closest.classList.add('selected');
                const val = closest.getAttribute('data-val');
                callback(val);
            }
        }, 100);
    });

    // 初期位置へスクロール
    setTimeout(() => scrollToValue(container, initialValue), 100);
}

function scrollToValue(container, val) {
    const target = container.querySelector(`.picker-item[data-val="${val}"]`);
    if (target) {
        const offset = target.offsetLeft - (container.offsetWidth / 2) + (target.offsetWidth / 2);
        container.scrollTo({ left: offset, behavior: 'smooth' });
        
        // 選択表示の即時反映
        container.querySelectorAll('.picker-item').forEach(item => item.classList.remove('selected'));
        target.classList.add('selected');
    }
}

function saveProfile(showAlert = true) {
    const profile = {
        gender: document.getElementById('profile-gender').value,
        age: parseInt(document.getElementById('profile-age').value) || 30,
        height: parseFloat(document.getElementById('profile-height').value) || 170,
        weight: parseFloat(document.getElementById('profile-weight').value) || 65,
        pal: parseFloat(document.getElementById('profile-pal').value) || 1.75
    };
    setState({ profile });
    if (showAlert) alert(t('msg_saved_prof'));
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

function toCanonical(dStr) {
    if (!dStr) return '';
    try {
        const d = new Date(dStr.replace(/\//g, '-'));
        if (isNaN(d.getTime())) return dStr;
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    } catch(e) { return dStr; }
}

function renderDayDetailsByDate(dateKey, label) {
    const targetKey = toCanonical(dateKey);
    const meals = state.history.filter(h => toCanonical(h.date) === targetKey);
    const acts = state.activities.filter(a => toCanonical(a.date) === targetKey);
    const panel = document.getElementById('day-meals-list'); if (!panel) return;
    if (meals.length === 0 && acts.length === 0) { panel.innerHTML = `<p class="help-text">${label} ${t('cal_no_record')}</p>`; return; }
    const mTotal = meals.reduce((s, e) => ({ cal: s.cal + e.calories, p: s.p + e.p, f: s.f + e.f, c: s.c + e.c, salt: s.salt + (e.salt || 0) }), { cal: 0, p: 0, f: 0, c: 0, salt: 0 });
    const aBurn = acts.reduce((s, a) => s + a.calories, 0);
    panel.innerHTML = `
        <div class="day-summary-banner detailed">
            <div class="main-total">${t('cal_intake')}: <strong>${mTotal.cal} kcal</strong> / ${t('cal_burn')}: <strong style="color:var(--accent-success)">${aBurn} kcal</strong></div>
            <div class="sub-total">
                <span>${t('dash_protein')}: ${mTotal.p.toFixed(1)}g</span>
                <span>${t('dash_fat')}: ${mTotal.f.toFixed(1)}g</span>
                <span>${t('dash_carbs')}: ${mTotal.c.toFixed(1)}g</span><br>
                <span style="color:var(--accent-warning)">${t('dash_salt_today')}: ${mTotal.salt.toFixed(1)}g</span>
            </div>
        </div>
        <h4 style="margin: 15px 0 10px; font-size:14px; color:var(--text-secondary);">食事の記録</h4>
        <div class="history-list detailed">
            ${meals.map(e => `
                <div class="history-item-detailed">
                    <div class="h-header">
                        <span>${e.name} (${e.time})</span>
                        <button class="btn-delete" title="削除" onclick="deleteEntry(${e.id || 0}, '${e.date}', '${e.time}', '${e.name}')"><i class="ph ph-trash"></i></button>
                    </div>
                    <div class="h-stats-grid">
                        <div style="grid-column: span 2; font-weight:700;">${e.calories} kcal</div>
                        <div>${t('dash_protein')}: ${e.p}g</div>
                        <div>${t('dash_fat')}: ${e.f}g</div>
                        <div>${t('dash_carbs')}: ${e.c}g</div>
                        <div>${t('dash_salt_today')}: ${e.salt || 0}g</div>
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
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-size:12px; opacity:0.6;">${h.date}</span>
                    <button class="btn-delete" onclick="${h.type === 'meal' ? `deleteEntry(${h.id || 0}, '${h.date}', '${h.time}', '${h.name}')` : `deleteActivity(${h.id || 0})`}"><i class="ph ph-trash"></i></button>
                </div>
            </div>
            <div class="h-stats-grid">
                ${h.type === 'meal' 
                    ? `<div style="grid-column: span 2; font-weight:700;">${h.calories} kcal</div><div>${t('dash_protein')}: ${h.p}g</div><div>${t('dash_fat')}: ${h.f}g</div><div>${t('dash_carbs')}: ${h.c}g</div><div>${t('dash_salt_today')}: ${h.salt || 0}g</div>` 
                    : `<div>${t('cal_burn')}: <strong>${h.calories}</strong> kcal</div><div>${h.duration} min</div>`
                }
            </div>
        </div>
    `).join('');
}

function saveEntry(entry) {
    if (!entry.id) entry.id = Date.now();
    const history = [...state.history, entry];
    setState({ history });
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
            if (mName === state.detectedModel) mBtn.style.boxShadow = '0 0 0 2px var(--accent-primary)';
            mBtn.onclick = () => { state.detectedModel = mName; localStorage.setItem('detected_model', mName); testGeminiConnection(); }; resDiv.appendChild(mBtn);
        });
    } catch (e) { resDiv.innerHTML = `${currentLang === 'ja' ? '接続失敗' : 'Failed'}: ${e.message}`; }
}
async function copyGasScript() {
    const s = `function doGet(e) {
  if (e.parameter.type === 'fetch') return handleFetch(e);
  return ContentService.createTextOutput("Nutri-Vision GAS Service Active");
}

function doPost(e) {
  var data = e.postData ? JSON.parse(e.postData.contents) : {};
  if (data.type === 'log') return handleLog(data);
  if (data.type === 'activity') return handleActivity(data);
  if (data.type === 'fetch' || e.parameter.type === 'fetch') return handleFetch(e, data);
  if (data.type === 'batch') return handleBatch(data, e);
  return sendResponse({status:'error', message:'Unknown style'}, e);
}

function handleLog(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Log') || ss.insertSheet('Log');
  if (sheet.getLastRow() === 0) sheet.appendRow(['ID', '日付', '時間', '項目', 'カロリー', 'たんぱく質', '脂質', '炭水化物', '塩分', '体重', '食物繊維', '野菜', '緑黄色野菜']);
  sheet.appendRow([data.id, data.date, data.time, data.name, data.calories, data.p, data.f, data.c, data.salt, data.weight || '', data.fiber || 0, data.veg || 0, data.gyVeg || 0]);
  return sendResponse({ status: 'success' });
}

function handleActivity(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Activities') || ss.insertSheet('Activities');
  if (sheet.getLastRow() === 0) sheet.appendRow(['ID', '日付', '時間', '種目', '消費カロリー', '時間(分)']);
  sheet.appendRow([data.id, data.date, data.time, data.typeName, data.calories, data.duration]);
  return sendResponse({ status: 'success' });
}

function handleBatch(data, e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (data.history && data.history.length > 0) {
    var sheet = ss.getSheetByName('Log') || ss.insertSheet('Log');
    if (sheet.getLastRow() === 0) sheet.appendRow(['ID', '日付', '時間', '項目', 'カロリー', 'たんぱく質', '脂質', '炭水化物', '塩分', '体重', '食物繊維', '野菜', '緑黄色野菜']);
    var rows = data.history.map(function(h) {
      return [h.id, h.date, h.time, h.name, h.calories, h.p, h.f, h.c, h.salt, h.weight || '', h.fiber || 0, h.veg || 0, h.gyVeg || 0];
    });
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 13).setValues(rows);
  }
  
  if (data.activities && data.activities.length > 0) {
    var sheet = ss.getSheetByName('Activities') || ss.insertSheet('Activities');
    if (sheet.getLastRow() === 0) sheet.appendRow(['ID', '日付', '時間', '種目', '消費カロリー', '時間(分)']);
    var rows = data.activities.map(function(a) {
      return [a.id, a.date, a.time, a.typeName, a.calories, a.duration];
    });
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 6).setValues(rows);
  }
  
  return sendResponse({ status: 'success' }, e);
}

function handleFetch(e, data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var history = [];
  var logSheet = ss.getSheetByName('Log');
  if (logSheet && logSheet.getLastRow() > 1) {
    var hRows = logSheet.getRange(2, 1, logSheet.getLastRow() - 1, 13).getValues();
    hRows.forEach(function(r) {
      history.push({ id: r[0], date: r[1], time: r[2], name: r[3], calories: r[4], p: r[5], f: r[6], c: r[7], salt: r[8], weight: r[9], fiber: r[10] || 0, veg: r[11] || 0, gyVeg: r[12] || 0 });
    });
  }
  
  var activities = [];
  var actSheet = ss.getSheetByName('Activities');
  if (actSheet && actSheet.getLastRow() > 1) {
    var aRows = actSheet.getRange(2, 1, actSheet.getLastRow() - 1, 6).getValues();
    aRows.forEach(function(r) {
      activities.push({ id: r[0], date: r[1], time: r[2], typeName: r[3], calories: r[4], duration: r[5], type: 'activity' });
    });
  }
  
  return sendResponse({ status: 'success', history: history, activities: activities }, e);
}

function sendResponse(obj, e) {
  var json = JSON.stringify(obj);
  if (e && e.parameter && e.parameter.callback) {
    return ContentService.createTextOutput(e.parameter.callback + "(" + json + ")")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}`;
    navigator.clipboard.writeText(s).then(() => alert(t('msg_copied_gas')));
}
function exportToCSV() {
    const isJa = currentLang === 'ja';
    const h = isJa ? ['日付', '時間', '項目', 'カロリー', 'たんぱく質', '脂質', '炭水化物', '塩分', '体重', '食物繊維', '野菜', '緑黄色野菜']
                   : ['Date', 'Time', 'Item', 'Calories', 'Protein', 'Fat', 'Carbs', 'Salt', 'Weight', 'Fiber', 'Veggies', 'GreenY_Veggies'];
    const r = state.history.map(x => [x.date, x.time, x.name, x.calories, x.p, x.f, x.c, x.salt || 0, x.weight || '', x.fiber || 0, x.veg || 0, x.gyVeg || 0]);
    const c = "\uFEFF" + [h.join(','), ...r.map(x => x.join(','))].join('\n');
    const b = new Blob([c], { type: 'text/csv;charset=utf-8;' }); const l = document.createElement("a"); l.href = URL.createObjectURL(b); l.download = `NutriVision_${new Date().toISOString().slice(0,10)}.csv`; l.click();
}
