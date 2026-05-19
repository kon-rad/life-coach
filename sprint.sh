#!/bin/bash
# Tight sprint loop — one task per iteration, no heavy context files.
set -u

SYS="You are a build executor. NOT a chat assistant. No questions, no options, no summaries. Just implement. AskUserQuestion/ExitPlanMode/Skill/ScheduleWakeup are disabled."

PROMPT='EXECUTE NOW. Find the first "- [ ]" task in TASKS.md. If none, append "ALL TASKS COMPLETE" to progress.txt and exit.
1. Implement it fully per its Do block (full code, no stubs).
2. Verify: proxy → cd proxy && npx tsc --noEmit && npm test; iOS → xcodebuild -scheme LiveCoach -destination "platform=iOS Simulator,name=iPhone 16" build (+ test if tests written); both changed → run both.
3. Flip - [ ] to - [x] in TASKS.md.
4. git add (never: .env node_modules/ DerivedData/ dist/ build/ *.log sprint.sh ralph.sh ralph.log design/).
5. git commit -m "T-NNN: short title".
6. Append to progress.txt: T-NNN\nT-NNN VERIFY: pass — one sentence.
7. Exit.'

while true; do
  if grep -q "ALL TASKS COMPLETE" progress.txt 2>/dev/null; then
    echo "$(date '+%H:%M:%S') ALL TASKS COMPLETE"
    exit 0
  fi
  if ! grep -q "^- \[ \]" TASKS.md 2>/dev/null; then
    echo "ALL TASKS COMPLETE" >> progress.txt
    echo "$(date '+%H:%M:%S') ALL TASKS COMPLETE"
    exit 0
  fi

  claude \
    --dangerously-skip-permissions \
    --disallowed-tools=AskUserQuestion \
    --disallowed-tools=ExitPlanMode \
    --disallowed-tools=Skill \
    --disallowed-tools=ScheduleWakeup \
    --append-system-prompt "$SYS" \
    "@TASKS.md" "@progress.txt" \
    "$PROMPT" \
    2>&1 | tee -a ralph.log

  echo "$(date '+%H:%M:%S') iteration done, next..."
  sleep 2
done
