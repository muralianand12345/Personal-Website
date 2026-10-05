import { z } from 'zod';
import { tool } from 'langchain';

const CONSTANTS: Record<string, number> = { pi: Math.PI, e: Math.E };

const FUNCTIONS: Record<string, (...args: number[]) => number> = {
    sqrt: Math.sqrt,
    cbrt: Math.cbrt,
    abs: Math.abs,
    round: Math.round,
    floor: Math.floor,
    ceil: Math.ceil,
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    asin: Math.asin,
    acos: Math.acos,
    atan: Math.atan,
    exp: Math.exp,
    ln: Math.log,
    log: Math.log10,
    log2: Math.log2,
    pow: Math.pow,
    min: Math.min,
    max: Math.max,
};

const TOKEN = /\s*(\d+\.?\d*(?:e[+-]?\d+)?|\.\d+(?:e[+-]?\d+)?|[a-z_]\w*|\*\*|[-+*/%^(),])/giy;

const tokenize = (expression: string) => {
    const tokens: string[] = [];
    TOKEN.lastIndex = 0;
    while (TOKEN.lastIndex < expression.trimEnd().length) {
        const match = TOKEN.exec(expression);
        if (!match) throw new Error(`Unexpected character at position ${TOKEN.lastIndex + 1}`);
        tokens.push(match[1] === '**' ? '^' : match[1].toLowerCase());
    }
    return tokens;
};

/**
 * Evaluates arithmetic without `eval`: + - * / % ^ (or **), parentheses, `pi`, `e`, and the
 * functions above. Grammar, loosest binding first:
 *   sum     = product (("+" | "-") product)*
 *   product = unary (("*" | "/" | "%") unary)*
 *   unary   = ("-" | "+") unary | power
 *   power   = atom ("^" unary)?          right-associative, so -2^2 = -4 and 2^3^2 = 512
 *   atom    = number | constant | name "(" sum ("," sum)* ")" | "(" sum ")"
 */
export const evaluate = (expression: string): number => {
    const tokens = tokenize(expression);
    let pos = 0;

    const peek = () => tokens[pos];
    const next = () => tokens[pos++];
    const expect = (token: string) => {
        if (next() !== token) throw new Error(`Expected "${token}"`);
    };

    const sum = (): number => {
        let value = product();
        while (peek() === '+' || peek() === '-')
            value = next() === '+' ? value + product() : value - product();
        return value;
    };

    const product = (): number => {
        let value = unary();
        while (peek() === '*' || peek() === '/' || peek() === '%') {
            const op = next();
            const rhs = unary();
            value = op === '*' ? value * rhs : op === '/' ? value / rhs : value % rhs;
        }
        return value;
    };

    const unary = (): number => {
        if (peek() !== '-' && peek() !== '+') return power();
        return next() === '-' ? -unary() : unary();
    };

    const power = (): number => {
        const base = atom();
        if (peek() !== '^') return base;
        next();
        return Math.pow(base, unary());
    };

    const atom = (): number => {
        const token = next();
        if (token === undefined) throw new Error('Unexpected end of expression');
        if (token === '(') {
            const value = sum();
            expect(')');
            return value;
        }
        if (/^[\d.]/.test(token)) return Number(token);
        if (token in CONSTANTS) return CONSTANTS[token];
        if (token in FUNCTIONS) {
            expect('(');
            const args = [sum()];
            while (peek() === ',') {
                next();
                args.push(sum());
            }
            expect(')');
            return FUNCTIONS[token](...args);
        }
        throw new Error(`Unknown name "${token}"`);
    };

    const result = sum();
    if (pos < tokens.length) throw new Error(`Unexpected "${tokens[pos]}"`);
    return result;
};

export const calculator = tool(
    async ({ expression }) => {
        try {
            const result = evaluate(expression);
            if (!Number.isFinite(result)) return `${expression} has no finite result.`;
            return `${expression} = ${Number(result.toPrecision(12))}`;
        } catch (error) {
            return `Could not evaluate "${expression}": ${(error as Error).message}`;
        }
    },
    {
        name: 'calculator',
        description:
            'Evaluate an arithmetic expression exactly. Use it for any calculation rather than doing it in your head. Supports + - * / % ^, parentheses, pi, e, sqrt, cbrt, abs, round, floor, ceil, sin, cos, tan, asin, acos, atan, exp, ln, log (base 10), log2, pow, min, max.',
        schema: z.object({
            expression: z.string().describe('For example "(1250 * 0.15) / 12" or "sqrt(2) ^ 3"'),
        }),
    }
);
