// warp <x> <y> [post]: move the real cursor to global point x,y. With "post", also post a mouseMoved CGEvent
// (needs Accessibility for the host app) so the browser sees a real hover and the OS draws hover cursors/tooltips.
import CoreGraphics
import Foundation
let a = CommandLine.arguments
let p = CGPoint(x: Double(a[1])!, y: Double(a[2])!)
CGWarpMouseCursorPosition(p)
CGAssociateMouseAndMouseCursorPosition(1)
if a.count > 3, let ev = CGEvent(mouseEventSource: nil, mouseType: .mouseMoved, mouseCursorPosition: p, mouseButton: .left) { ev.post(tap: .cghidEventTap) }
let cur = CGEvent(source: nil)!.location
print("cursor", cur.x, cur.y)
