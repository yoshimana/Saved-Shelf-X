//
//  ViewController.swift
//  X Bookmark Shelf
//
//  Created by 吉田学 on 2026/09/25.
//

import Cocoa
import SafariServices
import WebKit

private let hasCompletedOnboardingKey = "HasCompletedSafariExtensionOnboarding"

/// Safari App Extension の Bundle Identifier。
/// プロジェクト内の拡張ターゲットの Bundle Identifier と完全一致させてください。
/// 例: com.yoshimana.xbookmarkshelf.Extension
let extensionBundleIdentifier = "com.yoshimana.xbookmarkshelf.Extension" // matches extension target

class ViewController: NSViewController, WKNavigationDelegate, WKScriptMessageHandler {

    @IBOutlet var webView: WKWebView!

    private var didAttemptAutoOpenPreferences = false

    override func viewDidLoad() {
        super.viewDidLoad()

        print("[ViewController] viewDidLoad")

        self.webView.navigationDelegate = self

        self.webView.configuration.userContentController.add(self, name: "controller")

        if let htmlURL = Bundle.main.url(forResource: "Main", withExtension: "html"), let readAccessURL = Bundle.main.resourceURL {
            self.webView.loadFileURL(htmlURL, allowingReadAccessTo: readAccessURL)
        } else {
            assertionFailure("Main.html not found in bundle or resourceURL missing.")
            NSLog("[ViewController] ERROR: Main.html not found in bundle or resourceURL missing.")
        }
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        print("[ViewController] WebView didFinish navigation")

        SFSafariExtensionManager.getStateOfSafariExtension(withIdentifier: extensionBundleIdentifier) { (state, error) in
            guard let state = state, error == nil else {
                NSLog("[ViewController] Failed to get extension state: \(String(describing: error)))")
                // Insert code to inform the user that something went wrong.
                return
            }

            DispatchQueue.main.async {
                let hasCompletedOnboarding = UserDefaults.standard.bool(forKey: hasCompletedOnboardingKey)
                if !state.isEnabled && !hasCompletedOnboarding && !self.didAttemptAutoOpenPreferences {
                    self.didAttemptAutoOpenPreferences = true
                    NSLog("[ViewController] Extension disabled. Auto-opening Safari extension preferences…")
                    SFSafariApplication.showPreferencesForExtension(withIdentifier: extensionBundleIdentifier) { error in
                        DispatchQueue.main.async {
                            if let error { NSLog("[ViewController] Failed to auto-open preferences: \(error.localizedDescription)") }
                            // Do not terminate immediately; let the user enable the extension, then they can close the helper app.
                        }
                    }
                }

                if #available(macOS 13, *) {
                    webView.evaluateJavaScript("show(\(state.isEnabled), true)") { _, error in
                        if let error { NSLog("[ViewController] JS evaluation error (macOS13+): \(error.localizedDescription)") }
                    }
                } else {
                    webView.evaluateJavaScript("show(\(state.isEnabled), false)") { _, error in
                        if let error { NSLog("[ViewController] JS evaluation error (<13): \(error.localizedDescription)") }
                    }
                }
            }
        }
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let command = message.body as? String else {
            NSLog("[ViewController] Unexpected message body type: \(type(of: message.body))")
            return
        }
        guard command == "open-preferences" else {
            NSLog("[ViewController] Ignored unknown command: \(command)")
            return
        }

        SFSafariApplication.showPreferencesForExtension(withIdentifier: extensionBundleIdentifier) { error in
            DispatchQueue.main.async {
                if let error {
                    NSLog("[ViewController] Failed to show preferences: \(error.localizedDescription)")
                } else {
                    NSLog("[ViewController] Opened Safari extension preferences")
                    UserDefaults.standard.set(true, forKey: hasCompletedOnboardingKey)
                }
                NSApplication.shared.terminate(nil)
            }
        }
    }

}
