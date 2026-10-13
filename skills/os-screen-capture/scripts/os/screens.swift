// screens: list displays with their frame (points) and backing scale. Index 0 is the built-in display on a laptop.
import AppKit
for (i, s) in NSScreen.screens.enumerated() { print(i, s.localizedName, s.frame, s.backingScaleFactor) }
