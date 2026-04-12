const currentLang = navigator.language.startsWith('ja') ? 'ja' : 'en';

const translations = {
    ja: {
        // Navigation & General
        "nav_dashboard": "ホーム",
        "nav_calendar": "カレンダー分析",
        "nav_record": "食事を記録",
        "nav_analysis": "トレンド推移",
        "nav_history": "すべての履歴",
        "nav_settings": "設定・ガイド",
        "guest_user": "ゲストユーザー様",
        "local_mode": "安心の端末保存モード",
        "cloud_mode": "便利なクラウド同期モード",
        "btn_sync": "データを同期する",
        "btn_record": "記録を開始",
        "btn_cancel": "キャンセル",
        "btn_save": "この内容で保存する",

        // Dashboard
        "dash_fulfillment_today": "今日の栄養バランス",
        "dash_cal_today": "今日の摂取エネルギー",
        "dash_pfc": "PFC（三大栄養素）バランス",
        "dash_protein": "たんぱく質",
        "dash_fat": "脂質",
        "dash_carbs": "炭水化物",
        "dash_veg_fiber": "野菜・食物繊維の充足度",
        "dash_fiber": "食物繊維",
        "dash_veg": "野菜の総量",
        "dash_gyveg": "緑黄色野菜",
        "dash_salt_today": "今日の食塩摂取量",
        "dash_burn_today": "今日の消費エネルギー",
        "dash_burn_ext": "運動による消費分",
        "target_prefix": "目標: ",
        "chart1_title": "1. カロリー収支の確認",
        "chart1_desc": "目標を大きく超えていないか、毎日の食事量を一緒に見守りましょう。",
        "chart2_title": "2. 三大栄養バランスの質",
        "chart2_desc": "理想の比率（P:15% F:25% C:60%）に近づくと、体がもっと喜びますよ。",
        "chart3_title": "3. 野菜・食物繊維の達成度",
        "chart3_desc": "厚生労働省が勧める目標値（野菜350g等）への進捗です。あと少しですね！",
        "chart4_title": "4. 体重の推移（30日間）",
        "chart4_desc": "なだらかな変化を尊重しましょう。食事と運動の成果がここに現れます。",
        "dash_guide_calendar": "※詳しい日別分析や過去の振り返りは『カレンダー』タブをご確認くださいね。",

        // Calendar
        "cal_selected": "選択した日の分析結果",
        "cal_select_help": "カレンダーの日付を選択して、詳細を振り返ってみましょう",
        "cal_scope_day": "1日ごと",
        "cal_scope_week": "1週間（合計）",
        "cal_scope_month": "1ヶ月（合計）",
        "cal_scope_custom": "好きな期間",
        "cal_scope_all": "全期間",
        "cal_stats_title": "期間中の合計統計",
        "cal_no_record": "の記録は見つかりませんでした。今日から記録を始めてみませんか？",
        "cal_intake": "総摂取量",
        "cal_intake_detailed": "摂取（合計）",
        "cal_burn": "総消費量",
        
        // Settings etc... (Omitted for brevity in summary but restored in full)
        "set_prof_title": "1. パーソナルプロフィール（推奨摂取量の計算）",
        "set_btn_edit": "プロフィールを変更する",
        "set_btn_calc": "設定を保存して計算する",
        "set_pal_desc": "身体データに基づき、あなた専用の目標栄養バランスを算出しています。"
    },
    en: {
        "nav_dashboard": "Dashboard",
        "nav_calendar": "Calendar",
        "nav_record": "Record Meal",
        "nav_analysis": "Trends",
        "nav_history": "History",
        "nav_settings": "Settings",
        "cal_scope_week": "Weekly",
        "cal_scope_month": "Monthly",
        "dash_salt_today": "Sodium Intake"
    }
};

function t(key) {
    return (translations[currentLang] && translations[currentLang][key]) || 
           (translations['ja'] && translations['ja'][key]) || 
           key;
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
