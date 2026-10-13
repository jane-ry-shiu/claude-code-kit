// click <x> <y> [count=1] [right]: press and release the real mouse button at global point x,y with posted CGEvents
// (needs Accessibility for the host app). The page receives a trusted click and the OS cursor is really there, so a
// screen recording shows the pointer arriving and clicking. count 2 posts a double-click.
import CoreGraphics
import Foundation
let a = CommandLine.arguments
let p = CGPoint(x: Double(a[1])!, y: Double(a[2])!)
let count = a.count > 3 ? Int(a[3])! : 1
let right = a.count > 4 && a[4] == "right"
let (down, up, button): (CGEventType, CGEventType, CGMouseButton) = right
  ? (.rightMouseDown, .rightMouseUp, .right) : (.leftMouseDown, .leftMouseUp, .left)
CGEvent(mouseEventSource: nil, mouseType: .mouseMoved, mouseCursorPosition: p, mouseButton: button)?.post(tap: .cghidEventTap)
usleep(30_000)
for n in 1...count {
  for type in [down, up] {
    guard let ev = CGEvent(mouseEventSource: nil, mouseType: type, mouseCursorPosition: p, mouseButton: button) else { exit(1) }
    ev.setIntegerValueField(.mouseEventClickState, value: Int64(n))
    ev.post(tap: .cghidEventTap)
    usleep(type == down ? 70_000 : 90_000)
  }
}
print("clicked", p.x, p.y, count, right ? "right" : "left")
