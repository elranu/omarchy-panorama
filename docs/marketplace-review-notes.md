# Marketplace review notes

> Compiled 2026-08-22 from the review of the original plugin's submission,
> [#1401](https://github.com/omacom/omarchy-plugin-marketplace/issues/1401), and
> of sibling plugins #1468 and #1428. Use it as a self-check before submitting
> and when responding to a re-review.

## Original plugin status

Vista (formerly Panorama) is a fork of Overview Workspaces. The original plugin was approved and
verified, and is published at:
https://plugins.omarchy.org/plugin.html?id=hancore.overview-workspaces

The marketplace verification applies to the published snapshot and is not a
security audit, and it does not carry over to this fork: Vista is reviewed as
its own listing.

## 1. How marketplace review works

1. **Review is pinned to an exact HEAD.** Maintainers re-check a specific commit
   SHA. A fix must be pushed, linked from an issue comment, and then re-reviewed
   at the new HEAD. Local changes that are not pushed are invisible to review.
2. **Automated baseline.** It scans for `pkexec`/`sudo`/`systemctl`/`make`
   patterns and flags hits with `privilege`/`service-management` capabilities.
   This repository's baseline **passed with zero capability flags**. That is an
   advantage; keep it that way.
3. **Manual review** focuses on two things: supply-chain integrity, and resource
   and injection boundaries. Feedback is precise down to `file:line`.

## 2. What reviewers care about (from the three reviews)

| # | Concern | Source | Precedent |
|---|---------|--------|-----------|
| 1 | Pinned supply chain: no cloning a moving HEAD, no building downloads as root | #1468 | Unpinned remote-to-root path was rejected |
| 2 | TOCTOU: a user-writable path that was validated must not then be handed to a privileged step | #1468 | `make` in the user cache was rejected |
| 3 | Unbounded resources: downloads must be truncated at their declared size | #1428 | Download until EOF filling the disk was rejected |
| 4 | **Injection surface: externally sourced text must render as explicit PlainText** | **#1401, this repository** | hyprctl client titles rendered through AutoText could trigger rich-text resource loading |
| 5 | Privilege discipline: fixed inline commands, explicitly triggered by the user | #1428 ONNX | A fixed-string pkexec passed |
| 6 | Uninstall hygiene: no dangling hooks left in user configuration | Submission checklist | Explicit consent clause |
| 7 | Repository hygiene: no build artifacts committed; README, license, and preview present; version bumped | All three | The bot checks manifest id uniqueness |

## 3. Feedback on this repository and fix status

- Reviewer ryanrhughes (collaborator): window titles and class names in
  `HyprlandData.qml:557-573` and `OverviewWidget.qml` were rendered through
  `StyledText` (default `Text.AutoText`), so a local application could use a
  markup-shaped title to trigger rich-text resource loading in the long-lived
  shell.
- Fixed in `594826a`: `StyledText` now uses `Text.PlainText`. See the audit below
  (2026-08-22).

## 4. Self-check for this repository (2026-08-22 audit)

- [x] **PlainText coverage**: every file was checked. Every place that renders
      hyprctl titles, class names, or labels goes through `StyledText`
      (PlainText); bare `text:` bindings are internal constants.
- [x] **`bash -lc` assembly in the service entry point**: an injection invariant is
      declared before `bindingScript` (only constant tables and integer
      interpolation are allowed); all current content is constant.
- [x] **Leftovers from the Sumika port removed**: the session menu and Shell reload
      (whose backend binary does not exist) were deleted entirely; `>command` mode
      now spawns the system `xdg-terminal-exec` directly (feature kept, without
      `sumika-detach`); the Enter-to-launcher behavior on the trailing workspace
      was removed (no replacement binary), keeping only focus; the dead
      `Directories.root` property was deleted and `sumikaStateHome` was renamed
      `stateHome`.
- [x] **`workspace-order.json` write gate fixed**: Omarchy shell never sets
      `SUMIKA_APP_DIR`, so the old `isWriter` check was always false and ordering
      was never persisted. Now the plugin owns the write when that variable is not
      set, while keeping the original election semantics under Sumika.
- [x] Wallpaper polling now runs only while Overview is visible, with one extra
      refresh the moment it opens.
- [x] `Persistent.qml` was confirmed **not to be dead code** at the time
      (`OverviewWindow.qml:127` consumed it) and was kept;
      `Config.qml`'s `arbitraryRaceConditionDelay=50` is an existing timing
      parameter and was left alone.
- [x] No pkexec/sudo/keyd-style privilege surface; all hyprctl calls run detached
      in user space.
- [x] `tests/menu-index.test.js` and `tests/workspace-bar-config.test.js` exist.
      The binding script, system/optimized ordering, trailing ids, and pending
      moves are still manually regression-tested.
