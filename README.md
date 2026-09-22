# Vista

*Formerly Panorama. The plugin id (`ranu.panorama`) and the repository URL
are unchanged, so existing installs keep working.*

**Press Win/Super to open the Overview on every monitor.**

![Vista open on two monitors](preview.png)

**Drag windows between workspaces, including onto another monitor.**

![Dragging windows between monitors](docs/media/drag-between-monitors.gif)

**Navigate with the arrow keys and type to search apps, open windows, and Omarchy menu actions.**

![Keyboard navigation and search](docs/media/keyboard-and-search.gif)

Vista is a multi-monitor workspace overview for Omarchy. It provides a full-screen overview on every monitor with live window previews, wallpaper-backed workspace cards, MRU workspace ordering, drag-and-drop between workspaces and monitors, search, and automatic keyboard integration.

See [`CHANGELOG.md`](CHANGELOG.md) for release notes.

## Features

- Press the standalone Win/Super key to open or close Overview.
- Live `ScreencopyView` thumbnails for windows on every workspace.
- Wallpaper-backed workspace cards, including an opaque New workspace card.
- Empty workspaces remain visible when **Occupied workspaces only** is off.
- A New workspace card always stays at the end of each monitor's list.
- Mouse selection, window focusing, drag-and-drop, and multi-monitor layouts.
- Drag a window from one monitor's Overview onto a workspace on another monitor.
- Press `Ctrl+Shift+X` in Overview to arm force-kill mode; the cursor is hidden
  and a close icon (`󰅖`) follows the pointer, and clicking a window kills only
  that client. Press `Escape` or right-click to cancel without killing anything.
- Keyboard navigation with arrows, H/J/K/L, Tab, Enter, Space, and Escape.
- Windows-style MRU ordering for workspaces across Overview, the top bar,
  Win+number, Win+Tab, and Win+Shift+Tab.
- Search for applications, open windows, and Omarchy menu actions from Overview,
  with a built-in calculator.
- Per-monitor workspace previews, configurable from the gear panel.
- Right-click any part of the top-bar workspace widget to open Overview as a
  mouse fallback when the keyboard shortcut is unavailable.
- Re-registers its runtime bindings after a Hyprland configuration reload.
- Omarchy theme colors and configured icon font.
- No generic fallback icon is drawn over a window thumbnail when an app has no icon.

## Requirements

- Omarchy 4 (Hyprland with Lua configuration and the Omarchy Quickshell shell).
- Everything else it calls ships with Omarchy: `hyprctl`, `uwsm-app` and
  `gtk-launch` to launch applications from search, `xdg-terminal-exec` for
  `>command` searches, and `wl-copy` to copy calculator results.

Vista needs no root privileges, installs no services, downloads nothing,
and never edits your Hyprland configuration files. Its bindings exist only at
runtime and are removed when the plugin is disabled.

## Install

```sh
omarchy plugin add https://github.com/elranu/omarchy-panorama.git --enable
```

After enabling, the plugin registers its Hyprland bindings automatically. Users do not need to edit `~/.config/hypr/bindings.lua`.

### Switching from Overview Workspaces

Vista has its own plugin id (`ranu.panorama`), so `plugin add` installs it
next to Overview Workspaces instead of replacing it, and both would fight over
the same Win/Super bindings. Remove the original first, then add Vista:

```sh
omarchy plugin remove hancore.overview-workspaces
omarchy plugin add https://github.com/elranu/omarchy-panorama.git --enable
omarchy restart shell
```

Settings from the gear panel start from their defaults. To keep the learned
workspace order, move `omarchy-overview-workspaces` to `omarchy-panorama` inside
`${XDG_STATE_HOME:-$HOME/.local/state}` before restarting the shell.

If you run a local copy of this repository under the old id instead, rename its
folder in `~/.config/omarchy/plugins/` to `ranu.panorama`, change the bar entry id
in `~/.config/omarchy/shell.json` from `hancore.overview-workspaces` to
`ranu.panorama`, and restart the shell. That keeps your gear-panel settings.

After updating an existing enabled installation, restart Omarchy Shell once so
the new keybinding service code replaces the preserved `keepLoaded` instance:

```sh
omarchy restart shell
```

A plugin rescan alone does not replace that service instance. Do not use a
Hyprland reload as a substitute.

Enabling automatically replaces the built-in workspace indicator; disabling restores it through Omarchy's native replacement mechanism. Older hosts that injected the full shell configuration also retain the legacy duplicate-layout cleanup.

## Remove

```sh
omarchy plugin remove ranu.panorama
omarchy restart shell
```

Removing the plugin unregisters its runtime bindings and restores Omarchy's
native workspace indicator and workspace shortcuts. Optionally delete its saved
workspace order with `rm -rf "${XDG_STATE_HOME:-$HOME/.local/state}/omarchy-panorama"`.

