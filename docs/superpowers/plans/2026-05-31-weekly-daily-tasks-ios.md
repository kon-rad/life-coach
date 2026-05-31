# Weekly + Daily Tasks — Phase B (iOS) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the SwiftUI app to the weekly+daily task model: rename the Project tab to **Tasks** (week cards with day rows), update Home, add per-call types (midday/evening/weekly/free), add Weekly Retrospective Reports in Profile, expand notification settings (timezone + weekly planning), and remove the Projects/goal feature.

**Architecture:** New models `Week`, `WeekTask`, `DayTask`, `Retrospective`. `DailySession` evolves (`microActions`→`tasks`, `morningCallId`→`middayCallId`, add `weekId`). New services `WeekService`, `RetrospectiveService`. New `TasksView` replaces `ProjectView`. Networking via existing `ProxyAPIClient` against the Phase-A proxy endpoints.

**Tech Stack:** SwiftUI (iOS 17), `@Observable` services, XcodeGen project (`project.yml`), XCTest. Dark theme via `DesignSystem.swift` (`Color.lc*`, `LCCard`, `LCSectionLabel`).

**Prereqs:** Phase A (proxy) merged — endpoints `/weeks`, `/sessions` (new `tasks` shape), `/retrospectives`, `/user/profile` (new settings) exist.

**Critical workflow note:** After **creating or deleting any `.swift` file**, run `cd ios-app && xcodegen generate` before building, or the file won't be in the Xcode project. Build check command used throughout:

```bash
cd ios-app && xcodegen generate && xcodebuild -project LiveCoach.xcodeproj -scheme LiveCoach \
  -destination 'platform=iOS Simulator,name=iPhone 16 Pro' build 2>&1 | tail -5
```

Test command:
```bash
cd ios-app && xcodebuild -project LiveCoach.xcodeproj -scheme LiveCoach \
  -destination 'platform=iOS Simulator,name=iPhone 16 Pro' test 2>&1 | tail -20
```

---

## Task 1: New models (Week, WeekTask, DayTask, Retrospective) + DailySession evolution

**Files:**
- Create: `ios-app/LiveCoach/Models/Week.swift`
- Create: `ios-app/LiveCoach/Models/Retrospective.swift`
- Modify: `ios-app/LiveCoach/Models/DailySession.swift`
- Modify: `ios-app/LiveCoachTests/ModelTests.swift`

- [ ] **Step 1: Write failing model decode tests**

Add to `ModelTests.swift`:

```swift
func testWeekDecodes() throws {
    let json = """
    {"id":"u_2026-W23","userId":"u","weekNumber":23,"year":2026,
     "startDate":"2026-06-01","endDate":"2026-06-07",
     "tasks":[{"id":"t1","title":"Ship","isCompleted":false,"completedAt":null}],
     "status":"active","retrospectiveId":null,"createdAt":"2026-06-01T00:00:00Z"}
    """.data(using: .utf8)!
    let d = JSONDecoder(); d.dateDecodingStrategy = .iso8601
    let week = try d.decode(Week.self, from: json)
    XCTAssertEqual(week.weekNumber, 23)
    XCTAssertEqual(week.tasks.count, 1)
    XCTAssertEqual(week.status, .active)
}

func testRetrospectiveDecodes() throws {
    let json = """
    {"id":"u_2026-W23","weekId":"u_2026-W23","weekNumber":23,"year":2026,
     "startDate":"2026-06-01","endDate":"2026-06-07",
     "wentWell":"good","improve":"earlier","onePercent":"plan","summary":"solid",
     "createdAt":"2026-06-07T19:00:00Z"}
    """.data(using: .utf8)!
    let d = JSONDecoder(); d.dateDecodingStrategy = .iso8601
    let r = try d.decode(Retrospective.self, from: json)
    XCTAssertEqual(r.onePercent, "plan")
}

func testDailySessionUsesTasks() throws {
    let json = """
    {"id":"u_2026-06-02","userId":"u","date":"2026-06-02","weekId":"u_2026-W23",
     "tasks":[{"id":"t1","title":"A","isCompleted":true,"completedAt":null}],
     "middayCallId":null,"eveningCallId":null,"score":7,"scoreRationale":null}
    """.data(using: .utf8)!
    let d = JSONDecoder(); d.dateDecodingStrategy = .iso8601
    let s = try d.decode(DailySession.self, from: json)
    XCTAssertEqual(s.tasks.count, 1)
    XCTAssertEqual(s.score, 7)
}
```

