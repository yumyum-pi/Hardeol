/**
 * Safe expression evaluator for validation rules.
 * Matches Go expression syntax for consistent behavior.
 */

type ExprValue = string | number | boolean | null | undefined | unknown[] | Record<string, unknown>;

interface ExpressionContext {
  data: Record<string, unknown>;
  value?: unknown;
}

// Token types for the lexer
type TokenType =
  | 'NUMBER'
  | 'STRING'
  | 'IDENTIFIER'
  | 'OPERATOR'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA'
  | 'EOF';

interface Token {
  type: TokenType;
  value: string;
}

// Tokenize the expression
function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expr.length) {
    const char = expr[i];

    // Skip whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Numbers
    if (/\d/.test(char) || (char === '-' && /\d/.test(expr[i + 1]))) {
      let num = '';
      if (char === '-') {
        num = '-';
        i++;
      }
      while (i < expr.length && /[\d.]/.test(expr[i])) {
        num += expr[i++];
      }
      tokens.push({ type: 'NUMBER', value: num });
      continue;
    }

    // Strings
    if (char === '"' || char === "'") {
      const quote = char;
      let str = '';
      i++;
      while (i < expr.length && expr[i] !== quote) {
        if (expr[i] === '\\' && i + 1 < expr.length) {
          i++;
          str += expr[i];
        } else {
          str += expr[i];
        }
        i++;
      }
      i++; // Skip closing quote
      tokens.push({ type: 'STRING', value: str });
      continue;
    }

    // Identifiers and keywords
    if (/[a-zA-Z_]/.test(char)) {
      let ident = '';
      while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) {
        ident += expr[i++];
      }
      tokens.push({ type: 'IDENTIFIER', value: ident });
      continue;
    }

    // Multi-character operators
    const twoChar = expr.slice(i, i + 2);
    if (['==', '!=', '>=', '<=', '&&', '||'].includes(twoChar)) {
      tokens.push({ type: 'OPERATOR', value: twoChar });
      i += 2;
      continue;
    }

    // Single character operators
    if (['+', '-', '*', '/', '%', '>', '<', '!'].includes(char)) {
      tokens.push({ type: 'OPERATOR', value: char });
      i++;
      continue;
    }

    // Parentheses and comma
    if (char === '(') {
      tokens.push({ type: 'LPAREN', value: char });
      i++;
      continue;
    }
    if (char === ')') {
      tokens.push({ type: 'RPAREN', value: char });
      i++;
      continue;
    }
    if (char === ',') {
      tokens.push({ type: 'COMMA', value: char });
      i++;
      continue;
    }

    throw new Error(`Unexpected character: ${char}`);
  }

  tokens.push({ type: 'EOF', value: '' });
  return tokens;
}

// Parser for the expression
class ExpressionParser {
  private tokens: Token[];
  private pos: number;
  private ctx: ExpressionContext;

  constructor(tokens: Token[], ctx: ExpressionContext) {
    this.tokens = tokens;
    this.pos = 0;
    this.ctx = ctx;
  }

  private current(): Token {
    return this.tokens[this.pos];
  }

  private advance(): Token {
    const token = this.current();
    this.pos++;
    return token;
  }

  private expect(type: TokenType): Token {
    const token = this.advance();
    if (token.type !== type) {
      throw new Error(`Expected ${type} but got ${token.type}`);
    }
    return token;
  }

  parse(): ExprValue {
    const result = this.parseOr();
    if (this.current().type !== 'EOF') {
      throw new Error('Unexpected token after expression');
    }
    return result;
  }

  private parseOr(): ExprValue {
    let left = this.parseAnd();
    while (this.current().value === '||') {
      this.advance();
      const right = this.parseAnd();
      left = Boolean(left) || Boolean(right);
    }
    return left;
  }

  private parseAnd(): ExprValue {
    let left = this.parseEquality();
    while (this.current().value === '&&') {
      this.advance();
      const right = this.parseEquality();
      left = Boolean(left) && Boolean(right);
    }
    return left;
  }

  private parseEquality(): ExprValue {
    let left = this.parseComparison();
    while (['==', '!='].includes(this.current().value)) {
      const op = this.advance().value;
      const right = this.parseComparison();
      if (op === '==') {
        left = left === right;
      } else {
        left = left !== right;
      }
    }
    return left;
  }

  private parseComparison(): ExprValue {
    let left = this.parseAdditive();
    while (['>', '<', '>=', '<='].includes(this.current().value)) {
      const op = this.advance().value;
      const right = this.parseAdditive();
      const l = Number(left);
      const r = Number(right);
      switch (op) {
        case '>':
          left = l > r;
          break;
        case '<':
          left = l < r;
          break;
        case '>=':
          left = l >= r;
          break;
        case '<=':
          left = l <= r;
          break;
      }
    }
    return left;
  }

  private parseAdditive(): ExprValue {
    let left = this.parseMultiplicative();
    while (['+', '-'].includes(this.current().value)) {
      const op = this.advance().value;
      const right = this.parseMultiplicative();
      if (op === '+') {
        if (typeof left === 'string' || typeof right === 'string') {
          left = String(left) + String(right);
        } else {
          left = Number(left) + Number(right);
        }
      } else {
        left = Number(left) - Number(right);
      }
    }
    return left;
  }

