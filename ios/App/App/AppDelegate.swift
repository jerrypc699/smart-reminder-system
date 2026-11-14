import UIKit
import Capacitor
import ContactsUI

@objc(VideoAlarmPlugin)
public class VideoAlarmPlugin: CAPPlugin, CAPBridgedPlugin, CNContactPickerDelegate, UIDocumentInteractionControllerDelegate {
    public let identifier = "VideoAlarmPlugin"
    public let jsName = "VideoAlarm"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "pickContact", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openWhatsApp", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getPendingLaunchMedia", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "consumePendingLaunchMedia", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "syncVideoAlarms", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "scheduleSingleAlarm", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getAutoLaunchPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestOverlayPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestFullScreenPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestBatteryOptimizationExemption", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestExactAlarmPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "syncWhatsAppTaskAlarms", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "saveAndOpenFile", returnType: CAPPluginReturnPromise)
    ]

    private var contactCall: CAPPluginCall?
    private var docInteraction: UIDocumentInteractionController?

    @objc func pickContact(_ call: CAPPluginCall) {
        self.contactCall = call

        DispatchQueue.main.async {
            guard let presentingVC = self.bridge?.viewController ?? UIApplication.shared.windows.first(where: { $0.isKeyWindow })?.rootViewController else {
                call.reject("تعذر فتح جهات الاتصال على جهاز الآيفون")
                self.contactCall = nil
                return
            }

            let picker = CNContactPickerViewController()
            picker.delegate = self
            picker.displayedPropertyKeys = [CNContactPhoneNumbersKey]
            picker.predicateForEnablingContact = NSPredicate(format: "phoneNumbers.@count > 0")

            presentingVC.present(picker, animated: true, completion: nil)
        }
    }

    public func contactPicker(_ picker: CNContactPickerViewController, didSelect contactProperty: CNContactProperty) {
        guard let call = self.contactCall else { return }

        let contact = contactProperty.contact
        let fullName = CNContactFormatter.string(from: contact, style: .fullName) ?? 
            "\(contact.givenName) \(contact.familyName)".trimmingCharacters(in: .whitespaces)

        var phoneNumber = ""
        if let phoneVal = contactProperty.value as? CNPhoneNumber {
            phoneNumber = phoneVal.stringValue
        }

        if !phoneNumber.isEmpty {
            call.resolve([
                "success": true,
                "name": fullName,
                "phone": phoneNumber
            ])
        } else {
            call.resolve([
                "success": false,
                "name": fullName,
                "phone": "",
                "message": "جهة الاتصال لا تحتوي على رقم هاتف"
            ])
        }
        self.contactCall = nil
    }

    public func contactPicker(_ picker: CNContactPickerViewController, didSelect contact: CNContact) {
        guard let call = self.contactCall else { return }

        let fullName = CNContactFormatter.string(from: contact, style: .fullName) ?? 
            "\(contact.givenName) \(contact.familyName)".trimmingCharacters(in: .whitespaces)

        var phoneNumber = ""
        if let firstPhone = contact.phoneNumbers.first?.value.stringValue {
            phoneNumber = firstPhone
        }

        if !phoneNumber.isEmpty {
            call.resolve([
                "success": true,
                "name": fullName,
                "phone": phoneNumber
            ])
        } else {
            call.resolve([
                "success": false,
                "name": fullName,
                "phone": "",
                "message": "جهة الاتصال المحددة لا تحتوي على رقم هاتف مسجل"
            ])
        }
        self.contactCall = nil
    }

    public func contactPickerDidCancel(_ picker: CNContactPickerViewController) {
        guard let call = self.contactCall else { return }
        call.resolve([
            "success": false,
            "cancelled": true,
            "message": "تم إلغاء اختيار جهة الاتصال"
        ])
        self.contactCall = nil
    }

    @objc func openWhatsApp(_ call: CAPPluginCall) {
        guard let rawPhone = call.getString("phone") else {
            call.reject("رقم الهاتف مطلوب")
            return
        }

        let message = call.getString("text") ?? ""
        let cleanPhone = rawPhone.replacingOccurrences(of: "+", with: "")
            .replacingOccurrences(of: " ", with: "")
            .replacingOccurrences(of: "-", with: "")
            .replacingOccurrences(of: "(", with: "")
            .replacingOccurrences(of: ")", with: "")

        let encodedMsg = message.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""

        DispatchQueue.main.async {
            if let nativeUrl = URL(string: "whatsapp://send?phone=\(cleanPhone)&text=\(encodedMsg)"),
               UIApplication.shared.canOpenURL(nativeUrl) {
                UIApplication.shared.open(nativeUrl, options: [:]) { opened in
                    call.resolve(["opened": opened])
                }
            } else if let webUrl = URL(string: "https://wa.me/\(cleanPhone)?text=\(encodedMsg)") {
                UIApplication.shared.open(webUrl, options: [:]) { opened in
                    call.resolve(["opened": opened])
                }
            } else {
                call.resolve(["opened": false])
            }
        }
    }

    @objc func saveAndOpenFile(_ call: CAPPluginCall) {
        guard let base64Data = call.getString("base64Data"),
              let fileName = call.getString("fileName") else {
            call.reject("Missing base64Data or fileName")
            return
        }

        let cleanBase64: String
        if let commaIndex = base64Data.firstIndex(of: ",") {
            cleanBase64 = String(base64Data[base64Data.index(after: commaIndex)...])
        } else {
            cleanBase64 = base64Data
        }

        guard let data = Data(base64Encoded: cleanBase64) else {
            call.reject("Invalid base64 data")
            return
        }

        let tempUrl = FileManager.default.temporaryDirectory.appendingPathComponent(fileName)
        do {
            try data.write(to: tempUrl)
            DispatchQueue.main.async {
                guard let presentingVC = self.bridge?.viewController else {
                    call.resolve(["success": true, "filePath": tempUrl.path])
                    return
                }
                self.docInteraction = UIDocumentInteractionController(url: tempUrl)
                self.docInteraction?.delegate = self
                let presented = self.docInteraction?.presentPreview(animated: true) ?? false
                if !presented {
                    self.docInteraction?.presentOpenInMenu(from: presentingVC.view.bounds, in: presentingVC.view, animated: true)
                }
                call.resolve(["success": true, "filePath": tempUrl.path])
            }
        } catch {
            call.reject("Failed to write file: \(error.localizedDescription)")
        }
    }

    public func documentInteractionControllerViewControllerForPreview(_ controller: UIDocumentInteractionController) -> UIViewController {
        return self.bridge?.viewController ?? UIViewController()
    }

    @objc func getPendingLaunchMedia(_ call: CAPPluginCall) {
        call.resolve(["hasPending": false])
    }

    @objc func consumePendingLaunchMedia(_ call: CAPPluginCall) {
        call.resolve(["hasPending": false])
    }

    @objc func syncVideoAlarms(_ call: CAPPluginCall) {
        call.resolve(["success": true])
    }

    @objc func scheduleSingleAlarm(_ call: CAPPluginCall) {
        call.resolve(["success": true])
    }

    @objc func getAutoLaunchPermissions(_ call: CAPPluginCall) {
        call.resolve([
            "hasOverlay": true,
            "hasFullScreen": true,
            "isIgnoringBattery": true,
            "canScheduleExact": true,
            "autoStartSupported": false
        ])
    }

    @objc func requestOverlayPermission(_ call: CAPPluginCall) {
        call.resolve(["granted": true])
    }

    @objc func requestFullScreenPermission(_ call: CAPPluginCall) {
        call.resolve(["granted": true])
    }

    @objc func requestBatteryOptimizationExemption(_ call: CAPPluginCall) {
        call.resolve(["granted": true])
    }

    @objc func requestExactAlarmPermission(_ call: CAPPluginCall) {
        call.resolve(["granted": true])
    }

    @objc func syncWhatsAppTaskAlarms(_ call: CAPPluginCall) {
        call.resolve(["success": true])
    }
}

open class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(VideoAlarmPlugin())
    }
}

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        if window?.rootViewController == nil {
            window = UIWindow(frame: UIScreen.main.bounds)
            window?.rootViewController = MainViewController()
            window?.makeKeyAndVisible()
        }
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
    }

    func applicationWillTerminate(_ application: UIApplication) {
    }

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}