- [ ] **Step 2: Build/test to verify failure**

Run the test command. Expected: compile failure (`Week`/`Retrospective` undefined; `DailySession.tasks` missing).

- [ ] **Step 3: Implement the models**

`ios-app/LiveCoach/Models/Week.swift`:
```swift
import Foundation

struct WeekTask: Codable, Identifiable, Sendable {
    let id: String
    var title: String
    var isCompleted: Bool
    var completedAt: Date?
}

enum WeekStatus: String, Codable, Sendable {
    case planned, active, complete
}

struct Week: Codable, Identifiable, Sendable {
    let id: String
    let userId: String
    let weekNumber: Int
    let year: Int
    let startDate: String
    let endDate: String
    var tasks: [WeekTask]
    var status: WeekStatus
    var retrospectiveId: String?
    let createdAt: Date
}
```

`ios-app/LiveCoach/Models/Retrospective.swift`:
```swift
import Foundation

struct Retrospective: Codable, Identifiable, Sendable {
    let id: String
    let weekId: String
    let weekNumber: Int
    let year: Int
    let startDate: String
    let endDate: String
    var wentWell: String
    var improve: String
    var onePercent: String
    var summary: String
    let createdAt: Date
}
```

Rewrite `DailySession.swift` (rename `MicroAction`→`DayTask`, fields):
```swift
import Foundation

struct DayTask: Codable, Identifiable, Sendable {
    let id: String
    var title: String
    var isCompleted: Bool
    var completedAt: Date?
}

struct DailySession: Codable, Identifiable, Sendable {
    let id: String
    let userId: String
    let date: String
    var weekId: String?
    var tasks: [DayTask]
    var middayCallId: String?
    var eveningCallId: String?
    var score: Int?
    var scoreRationale: String?
}
```

> `MicroAction` is removed. Later tasks fix every reference (`HomeViewModel`, `SessionService`, `MicroActionRowView`, `DemoMode`).

- [ ] **Step 4: Run test command**

