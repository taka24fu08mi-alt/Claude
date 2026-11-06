#!/bin/bash
# メール送信・転送・削除、予定の変更・削除の前に必ずユーザー確認を挟む
TOOL=$(jq -r '.tool_name')
case "$TOOL" in
  *send_message*|*reply*) WHAT="メールを送信" ;;
  *forward*) WHAT="メールを転送" ;;
  *trash*) WHAT="メールを削除" ;;
  *delete_event*) WHAT="予定を削除" ;;
  *update_event*) WHAT="予定を変更" ;;
  *) exit 0 ;;
esac
jq -n --arg r "${WHAT}しようとしています。内容を確認してから許可してください。" \
  '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"ask",permissionDecisionReason:$r}}'
