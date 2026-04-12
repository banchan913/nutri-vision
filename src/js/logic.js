/**
 * Nutri-Vision i18n Dictionary
 */
const currentLang = navigator.language.startsWith('ja') ? 'ja' : 'en';

const translations = {
    ja: {
        "nav_dashboard": "ホーム",
        "nav_calendar": "カレンダー",
        "nav_record": "記録",
        "nav_settings": "設定",

        "dash_fulfillment_today": "今日の摂取量（目標比%）",
        "dash_weight_prediction": "体重推移の予測（今後30日間）",
        "dash_prediction_desc": "※現在の摂取・消費バランスに基づいたシミュレーションです",
        "dash_protein": "たんぱく質",
        "dash_fat": "脂質",
        "dash_carbs": "炭水化物",
        "dash_salt": "食塩",
        "dash_veg": "野菜の総量",
        "dash_gyveg": "緑黄色野菜",
        "dash_fiber": "食物繊維",
        "dash_cal_intake": "エネルギー摂取量",

        "cal_scope_day": "1日ごと",
        "cal_scope_week": "週次集計",
        "cal_scope_month": "月次集計",

        "rec_type_meal": "食事記録",
        "rec_type_activity": "運動記録",
        "rec_meal_desc": "写真を撮る・または選択",
        "rec_meal_note_ph": "補足（例: 自炊、ご飯少なめ、外食等）",
        "rec_btn_analyze": "解析開始",
        "rec_act_title": "活動を選択（15分単位）",
        "rec_act_manual": "または合計時間 (分)",

        "set_title_profile": "プロフィール設定",
        "set_title_api": "API設定",
        "set_btn_edit": "プロフィールを変更する",
        "set_guide_title": "スマホへの引き継ぎ",
        "btn_save": "設定を保存",
        "ai_greet_morning": "おはようございます！理想の身体へ、今日も一歩ずつ進みましょう。",
        "ai_greet_noon": "こんにちは！お昼の栄養補給は順調ですか？",
        "ai_greet_evening": "こんばんは。今日一日の頑張りを身体が喜んでいますよ。"
    },
    en: {
        "nav_dashboard": "Home",
        "nav_calendar": "Calendar",
        "nav_record": "Record",
        "nav_settings": "Settings",
        "dash_fulfillment_today": "Fulfillment (Target %)",
        "dash_weight_prediction": "Weight Prediction (30 Days)",
        "dash_salt": "Salt",
        "dash_veg": "Vegetables",
        "dash_gyveg": "Green-Yellow Veg",
        "dash_fiber": "Fiber",
        "rec_btn_analyze": "Start Analysis"
    }
};

function t(key) {
    return (translations[currentLang] && translations[currentLang][key]) || (translations['ja'] && translations['ja'][key]) || key;
}

function translatePage() {
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (key.startsWith("[placeholder]")) {
            el.placeholder = t(key.replace("[placeholder]", ""));
        } else {
            el.innerHTML = t(key);
        }
    });
}

/**
 * Nutri-Vision logic.js - Core Algorithms
 */
const METS_DB = {
    walking: 3.5,
    jogging: 7.0,
    cycling: 4.0,
    cleaning: 3.3,
    stairs: 4.0,
    gym: 6.0
};

/**
 * プロフィールから推奨摂取量を計算 (厚労省基準)
 */
function calculateDailyTargets(profile) {
    const { gender, weight, height, age, pal } = profile;
    
    // 基礎代謝 (BMR) - ハリス・ベネディクト改正式
    let bmr;
    if (gender === 'male') {
        bmr = (13.397 * weight) + (4.799 * height) - (5.677 * age) + 88.362;
    } else {
        bmr = (9.247 * weight) + (3.098 * height) - (4.33 * age) + 447.593;
    }
    
    // 1日の総エネルギー消費量 (TDEE)
    // pal: 1.5(低い), 1.75(ふつう), 2.0(高い)
    const tdee = bmr * pal;
    
    return {
        calories: Math.round(tdee),
        p: (tdee * 0.15) / 4, // 15%
        f: (tdee * 0.25) / 9, // 25%
        c: (tdee * 0.60) / 4, // 60%
        salt: gender === 'male' ? 7.5 : 6.5,
        veg: 350,
        gyveg: 120,
        fiber: gender === 'male' ? 21 : 18
    };
}

/**
 * 体重推移シミュレーション (今後30日間)
 * (現在の余剰カロリー平均を元に算出)
 */
function predictWeightTrend(history, activities, profile, days = 30) {
    const currentWeight = parseFloat(profile.weight);
    const bmr = calculateDailyTargets(profile).calories;
    
    // 直近7日間の平均カロリーバランスを取得
    const balance = history.slice(-7).reduce((acc, entry) => {
        return acc + (entry.calories - bmr);
    }, 0) / 7 || 0;
    
    const results = [];
    let projectedWeight = currentWeight;
    
    for (let i = 0; i <= days; i++) {
        // カロリー差分 7200kcalで体重 1kg 増減
        projectedWeight += (balance / 7200);
        results.push({
            day: i,
            weight: parseFloat(projectedWeight.toFixed(2))
        });
    }
    return results;
}