Expected: the three model tests pass once dependent files compile (they will after Tasks 2–6; if the suite can't build yet due to other references, proceed — Task 2 fixes the service layer, and re-run at Task 6). To keep this task green in isolation, also do Step 5 of Task 2 before building.

- [ ] **Step 5: Commit**

```bash
cd ios-app && xcodegen generate
git add ios-app/LiveCoach/Models/Week.swift ios-app/LiveCoach/Models/Retrospective.swift ios-app/LiveCoach/Models/DailySession.swift ios-app/LiveCoachTests/ModelTests.swift ios-app/LiveCoach.xcodeproj
git commit -m "feat(ios): Week/Retrospective/DayTask models; DailySession uses tasks"
```

---

## Task 2: Update SessionService for the day-task model

**Files:**
- Modify: `ios-app/LiveCoach/Services/SessionService.swift`

- [ ] **Step 1: Rewrite the toggle + references**

Replace `toggleMicroAction` with `toggleDayTask` using the new path `/sessions/{date}/tasks/{taskId}/complete` and the `tasks` field:

```swift
func toggleDayTask(sessionDate: String, taskId: String, isCompleted: Bool) async throws {
    struct ToggleBody: Encodable { let isCompleted: Bool }
    let updated: DailySession = try await api.put(
        "/sessions/\(sessionDate)/tasks/\(taskId)/complete",
        body: ToggleBody(isCompleted: isCompleted)
    )
    if todaySession?.date == sessionDate { todaySession = updated }
}
```

(The proxy returns the full updated session, so decode it directly instead of mutating locally.)

- [ ] **Step 2: Build**

Run the build command. Expected: `SessionService` compiles. (HomeViewModel still references old API — fixed in Task 3.)

- [ ] **Step 3: Commit**

```bash
git add ios-app/LiveCoach/Services/SessionService.swift
git commit -m "feat(ios): SessionService toggles day tasks via new endpoint"
```

---

## Task 3: WeekService + RetrospectiveService

**Files:**
- Create: `ios-app/LiveCoach/Services/WeekService.swift`
- Create: `ios-app/LiveCoach/Services/RetrospectiveService.swift`

- [ ] **Step 1: Implement WeekService**

```swift
import Foundation

@MainActor
@Observable final class WeekService {
    var weeks: [Week] = []
    var isLoading = false
    var error: Error?
    private let api = ProxyAPIClient.shared

    func load() async {
        isLoading = true; error = nil
        defer { isLoading = false }
        do { weeks = try await api.get("/weeks") }
        catch { self.error = error }
    }

    var currentWeek: Week? {
        weeks.first { $0.status == .active } ?? weeks.first
    }

    func toggleWeekTask(weekKey: String, taskId: String, isCompleted: Bool) async throws {
        struct Body: Encodable { let isCompleted: Bool }
        let updated: Week = try await api.put(
            "/weeks/\(weekKey)/tasks/\(taskId)/complete", body: Body(isCompleted: isCompleted)
        )
        if let idx = weeks.firstIndex(where: { $0.id == updated.id }) { weeks[idx] = updated }
    }
}
```

> `weekKey` is the part of the week doc id after `uid_`, i.e. `"2026-W23"`. Derive it from `Week.id` by dropping the `userId_` prefix: `String(week.id.split(separator: "_").last ?? "")`.

- [ ] **Step 2: Implement RetrospectiveService**

```swift
import Foundation

@MainActor
@Observable final class RetrospectiveService {
    var retrospectives: [Retrospective] = []
    var isLoading = false
    var error: Error?
    private let api = ProxyAPIClient.shared

    func load() async {
        isLoading = true; error = nil
        defer { isLoading = false }
        do { retrospectives = try await api.get("/retrospectives") }
        catch { self.error = error }
    }
}
```

- [ ] **Step 3: Build**

`cd ios-app && xcodegen generate` then build. Expected: both services compile.

- [ ] **Step 4: Commit**

```bash
git add ios-app/LiveCoach/Services/WeekService.swift ios-app/LiveCoach/Services/RetrospectiveService.swift ios-app/LiveCoach.xcodeproj
git commit -m "feat(ios): WeekService + RetrospectiveService"
```

---

## Task 4: Tasks tab (week cards) replacing Project

**Files:**
- Create: `ios-app/LiveCoach/Features/Tasks/TasksView.swift`
- Create: `ios-app/LiveCoach/Features/Tasks/WeekCardView.swift`
- Delete: `ios-app/LiveCoach/Features/Project/ProjectView.swift`, `ProjectViewModel.swift`, `EditProjectView.swift`
- Delete: `ios-app/LiveCoach/Services/ProjectService.swift`, `ios-app/LiveCoach/Models/Project.swift`
- Modify: `ios-app/LiveCoach/App/MainTabView.swift`

- [ ] **Step 1: Implement `WeekCardView`**

A card showing `Week {n}`, date range, 3 week-task checkbox rows, then a day list (today expanded & pinned top). Follow `DesignSystem` (`LCCard`, `Color.lc*`). Use this structure:

```swift
import SwiftUI

struct WeekCardView: View {
    let week: Week
    let days: [DailySession]            // sessions whose weekId == week.id, sorted desc
    let isExpanded: Bool
    let onToggleWeekTask: (WeekTask) -> Void
    let onToggleDayTask: (DailySession, DayTask) -> Void

    private var weekKey: String { String(week.id.split(separator: "_").last ?? "") }

    var body: some View {
        LCCard {
            VStack(alignment: .leading, spacing: 14) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Week \(week.weekNumber)")
                        .font(.system(size: 20, weight: .semibold)).foregroundStyle(Color.lcText)
                    Text("\(week.startDate) – \(week.endDate)")
                        .font(.system(size: 13)).foregroundStyle(Color.lcTextDim)
                }
                ForEach(week.tasks) { task in
                    CheckRow(title: task.title, isOn: task.isCompleted) { onToggleWeekTask(task) }
                }
                if isExpanded && !days.isEmpty {
                    Color.lcHairline.frame(height: 0.5)
                    ForEach(days) { day in
                        VStack(alignment: .leading, spacing: 6) {
                            Text(day.date).font(.system(size: 12, weight: .semibold))
                                .foregroundStyle(Color.lcTextDim)
                            ForEach(day.tasks) { t in
                                CheckRow(title: t.title, isOn: t.isCompleted) { onToggleDayTask(day, t) }
                            }
                        }
                    }
                }
            }
        }
    }
}

private struct CheckRow: View {
    let title: String; let isOn: Bool; let action: () -> Void
    var body: some View {
        Button(action: action) {
            HStack(spacing: 10) {
                Image(systemName: isOn ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(isOn ? Color.lcAccent : Color.lcTextFaint)
                Text(title).font(.system(size: 15)).foregroundStyle(Color.lcText)
                    .strikethrough(isOn).multilineTextAlignment(.leading)
                Spacer()
            }
        }.buttonStyle(.plain)
    }
}
```

- [ ] **Step 2: Implement `TasksView`**

```swift
import SwiftUI

struct TasksView: View {
    @State private var weekService = WeekService()
    @State private var sessions: [DailySession] = []
    private let api = ProxyAPIClient.shared

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                ForEach(sortedWeeks) { week in
                    WeekCardView(
                        week: week,
                        days: days(for: week),
                        isExpanded: week.id == weekService.currentWeek?.id,
                        onToggleWeekTask: { task in
                            Task { try? await weekService.toggleWeekTask(
                                weekKey: key(week), taskId: task.id, isCompleted: !task.isCompleted) }
                        },
                        onToggleDayTask: { day, t in
                            Task {
                                struct Body: Encodable { let isCompleted: Bool }
                                let _: DailySession = (try? await api.put(
                                    "/sessions/\(day.date)/tasks/\(t.id)/complete",
                                    body: Body(isCompleted: !t.isCompleted))) ?? day
                                await reload()
                            }
                        }
                    )
                }
            }
            .padding(16)
        }
        .background(Color.lcBackground)
        .task { await reload() }
    }

    private var sortedWeeks: [Week] {
        // current week first, then newest-first
        let cur = weekService.currentWeek?.id
        return weekService.weeks.sorted {
            if $0.id == cur { return true }; if $1.id == cur { return false }
            return $0.startDate > $1.startDate
        }
    }
    private func key(_ w: Week) -> String { String(w.id.split(separator: "_").last ?? "") }
    private func days(for week: Week) -> [DailySession] {
        sessions.filter { $0.weekId == week.id }.sorted { $0.date > $1.date }
    }
    private func reload() async {
        await weekService.load()
        // load last 14 days of sessions for day rows
        let cal = Calendar.current
        let to = Date(); let from = cal.date(byAdding: .day, value: -14, to: to) ?? to
        let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"; f.locale = Locale(identifier: "en_US_POSIX")
        sessions = (try? await api.get("/sessions?from=\(f.string(from: from))&to=\(f.string(from: to))")) ?? []
    }
}
```

- [ ] **Step 3: Delete Project files**

```bash
git rm ios-app/LiveCoach/Features/Project/ProjectView.swift \
       ios-app/LiveCoach/Features/Project/ProjectViewModel.swift \
       ios-app/LiveCoach/Features/Project/EditProjectView.swift \
       ios-app/LiveCoach/Services/ProjectService.swift \
       ios-app/LiveCoach/Models/Project.swift
```

- [ ] **Step 4: Wire MainTabView**

In `MainTabView.swift`: replace the `ProjectView()` tab block with:
```swift
TasksView()
    .tag(1)
    .tabItem { Label("Tasks", systemImage: "checklist") }
```
Update `tabTitle` case `1` to return `"Tasks"`. In the `.task { }` loader, remove `async let projectLoad ... appState.currentProject = await projectLoad` (and remove `currentProject` usage). If `AppState` has `currentProject`, remove that property and any references (search: `grep -rn currentProject ios-app/LiveCoach`).

- [ ] **Step 5: Regenerate, build**

```bash
cd ios-app && xcodegen generate && xcodebuild -project LiveCoach.xcodeproj -scheme LiveCoach -destination 'platform=iOS Simulator,name=iPhone 16 Pro' build 2>&1 | tail -5
```
Expected: BUILD SUCCEEDED. Fix any remaining `Project`/`currentProject` references the compiler flags.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(ios): Tasks tab with week cards; remove Projects feature"
```

---

## Task 5: Update Home for the new model

**Files:**
- Modify: `ios-app/LiveCoach/Features/Home/HomeViewModel.swift`
- Modify: `ios-app/LiveCoach/Features/Home/HomeView.swift`
- Modify: `ios-app/LiveCoach/Features/Home/MicroActionRowView.swift` (rename to DayTaskRowView)
- Modify: `ios-app/LiveCoach/Shared/DemoMode.swift`

- [ ] **Step 1: Update HomeViewModel**

Replace `toggleMicroAction(_ action: MicroAction, ...)` with `toggleDayTask(_ task: DayTask, isCompleted:)` calling `sessionService.toggleDayTask(sessionDate:taskId:isCompleted:)`. Replace `isMorningCallDone`/`shouldShowMorningCTA` naming with `isMiddayCallDone` / `shouldShowMiddayCTA` reading `todaySession?.middayCallId`. Add a `weekService` (inject or instantiate) and expose `currentWeekTasks: [WeekTask]`. Keep `todaySession?.tasks` for today's day tasks.

- [ ] **Step 2: Update HomeView + row view**

In `HomeView.swift`, change references from `microActions` to `tasks`, and call `toggleDayTask`. Rename `MicroActionRowView.swift` → `DayTaskRowView.swift` (`git mv`), rename the struct and its `MicroAction` parameter to `DayTask`. Add a small "This week" section listing `currentWeekTasks` (read-only or with checkboxes). Update call CTAs to use midday/evening labels.

- [ ] **Step 3: Update DemoMode**

In `DemoMode.swift`, update `todaySession` sample to the new `DailySession` shape (`tasks`, `middayCallId`, `weekId`) and add a `currentWeek`/`weeks` sample if referenced. Fix the `MicroAction`→`DayTask` type names.

- [ ] **Step 4: Build + run model tests**

```bash
cd ios-app && xcodegen generate && xcodebuild -project LiveCoach.xcodeproj -scheme LiveCoach -destination 'platform=iOS Simulator,name=iPhone 16 Pro' test 2>&1 | tail -20
```
Expected: BUILD SUCCEEDED; `ModelTests` (incl. Task 1's tests) PASS. Update `HomeViewModelTests` if it referenced removed APIs.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(ios): Home uses day tasks + week tasks; midday/evening naming"
```

---

## Task 6: Call types (midday / evening / weekly / free)

**Files:**
- Modify: `ios-app/LiveCoach/Services/VoiceCallService.swift`
- Modify: `ios-app/LiveCoach/Features/Calls/VoiceCallView.swift`, `CallsView.swift`, `NewConversationSheet.swift`

- [ ] **Step 1: Find current callType usage**

Run: `grep -rn "morning\|evening\|free\|callType\|init-call" ios-app/LiveCoach/Services/VoiceCallService.swift ios-app/LiveCoach/Features/Calls`

- [ ] **Step 2: Update the call-type enum + requests**

Wherever the app sends `callType` to `/vapi/init-call`, replace the set `{morning, evening, free}` with `{midday, evening, weekly, free}`. Define/extend a Swift enum:
```swift
enum CoachCallType: String, CaseIterable, Identifiable, Sendable {
    case midday, evening, weekly, free
    var id: String { rawValue }
    var label: String {
        switch self {
        case .midday: return "Midday check-in"
        case .evening: return "Evening debrief"
        case .weekly: return "Weekly planning"
        case .free: return "Free call"
        }
    }
}
```
Use `CoachCallType` in `VoiceCallView`/`CallsView`/`NewConversationSheet` to choose and send the call type. Map `ConversationType` decoding to include `weeklyCall`/`middayCall` (update `Conversation.swift` enum: `case middayCall, eveningCall, weeklyCall, freeChat, freeVoice`).

- [ ] **Step 3: Update Conversation model enum**

In `Models/Conversation.swift` change `enum ConversationType` cases from `morningCall` to `middayCall` and add `weeklyCall`. Search/replace any `.morningCall` usages in Calls views.

- [ ] **Step 4: Build**

Regenerate + build. Expected: BUILD SUCCEEDED.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(ios): midday/evening/weekly/free call types"
```

---

## Task 7: Weekly Retrospective Reports in Profile

**Files:**
- Create: `ios-app/LiveCoach/Features/Profile/RetrospectiveListView.swift`
- Create: `ios-app/LiveCoach/Features/Profile/RetrospectiveDetailView.swift`
- Modify: `ios-app/LiveCoach/Features/Profile/ProfileView.swift`

- [ ] **Step 1: Implement list + detail**

`RetrospectiveListView.swift`:
```swift
import SwiftUI

struct RetrospectiveListView: View {
    @State private var service = RetrospectiveService()
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(service.retrospectives) { r in
                    NavigationLink { RetrospectiveDetailView(retro: r) } label: {
                        LCCard {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Week \(r.weekNumber)")
                                    .font(.system(size: 16, weight: .semibold)).foregroundStyle(Color.lcText)
                                Text("\(r.startDate) – \(r.endDate)")
                                    .font(.system(size: 12)).foregroundStyle(Color.lcTextDim)
                                Text(r.summary).font(.system(size: 13)).foregroundStyle(Color.lcTextDim)
                                    .lineLimit(2).multilineTextAlignment(.leading)
                            }
                        }
                    }.buttonStyle(.plain)
                }
            }.padding(16)
        }
        .background(Color.lcBackground)
        .navigationTitle("Weekly Retrospectives")
        .task { await service.load() }
    }
}
```

`RetrospectiveDetailView.swift`:
```swift
import SwiftUI

