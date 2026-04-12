/**
 * Nutri-Vision Universal i18n Controller (v2.0)
 * すべての文言と多言語対応を集約。
 */

const currentLang = navigator.language.startsWith('ja') ? 'ja' : 'en';

const translations = {
    ja: {
        "nav_dashboard": "ホーム",
        "nav_calendar": "カレンダー分析",
        "nav_record": "食事を記録",
        "nav_analysis": "トレンド推移",
        "nav_history": "すべての履歴",
        "nav_settings": "設定・ガイド",
        "guest_user": "ゲストユーザー様",
        "local_mode": "安心の端末保存モード",
        "cloud_mode": "便利なクラウド同期モード",

        "dash_fulfillment_today": "今日の目標達成状況",
        "dash_cal_today": "今日の摂取エネルギー",
        "dash_pfc": "PFCバランス（三大栄養素）",
        "dash_protein": "たんぱく質",
        "dash_fat": "脂質",
        "dash_carbs": "炭水化物",
        "dash_veg_fiber": "野菜・食物繊維の達成度",
        "dash_fiber": "食物繊維",
        "dash_veg": "野菜の総量",
        "dash_gyveg": "緑黄色野菜",
        "dash_salt_today": "食塩摂取量",
        "dash_burn_today": "今日の消費エネルギー",
        "dash_burn_ext": "運動による消費分",
        "target_prefix": "目標: ",
        "dash_guide_calendar": "※詳しい日別分析や過去の振り返りは『カレンダー』タブをご確認くださいね。",

        "cal_selected": "選択した期間の分析",
        "cal_select_help": "日付を選択して、詳細を振り返ってみましょう",
        "cal_scope_day": "1日ごと",
        "cal_scope_week": "今日から7日間",
        "cal_scope_month": "今日から30日間",
        "cal_scope_all": "全期間",
        "cal_stats_title": "期間の合計統計",
        "cal_intake": "総摂取量",
        "cal_intake_detailed": "摂取",
        "cal_burn": "総消費量",

        "set_prof_title": "1. プロフィール設定",
        "set_btn_edit": "プロフィールを変更する",
        "set_btn_calc": "設定を保存して計算する",
        "ai_bmi_normal": "理想的な体重を維持されていますね。素晴らしいです！",
        "ai_greet_morning": "おはようございます！今日も心地よい一日になりますように。",
        "btn_save": "保存する",
        "btn_cancel": "キャンセル"
    },
    en: {
        "nav_dashboard": "Home",
        "nav_calendar": "Analysis",
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
