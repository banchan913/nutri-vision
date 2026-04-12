/**
 * Nutri-Vision Global Controller (Master Build)
 */

window.state = {
    activeTab: 'dashboard',
    history: JSON.parse(localStorage.getItem('nutri_history') || '[]'),
    activities: JSON.parse(localStorage.getItem('nutri_activities') || '[]'),
    profile: JSON.parse(localStorage.getItem('nutri_profile') || '{"gender":"male","age":30,"height":170,"weight":65,"pal":1.75}'),
    geminiKey: localStorage.getItem('gemini_api_key') || '',
    gasUrl: localStorage.getItem('gas_url') || '',
    detectedModel: localStorage.getItem('detected_model') || 'gemini-1.5-flash',
    viewDate: new Date(),
    calendarScope: 'day'
};
const state = window.state;

document.addEventListener('DOMContentLoaded', () => initApp());

function initApp() {
    console.log("🟢 Nutri-Vision Master Build Initializing...");
    
    translatePage();
    initNavigation();
    initSettingsFields();
    initProfileSummary();
    initCalendarEvents();

    renderApp();
    
    const hour = new Date().getHours();
    let msg = t('ai_greet_morning');
    if (hour >= 11 && hour < 17) msg = "こんにちは！お昼の栄養補給は順調ですか？";
    else if (hour >= 17) msg = "こんばんは！今日一日の締めくくりまで、見守りますね。";
    showAiMessage(msg);
}

function renderApp() {
    if (typeof updateDashboardStats === 'function') updateDashboardStats();
    
    if (state.activeTab === 'dashboard') {
        // Dashboard specific updates
    } else if (state.activeTab === 'calendar') {
        // Calendar specific updates
    }
}

function initNavigation() {
    document.querySelectorAll('.nav-links li').forEach(li => {
        li.onclick = () => switchTab(li.getAttribute('data-tab'));
    });
}

function switchTab(tab) {
    state.activeTab = tab;
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(`${tab}-tab`);
    if (target) target.classList.add('active');
    
    document.querySelectorAll('.nav-links li').forEach(li => {
        li.classList.toggle('active', li.getAttribute('data-tab') === tab);
    });
    
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) pageTitle.innerText = t(`nav_${tab}`);
    
    renderApp();
}

/**
 * 設定画面の初期化と保存
 */
function initSettingsFields() {
    const keyEl = document.getElementById('gemini-key');
    const urlEl = document.getElementById('gas-url');
    const modelEl = document.getElementById('detected-model');
    
    if (keyEl) keyEl.value = state.geminiKey;
    if (urlEl) urlEl.value = state.gasUrl;
    if (modelEl) modelEl.value = state.detectedModel;
}

function saveSystemSettings() {
    const key = document.getElementById('gemini-key').value;
    const url = document.getElementById('gas-url').value;
    const model = document.getElementById('detected-model').value;
    
    state.geminiKey = key;
    state.gasUrl = url;
    state.detectedModel = model;
    
    localStorage.setItem('gemini_api_key', key);
    localStorage.setItem('gas_url', url);
    localStorage.setItem('detected_model', model);
    
    showAiMessage("システム設定が保存されました");
}

/**
 * プロフィール管理
 */
function initProfileSummary() {
    const container = document.getElementById('profile-summary-area');
    if (!container) return;
    
    const p = state.profile;
    container.innerHTML = `
        <div class="summary-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
            <div class="summary-item"><span class="label" style="opacity:0.6; font-size:11px;">${t('set_gender')}</span><div style="font-weight:700;">${p.gender === 'male' ? '男性' : '女性'}</div></div>
            <div class="summary-item"><span class="label" style="opacity:0.6; font-size:11px;">${t('set_age')}</span><div style="font-weight:700;">${p.age}歳</div></div>
            <div class="summary-item"><span class="label" style="opacity:0.6; font-size:11px;">${t('set_height')}</span><div style="font-weight:700;">${p.height}cm</div></div>
            <div class="summary-item"><span class="label" style="opacity:0.6; font-size:11px;">${t('set_weight')}</span><div style="font-weight:700;">${p.weight}kg</div></div>
        </div>
        <button class="btn btn-secondary" style="width:100%;" onclick="toggleProfileEdit(true)"><i class="ph ph-pencil"></i> ${t('set_btn_edit')}</button>
    `;
}

function toggleProfileEdit(show) {
    const summary = document.getElementById('profile-summary-area');
    const edit = document.getElementById('profile-edit-area');
    if (summary && edit) {
        summary.style.display = show ? 'none' : 'block';
        edit.style.display = show ? 'flex' : 'none';
    }
}

function showAiMessage(text, duration = 4000) {
    let container = document.getElementById('ai-message-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'ai-toast';
    toast.innerHTML = `<div style="font-size:24px;">👩‍⚕️</div><div>${text}</div>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
}

// 他、カレンダー期間ボタンやピッカーのロジックをここに集約
function initCalendarEvents() {
    const btns = document.querySelectorAll('#cal-scope-selector .segment-btn');
    btns.forEach(btn => {
        btn.onclick = () => {
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.calendarScope = btn.getAttribute('data-val');
            // 分析更新を呼び出す
        };
    });
}
