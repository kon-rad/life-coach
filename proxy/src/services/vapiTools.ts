import * as crypto from 'crypto';
import { db } from './firebase';
import { encryptJSON, decryptJSON } from './encryption';
import { weekId, weekRange, upcomingWeekRange, weekIdForDate } from './weeks';

interface Task { id: string; title: string; isCompleted: boolean; completedAt: string | null; }

function makeTasks(titles: string[]): Task[] {
  return titles.slice(0, 3).map((title) => ({
    id: crypto.randomUUID(), title, isCompleted: false, completedAt: null,
  }));
}

async function setWeekTasks(uid: string, titles: string[]): Promise<string> {
  const range = upcomingWeekRange(new Date());
  const id = `${uid}_${range.year}-W${String(range.week).padStart(2, '0')}`;
  await db.collection('weeks').doc(id).set({
    userId: uid, weekNumber: range.week, year: range.year,
    startDate: range.startDate, endDate: range.endDate,
    tasks: await encryptJSON(makeTasks(titles)), status: 'planned',
    retrospectiveId: null, createdAt: new Date().toISOString(),
  });
  return `Saved 3 tasks for week ${range.week} (starting ${range.startDate}).`;
}

async function setDayTasks(uid: string, date: string, titles: string[]): Promise<string> {
  const id = `${uid}_${date}`;
  const ref = db.collection('sessions').doc(id);
  const existing = await ref.get();
  const base = existing.exists ? (existing.data() as Record<string, unknown>) : {};
  await ref.set({
    ...base,
    userId: uid, date,
    tasks: await encryptJSON(makeTasks(titles)),
    weekId: weekIdForDate(uid, date),
    middayCallId: (base as { middayCallId?: string }).middayCallId ?? null,
    eveningCallId: (base as { eveningCallId?: string }).eveningCallId ?? null,
    score: (base as { score?: number }).score ?? null,
    scoreRationale: (base as { scoreRationale?: string }).scoreRationale ?? null,
  });
  return `Saved 3 tasks for ${date}.`;
}

async function toggleInDoc(
  ref: { update: (data: Record<string, unknown>) => Promise<void> },
  data: Record<string, unknown>,
  taskId: string,
  isCompleted: boolean,
): Promise<boolean> {
  const enc = data.tasks as string | undefined;
  if (!enc) return false;
  const tasks = await decryptJSON<Task[]>(enc);
  const idx = tasks.findIndex((t) => t.id === taskId);
  if (idx === -1) return false;
  tasks[idx].isCompleted = isCompleted;
  tasks[idx].completedAt = isCompleted ? new Date().toISOString() : null;
  await ref.update({ tasks: await encryptJSON(tasks) });
  return true;
}

async function completeTask(uid: string, taskId: string, isCompleted: boolean): Promise<string> {
  // 1. current week
  const weekDocId = weekId(uid, new Date());
  const weekRef = db.collection('weeks').doc(weekDocId);
  const weekDoc = await weekRef.get();
  if (weekDoc.exists) {
    const matched = await toggleInDoc(
      weekRef as unknown as { update: (data: Record<string, unknown>) => Promise<void> },
      weekDoc.data() as Record<string, unknown>,
      taskId,
      isCompleted,
    );
    if (matched) return `Marked the week task ${isCompleted ? 'complete' : 'not complete'}.`;
  }
  // 2. last 7 day sessions
  const from = (() => { const d = new Date(); d.setUTCDate(d.getUTCDate() - 6); return d.toISOString().slice(0, 10); })();
  const to = new Date().toISOString().slice(0, 10);
  const snap = await db.collection('sessions')
    .where('userId', '==', uid).where('date', '>=', from).where('date', '<=', to).get();
  for (const d of snap.docs) {
    const matched = await toggleInDoc(
      d.ref as unknown as { update: (data: Record<string, unknown>) => Promise<void> },
      d.data() as Record<string, unknown>,
      taskId,
      isCompleted,
    );
    if (matched) return `Marked the task ${isCompleted ? 'complete' : 'not complete'}.`;
  }
  return 'Could not find that task.';
}

// Suppress unused import warning — weekRange is exported for use in other modules
void weekRange;

export async function handleToolCall(
  uid: string, name: string, args: Record<string, unknown>,
): Promise<string> {
  switch (name) {
    case 'set_week_tasks':
      return setWeekTasks(uid, (args.tasks as string[]) ?? []);
    case 'set_day_tasks':
      return setDayTasks(uid, String(args.date ?? new Date().toISOString().slice(0, 10)), (args.tasks as string[]) ?? []);
    case 'complete_task':
      return completeTask(uid, String(args.taskId ?? ''), Boolean(args.isCompleted));
    default:
      return `Unknown tool: ${name}`;
  }
}
