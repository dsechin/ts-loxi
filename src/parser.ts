import _ from 'lodash';
import * as AST from './ast';
import {Token, TokenType} from './token';
import {ParseError, reportParserError} from './error';

export class Parser {
  private current = 0;
  private readonly boundaryGuard = new Token(TokenType.EOF, '', null, 0);

  public readonly MAX_FUNCTION_ARGS = 255;

  private loopNestingLevel = 0;

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

  private next(): Token {
    if (this.current >= this.tokens.length - 1) {
      return this.boundaryGuard;
    }

    return this.tokens[this.current + 1];
  }

  private previous(): Token {
    return this.current > 0
      ? this.tokens[this.current - 1]
      : this.boundaryGuard;
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

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) {
      return this.advance();
    }

    this.error(this.peek(), message);

    return this.boundaryGuard;
  }

  private error(token: Token, message: string) {
    reportParserError(this.peek(), message);

    return new ParseError(token, message);
  }

  /** GRAMMAR RULES **/

  /**
   * declaration → funDecl
   *             | varDecl
   *             | statement ;
   */
  private declaration(): AST.Stmt {
    try {
      if (
        this.peek().type === TokenType.FUN
        && this.next().type === TokenType.IDENTIFIER
      ) {
        this.advance();

        return this.functionDeclartaion('function');
      }

      if (this.match(TokenType.VAR)) {
        return this.variableDeclaration();
      }

      return this.statement();
    } catch (error) {
      return new AST.ExpressionStmt(new AST.NoOpExpr());
    }
  }

  /**
   * funDecl → "fun" IDENTIFIER "(" parameters? ")" block ;
   */
  private functionDeclartaion(kind: string): AST.FunctionStmt {
    const name = this.consume(TokenType.IDENTIFIER, `Expect ${kind} name`);

    this.consume(TokenType.LEFT_PAREN, 'Expect "(" after a function declaration.');

    const params = this.check(TokenType.RIGHT_PAREN)
      ? []
      : this.parameters();

    this.consume(TokenType.RIGHT_PAREN, 'Expect ")" after a function parameters list.');
    this.consume(TokenType.LEFT_BRACE, `Expect "{" before ${kind} body.`);

    const body = this.blockContents();

    return new AST.FunctionStmt(name, params, body);
  }

  /**
   * parameters → IDENTIFIER ( "," IDENTIFIER )* ;
   */
  private parameters(): Token[] {
    const list = [this.consume(TokenType.IDENTIFIER, 'Expect parameter name.')];

    while (this.match(TokenType.COMMA)) {
      list.push(
        this.consume(TokenType.IDENTIFIER, 'Expect parameter name.'),
      );

      if (list.length > this.MAX_FUNCTION_ARGS) {
        this.error(this.peek(), `Can\'t have more than ${this.MAX_FUNCTION_ARGS} arguments.`);
      }
    }

    return list;
  }

  /**
   * varDecl → "var" IDENTIFIER ( "=" expression )? ";" ;
   */
  private variableDeclaration(): AST.Stmt {
    const name = this.consume(TokenType.IDENTIFIER, 'Expect variable name');

    const initializer = this.match(TokenType.EQUAL)
      ? this.expression()
      : new AST.LiteralExpr(null);

    this.consume(TokenType.SEMICOLON, 'Expect ";" after variable declaration.');

    return new AST.VarStmt(name, initializer);
  }

  /**
   * statement → exprStmt
   *           | ifStmt
   *           | printStmt
   *           | whileStmt
   *           | forStmt
   *           | breakStmt
   *           | returnStmt
   *           | block ;
   */
  private statement(): AST.Stmt {
    if (this.match(TokenType.BREAK)) {
      return this.breakStatement();
    }

    if (this.match(TokenType.FOR)) {
      return this.forStatment();
    }

    if (this.match(TokenType.IF)) {
      return this.ifStatement();
    }

    if (this.match(TokenType.PRINT)) {
      return this.printStatement();
    }

    if (this.match(TokenType.RETURN)) {
      return this.returnStatement();
    }

    if (this.match(TokenType.WHILE)) {
      return this.whileStatement();
    }

    if (this.match(TokenType.LEFT_BRACE)) {
      return new AST.BlockStmt(this.blockContents());
    }

    return this.expressionStatment();
  }

  /**
   * Converts "for" statements into "while" statements
   *
   * forStmt → "for" "(" ( varDecl | exprStmt | ";" )
   *           expression? ";"
   *           expression? ")" statement ;
   */
  private forStatment(): AST.Stmt {
    this.consume(TokenType.LEFT_PAREN, 'Expect "(" after for.');

    let initializer: AST.Stmt | null;

    if (this.match(TokenType.SEMICOLON)) {
      initializer = null;
    } else if (this.match(TokenType.VAR)) {
      initializer = this.variableDeclaration();
    } else {
      initializer = this.expressionStatment();
    }

    const condition: AST.Expr | null = this.check(TokenType.SEMICOLON)
      ? null
      : this.expression();

    this.consume(TokenType.SEMICOLON, 'Expect ";" after loop condition.');

    const increment: AST.Expr | null = this.check(TokenType.RIGHT_PAREN)
      ? null
      : this.expression();

    this.consume(TokenType.RIGHT_PAREN, 'Expect ")" after for clauses.');
    this.loopNestingLevel++;

    let body = this.statement();

    if (increment) {
      body = new AST.BlockStmt([
        body,
        new AST.ExpressionStmt(increment),
      ]);
    }

    const whileCondition = _.isNull(condition)
      ? new AST.LiteralExpr(true)
      : condition;

    body = new AST.WhileStmt(whileCondition, body);

    if (initializer) {
      body = new AST.BlockStmt([initializer, body]);
    }

    const resStmt = body;

    this.loopNestingLevel--;

    return resStmt;
  }

  /**
   * ifStmt → "if" "(" expression ")" statement ( "else" statement )? ;
   */
  private ifStatement(): AST.IfStmt {
    this.consume(TokenType.LEFT_PAREN, 'Expect "(" after if.');

    const condition = this.expression();

    this.consume(TokenType.RIGHT_PAREN, 'Expect ")" after if.');

    const thenBranch = this.statement();
    const elseBranch = this.match(TokenType.ELSE)
      ? this.statement()
      : null;

    return new AST.IfStmt(condition, thenBranch, elseBranch);
  }

  /**
   * returnStmt → "return" expression? ";" ;
   */
  private returnStatement(): AST.ReturnStmt {
    const keyword = this.previous();
    const value = this.check(TokenType.SEMICOLON)
      ? null
      : this.expression();

    this.consume(TokenType.SEMICOLON, 'Expect ";" after return.');

    return new AST.ReturnStmt(keyword, value);
  }

  /**
   * whileStmt → "while" "(" expression ")" statement ;
   */
  private whileStatement(): AST.WhileStmt {
    this.consume(TokenType.LEFT_PAREN, 'Expect "(" after while.');

    const condition = this.expression();

    this.consume(TokenType.RIGHT_PAREN, 'Expect ")" after while.');

    this.loopNestingLevel++;

    const body = this.statement();
    const resStmt = new AST.WhileStmt(condition, body);

    this.loopNestingLevel--;

    return resStmt;
  }

  /**
   * breakStmt → "break" ";"
   */
  private breakStatement(): AST.BreakStmt {
    this.consume(TokenType.SEMICOLON, 'Expect ";" after break');

    if (this.loopNestingLevel === 0) {
      throw this.error(this.previous(), '"break" is not allowed outside of a loop expression.');
    }

    return new AST.BreakStmt();
  }

  /**
   * block → "{" declaration* "}" ;
   */
  private blockContents(): AST.Stmt[] {
    const declarations = [];

    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      declarations.push(this.declaration());
    }

    this.consume(TokenType.RIGHT_BRACE, 'Expect "}" after block');

    return declarations;
  }

  /**
   * printStmt → "print" expression ";" ;
   */
  private printStatement(): AST.PrintStmt {
    const value = this.expression();

    this.consume(TokenType.SEMICOLON, 'Expect ";" after value');

    return new AST.PrintStmt(value);
  }

  /**
   * exprStmt → expression ";" ;
   */
  private expressionStatment(): AST.ExpressionStmt {
    const value = this.expression();

    this.consume(TokenType.SEMICOLON, 'Expect ";" after expression');

    return new AST.ExpressionStmt(value);
  }

  /**
   * expression → assigment
   */
  private expression(): AST.Expr {
    return this.assigment();
  }

  private assigment(): AST.Expr {
    const expr = this.conditional();

    if (this.match(TokenType.EQUAL)) {
      const equals = this.previous();
      const value = this.assigment();

      if (expr instanceof AST.VariableExpr) {
        const name = expr.name;

        return new AST.AssignExpr(name, value);
      }

      this.error(equals, 'Invalid assignment target');
    }

    return expr;
  }

  /**
   * conditional → equality "?" equality ":" equality
   *             | equality ;
   */
  private conditional(): AST.Expr {
    const condition: AST.Expr = this.or();

    if (this.match(TokenType.QUESTION_MARK)) {
      const truthly = this.equality();

      if (!this.match(TokenType.COLON)) {
        throw this.error(
          this.peek(),
          'Expect colon & another expression.',
        );
      }

      return new AST.TernaryExpr(
        condition,
        new AST.GroupingExpr(truthly), // ignore precedence
        this.conditional(), // right assoc.
      );
    }

    return condition;
  }

  /**
   * logic_or → logic_and ( "or" logic_and )* ;
   */
  private or(): AST.Expr {
    const left = this.and();

    while (this.match(TokenType.OR)) {
      const operator = this.previous();
      const right = this.and();

      return new AST.LogicalExpr(left, operator, right);
    }

    return left;
  }

  /**
   * logic_and → equality ( "and" equality )* ;
   */
  private and(): AST.Expr {
    const left = this.equality();

    while (this.match(TokenType.AND)) {
      const operator = this.previous();
      const right = this.equality();

      return new AST.LogicalExpr(left, operator, right);
    }

    return left;
  }

  /**
   * equality → comparison ( ( "!=" | "==" ) comparison )* ;
   */
  private equality(): AST.Expr {
    let expr: AST.Expr = this.comparison();

    while (this.match(TokenType.BANG_EQUAL, TokenType.EQUAL_EQUAL)) {
      const operator = this.previous();
      const right = this.comparison();

      expr = new AST.BinaryExpr(expr, operator, right);
    }

    return expr;
  }

  /**
   * comparison → term ( ( ">" | ">=" | "<" | "<=" ) term )* ;
   */
  private comparison(): AST.Expr {
    let term: AST.Expr = this.term();

    const comparisonOps = [
      TokenType.GREATER,
      TokenType.GREATER_EQUAL,
      TokenType.LESS,
      TokenType.LESS_EQUAL,
    ];

    while (this.match(...comparisonOps)) {
      const operator = this.previous();
      const right = this.term();

      term = new AST.BinaryExpr(term, operator, right);
    }

    return term;
  }

  /**
   * term → factor ( ( "-" | "+" ) factor )* ;
   */
  private term(): AST.Expr {
    let factor: AST.Expr = this.factor();

    while (this.match(TokenType.PLUS, TokenType.MINUS)) {
      const operator = this.previous();
      const right = this.factor();

      factor = new AST.BinaryExpr(factor, operator, right);
    }

    return factor;
  }

  /**
   * factor → unary ( ( "/" | "*" ) unary )* ;
   */
  private factor(): AST.Expr {
    let unary: AST.Expr = this.unary();

    while (this.match(TokenType.SLASH, TokenType.STAR)) {
      const operator = this.previous();
      const right = this.unary();

      unary = new AST.BinaryExpr(unary, operator, right);
    }

    return unary;
  }

  /**
   * unary → ( "!" | "-" ) unary
   *         | exponentiation ;
   */
  private unary(): AST.Expr {
    if (this.match(TokenType.BANG, TokenType.MINUS)) {
      const operator = this.previous();
      const right = this.exponentiation();

      return new AST.UnaryExpr(operator, right);
    }

    return this.exponentiation();
  }

  /**
   * exponentiation → primary ( ** factor )*
   *                | call
   */
  private exponentiation(): AST.Expr {
    let primary: AST.Expr = this.primary();

    if (!this.check(TokenType.STAR_STAR)) {
      return this.call(primary);
    }

    while (this.match(TokenType.STAR_STAR)) {
      const operator = this.previous();

      primary = new AST.BinaryExpr(
        primary,
        operator,
        this.factor(),
      );
    }

    return primary;
  }

  /**
   * primary ( "(" arguments? ")" )* ;
   */
  private call(callee: AST.Expr): AST.Expr {
    let expr = callee;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (this.match(TokenType.LEFT_PAREN)) {
        expr = this.finishCall(expr);
      } else {
        break;
      }
    }

    return expr;
  }

  private finishCall(callee: AST.Expr): AST.Expr {
    let args: AST.Expr[] = [];

    if (!this.check(TokenType.RIGHT_PAREN)) {
      args = this.args();
    }

    const closingParen = this.consume(
      TokenType.RIGHT_PAREN,
      'Expect ")" after function arguments.',
    );

    return new AST.CallExpr(callee, closingParen, args);
  }

  /**
   * arguments → expression ( "," expression )* ;
   */
  private args(): AST.Expr[] {
    const list = [this.expression()];

    while (!this.isAtEnd() && this.match(TokenType.COMMA)) {
      list.push(this.expression());

      if (list.length > this.MAX_FUNCTION_ARGS) {
        this.error(this.peek(), `Can\'t have more than ${this.MAX_FUNCTION_ARGS} arguments.`);
      }
    }

    return list;
  }

  /**
   * lambda → "fun" IDENTIFIER? "(" parameters? ")" block ;
   */
   private lambda(kind: string): AST.LambdaExpr {
    let name = null;

    if (this.match(TokenType.IDENTIFIER)) {
      name = this.previous();
    }

    this.consume(TokenType.LEFT_PAREN, 'Expect "(" after a lambda declaration.');

    const params = this.check(TokenType.RIGHT_PAREN)
      ? []
      : this.parameters();

    this.consume(TokenType.RIGHT_PAREN, 'Expect ")" after a lambda parameters list.');
    this.consume(TokenType.LEFT_BRACE, `Expect "{" before ${kind} body.`);

    const body = this.blockContents();

    return new AST.LambdaExpr(name, params, body);
  }

  /**
   * primary → NUMBER | STRING | "true" | "false" | "nil"
   *         | "(" expression ")"
   *         | IDENTIFIER ;
   */
  private primary(): AST.Expr {
    if (this.match(TokenType.TRUE)) {
      return new AST.LiteralExpr(true);
    }

    if (this.match(TokenType.FALSE)) {
      return new AST.LiteralExpr(false);
    }

    if (this.match(TokenType.NIL)) {
      return new AST.LiteralExpr(null);
    }

    if (this.match(TokenType.NUMBER, TokenType.STRING)) {
      return new AST.LiteralExpr(this.previous().literal);
    }

    if (this.match(TokenType.IDENTIFIER)) {
      return new AST.VariableExpr(this.previous());
    }

    if (this.match(TokenType.LEFT_PAREN)) {
      const expr = this.expression();

      this.consume(TokenType.RIGHT_PAREN, 'Expect \')\' after expression.');

      return new AST.GroupingExpr(expr);
    }

    if (this.match(TokenType.FUN)) {
      return this.lambda('function');
    }

    throw this.error(this.peek(), 'Expect expression.');

    // Unreachable
    return new AST.NoOpExpr();
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

  public parse(): AST.Stmt[] {
    const statements: AST.Stmt[] = [];

    try {
      while (!this.isAtEnd() && !this.match(TokenType.EOF)) {
        statements.push(this.declaration());
      }

      return statements;
    } catch (parserError) {
      return [];
    }
  }
}
