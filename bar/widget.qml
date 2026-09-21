import QtQuick
import Quickshell
import Quickshell.Io
import Quickshell.Hyprland
import qs.Commons
import qs.Ui
import ".." as Local
import "../WorkspaceBarConfig.js" as WorkspaceBarConfig

BarWidget {
    id: root
    moduleName: "ranu.panorama"

    readonly property bool opened: settingsPanelLoader.item
        ? settingsPanelLoader.item.opened === true
        : false

    readonly property string targetMonitorName: Hyprland.focusedMonitor?.name ?? ""
    readonly property bool legacySort: Local.GlobalStates.overviewSortMode === "legacy"
    readonly property var workspaceIds: {
        const mode = Local.GlobalStates.overviewSortMode;
        const all = Hyprland.workspaces.values
            .map(workspace => Number(workspace.id))
            .filter(id => id > 0 && id <= 100);
        const occupied = all.filter(id => {
            const workspace = Local.HyprlandData.workspaceById[id];
            return workspace && Local.HyprlandData.workspaceHasVisibleWindows(id)
                && (!root.targetMonitorName
                    || Local.HyprlandData.workspaceMonitorName(workspace) === root.targetMonitorName);
        });
        const visual = mode !== "legacy"
            ? Local.HyprlandData.systemWorkspaceIds()
            : Local.WorkspaceOrder.orderIdsForMonitor(root.targetMonitorName, occupied);
        const occupiedSet = ({});
        for (const id of occupied)
            occupiedSet[id] = true;
        const mru = Local.GlobalStates.overviewWorkspaceMru ?? [];
        const ordered = [];
        const added = ({});
        for (const id of mru) {
            if (occupiedSet[id] && !added[id]) {
                ordered.push(id);
                added[id] = true;
            }
        }
        for (const id of visual) {
            if (!added[id] && (mode !== "legacy" || occupiedSet[id])) {
                ordered.push(id);
                added[id] = true;
            }
        }
        return ordered;
    }

    function applySettings() {
        Local.GlobalStates.overviewSortMode = setting("sortMode", "legacy") === "legacy"
            ? "legacy" : "system";
        // The bar widget is the only place that always runs at shell startup;
        // SettingsPanel only syncs once the panel is instantiated.
        Local.GlobalStates.overviewPerMonitor = setting("perMonitor", true) !== false;
        Local.GlobalStates.overviewVimKeys = setting("vimKeys", true) !== false;
    }
    function open() { if (settingsPanelLoader.item) settingsPanelLoader.item.open(); }
    function close() { if (settingsPanelLoader.item) settingsPanelLoader.item.close(); }
    function toggle() { if (settingsPanelLoader.item) settingsPanelLoader.item.toggle(); }
    function openOverview() { Local.GlobalStates.overviewOpen = true; }
    function focusWorkspace(id) {
        Hyprland.dispatch(`hl.dsp.focus({ workspace = "${id}" })`);
    }
    function injectPanel() {
        if (!settingsPanelLoader.item) return;
        settingsPanelLoader.item.bar = root.bar;
        settingsPanelLoader.item.settings = root.settings;
        settingsPanelLoader.item.anchorItem = button;
        settingsPanelLoader.item.hostWidget = root;
    }

    implicitWidth: workspaceRow.implicitWidth + button.implicitWidth
    implicitHeight: button.implicitHeight
    onBarChanged: injectPanel()
    onSettingsChanged: { applySettings(); injectPanel(); }
    Component.onCompleted: {
        applySettings();
        root.shownWorkspaceIds = root.workspaceIds;
    }

    // What the Repeater draws. workspaceIds is re-evaluated on every Hyprland
    // event that touches its inputs (focused monitor, workspace data, MRU) and
    // returns a new array each time, usually with identical contents. Handing
    // that straight to the Repeater destroyed and recreated every button, and
    // each button's registration with the bar runs a sync over all plugins'
    // click targets. Under a burst of events that churn pinned the shell's main
    // thread in the garbage collector. Only a real change reaches the Repeater.
    property var shownWorkspaceIds: []
    onWorkspaceIdsChanged: {
        if (!WorkspaceBarConfig.sameWorkspaceIds(root.shownWorkspaceIds, root.workspaceIds))
            root.shownWorkspaceIds = root.workspaceIds;
    }

    // Keep the small gaps between workspace buttons useful as a mouse fallback
    // too. The buttons above this area still handle their own left/right clicks.
    MouseArea {
        anchors.fill: parent
        acceptedButtons: Qt.RightButton
        onClicked: root.openOverview()
    }

    Loader {
        id: settingsPanelLoader
        active: true
        source: Qt.resolvedUrl("../SettingsPanel.qml")
        visible: false
        onLoaded: { root.injectPanel(); Qt.callLater(root.injectPanel); }
    }

    WidgetButton {
        id: button
        anchors.left: workspaceRow.right
        anchors.verticalCenter: parent.verticalCenter
        width: implicitWidth
        height: parent.height
        bar: root.bar
        fontFamily: "JetBrainsMono Nerd Font"
        text: "󰒓"
        tooltipText: "Overview workspace order"
        onPressed: function(buttonCode) {
            if (buttonCode === Qt.RightButton)
                root.openOverview();
            else if (buttonCode === Qt.LeftButton)
                root.toggle();
        }
    }

    Row {
        id: workspaceRow
        anchors.left: parent.left
        anchors.verticalCenter: parent.verticalCenter
        height: parent.height
        spacing: Style.space(1)

        // The model is the number of buttons, not the id list. A Repeater given a
        // new list destroys and recreates every button, and each Omarchy
        // WidgetButton registers and unregisters itself with the bar, which then
        // resyncs every plugin's click targets. Focusing a workspace reorders the
        // MRU list, so that happened on nearly every switch. With a count, a
        // reorder only rebinds each button's workspace id; buttons are created or
        // destroyed only when the number of workspaces changes.
        Repeater {
            model: root.shownWorkspaceIds.length

            WidgetButton {
                required property int index
                readonly property int workspaceId: root.shownWorkspaceIds[index] ?? 0
                readonly property bool focused: Hyprland.focusedWorkspace?.id === workspaceId
                readonly property var workspace: Local.HyprlandData.workspaceById[workspaceId]
                readonly property bool occupied: !!workspace
                    && Local.HyprlandData.workspaceHasVisibleWindows(workspaceId)

                bar: root.bar
                fontFamily: "JetBrainsMono Nerd Font"
                // Original mode uses visual slots, while System mode mirrors
                // the native bar's actual workspace numbers.
                text: focused
                    ? "\uDB85\uDCFB"
                    : root.legacySort
                        ? String(index + 1)
                        : (workspaceId === 10 ? "0" : String(workspaceId))
                opacity: occupied || focused ? 1 : 0.5
                horizontalMargin: 6
                verticalPadding: 6
                fixedWidth: Style.space(20)
                fixedHeight: root.barSize
                onPressed: function(buttonCode) {
                    if (buttonCode === Qt.RightButton)
                        root.openOverview();
                    else
                        root.focusWorkspace(workspaceId);
                }
            }
        }
    }
}
