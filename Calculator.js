// Basic calculator for the Overview search. A small recursive-descent parser,
// never eval(): the query is untrusted text typed into a long-lived shell.
//
// Grammar:
//   expr    := term (("+" | "-") term)*
//   term    := unary (("*" | "/") unary)*
//   unary   := ("-" | "+") unary | power   so -2^2 is -(2^2)
//   power   := postfix ("^" unary)?        right-associative; 2^-1 works
//   postfix := primary "%"*                x% is x / 100
//   primary := number | "(" expr ")"
//
// "x" and "×" multiply, "÷" divides, and a comma is a decimal separator, so
// "3,5*2" works as typed on a Spanish keyboard.

var MAX_LENGTH = 200;

function tokenize(text) {
    const tokens = [];
    let i = 0;
    while (i < text.length) {
        const c = text[i];
        if (c === " " || c === "\t") {
            ++i;
            continue;
        }
        if ((c >= "0" && c <= "9") || c === "." || c === ",") {
            let j = i;
            let seenPoint = false;
            while (j < text.length) {
                const d = text[j];
                if (d >= "0" && d <= "9") {
                    ++j;
                } else if ((d === "." || d === ",") && !seenPoint) {
                    seenPoint = true;
                    ++j;
                } else {
                    break;
                }
            }
            const raw = text.slice(i, j).replace(",", ".");
            if (raw === ".")
                return null;
            tokens.push({ type: "num", value: Number(raw) });
            i = j;
            continue;
        }
        const op = { "+": "+", "-": "-", "*": "*", "x": "*", "X": "*", "×": "*",
                     "/": "/", "÷": "/", "^": "^", "%": "%", "(": "(", ")": ")" }[c];
        if (!op)
            return null;
        tokens.push({ type: "op", value: op });
        ++i;
    }
    return tokens;
}

function parse(tokens) {
    let pos = 0;
    const peek = () => tokens[pos];
    const isOp = value => peek()?.type === "op" && peek().value === value;

    function expr() {
        let left = term();
        while (isOp("+") || isOp("-")) {
            const op = tokens[pos++].value;
            const right = term();
            left = op === "+" ? left + right : left - right;
        }
        return left;
    }

    function term() {
        let left = unary();
        while (isOp("*") || isOp("/")) {
            const op = tokens[pos++].value;
            const right = unary();
            left = op === "*" ? left * right : left / right;
        }
        return left;
    }

    function unary() {
        if (isOp("-")) {
            ++pos;
            return -unary();
        }
        if (isOp("+")) {
            ++pos;
            return unary();
        }
        return power();
    }

    function power() {
        const base = postfix();
        if (isOp("^")) {
            ++pos;
            return Math.pow(base, unary());
        }
        return base;
    }

    function postfix() {
        let value = primary();
        while (isOp("%")) {
            ++pos;
            value = value / 100;
        }
        return value;
    }

    function primary() {
        const token = peek();
        if (!token)
            throw new Error("unexpected end");
        if (token.type === "num") {
            ++pos;
            return token.value;
        }
        if (isOp("(")) {
            ++pos;
            const value = expr();
            if (!isOp(")"))
                throw new Error("missing )");
            ++pos;
            return value;
        }
        throw new Error("unexpected token");
    }

    const value = expr();
    if (pos !== tokens.length)
        throw new Error("trailing input");
    return value;
}

// Rounds away binary noise (0.1 + 0.2) and writes the decimal separator the
// user typed.
function format(value, useComma) {
    const rounded = Number(value.toPrecision(12));
    const text = Object.is(rounded, -0) ? "0" : String(rounded);
    return useComma ? text.replace(".", ",") : text;
}

// Returns { expression, value, display } or null.
//
// Without a leading "=" the query must look like arithmetic: at least one
// digit and at least one operator, so a plain search such as "2048" or
// "vim" never turns into a calculation. "=" forces calculator mode.
function evaluate(query) {
    let text = String(query ?? "").trim();
    if (text.length === 0 || text.length > MAX_LENGTH)
        return null;
    const forced = text.startsWith("=");
    if (forced)
        text = text.slice(1).trim();
    if (text.length === 0)
        return null;
    if (!/[0-9]/.test(text))
        return null;
    const tokens = tokenize(text);
    if (!tokens || tokens.length === 0)
        return null;
    if (!forced && !tokens.some(token => token.type === "op" && token.value !== "(" && token.value !== ")"))
        return null;
    let value;
    try {
        value = parse(tokens);
    } catch (error) {
        return null;
    }
    if (!Number.isFinite(value))
        return null;
    const useComma = text.indexOf(",") >= 0 && text.indexOf(".") < 0;
    return { expression: text, value: value, display: format(value, useComma) };
}