struct RetrospectiveDetailView: View {
    let retro: Retrospective
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                section("What went well", retro.wentWell)
                section("What to improve", retro.improve)
                section("1% better next week", retro.onePercent)
                section("Summary", retro.summary)
            }.padding(16)
        }
        .background(Color.lcBackground)
        .navigationTitle("Week \(retro.weekNumber)")
    }
    private func section(_ title: String, _ body: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            LCSectionLabel(title: title)
            Text(body).font(.system(size: 15)).foregroundStyle(Color.lcText)
        }
    }
}
```

- [ ] **Step 2: Add the Profile entry**

In `ProfileView.swift`, add a new section above `privacySection`:
```swift
private var retrospectivesSection: some View {
    VStack(alignment: .leading, spacing: 8) {
        LCSectionLabel(title: "Progress")
        LCCard(padding: 0) {
            NavigationLink { RetrospectiveListView() } label: {
                profileRowLabel(label: "Weekly Retrospective Reports")
            }.buttonStyle(.plain)
        }
    }
}
```
Insert `retrospectivesSection` into the main `VStack` (e.g. after `aboutYouSection`).

- [ ] **Step 3: Regenerate, build**

Expected: BUILD SUCCEEDED.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(ios): Weekly Retrospective Reports in Profile"
```

