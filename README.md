## 遺失物管理 SaaS (MVP)

商業施設向けの遺失物管理システム（Webアプリ）のプロトタイプです。  
Next.js (App Router) / Supabase / Tailwind CSS / shadcn 風 UI コンポーネントで構成されています。

### 主な画面

- **ダッシュボード (`/`)**
  - 現在「保管中」の件数をカード表示
  - 今月中に所有権が移転する拾得物の一覧
  - 拾得日から自動計算した「警察提出期限（7日以内）」と「所有権取得日（90日後）」を表示
  - 未提出（ステータス「保管中」）かつ 6 日経過したアイテムには赤い警告バッジを表示

- **拾得物登録 (`/items/new`)**
  - 管理番号 / 拾得日時 / カテゴリー / 拾得場所 / 品名 / 特徴 / 顔写真URL / 拾得物写真URL を入力
  - 拾得日時入力時に「警察提出期限」と「所有権取得日」を即時計算してプレビュー
  - 登録時に Supabase の `lost_items` テーブルへ挿入

- **PDF 出力**
  - `GET /api/items/[id]/pdf` で警察提出用の「拾得物届出書」形式の PDF を生成

### セットアップ手順

1. **Node.js をインストール**
   - LTS 版をインストールし、`node` と `npm` が PATH に通っていることを確認してください。

2. **依存関係インストール**

   ```bash
   cd lost-and-found-saas
   npm install
   ```

3. **Supabase プロジェクトを作成し、テーブル定義を反映**

   - Supabase プロジェクトの SQL エディタで `supabase-schema.sql` を実行し、`lost_items` テーブルを作成します。

4. **環境変数を設定**

   ルートに `.env.local` を作成し、以下を設定します。

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=あなたのSupabase URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY=あなたのAnon Key
   ```

5. **開発サーバー起動**

   ```bash
   npm run dev
   ```

   ブラウザで `http://localhost:3000` にアクセスするとダッシュボードが表示されます。

### 補足

- 認証や詳細な権限管理は省略し、MVP として「遺失物法に基づく期限管理」と「警察提出用PDF出力」にフォーカスしています。
- 必要に応じて Supabase Auth を有効化し、テナントごとに `facility_id` カラムを追加することで商業施設単位のマルチテナント化も可能です。

