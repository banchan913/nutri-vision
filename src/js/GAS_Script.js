/**
 * Nutri-Vision 専用 Google Apps Script (GAS)
 * 
 * 【使い方】
 * 1. Google スプレッドシートを新規作成します。
 * 2. 拡張機能 > Apps Script を開きます。
 * 3. このコードをすべて貼り付けます（既存の myFunction は消してください）。
 * 4. 右上の「デプロイ」>「新しいデプロイ」をクリック。
 * 5. 以下の設定でデプロイします：
 *    - 種類を選択：ウェブアプリ
 *    - 次のユーザーとして実行：自分
 *    - アクセスできるユーザー：全員（Anyone）
 * 6. 発行された「ウェブアプリのURL」をコピーし、Nutri-Visionアプリの設定画面に貼り付けてください。
 */

function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Log');
  
  // シートの初期化
  if (!sheet) {
    sheet = ss.insertSheet('Log');
    sheet.appendRow(['日付', '時間', '項目', 'カロリー', 'P', 'F', 'C', '塩分', '画像URL', '体重']);
  }

  // 画像保存モード
  if (data.type === 'image') {
    var folderName = "NutriVision_Images";
    var folders = DriveApp.getFoldersByName(folderName);
    var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
    
    var blob = Utilities.newBlob(Utilities.base64Decode(data.base64), data.mimeType, "meal_" + new Date().getTime());
    var file = folder.createFile(blob);
    
    // アプリから表示できるように共有設定を変更
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // 直接表示用URLの生成
    var viewUrl = "https://drive.google.com/uc?export=view&id=" + file.getId();
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', url: viewUrl }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ログ保存モード
  if (data.type === 'log') {
    sheet.appendRow([
      data.date, 
      data.time, 
      data.name, 
      data.calories, 
      data.p, 
      data.f, 
      data.c, 
      data.salt || 0,
      data.imageUrl || '', 
      data.weight || ''
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 履歴取得モード (同期用)
  if (data.type === 'fetch') {
    var rows = sheet.getDataRange().getValues();
    var history = [];
    var activities = [];
    
    for (var i = 1; i < rows.length; i++) {
        var row = rows[i];
        // 簡易的な判別（項目名に運動系が含まれるか等、あるいはデータの種類で分ける）
        // GAS側で判別が難しいため、一旦すべて history として返し、必要があればアプリ側で振り分けるか、
        // 運動を記録する際の flag を付ける。現状は一括取得。
        var entry = {
            date: row[0],
            time: row[1],
            name: row[2],
            calories: row[3],
            p: row[4],
            f: row[5],
            c: row[6],
            salt: row[7],
            imageUrl: row[8],
            weight: row[9],
            id: new Date(row[0] + " " + row[1]).getTime() + i
        };
        history.push(entry);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', history: history, activities: activities }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Unknown type' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return HtmlService.createHtmlOutput("Nutri-Vision Backend is active.");
}
