import _ from 'lodash';
import * as AST from './ast';
import {reportResolverError} from './error';
import {Interpreter} from './interpreter';
import {Token} from './token';

export enum FUNCTION_TYPE {
  NONE = 'none',
  FUNCTION = 'function',
  METHOD = 'method',
  STATIC_METHOD = 'static_method',
  // class constructor; allow early return, disallow returning a value
  INITIALIZER = 'initializer',
}

export enum CLASS_TYPE {
  NONE = 'none',
  CLASS = 'class',
}

export enum VAR_STATE {
  DECLARED = 'DECLARED',
  DEFINED = 'DEFINED',
  USED = 'USED',
}

export type Scope = Record<string, VAR_STATE>;
export class Resolver implements
  AST.ExprVisitor<void>,
  AST.StmtVisitor<void> {

  private scopes: Array<Scope> = [];
  private currentFunction: FUNCTION_TYPE = FUNCTION_TYPE.NONE;
  private currentClass: CLASS_TYPE = CLASS_TYPE.NONE;

  constructor(
    public interpreter: Interpreter,
  ) {
  }

  private beginScope() {
    const scope: Scope = {};

    this.scopes.push(scope);
  }

  private endScope() {
    const scope = this.scopes.pop();

    const unusedVars = _
      .chain(scope)
      .pickBy((value, name) => name !== 'this')
      .pickBy(value => value !== VAR_STATE.USED)
      .keys()
      .value();

    unusedVars.forEach(varName => {
      const nestingLevel = this.scopes.length + 1;

      console.warn(
        `"${varName}" variable is declared, but never used [nesting level ${nestingLevel}]`,
      );
    });
  }

  private peekScope(): Scope {
    return this.scopes[this.scopes.length - 1];
  }

  private scopesStackIsEmpty() {
    return this.scopes.length === 0;
  }

  private resolveStmtList(statements: AST.Stmt[]): void {
    statements.forEach(statement => {
      this.resolveStmt(statement);
    });
  }

  private resolveStmt(statement: AST.Stmt): void {
    statement.accept(this);
  }

  private resolveExpr(expression: AST.Expr): void {
    expression.accept(this);
  }

  private resolveFunction(
    statement: AST.FunctionStmt,
    functionType: FUNCTION_TYPE,
  ): void {
    const enclosingFunction = this.currentFunction;

    this.currentFunction = functionType;

    this.beginScope();

    statement.params.forEach(param => {
      this.declare(param);
      this.define(param);
    });

    this.resolveStmtList(statement.body);

    this.endScope();

    this.currentFunction = enclosingFunction;
  }

  private resolveLambda(
    expr: AST.LambdaExpr,
    functionType: FUNCTION_TYPE,
  ): void {
    const enclosingFunction = this.currentFunction;

    this.currentFunction = functionType;

    this.beginScope();

    expr.params.forEach((param, index) => {
      this.declare(param);
      this.define(param);

      if (index < expr.params.length - 1) {
        this.markUsed(param);
      }
    });

    this.resolveStmtList(expr.body);

    this.endScope();

    this.currentFunction = enclosingFunction;
  }

  private declare(token: Token): void {
    if (this.scopesStackIsEmpty()) {
      return;
    }

    const scope = this.peekScope();

    if (_.has(scope, token.lexeme)) {
      reportResolverError(
        token,
        'Already a variable with this name in this scope.',
      );

      return;
    }

    scope[token.lexeme] = VAR_STATE.DECLARED;
  }

  private define(token: Token): void {
    if (this.scopesStackIsEmpty()) {
      return;
    }

    const scope = this.peekScope();

    scope[token.lexeme] = VAR_STATE.DEFINED;
  }

  private markUsed(token: Token): void {
    if (this.scopesStackIsEmpty()) {
      return;
    }

    let index = this.scopes.length - 1;
    let tokenScope = this.scopes[index];

    while (index > 0 && !_.has(tokenScope, [token.lexeme])) {
      index--;
      tokenScope = this.scopes[index];
    }

    tokenScope[token.lexeme] = VAR_STATE.USED;
  }

  private resolveLocal(expr: AST.Expr, name: Token): void {
    const maxIdx = this.scopes.length - 1;

    for (let i = maxIdx; i >= 0; i--) {
      if (_.has(this.scopes, [i, name.lexeme])) {
        this.interpreter.resolve(expr, maxIdx - i);
      }
    }
  }

  public visitBlockStmt(stmt: AST.BlockStmt): void {
    this.beginScope();
    this.resolveStmtList(stmt.statements);
    this.endScope();
  }

  public visitVarStmt(stmt: AST.VarStmt): void {
    this.declare(stmt.name);

    if (!_.isNull(stmt.initializer)) {
      this.resolveExpr(stmt.initializer);
    }

    this.define(stmt.name);
  }

  public visitClassStmt(stmt: AST.ClassStmt): void {
    const enclosingClass = this.currentClass;

    this.currentClass = CLASS_TYPE.CLASS;

    this.declare(stmt.name);
    this.define(stmt.name);

    const [staticMethods, instanceMethods] = _.partition(stmt.methods, method => method.isStatic);

    staticMethods.forEach(method => {
      this.resolveFunction(method, FUNCTION_TYPE.STATIC_METHOD);
    });

    // To bind 'this' to instance methods
    this.beginScope();

    const scope = this.peekScope();

    scope['this'] = VAR_STATE.DEFINED;

    instanceMethods.forEach(method => {
      const declaration = method.name.lexeme === 'init'
        ? FUNCTION_TYPE.INITIALIZER
        : FUNCTION_TYPE.METHOD;

      this.resolveFunction(method, declaration);
    });

    this.endScope();

    this.currentClass = enclosingClass;
  }

  public visitFunctionStmt(stmt: AST.FunctionStmt): void {
    this.declare(stmt.name);
    this.define(stmt.name);

    this.resolveFunction(stmt, FUNCTION_TYPE.FUNCTION);
  }

  public visitExpressionStmt(stmt: AST.ExpressionStmt): void {
    this.resolveExpr(stmt.expression);
  }

  public visitIfStmt(stmt: AST.IfStmt): void {
    this.resolveExpr(stmt.condition);
    this.resolveStmt(stmt.thenBranch);

    if (!_.isNull(stmt.elseBranch)) {
      this.resolveStmt(stmt.elseBranch);
    }
  }

  public visitPrintStmt(stmt: AST.PrintStmt): void {
    this.resolveExpr(stmt.expression);
  }

  public visitReturnStmt(stmt: AST.ReturnStmt): void {
    if (this.currentFunction === FUNCTION_TYPE.NONE) {
      reportResolverError(
        stmt.keyword,
        'Can\'t return from top-level code.',
      );
    }

    if (!_.isNull(stmt.value)) {
      if (this.currentFunction === FUNCTION_TYPE.INITIALIZER) {
        reportResolverError(
          stmt.keyword,
          'Can\'t return value from an instance initializer.',
        );
      }

      this.resolveExpr(stmt.value);
    }
  }

  public visitWhileStmt(stmt: AST.WhileStmt): void {
    this.resolveExpr(stmt.condition);
    this.resolveStmt(stmt.body);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public visitBreakStmt(stmt: AST.BreakStmt): void {

  }

  public visitVariableExpr(expr: AST.VariableExpr): void {
    if (
      !this.scopesStackIsEmpty()
      && this.peekScope()[expr.name.lexeme] === VAR_STATE.DECLARED
    ) {
      reportResolverError(
        expr.name,
        'Can\'t read local variable in its own initializer.',
      );

      return;
    }

    this.resolveLocal(expr, expr.name);
    this.markUsed(expr.name);
  }

  public visitAssignExpr(expr: AST.AssignExpr): void {
    this.resolveExpr(expr.value);
    this.resolveLocal(expr, expr.name);
  }

  public visitBinaryExpr(expr: AST.BinaryExpr): void {
    this.resolveExpr(expr.left);
    this.resolveExpr(expr.right);
  }

  public visitTernaryExpr(expr: AST.TernaryExpr): void {
    this.resolveExpr(expr.condition);
    this.resolveExpr(expr.truthly);
    this.resolveExpr(expr.falsey);
  }

  public visitCallExpr(expr: AST.CallExpr): void {
    this.resolveExpr(expr.callee);

    expr.args.forEach(arg => {
      this.resolveExpr(arg);
    });

    if (expr.callee instanceof AST.VariableExpr) {
      this.markUsed(expr.callee.name);
    }
  }

  public visitGroupingExpr(expr: AST.GroupingExpr): void {
    this.resolveExpr(expr.expression);
  }

  public visitGetExpr(expr: AST.GetExpr): void {
    this.resolveExpr(expr.object);
  }

  public visitSetExpr(expr: AST.SetExpr): void {
    this.resolveExpr(expr.value);
    this.resolveExpr(expr.object);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public visitLiteralExpr(expr: AST.LiteralExpr): void {

  }

  public visitLogicalExpr(expr: AST.LogicalExpr): void {
    this.resolveExpr(expr.left);
    this.resolveExpr(expr.right);
  }

  public visitUnaryExpr(expr: AST.UnaryExpr): void {
    this.resolveExpr(expr.right);
  }

  public visitThisExpr(expr: AST.ThisExpr): void {
    if (this.currentClass === CLASS_TYPE.NONE) {
      reportResolverError(
        expr.keyword,
        'Can\'t use "this" outside of a class.',
      );

      return;
    }

    this.resolveLocal(expr, expr.keyword);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public visitNoOpExpr(expr: AST.NoOpExpr): void {

  }

  public visitLambdaExpr(expr: AST.LambdaExpr): void {
    if (!_.isNull(expr.name)) {
      this.declare(expr.name);
      this.define(expr.name);
    }

    this.resolveLambda(expr, FUNCTION_TYPE.FUNCTION);
  }

  public resolve(statements: AST.Stmt[]): void {
    this.resolveStmtList(statements);
  }
}
