# Anthropic Academy 無料講座メモ（2026年11月6日時点）

講座サイト：https://anthropic.skilljar.com/ （無料。受講には Skilljar の無料登録が必要）
※ 講座の本文（動画・レッスン）はログインが必要なため、公開されている「講座紹介・目次」を元にまとめた。

## 全22講座と、この仕事への役立ち度

| 講座 | 内容 | 役立ち度 |
|---|---|---|
| Claude 101 | 日常業務でのClaudeの使い方（プロジェクト・アーティファクト・スキル・ツール連携・リサーチ） | ◎ 最初の1本に |
| AI Fluency: Framework & Foundations | AIとの付き合い方「4D」（任せる・伝える・見極める・責任） | ◎ CLAUDE.md に反映 |
| AI Fluency for Small Businesses | 4Dを中小企業の事務・現場仕事に当てはめる | ◎ |
| AI Capabilities and Limitations | AIの得意・不得意と、変な答えが出たときの直し方 | ○ |
| Introduction to Claude Cowork | 自分のファイルでClaudeと作業する（スキル・プラグイン・Excel/Outlook連携） | ○ |
| Introduction to agent skills | スキルの作り方（説明文の書き方・ファイルの分け方・共有） | ○ スキル作りに反映 |
| Claude Code 101 | Claude Code の基本（CLAUDE.md・サブエージェント・スキル・MCP・フック） | ○ |
| Claude Code in Action | 長い作業を任せる・CLAUDE.mdを短く保つ・検証用スキル・フック | ○ 見直しスキルに反映 |
| Introduction to subagents | 作業を別の助手に分けて任せる | △ |
| Claude Platform 101 / Building with the Claude API | プログラムからClaudeを使う（開発者向け） | × |
| Introduction to MCP / MCP: Advanced Topics | 外部ツール連携の仕組みを作る（開発者向け） | × |
| Claude with Amazon Bedrock / Claude on Google Cloud | クラウド上での利用（開発者向け） | × |
| Deploying Claude Enterprise with Confidence | 会社全体への導入（管理者向け） | × |
| AI Fluency for educators / students / Teaching AI Fluency | 教育者・学生向け | × |
| AI Fluency for nonprofits / Builders / Creative Work | 非営利団体・開発者・クリエイター向け | × |

## このリポジトリに取り入れたこと

| 取り入れた所 | 内容 | 元にした講座 |
|---|---|---|
| CLAUDE.md「AIとの付き合い方（4D）」 | 任せる／伝える／見極める／責任 の4つのルール | AI Fluency 各講座 |
| スキル `teishutsu-check` | 日報・伝票・メール下書きを渡す前の見直し表 | AI Fluency（見極め）、Claude Code in Action（検証用スキル） |
| CLAUDE.md の書き方 | 短く保ち、細かい手順はスキルに分ける | Claude Code in Action、Introduction to agent skills |

## 公式ドキュメントから取り入れたこと（2026年11月7日）

講座の中身はログインが必要なため、同じ内容が載っている公開の公式ドキュメントを読んだ。

| 読んだページ | 取り入れたこと | 反映先 |
|---|---|---|
| [CLAUDE.md の書き方](https://code.claude.com/docs/en/memory) | 200行以内にする・具体的に書く・矛盾するルールを残さない | CLAUDE.md |
| [Claude Code のベストプラクティス](https://code.claude.com/docs/en/best-practices) | 2回直したことは書き残す・見直しチェックを用意する・例外を許さないルールはフックで強制する | CLAUDE.md、各スキルの「仕上げ」 |
| [スキル作成のベストプラクティス](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) | 説明文に「何をするか」と「いつ使うか」を書く・短く書く・チェック表で見直す | 各スキル（今の説明文は条件を満たしている） |
| [頼み方（プロンプト）のコツ](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) | はっきり頼む・目的や理由を伝える・見本を見せる | 下の「頼み方のコツ」 |

## 頼み方のコツ（越前さん用）

| コツ | 例 |
|---|---|
| **目的を一言そえる** | 「元請への提出用だから、丁寧な書き方で」 |
| **見本を渡す** | 「この過去物件の見積と同じ形式で」（サーバーのファイル名を伝える） |
| **期限・宛先・書式を伝える** | 「月曜までに、東京消防庁の書式で、着工届の表紙を」 |
| **ほしい形を指定する** | 「表にして」「3行で」「Excelで」 |
| **2回同じことを直したら** | 「これを毎回のルールにして」と言えば、CLAUDE.md かスキルに追記する |
