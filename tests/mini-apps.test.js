const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const context = vm.createContext({});
vm.runInContext(fs.readFileSync(require.resolve('../MiniApps.js'), 'utf8'), context);
const { MINI_APPS, byId, search } = context;

test('every registered mini app has the fields the Overview needs, and its file exists', () => {
    for (const app of MINI_APPS) {
        for (const field of ['id', 'title', 'subtitle', 'icon', 'source'])
            assert.equal(typeof app[field], 'string', `${app.id}.${field}`);
        assert.ok(Array.isArray(app.keywords) && app.keywords.length > 0, `${app.id}.keywords`);
        assert.ok(fs.existsSync(path.join(__dirname, '..', app.source)), `${app.source} missing`);
    }
});

test('ids are unique and looked up by id', () => {
    const ids = MINI_APPS.map(app => app.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(byId('calculator').source, 'CalculatorApp.qml');
    assert.equal(byId('nope'), null);
    assert.equal(byId(undefined), null);
});

// The registry runs inside a vm context, so its arrays have a different
// prototype than this file's; compare ids, never the arrays themselves.
const ids = query => Array.from(search(query) ?? []).map(app => app.id).join(',');

test('search matches title and keywords by prefix', () => {
    assert.equal(ids('calc'), 'calculator');
    assert.equal(ids('CALCU'), 'calculator');
    assert.equal(ids('calculadora'), 'calculator');
    assert.equal(ids('math'), 'calculator');
});

test('search ignores unrelated queries and respects the limit', () => {
    for (const query of ['', '   ', 'firefox', 'ulator', 'zzz'])
        assert.equal(ids(query), '', JSON.stringify(query));
    assert.equal(search('calc', 0).length, 0);
});
