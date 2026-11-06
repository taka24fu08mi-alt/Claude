#!/bin/bash
# セッション開始時：最新を取り込み、日付とブランチ状況をClaudeに伝える
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
BR=$(git branch --show-current 2>/dev/null)
[ -n "$BR" ] && git pull -q --ff-only origin "$BR" >/dev/null 2>&1
TODAY=$(TZ=Asia/Tokyo date '+%Y年%-m月%-d日(%a)')
STATUS=$(git status --short 2>/dev/null | head -20)
MSG="今日は ${TODAY}（日本時間）。ブランチ: ${BR:-不明}。"
[ -n "$STATUS" ] && MSG="$MSG 未保存の変更あり:"$'\n'"$STATUS"
jq -n --arg m "$MSG" '{hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:$m}}'
