// Resolving a window's icon from its Hyprland class.
//
// The class is rarely the icon name: Brave reports "brave-browser" but its
// icon is "brave-desktop", VS Code reports "Code" and uses "vscode". The
// desktop entries hold the mapping, through StartupWMClass, the entry id, or
// the binary in Exec, so they are indexed once and consulted first.

function normalize(value) {
    return String(value ?? "").trim().toLowerCase().replace(/\.desktop$/, "");
}

// The binary name out of an Exec line: "/usr/bin/brave %U" -> "brave".
function execBinary(execString) {
    const first = String(execString ?? "").trim().split(/\s+/)[0] ?? "";
    const slash = first.lastIndexOf("/");
    return normalize(slash >= 0 ? first.slice(slash + 1) : first);
}

// Keys an entry can be found by, most specific first. The last segment of a
// reverse-DNS id ("com.mitchellh.ghostty" -> "ghostty") is included because
// some apps report only that as their class.
//
// Kept for tests and readability; buildIndex does the same work without the
// intermediate arrays, since it runs on every desktop-entry rescan.
function entryKeys(entry) {
    const id = normalize(entry?.id);
    const keys = [normalize(entry?.startupClass), id, execBinary(entry?.execString)];
    const dot = id.lastIndexOf(".");
    if (dot > 0 && dot < id.length - 1)
        keys.push(id.slice(dot + 1));
    return keys.filter(key => key.length > 0);
}

function claim(index, key, icon) {
    if (key.length > 0 && index[key] === undefined)
        index[key] = icon;
}

// key -> icon. The first entry to claim a key keeps it, so a more specific
// match is not overwritten by a later entry's weaker one.
//
// Allocation matters here: Quickshell re-emits its entry list on every rescan,
// and a per-entry array of keys made this a burst of garbage each time. A hang
// (2026-09-23) caught the shell's main thread inside the JS garbage collector
// under exactly this call, so keys are written straight into the index.
function buildIndex(entries) {
    const index = ({});
    const list = entries ?? [];
    for (var i = 0; i < list.length; ++i) {
        const entry = list[i];
        const icon = String(entry?.icon ?? "").trim();
        if (icon.length === 0)
            continue;
        const id = normalize(entry?.id);
        claim(index, normalize(entry?.startupClass), icon);
        claim(index, id, icon);
        claim(index, execBinary(entry?.execString), icon);
        const dot = id.lastIndexOf(".");
        if (dot > 0 && dot < id.length - 1)
            claim(index, id.slice(dot + 1), icon);
    }
    return index;
}

// The icon for a window class, or "" when nothing matches. Falls back to the
// class with its reverse-DNS prefix dropped, which is how many themes name
// their files.
function resolve(index, className) {
    const name = normalize(className);
    if (name.length === 0)
        return "";
    const map = index ?? {};
    if (map[name] !== undefined)
        return map[name];
    const dot = name.lastIndexOf(".");
    if (dot > 0 && dot < name.length - 1 && map[name.slice(dot + 1)] !== undefined)
        return map[name.slice(dot + 1)];
    return "";
}
