// activate <pid>: bring that app to the front (native tooltips only show in the key window).
import AppKit
let pid = pid_t(CommandLine.arguments[1])!
if let app = NSRunningApplication(processIdentifier: pid) { print(app.localizedName ?? "?", app.activate(options: [.activateIgnoringOtherApps])) } else { print("no app") }
