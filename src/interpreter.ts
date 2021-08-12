import _ from 'lodash';
import * as AST from './ast';
import {Environment} from './environment';
import {reportRuntimeError, RuntimeError} from './error';
import {Token, TokenType} from './token';

export class Interpreter implements
  AST.ExprVisitor<unknown>,
  AST.StmtVisitor<void> {

  private environment: Environment;

  constructor() {
    this.environment = new Environment();
  }

  private execute(stmt: AST.Stmt): void {
    stmt.accept(this);
  }

  private evaluate(expr: AST.Expr): unknown {
    return expr.accept(this);
  }

  private isTruthly(value: unknown): boolean {
    if (_.isNull(value)) {
      return false;
    }

    if (_.isBoolean(value)) {
      return value;
    }

    return true;
  }

  private isEqual(a: unknown, b: unknown): boolean {
    return  _.isEqual(a, b);
  }

  private checkNumberOperand(operator: Token, operand: unknown): void {
    if (_.isNumber(operand)) {
      return;
    }

    throw new RuntimeError(operator, 'Operand must be a number.');
  }

  private checkNumberOperands(operator: Token, left: unknown, right: unknown): void {
    if (_.isNumber(left) && _.isNumber(right)) {
      return;
    }

    throw new RuntimeError(operator, 'Operand must be a number.');
  }

  private stringify(value: unknown): string {
    if (_.isNull(value)) {
      return 'nil';
    }

    if (_.isNumber(value)) {
      return String(value);
    }

    return String(value);
  }

  public interpret(statements: AST.Stmt[]): void{
    try {
      statements.forEach(statement => {
        this.execute(statement);
      });
    } catch (error) {
      reportRuntimeError(error);
    }
  }

  public visitVarStmt(stmt: AST.VarStmt): void {
    const value = this.isTruthly(stmt.initializer)
      ? this.evaluate(stmt.initializer)
      : null;

    this.environment.define(stmt.name.lexeme, value);
  }

  public visitExpressionStmt(stmt: AST.ExpressionStmt): void {
    this.evaluate(stmt.expression);
  }

  public visitPrintStmt(stmt: AST.PrintStmt): void {
    const value = this.evaluate(stmt.expression);

    console.log(this.stringify(value));
  }

  public visitAssignExpr(stmt: AST.AssignExpr): unknown {
    const value = this.evaluate(stmt.value);

    this.environment.assign(stmt.name, value);

    return value;
  }

  public visitBinaryExpr(expr: AST.BinaryExpr): unknown {
    const left = this.evaluate(expr.left);
    const right = this.evaluate(expr.right);

    switch (expr.operator.type) {
      // comparison
      case TokenType.GREATER:
        this.checkNumberOperands(expr.operator, left, right);

        return Number(left) > Number(right);

      case TokenType.GREATER_EQUAL:
        this.checkNumberOperands(expr.operator, left, right);

        return Number(left) >= Number(right);

      case TokenType.LESS:
        this.checkNumberOperands(expr.operator, left, right);

        return Number(left) < Number(right);

      case TokenType.LESS_EQUAL:
        this.checkNumberOperands(expr.operator, left, right);

        return Number(left) <= Number(right);

      case TokenType.BANG_EQUAL:
        this.checkNumberOperands(expr.operator, left, right);

        return !this.isEqual(left, right);

      case TokenType.EQUAL_EQUAL:
        this.checkNumberOperands(expr.operator, left, right);

        return this.isEqual(left, right);

      // arithmetic
      case TokenType.MINUS:
        this.checkNumberOperands(expr.operator, left, right);

        return Number(left) - Number(right);

      case TokenType.STAR:
        this.checkNumberOperands(expr.operator, left, right);

        return Number(left) * Number(right);

      case TokenType.SLASH:
        this.checkNumberOperands(expr.operator, left, right);

        if ([0, -0].includes(Number(right))) {
          throw new RuntimeError(
            expr.operator,
            'Division by zero',
          );
        }

        return Number(left) / Number(right);

      case TokenType.STAR_STAR:
        this.checkNumberOperands(expr.operator, left, right);

        return Math.pow(Number(left), Number(right));

      // addition OR concatenation
      case TokenType.PLUS:
        if (_.isString(left) && _.isString(right)) {
          return left + right;
        }

        if (_.isNumber(left) && _.isNumber(right)) {
          return left + right;
        }

        throw new RuntimeError(
          expr.operator,
          'Operands must be two numbers or two strings.',
        );
        break;
    }

    // Unreachable
    return null;
  }

  public visitTernaryExpr(expr: AST.TernaryExpr): unknown {
    const condition = this.evaluate(expr.condition);
    const truthly = this.evaluate(expr.truthly);
    const falsey = this.evaluate(expr.falsey);

    return this.isTruthly(condition) ? truthly : falsey;
  }

  public visitUnaryExpr(expr: AST.BinaryExpr): unknown {
    const right = this.evaluate(expr.right);

    switch (expr.operator.type) {
      case TokenType.MINUS:
        this.checkNumberOperand(expr.operator, right);

        return - Number(right);

      case TokenType.BANG:
        return !this.isTruthly(right);
    }

    // Unreachable
    return null;
  }

  public visitLiteralExpr(expr: AST.LiteralExpr): unknown {
    return expr.value;
  }

  public visitNoOpExpr(expr: AST.NoOpExpr): unknown {
    return null;
  }

  public visitGroupingExpr(expr: AST.GroupingExpr): unknown{
    return this.evaluate(expr.expression);
  }

  public visitVariableExpr(expr: AST.VariableExpr): unknown {
    return this.environment.get(expr.name);
  }
}
