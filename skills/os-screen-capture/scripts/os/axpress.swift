// axpress <pid> <window-title-substring> <element-title>: press the first button/link/radio with that title or
// description in a window of that app (needs Accessibility). Exit 2 if not found. Used to answer Chrome's screen-share
// picker and to hide the "sharing your screen" bar. Use axdump to discover the labels in your OS language.
import ApplicationServices
import Foundation
let a = CommandLine.arguments
let app = AXUIElementCreateApplication(pid_t(Int32(a[1])!))
func attr(_ e: AXUIElement, _ n: String) -> AnyObject? { var v: AnyObject?; AXUIElementCopyAttributeValue(e, n as CFString, &v); return v }
func find(_ e: AXUIElement, _ d: Int) -> AXUIElement? {
  if (attr(e, kAXTitleAttribute) as? String) == a[3] || (attr(e, kAXDescriptionAttribute) as? String) == a[3] {
    let role = attr(e, kAXRoleAttribute) as? String ?? ""
    if role == "AXButton" || role == "AXLink" || role == "AXRadioButton" { return e }
  }
  if d > 25 { return nil }
  for c in (attr(e, kAXChildrenAttribute) as? [AXUIElement]) ?? [] { if let f = find(c, d + 1) { return f } }
  return nil
}
let wins = (attr(app, kAXWindowsAttribute) as? [AXUIElement]) ?? []
for w in wins where ((attr(w, kAXTitleAttribute) as? String) ?? "").contains(a[2]) {
  if let t = find(w, 0) { print("pressed", AXUIElementPerformAction(t, kAXPressAction as CFString).rawValue); exit(0) }
}
print("not found"); exit(2)
