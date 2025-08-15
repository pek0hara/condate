# 献立アプリ

3日分の献立を管理できるWebアプリケーションです。Firestoreをバックエンドとして使用し、献立の保存・読み込み・削除が可能です。

## 機能

- 3日分の献立（朝食・昼食・夕食）を入力・管理
- Firestoreを使った献立データの永続化
- レスポンシブデザイン
- リアルタイムでの保存・読み込み

## セットアップ手順

### 1. Firebaseプロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを追加」をクリック
3. プロジェクト名を入力して作成

### 2. Firestore Databaseの設定

1. Firebase Console でプロジェクトを開く
2. 左メニューから「Firestore Database」を選択
3. 「データベースの作成」をクリック
4. テストモードで開始（本番環境では適切なセキュリティルールを設定）

### 3. Web アプリの設定

1. Firebase Console のプロジェクト設定を開く
2. 「全般」タブで「ウェブアプリを追加」をクリック
3. アプリ名を入力して登録
4. 設定オブジェクトをコピー

### 4. 設定ファイルの更新

`firebase-config.js` ファイル内の `firebaseConfig` オブジェクトを、Firebase Console で取得した設定に置き換えてください。

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

## ファイル構成

```
condate/
├── index.html          # メインHTMLファイル
├── style.css           # スタイルシート
├── app.js              # メインJavaScriptファイル
├── firebase-config.js  # Firebase設定
└── README.md          # このファイル
```

## 使用技術

- HTML5
- CSS3（Grid、Flexbox）
- JavaScript（ES6+ modules）
- Firebase Firestore
- Responsive Web Design

## 使用方法

1. 各日の朝食・昼食・夕食メニューを入力
2. 「献立を保存」ボタンで Firestore に保存
3. 「献立を読込」ボタンで保存済みの献立を読み込み
4. 「クリア」ボタンで全ての入力をクリア

## 注意事項

- Firebaseの設定が正しく行われていない場合、アプリは正常に動作しません
- ブラウザがモジュールをサポートしている必要があります（モダンブラウザ推奨）
- HTTPSまたはlocalhostでの実行が必要です（Firebase SDKの制限）

## Firestoreセキュリティルール（開発用）

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

本番環境では適切なセキュリティルールを設定してください。