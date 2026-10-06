import UIKit
import WebKit

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
    deinit {
        webView?.configuration.userContentController.removeScriptMessageHandler(forName:"share")
        webView?.configuration.userContentController.removeScriptMessageHandler(forName:"openURL")
    }
}
