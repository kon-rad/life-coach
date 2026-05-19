import SwiftUI
import FirebaseCore
import RevenueCat

@main
struct LiveCoachApp: App {
    @State private var appState = AppState()

    init() {
        guard ProcessInfo.processInfo.environment["XCTestConfigurationFilePath"] == nil else { return }
        FirebaseApp.configure()
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
