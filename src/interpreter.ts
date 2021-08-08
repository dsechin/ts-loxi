import _ from 'lodash';
import * as AST from './ast';
import {reportRuntimeError, RuntimeError} from './error';
import {Token, TokenType} from './token';

export class Interpreter implements AST.Visitor<unknown> {
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

    return  String(value);
  }

  public interpret(expression: AST.Expr): void{
    try {
      const value = this.evaluate(expression);

      console.log(this.stringify(value));
    } catch (error) {
      reportRuntimeError(error);
    }
  }

  public visitBinaryExpr(expr: AST.BinaryExpr) {
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

  public visitTernaryExpr(expr: AST.TernaryExpr) {
    const condition = this.evaluate(expr.condition);
    const truthly = this.evaluate(expr.truthly);
    const falsey = this.evaluate(expr.falsey);

    return this.isTruthly(condition) ? truthly : falsey;
  }

  public visitUnaryExpr(expr: AST.BinaryExpr) {
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

  public visitLiteralExpr(expr: AST.LiteralExpr) {
    return expr.value;
  }

  public visitNoOpExpr(expr: AST.NoOpExpr) {
    return null;
  }

  public visitGroupingExpr(expr: AST.GroupingExpr) {
    return this.evaluate(expr.expression);
  }
}
