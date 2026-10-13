// axdump <pid> <window-title-substring>: print the accessibility tree of matching windows (roles, titles,
// descriptions) so you can find the exact labels axpress needs.
import ApplicationServices
import Foundation
let a = CommandLine.arguments
let app = AXUIElementCreateApplication(pid_t(Int32(a[1])!))
func attr(_ e: AXUIElement, _ n: String) -> AnyObject? { var v: AnyObject?; AXUIElementCopyAttributeValue(e, n as CFString, &v); return v }
func walk(_ e: AXUIElement, _ d: Int) {
  let role = attr(e, kAXRoleAttribute) as? String ?? ""
  let title = attr(e, kAXTitleAttribute) as? String ?? ""
  let desc = attr(e, kAXDescriptionAttribute) as? String ?? ""
  if !(role == "AXGroup" && title.isEmpty && desc.isEmpty) || d < 3 { print(String(repeating: "  ", count: d) + "\(role) t=\(title) d=\(desc)") }
  if d > 25 { return }
  for c in (attr(e, kAXChildrenAttribute) as? [AXUIElement]) ?? [] { walk(c, d + 1) }
}
for w in (attr(app, kAXWindowsAttribute) as? [AXUIElement]) ?? [] where ((attr(w, kAXTitleAttribute) as? String) ?? "").contains(a[2]) { walk(w, 0) }
