const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = vm.createContext({});
vm.runInContext(fs.readFileSync(require.resolve('../HyprlandEvents.js'), 'utf8'), context);
const { affectsWorkspaceModel } = context;

test('window, workspace and monitor events still refetch', () => {
    for (const name of ['openwindow', 'closewindow', 'movewindow', 'workspace', 'createworkspacev2',
                        'destroyworkspacev2', 'monitoradded', 'activewindowv2', 'windowtitlev2', 'fullscreen'])
        assert.equal(affectsWorkspaceModel(name), true, name);
});

test('layer, screencast and keyboard layout events do not', () => {
    for (const name of ['openlayer', 'closelayer', 'screencast', 'screencastv2', 'activelayout'])
        assert.equal(affectsWorkspaceModel(name), false, name);
});

test("the plugin's own Super-key custom events do not, other custom events do", () => {
    assert.equal(affectsWorkspaceModel('custom', 'panorama-super,tap'), false);
    assert.equal(affectsWorkspaceModel('custom', 'panorama-super,down'), false);
    assert.equal(affectsWorkspaceModel('custom', 'panorama-super,interrupt'), false);
    assert.equal(affectsWorkspaceModel('custom', 'someone-else,event'), true);
    assert.equal(affectsWorkspaceModel('custom'), true);
    assert.equal(affectsWorkspaceModel('custom', ''), true);
});
