# Nutri-Vision 🥗📸

[English](#english) | [日本語](#日本語)

![Nutri-Vision Screenshot](https://images.unsplash.com/photo-1498837167922-41cfa6f31ce3?q=80&w=800&auto=format&fit=crop) <!-- Replace with actual screenshot later -->

---

<h2 id="english">English</h2>

**Nutri-Vision** is a next-generation nutrition tracking web application that uses AI to automatically analyze meals (calories and macronutrients) from a single photo, helping you manage your daily health. It features a highly modern design (dark mode, glassmorphism) and works smoothly on both smartphones and PCs.

### ✨ Features

- 📸 **AI Meal Image Analysis (Gemini API)**: Simply upload or snap a photo of your meal, and the AI will automatically estimate the dish name, calories, protein, fat, carbs, and salt equivalent. It also features an OCR mode to analyze nutrition labels on food packaging.
- 📊 **Rich Data Visualization**: Track your daily calorie balance, macronutrient (PFC) ratio, and weight trends using visually appealing charts powered by Chart.js.
- 🌍 **Multi-language Support (i18n)**: The UI text and AI output language automatically switch to match your browser or device's language settings (English / Japanese).
- 🏃 **Exercise Tracking**: Log daily physical activities like walking or muscle training with a single tap. The app predicts future weight fluctuations based on both calorie intake and calories burned.
- ☁️ **Cloud Sync (Google Apps Script)**: By default, data is saved locally in your browser to protect privacy. By linking with a free Google Spreadsheet (GAS), you can share data across multiple devices and maintain a persistent cloud backup.
- 📱 **QR Code Transfer Magic**: Instantly transfer your API keys and URL settings from your PC to your smartphone via a generated QR code.

### 🚀 How to Use

This application operates entirely on the front-end without requiring any complex server setup.

1. **Download and Open**  
   Clone or download this repository, and open `index.html` in a modern browser (Chrome, Safari, etc.).
2. **Get a Gemini API Key**  
   To use the AI analysis feature, generate a free **Gemini API Key** from [Google AI Studio](https://aistudio.google.com/app/apikey).
3. **Initial Setup**  
   Go to the "Settings" tab in the app, and enter your profile information (height, weight, etc.) along with the API key you obtained.
4. **Start Logging**  
   Go to the "Log" tab, upload a photo of your food, and start analyzing!

### 🛠️ Tech Stack

- **UI / Front-end**: HTML5, Vanilla JavaScript, Vanilla CSS (Responsive design, Dark mode exclusively)
- **Icons**: [Phosphor Icons](https://phosphoricons.com/)
- **Charts**: [Chart.js](https://www.chartjs.org/)
- **AI Analysis**: [Google Gemini 1.5 Flash](https://aistudio.google.com/app/prompts/new_chat) (REST API Call)
- **Cloud Sync**: Google Apps Script (GAS) to read/write Google Spreadsheets (using JSONP to bypass CORS)

### ☁️ Cloud Sync Setup (Optional)

If you want to sync your data between your smartphone and PC, you can configure a Google Spreadsheet as your database.

1. Create a new [Google Spreadsheet](https://sheets.new) and open "Extensions" > "Apps Script".
2. In the Nutri-Vision app, go to the "Settings" tab, click the "Copy GAS Script" button, and paste the code into the Apps Script editor, overwriting any default code.
3. In the Apps Script editor, click "Deploy" > "New deployment" in the top right.
4. Select "Web app" as the deployment type, set **Who has access to "Anyone"**, and click Deploy.
5. Copy the displayed "Web app URL" (`https://script.google.com/macros/s/.../exec`) and paste it into the Cloud Sync section of the app's settings.

### 🔒 Privacy

This application runs purely on the front-end. By default, all your dietary data and API keys remain safely stored within your own device (browser LocalStorage). No data is sent to any servers managed by us (excluding API calls directly to Google Gemini and your personal GAS endpoint, if configured).

---

<h2 id="日本語">日本語</h2>

**Nutri-Vision** は、写真1枚からAIが食事のカロリーと栄養素を自動解析し、日々の健康管理をサポートする次世代の栄養トラッキング・ウェブアプリケーションです。非常にモダンなデザイン（ダークモード、グラスモーフィズム）を採用し、スマホとPCの両方で快適に動作します。

### ✨ 主な特徴

- 📸 **AI 食事画像解析 (Gemini API)**: スマホで撮った写真やダウンロードした画像をアップロードするだけで、料理名、カロリー、たんぱく質、脂質、炭水化物、食塩相当量をAIが自動で推測します。パッケージの「栄養成分表示」をOCR解析するモードも備えています。
- 📊 **リッチなデータビジュアライゼーション**: Chart.jsを用いた視覚的にわかりやすいグラフで、毎日のカロリー収支、三大栄養素（PFC）のバランス、そして体重の推移をトラッキングします。
- 🌍 **多言語対応 (i18n)**: お使いのブラウザやデバイスの言語設定（日本語 / 英語）に合わせてUIテキストとAIの出力言語が自動的に切り替わります。
- 🏃 **運動の記録**: ウォーキングや筋力トレーニングなど、日常の運動消費カロリーも1タップで記録。摂取カロリーと消費カロリーの両軸から未来の体重変動を予測します。
- ☁️ **クラウド同期 (Google Apps Script)**: 標準はブラウザ内のローカルストレージにデータを保存しますが、無料で使えるGoogleスプレッドシート（GAS）と連携することで、複数端末間でのデータ共有やクラウドへの永続バックアップが可能です。
- 📱 **QRコード転送魔法**: PCで設定した面倒なAPIキーやURLなどを、QRコードを通してスマホへ一瞬で引き継ぐ機能を搭載しています。

### 🚀 使い方

本アプリはサーバー構築不要（フロントエンド完結型）で動作します。

1. **ダウンロードして開く**  
   このリポジトリをクローンするかダウンロードし、`index.html` をモダンブラウザ（Chrome, Safari等）で開いてください。
2. **Gemini APIキーの取得**  
   AI解析機能を利用するために、[Google AI Studio](https://aistudio.google.com/app/apikey) にて無料で取得できる **Gemini APIキー** を生成します。
3. **初期設定**  
   アプリの「設定」タブを開き、身長・体重などのプロフィール情報と、取得したAPIキーを入力します。
4. **記録開始**  
   「記録する」タブから写真をアップロードし、分析を開始してください！

### 🛠️ 技術スタック

- **UI / フロントエンド**: HTML5, Vanilla JavaScript, Vanilla CSS (レスポンシブデザイン, ダークモード専用)
- **アイコン**: [Phosphor Icons](https://phosphoricons.com/)
- **グラフ描画**: [Chart.js](https://www.chartjs.org/)
- **AI 解析**: [Google Gemini 1.5 Flash](https://aistudio.google.com/app/prompts/new_chat) (REST API呼び出し)
- **クラウド同期 (BaaS代用)**: Google Apps Script (GAS) 経由での Google Spreadsheet 読み書き（JSONPによるCORS回避実装）

### ☁️ クラウド同期のセットアップ手順（任意）

スマホとPCでデータを同期したい場合、以下の手順でスプレッドシートをデータベース化できます。

1. [Google スプレッドシート](https://sheets.new) を新規作成し、「拡張機能」>「Apps Script」を開きます。
2. アプリの「設定」画面中段にある「GASスクリプトをコピー」ボタンを押し、コードをApps Scriptエディタに貼り付けて保存します。
3. Apps Scriptの右上にある「デプロイ」>「新しいデプロイ」を選択します。
4. 種類を「ウェブアプリ」とし、**アクセスできるユーザーを「全員 (Anyone)」** に設定して「デプロイ」を実行します。
5. 表示された「ウェブアプリの URL (`https://script.google.com/macros/s/.../exec`)」をアプリの設定画面に入力してください。

### 🔒 プライバシーについて

本アプリはフロントエンドのみで動作し、標準状態ではあなたの食事データやAPIキーはすべて「お使いの端末（ブラウザのLocalStorage）」内に留まります。我々の管理するサーバーにデータが送信されることはありません（Google APIへの通信や、ご自身で設定したGASへの通信を除きます）。

---

*Made with ❤️ and Vanilla JS.*
