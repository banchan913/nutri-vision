/**
 * Nutri-Vision Global i18n Dictionary (Master Build)
 */

const currentLang = navigator.language.startsWith('ja') ? 'ja' : 'en';

const translations = {
    ja: {
        // Navigation
        "nav_dashboard": "ホーム",
        "nav_calendar": "カレンダー分析",
        "nav_record": "食事を記録",
        "nav_analysis": "トレンド推移",
        "nav_history": "すべての履歴",
        "nav_settings": "設定・ガイド",
        "guest_user": "ゲストユーザー様",

        // Dashboard
        "dash_fulfillment_today": "今日の目標達成状況",
        "dash_cal_today": "エネルギー摂取量",
        "dash_pfc": "PFCバランス（三大栄養素）",
        "dash_protein": "たんぱく質",
        "dash_fat": "脂質",
        "dash_carbs": "炭水化物",
        "dash_veg_fiber": "野菜・食物繊維の充足度",
        "dash_fiber": "食物繊維",
        "dash_veg": "野菜の総量",
        "dash_gyveg": "緑黄色野菜",
        "dash_salt_today": "食塩摂取量",
        "dash_burn_today": "今日の消費エネルギー",
        "dash_burn_ext": "運動による消費分",
        "target_prefix": "目標: ",
        "chart1_title": "1. カロリー収支の確認",
        "chart1_desc": "食べ過ぎていないか、あるいは不足していないか見守ります。",

        // Calendar
        "cal_selected": "分析と記録の詳細",
        "cal_select_help": "カレンダーから日付を選んでください",
        "cal_scope_day": "1日ごと",
        "cal_scope_week": "今日から7日間",
        "cal_scope_month": "今日から30日間",
        "cal_stats_title": "期間の合計統計",
        "cal_intake": "総摂取量",
        "cal_intake_detailed": "摂取",
        "cal_burn": "総消費量",

        // Profile & Settings
        "set_prof_title": "パーソナルプロフィール",
        "set_gender": "性別",
        "set_male": "男性",
        "set_female": "女性",
        "set_age": "年齢",
        "set_height": "身長",
        "set_weight": "体重",
        "set_pal_title": "身体活動レベル (PAL)",
        "set_pal_low": "低い (1.5)",
        "set_pal_mid": "ふつう (1.75)",
        "set_pal_hi": "高い (2.0)",
        "set_bmr_label": "基礎代謝 (推定)",
        "set_target_cal_label": "1日の目標摂取量",
        "set_btn_edit": "編集する",
        "set_guide_title": "スマホへの引き継ぎ",
        "btn_save": "設定を保存する",
        "btn_sync": "データを同期",
        "btn_record": "記録を開始",
        "btn_cancel": "キャンセル"
    },
    en: {
        "nav_dashboard": "Dashboard",
        "nav_calendar": "Calendar",
        "dash_salt_today": "Sodium Intake",
        "cal_scope_week": "Past 7 Days",
        "cal_scope_month": "Past 30 Days"
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
