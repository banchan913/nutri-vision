// Simple communication with GAS (Google Apps Script)
const sheets = {
    async uploadImage(base64, mimeType) {
        const gasUrl = localStorage.getItem('gas_url');
        if (!gasUrl) return null;

        try {
            // ヘッダーを削除し「シンプルリクエスト」にすることでCORS事前チェックを回避
            await fetch(gasUrl, {
                method: 'POST',
                // mode: 'cors', redirect: 'follow' はデフォルトで動作
                body: JSON.stringify({
                    type: 'image',
                    base64: base64,
                    mimeType: mimeType
                })
            });
            
            // Note: with mode 'no-cors', we can't read the JSON response.
            // This is a limitation of GAS as a Web App without a custom proxy.
            // BUT, if we use redirected responses, we can sometimes solve this.
            // Actually, for a better UX, 'cors' is preferred, but GAS requires specific headers.
            
            // Let's try regular fetch first. If it fails, we guide user on CORS.
            // Actually, GAS supports CORS if returning specific content types.
        } catch (e) {
            console.error('Upload failed', e);
        }
    },

    async saveToCloud(entry) {
        const gasUrl = localStorage.getItem('gas_url');
        if (!gasUrl) return;

        await fetch(gasUrl, {
            method: 'POST',
            body: JSON.stringify({
                type: 'log',
                ...entry
            })
        });
    }
};

// JSONPを利用した通信ヘルパー
function fetchViaJSONP(url, payload) {
    return new Promise((resolve, reject) => {
        const callbackName = 'jsonp_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        const script = document.createElement('script');
        
        // タイムアウト設定
        const timeout = setTimeout(() => {
            cleanup();
            reject(new Error('GAS Sync Timeout: スクリプトからの応答がありません。デプロイ設定を確認してください。'));
        }, 15000);

        function cleanup() {
            clearTimeout(timeout);
            if (script.parentNode) script.parentNode.removeChild(script);
            delete window[callbackName];
        }

        window[callbackName] = (data) => {
            cleanup();
            resolve(data);
        };

        const targetUrl = new URL(url);
        targetUrl.searchParams.append('callback', callbackName);
        for (const key in payload) {
            targetUrl.searchParams.append(key, payload[key]);
        }

        script.src = targetUrl.toString();
        script.onerror = () => {
            cleanup();
            reject(new Error('GAS接続失敗: 他のGoogleアカウントとの競合、または権限不足です。「シークレットブラウザ」で試すか、GASデプロイ設定でアクセスを「全員」にしているか確認してください。'));
        };
        document.body.appendChild(script);
    });
}

// Refined GAS Caller with JSONP support (CORS bypass)
async function callGAS(payload) {
    const gasUrl = state.gasUrl || localStorage.getItem('gas_url');
    if (!gasUrl) return null;

    try {
        if (payload.type === 'fetch') {
            // 同期（取得）は CORS 制限を回避できる JSONP を利用
            const result = await fetchViaJSONP(gasUrl, payload);
            if (result && result.status === 'success') {
                console.log('GAS JSONP Sync Success');
                return result;
            }
        } else {
            // 送信（POST）はヘッダーなしのシンプル POST を利用（レスポンスが取れなくても送信自体は成功する）
            const response = await fetch(gasUrl, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            // レスポンスが取れる場合は取る（CORS次第）
            try { return await response.json(); } catch(e) { return { status: 'success', note: 'opaque response' }; }
        }
    } catch (e) {
        console.warn('GAS Connectivity warning:', e.message);
    }
    return null;
}