---

## Task 8: Expanded notification settings (timezone + weekly planning)

**Files:**
- Modify: `ios-app/LiveCoach/Models/User.swift`
- Modify: `ios-app/LiveCoach/Features/Profile/NotificationSettingsView.swift`

- [ ] **Step 1: Update `NotificationSettings`**

```swift
struct NotificationSettings: Codable, Sendable {
    var middayReminderHour: Int
    var middayReminderMinute: Int
    var eveningReminderHour: Int
    var eveningReminderMinute: Int
    var weeklyPlanningWeekday: Int      // 0=Sun ... 6=Sat
    var weeklyPlanningHour: Int
    var weeklyPlanningMinute: Int
    var timeZone: String                // IANA, e.g. "America/New_York"
    var streakReminders: Bool
}
```

- [ ] **Step 2: Update the settings view**

In `NotificationSettingsView.swift`: rename morning→midday throughout (UserDefaults keys `notif_midday_*`, labels "Midday check-in"). Add a weekly planning section: a weekday `Picker` (Sunday…Saturday) and a `DatePicker` for time. Send `TimeZone.current.identifier` as `timeZone` in `syncToProxy()`. Update the `NotificationSettings(...)` initializer call to the new fields. Update `NotificationService.scheduleCheckInReminders` call sites to the midday naming (rename the param if present).

