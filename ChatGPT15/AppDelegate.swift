import UIKit
import WebKit
import LocalAuthentication
import PDFKit

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        let window = UIWindow(frame: UIScreen.main.bounds)
        window.rootViewController = WebViewController()
        window.makeKeyAndVisible()
        self.window = window
        return true
    }
}

final class WebViewController: UIViewController, WKNavigationDelegate, WKUIDelegate, UIScrollViewDelegate, WKScriptMessageHandler {
    private var webView: WKWebView!
    override func viewDidLoad() {
        super.viewDidLoad()
        let bg = UIColor(red: 5/255, green: 7/255, blue: 11/255, alpha: 1)
        view.backgroundColor = bg
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        let pagePrefs = WKWebpagePreferences()
        pagePrefs.allowsContentJavaScript = true
        config.defaultWebpagePreferences = pagePrefs
        config.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")
        config.setValue(true, forKey: "allowUniversalAccessFromFileURLs")
        config.userContentController.add(self, name: "share")
        config.userContentController.add(self, name: "openURL")
        config.userContentController.add(self, name: "haptic")
        config.userContentController.add(self, name: "touchID")
        config.userContentController.add(self, name: "exportFile")
        config.userContentController.add(self, name: "extractPDF")

        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.scrollView.delegate = self
        webView.scrollView.bounces = false
        webView.scrollView.keyboardDismissMode = .interactive
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.isOpaque = false
        webView.backgroundColor = bg
        webView.scrollView.backgroundColor = bg
        webView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(webView)
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.topAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
        guard let url = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "Web") else { return }
        webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
    }
    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }
    func viewForZooming(in scrollView: UIScrollView) -> UIView? { nil }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let value = message.body as? String else { return }
        if message.name == "share" {
            let vc = UIActivityViewController(activityItems: [value], applicationActivities: nil)
            if let p = vc.popoverPresentationController { p.sourceView = view; p.sourceRect = CGRect(x:view.bounds.midX,y:view.bounds.maxY-30,width:1,height:1) }
            present(vc, animated: true)
        } else if message.name == "openURL", let url = URL(string:value) { UIApplication.shared.open(url) }
        else if message.name == "haptic" { UIImpactFeedbackGenerator(style: .light).impactOccurred() }
        else if message.name == "exportFile" {
            let url = FileManager.default.temporaryDirectory.appendingPathComponent("Luma-Backup.json")
            try? value.data(using: .utf8)?.write(to: url)
            let vc = UIActivityViewController(activityItems: [url], applicationActivities: nil)
            if let p = vc.popoverPresentationController { p.sourceView = view; p.sourceRect = CGRect(x:view.bounds.midX,y:view.bounds.maxY-30,width:1,height:1) }
            present(vc, animated: true)
        }
        else if message.name == "touchID" { handleTouchID() }
        else if message.name == "extractPDF" { handlePDFExtraction(value) }
    }
    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let a = UIAlertController(title:"ChatGPT 15", message:message, preferredStyle:.alert)
        a.addAction(UIAlertAction(title:"OK",style:.default){_ in completionHandler()}); present(a,animated:true)
    }
    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let a = UIAlertController(title:"ChatGPT 15",message:message,preferredStyle:.alert)
        a.addAction(UIAlertAction(title:"Cancel",style:.cancel){_ in completionHandler(false)})
        a.addAction(UIAlertAction(title:"OK",style:.default){_ in completionHandler(true)});present(a,animated:true)
    }
    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
        let a=UIAlertController(title:"Rename chat",message:nil,preferredStyle:.alert);a.addTextField{$0.text=defaultText}
        a.addAction(UIAlertAction(title:"Cancel",style:.cancel){_ in completionHandler(nil)})
        a.addAction(UIAlertAction(title:"Save",style:.default){_ in completionHandler(a.textFields?.first?.text)});present(a,animated:true)
    }
    private func handlePDFExtraction(_ dataURL: String) {
        guard let comma = dataURL.firstIndex(of: ",") else {
            sendPDFResult(error: "Invalid PDF data.")
            return
        }
        let encoded = String(dataURL[dataURL.index(after: comma)...])
        guard let data = Data(base64Encoded: encoded, options: .ignoreUnknownCharacters),
              let document = PDFDocument(data: data) else {
            sendPDFResult(error: "Luma could not open this PDF.")
            return
        }

        var pages: [String] = []
        for index in 0..<document.pageCount {
            guard let page = document.page(at: index) else { continue }
            let text = page.string?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            if !text.isEmpty {
                pages.append("[Page \(index + 1)]
" + text)
            }
        }

        if pages.isEmpty {
            sendPDFResult(error: "This PDF does not contain extractable text. Scanned PDFs need OCR, which is not included yet.")
            return
        }

        let joined = pages.joined(separator: "

")
        let escaped = joined
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "`", with: "\\`")
            .replacingOccurrences(of: "$", with: "\\$")
        webView.evaluateJavaScript("window.LumaNativePDF && window.LumaNativePDF.success(`\(escaped)`)") { _, _ in }
    }

    private func sendPDFResult(error: String) {
        let escaped = error
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "`", with: "\\`")
            .replacingOccurrences(of: "$", with: "\\$")
        webView.evaluateJavaScript("window.LumaNativePDF && window.LumaNativePDF.failure(`\(escaped)`)") { _, _ in }
    }

    private func handleTouchID() {
        let context = LAContext()
        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            let a = UIAlertController(title:"Touch ID",message:"Touch ID is not available or configured on this device.",preferredStyle:.alert)
            a.addAction(UIAlertAction(title:"OK",style:.default));present(a,animated:true);return
        }
        context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason:"Unlock Luma") { success, _ in
            DispatchQueue.main.async {
                let a=UIAlertController(title:"Touch ID",message:success ? "Touch ID verified. App-lock support is ready for device testing." : "Touch ID verification failed.",preferredStyle:.alert)
                a.addAction(UIAlertAction(title:"OK",style:.default));self.present(a,animated:true)
            }
        }
    }

    deinit {
        webView?.configuration.userContentController.removeScriptMessageHandler(forName:"share")
        webView?.configuration.userContentController.removeScriptMessageHandler(forName:"openURL")
        webView?.configuration.userContentController.removeScriptMessageHandler(forName:"haptic")
        webView?.configuration.userContentController.removeScriptMessageHandler(forName:"touchID")
        webView?.configuration.userContentController.removeScriptMessageHandler(forName:"exportFile")
        webView?.configuration.userContentController.removeScriptMessageHandler(forName:"extractPDF")
    }
}
