/**
 * Nutri-Vision AI Analysis Engine (Gemini 1.5 Flash)
 */

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent";

/**
 * 食事の画像を解析し、栄養素を推定します
 * @param {string} base64Image - 画像のBase64文字列（data:image/... プレフィックス付き）
 * @param {string} note - ユーザーからの補足テキスト
 * @returns {Promise<Object>} 推定された栄養データ
 */
async function analyzeMeal(base64Image, note = "") {
    const apiKey = state.settings.geminiApiKey;
    if (!apiKey) {
        throw new Error("APIキーが設定されていません。設定画面で入力してください。");
    }

    // data:image/png;base64,XXXX -> XXXX のみに変換
    const content = base64Image.split(',')[1];
    const mimeType = base64Image.split(',')[0].split(':')[1].split(';')[0];

    const prompt = `
あなたはプロの管理栄養士です。提供された食事画像と補足テキストから、含まれる栄養素を精密に推定してください。
ユーザーの補足: "${note}"

必ず以下のJSON形式のみで回答してください（他のテキストは一切含めないでください）:
{
  "name": "料理名",
  "calories": 数値(kcal),
  "p": 数値(たんぱく質g),
  "f": 数値(脂質g),
  "c": 数値(炭水化物g),
  "salt": 数値(食塩相当量g),
  "veg": 数値(野菜総重量g),
  "gyveg": 数値(緑黄色野菜重量g),
  "fiber": 数値(食物繊維g),
  "advice": "100文字程度の管理栄養士からのアドバイス"
}
`;

    const requestBody = {
        contents: [{
            parts: [
                { text: prompt },
                {
                    inline_data: {
                        mime_type: mimeType,
                        data: content
                    }
                }
            ]
        }]
    };

    try {
        const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || "APIリクエストに失敗しました");
        }

        const result = await response.json();
        const textResponse = result.candidates[0].content.parts[0].text;
        
        // JSONを抽出 (Markdownのバッククォートが含まれる場合を考慮)
        const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("解析結果の読み取りに失敗しました。");
        
        return JSON.parse(jsonMatch[0]);
    } catch (err) {
        console.error("Gemini Analysis Error:", err);
        throw err;
    }
}

/**
 * APIキーの接続テストを行い、利用可能なモデル一覧を返します
 */
async function testApiKeyConnection(apiKey) {
    if (!apiKey) throw new Error("APIキーが入力されていません。");

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || "接続に失敗しました。キーを確認してください。");
        }

        const data = await response.json();
        return data.models || [];
    } catch (err) {
        console.error("API Test Error:", err);
        throw err;
    }
}
