// allwin: every on-screen window as "owner pid layer title x y w h". A Chrome native tooltip is a Chrome-owned window
// at layer 103; Chrome's "sharing your screen" bar is a Chrome window whose title names the share.
import CoreGraphics
import Foundation
let list = CGWindowListCopyWindowInfo([.optionOnScreenOnly], kCGNullWindowID) as! [[String: Any]]
for w in list {
  let b = w[kCGWindowBounds as String] as! [String: Any]
  print(w[kCGWindowOwnerName as String] ?? "?", w[kCGWindowOwnerPID as String]!, w[kCGWindowLayer as String]!, w[kCGWindowName as String] ?? "", b["X"]!, b["Y"]!, b["Width"]!, b["Height"]!)
}
