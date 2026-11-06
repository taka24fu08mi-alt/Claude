#!/bin/bash
# 作業終了時：①もう一度確認 ②未保存チェック ③完了通知
INPUT=$(cat)
ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false')
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
DIRTY=$(git status --porcelain 2>/dev/null)
AHEAD=$(git log --oneline @{u}..HEAD 2>/dev/null)
if [ "$ACTIVE" != "true" ]; then
  R="終了前にもう一度確認してください：ユーザーの依頼をすべて満たしたか、内容・数字・日付に誤りがないか、CLAUDE.md のルール（推測で埋めない等）を守ったか。問題があれば直し、なければ短く「確認済み」と伝えて終了してください。"
  if [ -n "$DIRTY" ] || [ -n "$AHEAD" ]; then
    R="$R また、コミットまたはプッシュしていない変更があります。必要なものはコミットしてプッシュしてください。"
  fi
  jq -n --arg r "$R" '{decision:"block",reason:$r}'
  exit 0
fi
if [ -n "$DIRTY" ] || [ -n "$AHEAD" ]; then
  echo '{"systemMessage":"⚠️ 作業終了：まだ保存（コミット・プッシュ）していない変更があります"}'
else
  echo '{"systemMessage":"✅ 作業が終わりました"}'
fi