  private parseMultiplicative(): ExprValue {
    let left = this.parseUnary();
    while (['*', '/', '%'].includes(this.current().value)) {
      const op = this.advance().value;
      const right = this.parseUnary();
      const l = Number(left);
      const r = Number(right);
      switch (op) {
        case '*':
          left = l * r;
          break;
        case '/':
          left = l / r;
          break;
        case '%':
          left = l % r;
          break;
      }
    }
    return left;
  }

  private parseUnary(): ExprValue {
    if (this.current().value === '!') {
      this.advance();
      return !this.parseUnary();
    }
    if (this.current().value === '-' && this.current().type === 'OPERATOR') {
      this.advance();
      return -Number(this.parseUnary());
    }
    return this.parsePrimary();
  }

  private parsePrimary(): ExprValue {
    const token = this.current();

    if (token.type === 'NUMBER') {
      this.advance();
      return parseFloat(token.value);
    }

    if (token.type === 'STRING') {
      this.advance();
      return token.value;
    }

    if (token.type === 'IDENTIFIER') {
      const name = token.value;
      this.advance();

      // Check for function call
      if (this.current().type === 'LPAREN') {
        return this.parseFunctionCall(name);
      }

      // Check for built-in values
      if (name === 'true') return true;
      if (name === 'false') return false;
      if (name === 'null') return null;
      if (name === 'value') return this.ctx.value;

      // Look up in data
      return this.ctx.data[name];
    }

    if (token.type === 'LPAREN') {
      this.advance();
      const result = this.parseOr();
      this.expect('RPAREN');
      return result;
    }

    throw new Error(`Unexpected token: ${token.type} ${token.value}`);
  }

  private parseFunctionCall(name: string): ExprValue {
    this.expect('LPAREN');
    const args: ExprValue[] = [];

    if (this.current().type !== 'RPAREN') {
      args.push(this.parseOr());
      while (this.current().type === 'COMMA') {
        this.advance();
        args.push(this.parseOr());
      }
    }

    this.expect('RPAREN');
    return this.callFunction(name, args);
  }

  private callFunction(name: string, args: ExprValue[]): ExprValue {
    switch (name) {
      case 'field':
        return this.ctx.data[String(args[0])];

      case 'isEmpty':
        return isEmpty(args[0]);

      case 'len':
        if (typeof args[0] === 'string') return args[0].length;
        if (Array.isArray(args[0])) return args[0].length;
        if (args[0] && typeof args[0] === 'object') return Object.keys(args[0]).length;
        return 0;

      case 'contains':
        return String(args[0]).includes(String(args[1]));

      case 'startsWith':
        return String(args[0]).startsWith(String(args[1]));

      case 'endsWith':
        return String(args[0]).endsWith(String(args[1]));

      case 'matches':
        try {
          const regex = new RegExp(String(args[1]));
          return regex.test(String(args[0]));
        } catch {
          return false;
        }

      case 'now':
        return new Date().toISOString().split('T')[0];

      default:
        throw new Error(`Unknown function: ${name}`);
    }
  }
}

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Evaluate an expression against the provided data
 */
export function evaluateExpression(
  expression: string,
  data: Record<string, unknown>,
  currentValue?: unknown
): boolean {
  try {
    const tokens = tokenize(expression);
    const parser = new ExpressionParser(tokens, { data, value: currentValue });
    const result = parser.parse();
    return Boolean(result);
  } catch (error) {
    console.error('Expression evaluation error:', error);
    return false;
  }
}

/**
 * Parse date expressions like "now", "now+7d", "now-1m"
 */
export function parseDateExpression(expr: string): Date | null {
  expr = expr.trim().toLowerCase();

  // Handle "now"
  if (expr === 'now') {
    return new Date();
  }

  // Handle relative dates like "now+7d", "now-1m", "now+1y"
  if (expr.startsWith('now')) {
    let offset = expr.slice(3);
    if (offset.length < 2) return null;

    // Parse the sign
    let sign = 1;
    if (offset[0] === '-') {
      sign = -1;
      offset = offset.slice(1);
    } else if (offset[0] === '+') {
      offset = offset.slice(1);
    }

    // Parse the number and unit
    const unit = offset[offset.length - 1];
    const numStr = offset.slice(0, -1);
    const num = parseInt(numStr, 10) * sign;

    if (isNaN(num)) return null;

    const now = new Date();
    switch (unit) {
      case 'd':
        now.setDate(now.getDate() + num);
        return now;
      case 'w':
        now.setDate(now.getDate() + num * 7);
        return now;
      case 'm':
        now.setMonth(now.getMonth() + num);
        return now;
      case 'y':
        now.setFullYear(now.getFullYear() + num);
        return now;
      default:
        return null;
    }
  }

  // Try parsing as a standard date
  const parsed = new Date(expr);
  return isNaN(parsed.getTime()) ? null : parsed;
}
