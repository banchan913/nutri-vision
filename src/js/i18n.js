/**
 * Nutri-Vision i18n Dictionary & Controller (v2.0)
 * すべての文言と多言語対応の心臓部です。
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
        "local_mode": "安心の端末保存モード",
        "cloud_mode": "便利なクラウド同期モード",

        // Dashboard (Fulfillment & Stats)
        "dash_fulfillment_today": "今日の栄養バランス",
        "dash_cal_today": "今日の摂取エネルギー",
        "dash_pfc": "PFCバランス（三大栄養素）",
        "dash_protein": "たんぱく質",
        "dash_fat": "脂質",
        "dash_carbs": "炭水化物",
        "dash_veg_fiber": "野菜・食物繊維の達成度",
        "dash_fiber": "食物繊維",
        "dash_veg": "野菜の総量",
        "dash_gyveg": "緑黄色野菜",
        "dash_salt_today": "食塩摂取量", // 「今日の」を削除
        "dash_burn_today": "今日の消費エネルギー",
        "dash_burn_ext": "運動による消費分",
        "target_prefix": "目標: ",
        "dash_guide_calendar": "※詳しい日別分析や過去の振り返りは『カレンダー』タブをご確認くださいね。",

        // Charts Help
        "chart1_title": "1. カロリー収支の確認",
        "chart1_desc": "目標を大きく超えていないか、毎日の食事量を一緒に見守りましょう。",
        "chart2_title": "2. 三大栄養バランスの質",
        "chart2_desc": "理想の比率（P:15% F:25% C:60%）に近づくと、体がもっと喜びますよ。",
        "chart3_title": "3. 野菜・食物繊維の達成度",
        "chart3_desc": "厚生労働省が指示する目標値（野菜350g等）への進捗です。あと少しですね！",
        "chart4_title": "4. 体重の推移トレンド",
        "chart4_desc": "なだらかな変化を尊重しましょう。食事と運動の成果がここに現れます。",

        // Calendar Analysis
        "cal_selected": "選択した期間の分析結果",
        "cal_select_help": "日付を選択して、詳細を振り返ってみましょう",
        "cal_scope_day": "1日ごと",
        "cal_scope_week": "今日から7日間", // 最新の要望
        "cal_scope_month": "今日から30日間", // 最新の要望
        "cal_scope_custom": "好きな期間",
        "cal_scope_all": "全期間",
        "cal_stats_title": "期間中の合計統計",
        "cal_intake": "総摂取量",
        "cal_intake_detailed": "摂取", // 「（合計）」を削除
        "cal_burn": "総消費量",
        "cal_no_record": "の記録は見つかりませんでした。今日からの記録を楽しみにしています！",

        // Settings & Profile
        "set_prof_title": "1. パーソナルプロフィール（推奨摂取量の計算）",
        "set_profile_title": "あなたのプロフィール",
        "set_gender": "性別",
        "set_male": "男性",
        "set_female": "女性",
        "set_age": "年齢 (歳)",
        "set_height": "身長 (cm)",
        "set_weight": "体重 (kg)",
        "set_pal_title": "基本の身体活動レベル (PAL)",
        "set_pal_desc": "身体データに基づき、あなた専用の目標栄養バランスを算出しています。",
        "set_btn_edit": "プロフィールを変更する",
        "set_btn_calc": "設定を保存して計算する",
        "set_bmr_label": "基礎代謝 (推定)",
        "set_target_cal_label": "1日の目標摂取カロリー",
        "btn_save": "この内容で保存する",
        "btn_cancel": "キャンセル",
        "btn_sync": "データを同期する"
    },
    en: {
        "nav_dashboard": "Home",
        "nav_calendar": "Calendar",
        "dash_salt_today": "Sodium Intake",
        "cal_scope_week": "Past 7 Days",
        "cal_scope_month": "Past 30 Days"
    }
};

/**
 * 翻訳を取得する魔法の言葉
 */
function t(key) {
    return (translations[currentLang] && translations[currentLang][key]) || 
           (translations['ja'] && translations['ja'][key]) || 
           key;
}

/**
 * ページ上の対象要素を一括翻訳します
 */
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
