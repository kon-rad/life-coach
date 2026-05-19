import SwiftUI
import FirebaseCore
import FirebaseMessaging
import RevenueCat
import UserNotifications

@main
struct LiveCoachApp: App {
    @State private var appState = AppState()
    private let fcmDelegate = FCMDelegate()

    init() {
        guard ProcessInfo.processInfo.environment["XCTestConfigurationFilePath"] == nil else { return }
        guard !DemoMode.isEnabled else { return }
        FirebaseApp.configure()
        UNUserNotificationCenter.current().delegate = fcmDelegate
        Messaging.messaging().delegate = fcmDelegate
        #if DEBUG
        Purchases.logLevel = .debug
        #endif
        Purchases.configure(withAPIKey: Constants.revenueCatAPIKey)
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(appState)
        }
    }
}
