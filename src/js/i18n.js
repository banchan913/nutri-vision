/**
 * Nutri-Vision i18n Dictionary
 * すべての文言をここで一括管理します。
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
        "cal_no_data": "この日の記録はありません",

        "rec_type_meal": "食事記録",
        "rec_type_activity": "運動記録",
        "rec_meal_desc": "写真を撮る・または選択",
        "rec_meal_note_ph": "補足（例: 自炊、ご飯少なめ、外食等）",
        "rec_btn_analyze": "解析開始",
        "rec_act_title": "活動を選択（15分単位）",
        "rec_act_manual": "または合計時間 (分)",

        "act_walking": "歩行",
        "act_jogging": "ジョギング",
        "act_cycling": "自転車",
        "act_cleaning": "家事・清掃",
        "act_gym": "ジム・筋トレ",
        "act_swimming": "水泳",
        "act_yoga": "ヨガ",
        "act_stretching": "ストレッチ",

        "ana_analyzing": "AIが画像を分析しています...",
        "ana_success": "栄養解析が完了しました！",
        "ana_error": "解析に失敗しました。APIキーを確認してください。",
        "ana_error_img": "画像を読み込めませんでした。",

        "set_title_profile": "プロフィール設定",
        "set_title_api": "API設定",
        "set_btn_edit": "プロフィールを変更する",
        "set_gender": "性別",
        "set_male": "男性",
        "set_female": "女性",
        "set_age": "年齢",
        "set_height": "身長",
        "set_weight": "体重",
        "set_pal_title": "活動レベル",
        "set_bmr_label": "基礎代謝",
        "btn_save": "設定を保存",
        "btn_cancel": "戻る",
        "ai_greet_morning": "おはようございます！理想の身体へ、今日も一歩ずつ進みましょう。",
        "ai_greet_noon": "こんにちは！お昼の栄養補給は順調ですか？",
        "ai_greet_evening": "こんばんは。今日一日の頑張りを身体が喜んでいますよ。"
    },
    en: {
        "nav_dashboard": "Home",
        "nav_calendar": "Calendar",
        "nav_record": "Record",
        "nav_settings": "Settings",
        "dash_fulfillment_today": "Fulfillment (Target%)",
        "dash_weight_prediction": "Weight Trend (30 Days)",
        "dash_salt": "Salt",
        "dash_veg": "Veg Total",
        "dash_gyveg": "Green-Yellow Veg",
        "dash_fiber": "Fiber",
        "rec_btn_analyze": "Start Analysis",
        "cal_scope_day": "Daily",
        "cal_scope_week": "Weekly",
        "cal_scope_month": "Monthly"
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
