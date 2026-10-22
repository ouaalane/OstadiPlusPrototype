import ExpoModulesCore
import UIKit

public final class OustadiCaptureProtectionModule: Module {
  private var observers: [NSObjectProtocol] = []
  private var observing = false

  public func definition() -> ModuleDefinition {
    Name("OustadiCaptureProtection")
    Events("captureChanged")

    // UIScreen's capture signal is also used by Expo SDK 57. It detects
    // recording/mirroring, not a screenshot before the image is taken.
    AsyncFunction("ensureProtection") {
      return ["captured": self.isCaptured(), "windowId": self.keyWindowID()] as [String: Any]
    }.runOnQueue(.main)

    OnStartObserving {
      DispatchQueue.main.async { self.startObserving() }
    }
    OnStopObserving {
      DispatchQueue.main.async { self.stopObserving() }
    }
    OnDestroy {
      DispatchQueue.main.async { self.stopObserving() }
    }
  }

  private func keyWindowID() -> String {
    let windows = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.flatMap { $0.windows }
    guard let window = windows.first(where: { $0.isKeyWindow }) else { return "" }
    return String(describing: ObjectIdentifier(window))
  }

  private func isCaptured() -> Bool {
    // Include connected screens: recording may start before the app opens.
    UIScreen.screens.contains { $0.isCaptured }
  }

  private func startObserving() {
    guard !observing else { return }
    observing = true
    for name in [UIScreen.capturedDidChangeNotification, UIScreen.didConnectNotification,
                 UIScreen.didDisconnectNotification, UIApplication.didBecomeActiveNotification] {
      observers.append(NotificationCenter.default.addObserver(forName: name, object: nil, queue: .main) { [weak self] _ in
        guard let self else { return }
        self.sendEvent("captureChanged", ["captured": self.isCaptured()])
      })
    }
    sendEvent("captureChanged", ["captured": isCaptured()])
  }

  private func stopObserving() {
    observing = false
    observers.forEach { NotificationCenter.default.removeObserver($0) }
    observers.removeAll()
  }
}