## Workspace ordering

Open the gear button in the top bar and use the **Occupied workspaces only**
toggle. In both states, occupied workspaces follow Windows-style MRU order and
the New workspace card stays last. The top bar, Overview, and keyboard behavior
change together.

**On (default)**

- Only workspaces with windows are shown.
- Win+1 through Win+0 follow those visual slots.

**Off**

- Native empty slots 1–10 stay visible, along with existing workspaces 11 and higher.
- Native IDs are not renumbered.
- Native Win+number behavior is restored; Overview and Win+Tab remain available.

## Search

Open Overview with the standalone Win/Super key, then press `/` to enter search.
Type an application name, window title, or Omarchy menu action and press Enter
to launch or focus the selected result. Use the arrow keys or Tab to move the
selection, and Escape to leave search.

H/J/K/L remain workspace navigation keys by default. To restore the older
behavior where any printable character starts search, turn off **Keep h/j/k/l
for navigation** in the gear panel. Prefix a query with `>` to run it as a
terminal command.

Applications open on a new, empty workspace when you press Enter. Press
**Shift+Enter** (or Shift+click the result) to open the app on the current
workspace instead.

Typing arithmetic shows the answer as the first result: `12*3+4`,
`(1500-200)/4`, `2^10`, or `200*15%` (percent divides by 100). `x`, `×` and `÷`
also work, and a comma is read as a decimal separator (`3,5*2`). **Enter** opens
the **Calculator** mini app with that expression loaded; **Shift+Enter** copies
the result and closes the Overview. Start the query with `=` to force a
calculation, for example `=2048`. Expressions are parsed by the plugin itself, never evaluated as code.

### Mini apps

Mini apps are small interactive panels that open over the workspace grid. Search
for one by name (the Calculator answers to `calc`) and press Enter; Escape
closes it and leaves the Overview open. Inside the Calculator you can type or
click the keypad, Enter copies the answer and keeps it in the history, and the
answer stays ready as the start of the next operation.

Adding one is a QML file based on `MiniApp.qml` plus an entry in `MiniApps.js`.

The search index reads Omarchy's menu through `$OMARCHY_PATH`, so it does not
assume `/usr/share/omarchy` and can be used on NixOS installations.

## Keyboard integration and cleanup

The enabled plugin service registers standalone Win, Win+Tab, Win+Shift+Tab, optimized Win+number slots, and Super-interrupt guards for normal application shortcuts.

When the plugin is disabled or removed, the service removes the fixed shortcut
chords it manages and restores Omarchy's default workspace navigation and
Super+mouse move/resize. Hyprland's runtime unbind API has no plugin-owner
identity, so a custom user mapping on the same chord cannot be preserved by
this cleanup. The service never runs `hyprctl reload` or writes runtime binds
into the user's Hyprland configuration.

## Manual summon and diagnostics

```sh
omarchy-shell shell summon ranu.panorama '{}'
hyprctl layers | grep -A3 -B2 'quickshell:overview'
omarchy plugin list --json | jq '.[] | select(.id == "ranu.panorama")'
```

## Project files

- `Overview.qml` — Overview layer-shell surface and lifecycle.
- `OverviewWidget.qml` — workspace grid, wallpaper, borders, selection, and drag targets.
- `OverviewWindow.qml` — window geometry, live thumbnails, and app icons.
- `WorkspaceNavigation.qml` — keyboard navigation, focus, and drag commits.
- `OverviewSwitchingController.qml` — Win+Tab switching and commit behavior.
- `WorkspaceOrder.qml` — persistent optimized workspace ordering.
- `HyprlandData.qml` — workspace, monitor, and window state mapping.
- `SettingsPanel.qml` — ordering-mode settings panel.
- `KeybindingService.qml` — automatic shortcut registration and cleanup.

## Validation

The complete repeatable validation procedure is documented in
[`docs/validation.md`](docs/validation.md). It covers automated tests, plugin
validation, QML checks, Shell IPC, layer checks, mouse fallback behavior,
stability cycles, and recovery isolation.

```sh
omarchy plugin validate .
qmllint -I "${OMARCHY_PATH:-/usr/share/omarchy}/shell" \
  Overview.qml OverviewWidget.qml OverviewWindow.qml \
  SettingsPanel.qml KeybindingService.qml bar/widget.qml
node --test
```

## Credits

Vista (formerly Panorama) is a fork of
[iamcheyan/omarchy-overview-workspaces](https://github.com/iamcheyan/omarchy-overview-workspaces)
(Overview Workspaces, by HANCORE), which is published separately in the Omarchy
plugin marketplace. Vista adds multi-monitor support, such as dragging windows
between monitors, and follows its own release line. Both are MIT licensed.

Vista and Overview Workspaces take over the same Win/Super bindings, so enable
only one of them at a time.
