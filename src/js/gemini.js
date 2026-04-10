// Gemini API Logic
async function analyzeImage(base64Data, mimeType, mode = 'food') {
    if (!state.geminiKey) { alert('Gemini APIキーを設定画面で入力してください。'); return; }

    const status = document.getElementById('analysis-status-global');
    const statusText = document.getElementById('status-text');
    if (status) status.classList.remove('hidden');
    if (statusText) statusText.textContent = "AIが解析中...";

    // カウントダウン開始
    let secondsLeft = 5;
    const bar = document.getElementById('countdown-bar');
    if (bar) bar.style.width = '100%';

    const updateDisplay = (s) => {
        if (statusText) statusText.textContent = `AIが解析中... あと約 ${s} 秒`;
        if (bar) bar.style.width = `${(s / 5) * 100}%`;
    };

    updateDisplay(secondsLeft); // 直後に表示

    const timer = setInterval(() => {
        secondsLeft--;
        if (secondsLeft <= 0) {
            clearInterval(timer);
            if (statusText) statusText.textContent = "間もなく完了します...";
        } else {
            updateDisplay(secondsLeft);
        }
    }, 1000);

    const modelName = state.detectedModel || 'gemini-1.5-flash';
    const langSuffixStr = currentLang === 'ja' 
        ? "必ず日本の一般的な料理名（例：ラーメン、おにぎり、サラダ）を使用し、日本語で出力してください。"
        : "Output the dish name and properties in English.";
    const userPrompt = mode === 'food' 
        ? `この食事画像/This food imageを解析してください。${langSuffixStr}`
        : `この栄養成分表示の画像/This nutrition labelを解析してください。全ての項目名を指定された言語で出力してください。${langSuffixStr}`;

    const systemPrompt = currentLang === 'ja'
        ? "あなたは日本の栄養管理の専門家です。全ての出力、特に料理名(name)は、必ず日本語で記述してください。各栄養素だけでなく野菜の総重量(g)、うち緑黄色野菜の重量(g)、食物繊維(g)も推測してください。結果は厳密に指定されたJSONフォーマットで回答してください。"
        : "You are an expert in nutrition management. You must output everything, especially the dish name (name), in English. Please also estimate total vegetable weight (g), green-yellow vegetable weight (g), and dietary fiber (g). Respond strictly in the specified JSON format.";

    const payload = {
        contents: [{ parts: [{ text: userPrompt }, { inline_data: { mime_type: mimeType, data: base64Data } }] }],
        system_instruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
            response_mime_type: "application/json",
            response_schema: {
                type: "object",
                properties: {
                    name: { type: "string" },
                    calories: { type: "number" },
                    p: { type: "number" },
                    f: { type: "number" },
                    c: { type: "number" },
                    salt: { type: "number" },
                    fiber: { type: "number" },
                    veg: { type: "number" },
                    gyVeg: { type: "number" }
                },
                required: ["name", "calories", "p", "f", "c", "salt", "fiber", "veg", "gyVeg"]
            }
        }
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${state.geminiKey}`;

    try {
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) { const errBody = await response.json(); throw new Error(`Gemini API Error: ${errBody.error?.message || response.statusText}`); }
        const result = await response.json();
        clearInterval(timer); // 成功時にタイマー停止
        if (!result.candidates || !result.candidates[0]) throw new Error(t('ai_err_no_ans'));
        let textResponse = result.candidates[0].content.parts[0].text;
        textResponse = textResponse.replace(/```json\n?|```/g, '').trim();
        
        if (statusText) statusText.textContent = t('ai_status_done');
        return JSON.parse(textResponse);
    } catch (error) {
        // @ts-ignore
        if (typeof timer !== 'undefined') clearInterval(timer);
        console.error('Gemini Analysis Failed:', error);
        if (statusText) statusText.textContent = `${t('ai_err_fail')} : ${error.message}`;
        setTimeout(() => { if (status) status.classList.add('hidden'); }, 5000);
        throw error;
    }
}

// UI Handlers for Meal Log
const fileInput = document.getElementById('file-input');
const modeBtns = document.querySelectorAll('.mode-btn');

modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.currentMode = btn.getAttribute('data-mode');
    });
});

fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
        try {
            const previewContainer = document.getElementById('image-preview-container');
            const previewImg = document.getElementById('image-preview');
            if (previewContainer && previewImg) {
                previewImg.src = reader.result;
                previewContainer.classList.remove('preview-hidden');
            }

            const base64 = reader.result.split(',')[1];
            const data = await analyzeImage(base64, file.type, state.currentMode || 'food');
            if (state.gasUrl) await callGAS({ type: 'image', base64: base64, mimeType: file.type });
            showEditModal(data);
        } catch (err) { 
            console.error(err); 
            const errMsgStr = err.message.toLowerCase();
            const isQuota = errMsgStr.includes('429') || errMsgStr.includes('quota') || errMsgStr.includes('limit') || errMsgStr.includes('too many') || errMsgStr.includes('token');
            const showMsg = isQuota ? t('ai_err_quota') : t('ai_err_fail');
            
            alert(`${showMsg}\nDetail: ${err.message}`); 
            const container = document.getElementById('image-preview-container');
            if(container) {
                container.innerHTML = `<div style="padding: 20px; background: rgba(239,68,68,0.1); border: 2px solid var(--accent-danger); border-radius: var(--radius-md);">
                    <h4 style="color: var(--accent-danger); margin-bottom: 10px;">${showMsg}</h4>
                    <p style="font-size: 13px; color: var(--text-main); word-break: break-all;">${err.message}</p>
                </div>`;
                container.classList.remove('preview-hidden');
            }
        }
    };
    reader.readAsDataURL(file);
});

// カテゴリ判定ロジックは app.js などで共有されるべきものですが、
// ここではその日の時間帯に基づいて最適な食事区分を返します。
function getAutoCategory() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return "朝食";
    if (hour >= 11 && hour < 16) return "昼食";
    if (hour >= 17 && hour < 22) return "夕食";
    if (hour >= 22 || hour < 5) return "夜食";
    return "間食";
}

let lastAnalyzedData = null; // 自炊切替用に保持

function showEditModal(data) {
    lastAnalyzedData = data; // データを保存
    // 確実に解析バーを隠す
    const statusGlobal = document.getElementById('analysis-status-global');
    if (statusGlobal) statusGlobal.classList.add('hidden');

    const editForm = document.getElementById('edit-form');
    const now = new Date();
    const curDate = now.toISOString().split('T')[0];
    const autoCategory = getAutoCategory();

    editForm.innerHTML = `
        <div class="setting-item">
            <label>${t('edit_step1')}</label>
            <input type="date" id="edit-date" value="${curDate}">
        </div>
        <div class="edit-item">
            <label>${t('edit_name')}</label>
            <input type="text" id="edit-name" value="${data.meal_name || data.name}">
        </div>
        <div class="edit-item" style="margin-top: 10px;">
            <label>${t('edit_weight')}</label>
            <input type="number" id="edit-weight" step="0.1" placeholder="${state.profile?.weight || '--'}">
        </div>
        <div class="setting-item" style="margin-top: 15px;">
            <label>${t('edit_step2')}</label>
            <div class="segment-selector meals" id="meal-category-selector">
                <div class="segment-btn ${autoCategory === '朝食' ? 'active' : ''}" data-val="朝食">${t('edit_meal_break')}</div>
                <div class="segment-btn ${autoCategory === '昼食' ? 'active' : ''}" data-val="昼食">${t('edit_meal_lunch')}</div>
                <div class="segment-btn ${autoCategory === '夕食' ? 'active' : ''}" data-val="夕食">${t('edit_meal_dinner')}</div>
                <div class="segment-btn ${autoCategory === '間食' ? 'active' : ''}" data-val="間食">${t('edit_meal_snack')}</div>
                <div class="segment-btn ${autoCategory === '夜食' ? 'active' : ''}" data-val="夜食">${t('edit_meal_night')}</div>
            </div>
        </div>
        <div class="setting-item" style="margin-top: 15px;">
            <label>${t('edit_style')}</label>
            <div class="segment-selector" id="cooking-type-selector" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div class="segment-btn active" data-val="outside">${t('edit_style_out')}</div>
                <div class="segment-btn" data-val="inside">${t('edit_style_in')}</div>
            </div>
        </div>
        <div class="setting-item" style="margin-top: 15px;">
            <label>${t('edit_step3')}</label>
            <input type="text" id="edit-name" value="${data.name}" style="margin-bottom: 10px; height: 54px; font-size: 18px;">
            <div class="edit-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px;">
                <div class="edit-item">
                    <label>Energy (kcal)</label>
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <input type="number" id="edit-calories" value="${Math.round(data.total_calories || data.calories)}">
                        <span style="font-size: 12px; color: var(--text-secondary);">kcal</span>
                    </div>
                </div>
                <div class="edit-item">
                    <label>${t('dash_protein')}</label>
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <input type="number" id="edit-p" step="0.1" value="${data.protein_g || data.p}">
                        <span style="font-size: 12px; color: var(--text-secondary);">g</span>
                    </div>
                </div>
                <div class="edit-item">
                    <label>${t('dash_fat')}</label>
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <input type="number" id="edit-f" step="0.1" value="${data.fat_g || data.f}">
                        <span style="font-size: 12px; color: var(--text-secondary);">g</span>
                    </div>
                </div>
                <div class="edit-item">
                    <label>${t('dash_carbs')}</label>
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <input type="number" id="edit-c" step="0.1" value="${data.carbs_g || data.c}">
                        <span style="font-size: 12px; color: var(--text-secondary);">g</span>
                    </div>
                </div>
                <div class="edit-item">
                    <label>${t('dash_salt_today')}</label>
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <input type="number" id="edit-salt" step="0.1" value="${data.salt_g || data.salt || 0}">
                        <span style="font-size: 12px; color: var(--text-secondary);">g</span>
                    </div>
                </div>
                <div class="edit-item">
                    <label>${t('edit_fiber')}</label>
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <input type="number" id="edit-fiber" step="0.1" value="${data.fiber || 0}">
                        <span style="font-size: 12px; color: var(--text-secondary);">g</span>
                    </div>
                </div>
                <div class="edit-item">
                    <label>${t('edit_veg')}</label>
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <input type="number" id="edit-veg" step="1" value="${data.veg || 0}">
                        <span style="font-size: 12px; color: var(--text-secondary);">g</span>
                    </div>
                </div>
                <div class="edit-item">
                    <label>${t('edit_gyveg')}</label>
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <input type="number" id="edit-gyveg" step="1" value="${data.gyVeg || 0}">
                        <span style="font-size: 12px; color: var(--text-secondary);">g</span>
                    </div>
                </div>
            </div>
    `;

    // Category & Cooking Type toggle logic
    const categoryBtns = editForm.querySelectorAll('#meal-category-selector .segment-btn');
    categoryBtns.forEach(btn => {
        btn.onclick = () => {
            categoryBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        };
    });

    const updateLiveNutrients = (isHomeCooking) => {
        const base = lastAnalyzedData;
        const fInput = document.getElementById('edit-f');
        const saltInput = document.getElementById('edit-salt');
        const calInput = document.getElementById('edit-calories');

        let f = base.fat_g || base.f;
        let salt = base.salt_g || base.salt || 0;
        let cal = base.total_calories || base.calories;

        if (isHomeCooking) {
            f = f * 0.9;
            salt = salt * 0.9;
            // 脂質（1g=9kcal）が減る分、カロリーも微調整
            const diffF = (base.fat_g || base.f) * 0.1;
            cal = cal - (diffF * 9);
        }

        fInput.value = f.toFixed(1);
        saltInput.value = salt.toFixed(1);
        calInput.value = Math.round(cal);

        // 視覚的フィードバック（フラッシュ効果）
        [fInput, saltInput, calInput].forEach(el => {
            el.style.backgroundColor = 'rgba(250, 204, 21, 0.2)';
            setTimeout(() => el.style.backgroundColor = '', 300);
        });
    };

    const cookingBtns = editForm.querySelectorAll('#cooking-type-selector .segment-btn');
    cookingBtns.forEach(btn => {
        btn.onclick = () => {
            cookingBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateLiveNutrients(btn.getAttribute('data-val') === 'inside');
        };
    });

    openModal('edit-modal');

    // Save Button Click
    document.getElementById('save-entry-btn').onclick = () => {
        const weightVal = parseFloat(document.getElementById('edit-weight')?.value);
        
        const entry = {
            id: Date.now(),
            date: document.getElementById('edit-date').value.replace(/-/g, '/'),
            time: document.querySelector('#meal-category-selector .segment-btn.active')?.getAttribute('data-val') || '間食',
            name: document.getElementById('edit-name').value,
            calories: parseInt(document.getElementById('edit-calories').value),
            p: parseFloat(document.getElementById('edit-p').value),
            f: parseFloat(document.getElementById('edit-f').value),
            c: parseFloat(document.getElementById('edit-c').value),
            salt: parseFloat(document.getElementById('edit-salt').value),
            fiber: parseFloat(document.getElementById('edit-fiber').value) || 0,
            veg: parseInt(document.getElementById('edit-veg').value) || 0,
            gyVeg: parseInt(document.getElementById('edit-gyveg').value) || 0,
            weight: weightVal || null
        };
        
        if (weightVal) {
            setState({ profile: { ...state.profile, weight: weightVal } });
            if (window.initProfileFields) window.initProfileFields();
        }

        saveEntry(entry);
        if (state.gasUrl) callGAS({ type: 'log', ...entry });
        closeModal();
        alert('記録を保存しました。');
        
        // フォームのリセットとプレビューの非表示
        document.getElementById('file-input').value = "";
        document.getElementById('image-preview-container')?.classList.add('preview-hidden');
        
        renderCalendar();
    };
}