- [ ] **Step 3: Update Profile reminders labels**

In `ProfileView.swift` `remindersSection`, change the two row labels to "Midday check-in reminder" and "Evening reminder", and (optionally) add "Weekly planning reminder".

- [ ] **Step 4: Build**

Expected: BUILD SUCCEEDED. Fix any `morningReminder*` references the compiler flags (search: `grep -rn morningReminder ios-app/LiveCoach`).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(ios): timezone + weekly planning notification settings"
```

---

## Task 9: Remove the goal onboarding step

**Files:**
- Modify: `ios-app/LiveCoach/Features/Onboarding/OnboardingCoordinatorView.swift`
- Delete: `ios-app/LiveCoach/Features/Onboarding/GoalInputView.swift`

- [ ] **Step 1: Inspect the coordinator**

Run: `grep -n "GoalInputView\|goal\|Project\|project" ios-app/LiveCoach/Features/Onboarding/OnboardingCoordinatorView.swift`

- [ ] **Step 2: Remove the goal step**

Delete `GoalInputView` from the onboarding step sequence (and any project-creation call it triggered). Ensure onboarding still completes (sets `isOnboardingComplete`). The first week's tasks are now created in the first weekly voice call, not onboarding.

```bash
git rm ios-app/LiveCoach/Features/Onboarding/GoalInputView.swift
```

- [ ] **Step 3: Regenerate, build, test**

```bash
cd ios-app && xcodegen generate && xcodebuild -project LiveCoach.xcodeproj -scheme LiveCoach -destination 'platform=iOS Simulator,name=iPhone 16 Pro' test 2>&1 | tail -20
```
Expected: BUILD SUCCEEDED; tests PASS. Resolve any lingering `Project`/`MicroAction`/`morning*` references (`grep -rn "MicroAction\|currentProject\|morningCallId\|ProjectService" ios-app/LiveCoach`).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(ios): remove goal onboarding step"
```

---

## Self-review notes (spec → tasks)

- Models + DailySession evolution → Task 1; SessionService → Task 2.
- Tasks tab with week cards + day rows → Task 4 (services in Task 3).
- Home dashboard (week + day tasks + score) → Task 5.
- Call types midday/evening/weekly/free → Task 6.
- Weekly Retrospective Reports in Profile → Task 7.
- Configurable midday/evening/weekly times + timezone → Task 8.
- Remove Projects + goal → Tasks 4 and 9.

## Known follow-ups
- Visual polish of week cards / Home week section happens in Phase D design pass.
- `AppState.currentProject` and any project stats fields are removed in Task 4; if `UserStats` references project data, leave it (server-driven) unless the compiler complains.
