# Vista validation procedure

This is the fixed acceptance checklist to run after every change to the plugin.
It covers static checks, automated tests, Shell runtime checks, and Overview
interaction checks. Run all commands from the plugin directory
`ranu.panorama/`.

## 1. Before changing anything

```sh
git status --short --branch
git diff --check
```

Make sure no changes to other plugins or user configuration are mixed into the
commit. During development, do not trigger a plugin hot rescan while Overview is
open or a window is being dragged.

## 2. Automated checks

```sh
node --test
omarchy plugin validate .
qmllint -I "${OMARCHY_PATH:-/usr/share/omarchy}/shell" \
  Overview.qml OverviewWidget.qml OverviewWindow.qml \
  SettingsPanel.qml KeybindingService.qml bar/widget.qml
```

Acceptance criteria:

- `node --test` passes completely; the test count is whatever the repository
  currently has (51 at the moment).
- `omarchy plugin validate .` succeeds with no manifest errors.
- `qmllint` reports no new QML errors. Because of Quickshell's runtime import
  paths, some environments print `Failed to import QtQuick` or unresolved
  composite type warnings; those warnings are not a substitute for runtime tests.
- The plugin lifecycle code must not contain a full Hyprland reload:

```sh
if rg -n 'hyprctl.*reload|reload.*hyprctl' . -g '*.qml'; then
  echo 'forbidden hyprctl reload found' >&2
  exit 1
fi
```

## 3. Shell runtime checks

```sh
OMARCHY_SHELL_IPC_TIMEOUT=1s omarchy-shell shell ping
OMARCHY_SHELL_IPC_TIMEOUT=1s omarchy plugin list --json \
  | jq '.[] | select(.id == "ranu.panorama")'

pid=$(pgrep -f '^quickshell -n -p ' | head -n1)
ps -p "$pid" -o pid,ppid,stat,etime,pcpu,pmem,cmd
hyprctl layers
```

Acceptance criteria:

- Shell ping returns `ok`.
- The plugin is `enabled: true`.
- `hyprctl layers` contains `namespace: omarchy-bar`.
- The Quickshell process exists and stays running. A short CPU spike after
  startup is fine, but after about 30 seconds it must not keep climbing or stop
  answering IPC.

## 4. Overview display and mouse checks

The command line can check layers and IPC; actual right-clicks must still be
confirmed by hand:

```sh
OMARCHY_SHELL_IPC_TIMEOUT=1s \
  omarchy-shell shell summon ranu.panorama '{}'
hyprctl layers | rg 'omarchy-bar|quickshell:overview'
OMARCHY_SHELL_IPC_TIMEOUT=1s \
  omarchy-shell shell hide ranu.panorama
```

In the top-bar overview workspace area, confirm each of these:

1. Right-click a workspace number: Overview opens.
2. Right-click the gear: Overview opens.
3. Right-click the gap between numbers: Overview opens.
4. Left-click a workspace number: still switches workspace.
5. Left-click the gear: still opens the settings panel.

While Overview is open the `quickshell:overview` layer must be present; after it
closes that layer must disappear and `omarchy-bar` must remain.

## 5. Stability regression

For changes that touch the Shell, keybindings, plugin lifecycle, or the bar
widget, run at least 3 cycles; for hot reload, IPC, or hang issues, run 5:

```sh
for n in 1 2 3 4 5; do
  echo "cycle-$n"
  timeout 35s omarchy restart shell
  OMARCHY_SHELL_IPC_TIMEOUT=1s omarchy-shell shell ping
  OMARCHY_SHELL_IPC_TIMEOUT=1s \
    omarchy-shell shell summon ranu.panorama '{}'
  sleep 1
  hyprctl layers | rg -q 'namespace: quickshell:overview'
  OMARCHY_SHELL_IPC_TIMEOUT=1s \
    omarchy-shell shell hide ranu.panorama
  sleep 1
done
```

Every cycle must succeed. Keep at least 1 second between cycles so a Shell
startup race is not mistaken for a plugin failure. Afterwards wait about 30
seconds, confirm ping still returns `ok`, and check recent logs:

```sh
journalctl --user -b --since '3 min ago' --no-pager \
  | rg -i 'omarchy-shell|quickshell|overview|qml|fatal|segfault' \
  | tail -n 160
```

Look for `fatal`, `segfault`, `is not responding`, repeated Shell start/exit
cycles, and the same QML error flooding the log. Missing icons and portal
registration warnings are usually not plugin failures, but record them rather
than claiming there were no warnings at all.

## 6. Isolating a hang

If the top bar and Overview are both unresponsive, preserve the state and run:

```sh
pgrep -af 'quickshell|omarchy-launch-shell'
OMARCHY_SHELL_IPC_TIMEOUT=1s omarchy-shell shell ping
hyprctl layers
free -h
df -h
```

If Hyprland works but Shell IPC does not answer, the fault is in the
Quickshell/Shell layer, not system-wide resource exhaustion. Try Omarchy's normal
recovery first:

```sh
timeout 35s omarchy restart shell
```

If the Shell is busy-looping and that command cannot finish, the last resort is
to terminate only the current Quickshell child process and let
`omarchy-launch-shell` relaunch it. Do not kill Hyprland, and do not use
`hyprctl reload` in place of a Shell restart. After recovery, repeat sections 3,
4, and 5.

To confirm whether the overview plugin is the cause, temporarily run:

```sh
omarchy plugin disable ranu.panorama
timeout 35s omarchy restart shell
```

Always restore it once isolation testing is done:

```sh
omarchy plugin enable ranu.panorama left
timeout 35s omarchy restart shell
```

## 7. Pre-commit checklist

- Automated tests, plugin validation, and `git diff --check` pass.
- No new `hyprctl reload`.
- Manual right-click/left-click behavior matches section 4.
- Shell ping returns `ok`; the bar and overview layers appear and disappear correctly.
- The stability cycles completed and the logs show no new fatal or QML errors.
- Only this repository's files are committed; check `git status` before committing.
