const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = vm.createContext({});
vm.runInContext(fs.readFileSync(require.resolve('../Calculator.js'), 'utf8'), context);
const { evaluate } = context;
const shown = query => evaluate(query)?.display ?? null;

test('basic arithmetic with precedence and parentheses', () => {
    assert.equal(shown('12*3+4'), '40');
    assert.equal(shown('(1500-200)/4'), '325');
    assert.equal(shown('2+3*4'), '14');
    assert.equal(shown('(2+3)*4'), '20');
    assert.equal(shown('10 - 2 - 3'), '5');
    assert.equal(shown('100 / 10 / 2'), '5');
});

test('powers are right-associative and bind tighter than unary minus', () => {
    assert.equal(shown('2^10'), '1024');
    assert.equal(shown('2^3^2'), '512');
    assert.equal(shown('-2^2'), '-4');
    assert.equal(shown('(-2)^2'), '4');
    assert.equal(shown('2^-1'), '0.5');
});

test('percent divides by 100 and counts as arithmetic on its own', () => {
    assert.equal(shown('200*15%'), '30');
    assert.equal(shown('50%'), '0.5');
    assert.equal(shown('=50%'), '0.5');
});

test('x, × and ÷ work as operators', () => {
    assert.equal(shown('3x4'), '12');
    assert.equal(shown('3×4'), '12');
    assert.equal(shown('12÷4'), '3');
});

test('comma is a decimal separator and the answer uses it back', () => {
    assert.equal(shown('3,5*2'), '7');
    assert.equal(shown('1,5+1,25'), '2,75');
    assert.equal(shown('1.5+1.25'), '2.75');
});

test('binary noise is rounded away', () => {
    assert.equal(shown('0.1+0.2'), '0.3');
    assert.equal(shown('1/3'), '0.333333333333');
});

test('plain searches never become calculations', () => {
    for (const query of ['2048', 'vim', 'firefox 3', 'x', '', '   ', 'chromium', '(', 'a+b'])
        assert.equal(evaluate(query), null, JSON.stringify(query));
});

test('= forces calculator mode for a bare number', () => {
    assert.equal(shown('=2048'), '2048');
    assert.equal(shown('= 7'), '7');
    assert.equal(evaluate('='), null);
});

test('invalid or non-finite input yields nothing', () => {
    for (const query of ['1/0', '2+', '(1+2', '1+2)', '1..2', '3 4', '2**3', '1e5+1', 'x2+3'])
        assert.equal(evaluate(query), null, JSON.stringify(query));
});

test('unary signs and very long input', () => {
    assert.equal(shown('-3+5'), '2');
    assert.equal(shown('+3*-2'), '-6');
    assert.equal(evaluate('1+'.repeat(150) + '1'), null);
});
