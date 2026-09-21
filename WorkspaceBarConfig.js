// Upgrade layouts created before the manifest declared its native replacement.
// Return false for clean/disabled layouts so config notifications never loop.
function removeDuplicateNativeWidget(config) {
    const layout = config?.bar?.layout;
    const sections = ["left", "center", "right"];
    const id = entry => typeof entry === "string" ? entry : entry?.id;
    if (!sections.some(section => (layout?.[section] ?? []).some(
            entry => id(entry) === "ranu.panorama")))
        return false;

    let changed = false;
    for (const section of sections) {
        const entries = layout[section];
        if (!Array.isArray(entries)) continue;
        const filtered = entries.filter(entry => id(entry) !== "omarchy.workspaces");
        if (filtered.length !== entries.length) {
            layout[section] = filtered;
            changed = true;
        }
    }
    return changed;
}

function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

// Omarchy 4 gives third-party plugins a capability-scoped shell API. It exposes
// the bar snapshot directly as `barConfig`; older hosts injected the complete
// shell and exposed the same data as `shellConfig.bar`.
function shellBarConfig(shell) {
    if (!shell || (typeof shell !== "object" && typeof shell !== "function"))
        return null;
    if ("barConfig" in shell)
        return isPlainObject(shell.barConfig) ? shell.barConfig : null;
    if ("shellConfig" in shell && isPlainObject(shell.shellConfig)
            && isPlainObject(shell.shellConfig.bar))
        return shell.shellConfig.bar;
    return null;
}

function configuredOverviewMode(shell) {
    const bar = shellBarConfig(shell);
    const layout = isPlainObject(bar?.layout) ? bar.layout : null;
    if (!layout)
        return "";

    for (const section of ["left", "center", "right"]) {
        const entries = layout[section];
        if (!Array.isArray(entries))
            continue;
        for (const entry of entries) {
            const id = typeof entry === "string" ? entry
                : (isPlainObject(entry) ? entry.id : "");
            if (id === "ranu.panorama")
                return isPlainObject(entry) && entry.sortMode === "system"
                    ? "system" : "legacy";
        }
    }
    return "";
}

// Duplicate cleanup is only available on the legacy full-shell API. Omarchy 4
// performs cloned-widget replacement in PluginRegistry.setEnabled(), and its
// scoped API intentionally does not permit a widget to rewrite other entries.
function legacyShellConfig(shell) {
    if (!shell || (typeof shell !== "object" && typeof shell !== "function"))
        return null;
    if (!("shellConfig" in shell) || !isPlainObject(shell.shellConfig))
        return null;
    return shell.shellConfig;
}

function requiresNativeWorkspaceNumberRestore(previousMode, nextMode) {
    return previousMode === "legacy" && nextMode === "system";
}

// Whether two workspace id lists hold the same ids in the same order. The bar
// only hands its Repeater a new list when this is false: a Repeater given a new
// array destroys and recreates every button, even when nothing changed.
function sameWorkspaceIds(a, b) {
    const left = a ?? [];
    const right = b ?? [];
    if (left.length !== right.length)
        return false;
    for (let i = 0; i < left.length; ++i) {
        if (left[i] !== right[i])
            return false;
    }
    return true;
}
