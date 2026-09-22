pragma Singleton
import QtQuick
import Quickshell

QtObject {
    readonly property string home: Quickshell.env("HOME") || ""
    // Kept as omarchy-panorama after the rename to Vista: this holds the
    // learned workspace order, and renaming the directory would throw it away
    // on upgrade for no user-visible gain.
    readonly property string stateHome: `${Quickshell.env("XDG_STATE_HOME") || home + "/.local/state"}/omarchy-panorama`
}
