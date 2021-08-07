import {BinaryExpr, Expr, GroupingExpr, LiteralExpr, NoOpExpr, UnaryExpr} from './ast';
import {Token, TokenType} from './token';
import {ParseError, reportParserError} from './error';

export class Parser {
  private current = 0;
  private readonly startGuard = new Token(TokenType.EOF, '', null, 0);

  constructor(
    private readonly tokens: Token[],
  ) {

  }

  private isAtEnd(): boolean {
    return this.current >= this.tokens.length;
  }

  private advance(): Token {
    if (!this.isAtEnd()) {
      this.current++;
    }

    return this.previous();
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.current > 0
      ? this.tokens[this.current - 1]
      : this.startGuard;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) {
      return false;
    }

    return this.peek().type === type;
  }

  private match(...types: TokenType[]): boolean {
    if (types.some(type => this.check(type))) {
      this.advance();

      return true;
    }

    return false;
  }

  private consume(type: TokenType, message: string) {
    if (this.check(type)) {
      return this.advance();
    }

    this.error(this.peek(), message);
  }

  private error(token: Token, message: string) {
    reportParserError(this.peek(), message);

    return new ParseError(token, message);
  }

  /** GRAMMAR RULES **/

  /**
   * expression → equality
   */
  private expression(): Expr {
    return this.equality();
  }

  /**
   * equality → comparison ( ( "!=" | "==" ) comparison )* ;
   */
  private equality(): Expr {
    let expr: Expr = this.comparison();

    while (this.match(TokenType.BANG_EQUAL, TokenType.EQUAL)) {
      const operator = this.previous();
      const right = this.comparison();

      expr = new BinaryExpr(expr, operator, right);
    }

    return expr;
  }

  /**
   * comparison → term ( ( ">" | ">=" | "<" | "<=" ) term )* ;
   */
  private comparison(): Expr {
    let term: Expr = this.term();

    const comparisonOps = [
      TokenType.GREATER,
      TokenType.GREATER_EQUAL,
      TokenType.LESS,
      TokenType.LESS_EQUAL,
    ];

    while (this.match(...comparisonOps)) {
      const operator = this.previous();
      const right = this.term();

      term = new BinaryExpr(term, operator, right);
    }

    return term;
  }

  /**
   * term → factor ( ( "-" | "+" ) factor )* ;
   */
  private term(): Expr {
    let factor: Expr = this.factor();

    while (this.match(TokenType.PLUS, TokenType.MINUS)) {
      const operator = this.previous();
      const right = this.factor();

      factor = new BinaryExpr(factor, operator, right);
    }

    return factor;
  }

  /**
   * factor → unary ( ( "/" | "*" ) unary )* ;
   */
  private factor(): Expr {
    let unary: Expr = this.unary();

    while (this.match(TokenType.SLASH, TokenType.STAR)) {
      const operator = this.previous();
      const right = this.unary();

      unary = new BinaryExpr(unary, operator, right);
    }

    return unary;
  }

  /**
   * unary → ( "!" | "-" ) unary
   *         | primary ;
   */
  private unary(): Expr {
    if (this.match(TokenType.BANG, TokenType.MINUS)) {
      const operator = this.previous();
      const right = this.primary();

      return new UnaryExpr(operator, right);
    }

    return this.primary();
  }

  /**
   * primary → NUMBER | STRING | "true" | "false" | "nil"
   *         | "(" expression ")" ;
   */
  private primary(): Expr {
    if (this.match(TokenType.TRUE)) {
      return new LiteralExpr(true);
    }

    if (this.match(TokenType.FALSE)) {
      return new LiteralExpr(false);
    }

    if (this.match(TokenType.NIL)) {
      return new LiteralExpr(null);
    }

    if (this.match(TokenType.NUMBER, TokenType.STRING)) {
      return new LiteralExpr(this.previous().literal);
    }

    if (this.match(TokenType.LEFT_PAREN)) {
      const expr = this.expression();

      this.consume(TokenType.RIGHT_PAREN, 'Expect \')\' after expression.');

      return new GroupingExpr(expr);
    }

    throw this.error(this.peek(), 'Expect expression.');

    // Unreachable
    return new NoOpExpr();
  }

  private synchronize(): void {
    this.advance();

    while (!this.isAtEnd()) {
      if (this.previous().type === TokenType.SEMICOLON) {
        return;
      }

      switch (this.peek().type) {
        case TokenType.CLASS:
        case TokenType.FUN:
        case TokenType.VAR:
        case TokenType.FOR:
        case TokenType.IF:
        case TokenType.WHILE:
        case TokenType.PRINT:
        case TokenType.RETURN:
          return;
      }

      this.advance();
    }
  }

  public parse(): Expr | null {
    try {
      return this.expression();
    } catch (error) {
      return null;
    }
  }
}
