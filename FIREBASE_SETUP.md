# Firebase 設定手順

## 1. Firebase プロジェクトの作成

1. https://console.firebase.google.com/ にアクセス
2. 「プロジェクトを追加」をクリック
3. プロジェクト名を「kakeibo-app」などと入力
4. Google アナリティクスは不要なのでオフにして続行

## 2. Web アプリの登録

1. プロジェクトのホーム画面で「ウェブ」アイコン（</>）をクリック
2. アプリのニックネームを入力（例: 家計簿アプリ）
3. 「Firebase Hosting も設定する」はチェックしない
4. 「アプリを登録」をクリック
5. 表示される設定情報（firebaseConfig）をコピー

## 3. Authentication（認証）の設定

1. 左メニューから「Authentication」を選択
2. 「始める」をクリック
3. 「Sign-in method」タブを選択
4. 「メール/パスワード」を選択して有効にする
5. 「保存」をクリック

## 4. Realtime Database の設定

1. 左メニューから「Realtime Database」を選択
2. 「データベースを作成」をクリック
3. ロケーションは「asia-southeast1 (シンガポール)」を選択
4. セキュリティルールは「テストモードで開始」を選択
5. 「有効にする」をクリック

## 5. セキュリティルールの設定

Realtime Database の「ルール」タブで以下のルールを設定：

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    }
  }
}
```

「公開」をクリックして保存

## 6. script.js の設定を更新

手順 2 でコピーした設定情報を使って、script.js の最初の部分を以下のように更新：

```javascript
const firebaseConfig = {
  apiKey: "あなたのAPIキー",
  authDomain: "あなたのプロジェクト.firebaseapp.com",
  databaseURL: "https://あなたのプロジェクト-default-rtdb.firebaseio.com",
  projectId: "あなたのプロジェクトID",
  storageBucket: "あなたのプロジェクト.appspot.com",
  messagingSenderId: "あなたのメッセージングID",
  appId: "あなたのアプリID",
};
```

## 7. GitHub にプッシュ

設定が完了したら、変更を GitHub にプッシュ：

```bash
cd "c:\Users\reram\OneDrive\ドキュメント\プログラミング\家計簿アプリ"
git add .
git commit -m "ログイン機能を追加"
git push origin main
```

## 8. 使い方

- 新規登録：メールアドレスとパスワードでアカウント作成
- ログイン：登録したメールアドレスとパスワードでログイン
- データは Firebase に保存されるので、どのデバイスからでも同じアカウントでログインすれば同じデータが見られます

## 注意事項

- パスワードは 6 文字以上必要です
- メールアドレスは実在するものでなくても OK ですが、忘れないようにメモしておいてください
