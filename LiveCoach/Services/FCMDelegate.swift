import Foundation
import FirebaseMessaging
import UserNotifications

@MainActor
final class FCMDelegate: NSObject, UNUserNotificationCenterDelegate, MessagingDelegate, Sendable {

    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let token = fcmToken else { return }
        Task {
            struct Body: Encodable { let fcmToken: String }
            struct Response: Decodable { let updated: Bool }
            _ = try? await ProxyAPIClient.shared.put("/user/profile", body: Body(fcmToken: token)) as Response
        }
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound, .badge])
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        completionHandler()
    }
}
