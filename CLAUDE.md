# 仕事の補助 ルール

このリポジトリの目的は、**仕事の補助全般**（カレンダー管理・メール確認・経費精算・業務日報など）を行うこと。
ユーザーは主にスマホから使うので、返事は短く分かりやすい日本語で、表や箇条書きを使って見やすくする。

## 共通ルール（組織・人物）

| 人物 | 所属・役割 | 備考 |
|---|---|---|
| 野口 茜 | 消火装置部 事務員 | 業務日報の作成対象者 |
| 中井 主任 | 消火装置部 | 野口茜の上司（直属） |
| 稲川 参事 | — | 野口茜の上司 |
| 越前 | — | 野口茜の上司 |

## 必ず守ること

- あいまいな内容は推測で埋めず、ユーザーに確認する。
- 予定の削除・変更、メールの送信・転送・削除は、内容を見せて確認を取ってから行う。

## スキル（詳しい手順は `.claude/skills/` に入っている）

| スキル | 内容 | ファイル |
|---|---|---|
| calendar | カレンダー管理（Googleカレンダー） | `.claude/skills/calendar/SKILL.md` |
| email | メール確認（Gmail） | `.claude/skills/email/SKILL.md` |
| keihi-seisan | 経費精算（領収書→伝票） | `.claude/skills/keihi-seisan/SKILL.md` |
| gyomu-nippo | 業務日報（野口茜） | `.claude/skills/gyomu-nippo/SKILL.md` |
| skill-creator | 新しいスキルの作成・既存スキルの改善（Anthropic公式） | `.claude/skills/skill-creator/SKILL.md` |

## 環境・設定のメモ

- **作業環境は一時的**：クラウドのセッションは終わると中身が消える。残したい変更は必ずコミット＆プッシュする。
- **ユーザーへの説明**：専門用語は避けて、たとえで説明する（例：コミット＝セーブ、プッシュ＝GitHubに送る）。
- **スキルの追加**：`npx -y skills add <URL> --skill <名前> -y` で入れる。本体は `.agents/skills/` に、`.claude/skills/` にはそこへのリンクが入る。入れたら上のスキル表にも追記する。
- **プラグインの追加**：`--scope project` で入れる（`.claude/settings.json` に記録される）。公式マーケットが無いと言われたら、先に `claude plugin marketplace add anthropics/claude-plugins-official --scope project` を実行する。反映されるのは次のセッションから。
- **導入済みプラグイン**：superpowers（claude-plugins-official）

### フック（`.claude/settings.json` ＋ `.claude/hooks/`）

| いつ | スクリプト | 内容 |
|---|---|---|
| セッション開始時 | `session-start.sh` | 最新を取り込み、今日の日付（日本時間）とブランチの状況を伝える |
| メールの送信・返信・転送・削除、予定の変更・削除の前 | `confirm-action.sh` | 必ずユーザーの許可を求める |
| 作業の終わり | `stop-check.sh` | 1回目：もう一度確認するよう促し、未保存があれば保存も促す（問題なければ「確認済み」と短く伝えて終える）／2回目：画面に完了通知を出す |

---

全体のルール・人物の追加変更はこのファイル、各業務の手順の追加変更は該当するスキルのファイルを更新する。
