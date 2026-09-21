// Which Hyprland raw events are worth a data refetch.
//
// Every event that gets through costs four hyprctl processes, a JSON parse
// each, and the property cascade that follows, so events that cannot change
// the clients, workspaces or monitors the Overview draws are dropped here.
var IGNORED_EVENTS = [
    "openlayer",
    "closelayer",
    "screencast",
    "screencastv2",
    // Keyboard layout switches. fcitx5's virtual keyboard can flap between
    // layouts many times a second, and every flap refetched the whole model.
    "activelayout"
];

// The plugin's own Super-key events, emitted by its Lua listener on every
// press, release and interrupt. They carry key state, never window data.
var OWN_CUSTOM_EVENT_PREFIX = "panorama-super";

function affectsWorkspaceModel(name, data) {
    const eventName = String(name ?? "");
    if (IGNORED_EVENTS.indexOf(eventName) >= 0)
        return false;
    if (eventName === "custom" && String(data ?? "").startsWith(OWN_CUSTOM_EVENT_PREFIX))
        return false;
    return true;
}
