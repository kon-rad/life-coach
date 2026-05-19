#!/bin/bash
# Live Coach Ralph loop — unattended task executor.
# Picks the first unchecked task in TASKS.md, implements it, commits, appends progress.txt, exits.

set -u

read -r -d '' SYS_PROMPT <<'EOF' || true
You are a build executor running inside an infinite shell loop. You are NOT a chat assistant. You have NO human counterpart in this session. There is no one to answer your questions, accept your offered options, or pick from a numbered list. Any text you emit that looks like a question, an option list (numbered or bulleted), a request for confirmation, a "let me know how you would like to proceed", or any other deferral, is wasted output and will cause an iteration of the loop to fail without progress.

You have exactly ONE behavior: read the task list, find the first unchecked task, implement it end-to-end, run verification, commit, append a progress line, then exit. You do not ask first. You do not propose alternatives. You do not summarize what you are about to do. You just do it.

The AskUserQuestion, ExitPlanMode, Skill, and ScheduleWakeup tools are disabled at the CLI level. Do not attempt to call them. There is no plan-mode workflow here; you are already executing.

If a task is genuinely blocked by something outside the repo (network down, missing credentials the PRD requires but does not supply, etc.), record "T-NNN BLOCKED: <one-line reason>" in progress.txt and exit. Do not improvise alternative implementations outside what the TASKS.md specifies.

Trust the TASKS.md. Its tech-stack choices, library picks, and architecture are locked. Do not propose substitutions.
EOF

read -r -d '' USER_PROMPT <<'EOF' || true
EXECUTE NOW. No preamble. No questions.

1. Find the first task in TASKS.md whose checkbox is "- [ ]". Call it T-NNN. If no such task exists, append "ALL TASKS COMPLETE" to progress.txt and exit.

2. Implement T-NNN per its Do block. Honor its Acceptance criteria exactly.

3. Verify:
   - For iOS tasks (anything touching LiveCoach/ or LiveCoachTests/): run
       xcodebuild -scheme LiveCoach -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | grep -E "(SUCCEEDED|FAILED|error:)"
     AND (if tests were written or modified):
       xcodebuild test -scheme LiveCoach -destination 'platform=iOS Simulator,name=iPhone 16' 2>&1 | grep -E "(TEST SUCCEEDED|TEST FAILED|passed|failed)"
     Both must show SUCCEEDED / passed.
   - For proxy tasks (anything in proxy/): run
       cd proxy && npx tsc --noEmit && npm test 2>&1 | tail -20
     Both must exit 0 / pass.
   - Tasks that touch both: run all four commands above.

4. Flip the T-NNN checkbox in TASKS.md from "- [ ]" to "- [x]".

5. git add all changed files. NEVER add: design/, ralph.sh, ralph.log, DerivedData/, build/, .env, *.log, or any binary/image/media files. ALWAYS add TASKS.md when the checkbox was flipped.

6. git commit with subject "T-NNN: <short title matching the task name>".

7. Append exactly two lines to progress.txt:
   T-NNN
   T-NNN VERIFY: pass — <one-sentence summary of what was implemented>

8. Exit.

Do exactly ONE task. Do not also do T-(NNN+1). Do not modify ralph.sh, project.yml, or docs/*.
EOF

while true; do
  # Stop if all tasks are done
  if grep -q "ALL TASKS COMPLETE" progress.txt 2>/dev/null; then
    echo "$(date '+%H:%M:%S') ALL TASKS COMPLETE. Loop exiting."
    exit 0
  fi

  claude \
    --dangerously-skip-permissions \
    --disallowed-tools=AskUserQuestion \
    --disallowed-tools=ExitPlanMode \
    --disallowed-tools=Skill \
    --disallowed-tools=ScheduleWakeup \
    --append-system-prompt "$SYS_PROMPT" \
    "@docs/architecture.md" "@TASKS.md" "@progress.txt" \
    "$USER_PROMPT" \
    2>&1 | tee -a ralph.log

  echo "$(date '+%H:%M:%S') Iteration complete. Spawning next..."
  sleep 2
done
