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

  private executeBlock(statements: AST.Stmt[], environment: Environment): void {
    const prevEnv = this.environment;

    try {
      this.environment = environment;

      statements.forEach(statement => {
        this.execute(statement);
      });
    } finally {
      this.environment = prevEnv;
    }
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

  private checkOperandsType(
    left: unknown,
    right: unknown,
    predicate: (val: unknown) => boolean,
  ): boolean {
    return predicate(left) && predicate(right);
  }

  private checkNumberOperands(operator: Token, left: unknown, right: unknown): void {
    if (this.checkOperandsType(left, right, (val) => _.isNumber(val))) {
      return;
    }

    throw new RuntimeError(
      operator,
      'Both operands must be either numbers or strings',
    );
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
    const initialValue = this.evaluate(stmt.initializer);
    const value = this.isTruthly(initialValue)
      ? initialValue
      : undefined;

    this.environment.define(stmt.name.lexeme, value);
  }

  public visitExpressionStmt(stmt: AST.ExpressionStmt): void {
    this.evaluate(stmt.expression);
  }

  public visitPrintStmt(stmt: AST.PrintStmt): void {
    const value = this.evaluate(stmt.expression);

    console.log(this.stringify(value));
  }

  public visitBlockStmt(stmt: AST.BlockStmt): void {
    const blockEnv = new Environment(this.environment);

    this.executeBlock(stmt.statements, blockEnv);
  }

  public visitIfStmt(stmt: AST.IfStmt): void {
    const conditionValue = this.evaluate(stmt.condition);

    if (this.isTruthly(conditionValue)) {
      this.execute(stmt.thenBranch);
    } else if (stmt.elseBranch) {
      this.execute(stmt.elseBranch);
    }
  }

  public visitWhileStmt(stmt: AST.WhileStmt): void {
    while (this.isTruthly(this.evaluate(stmt.condition))) {
      this.execute(stmt.body);
    }
  }

  public visitAssignExpr(stmt: AST.AssignExpr): unknown {
    const value = this.evaluate(stmt.value);

    this.environment.assign(stmt.name, value);

    return value;
  }

  public visitLogicalExpr(expr: AST.LogicalExpr): unknown {
    const left = this.evaluate(expr.left);

    if (expr.operator.type === TokenType.OR) {
      if (this.isTruthly(left)) {
        return left;
      }
    } else {
      if (!this.isTruthly(left)) {
        return left;
      }
    }

    return this.evaluate(expr.right);
  }

  public visitBinaryExpr(expr: AST.BinaryExpr): unknown {
    const left = this.evaluate(expr.left);
    const right = this.evaluate(expr.right);

    switch (expr.operator.type) {
      // comparison
      case TokenType.GREATER:
        if (this.checkOperandsType(left, right, (val) => _.isNumber(val))) {
          return Number(left) > Number(right);
        } else if (this.checkOperandsType(left, right, (val) => _.isString(val))) {
          return String(left) > String(right);
        }

        throw new RuntimeError(
          expr.operator,
          'Both operands must be either numbers or strings',
        );

      case TokenType.GREATER_EQUAL:
        if (this.checkOperandsType(left, right, (val) => _.isNumber(val))) {
          return Number(left) >= Number(right);
        } else if (this.checkOperandsType(left, right, (val) => _.isString(val))) {
          return String(left) >= String(right);
        }

        throw new RuntimeError(
          expr.operator,
          'Both operands must be either numbers or strings',
        );

      case TokenType.LESS:
        if (this.checkOperandsType(left, right, (val) => _.isNumber(val))) {
          return Number(left) < Number(right);
        } else if (this.checkOperandsType(left, right, (val) => _.isString(val))) {
          return String(left) < String(right);
        }

        throw new RuntimeError(
          expr.operator,
          'Both operands must be either numbers or strings',
        );

      case TokenType.LESS_EQUAL:
        if (this.checkOperandsType(left, right, (val) => _.isNumber(val))) {
          return Number(left) <= Number(right);
        } else if (this.checkOperandsType(left, right, (val) => _.isString(val))) {
          return String(left) <= String(right);
        }

        throw new RuntimeError(
          expr.operator,
          'Both operands must be either numbers or strings',
        );

      case TokenType.BANG_EQUAL:
        if (this.checkOperandsType(left, right, (val) => _.isNumber(val))) {
          return this.isEqual(Number(left), Number(right));
        } else if (this.checkOperandsType(left, right, (val) => _.isString(val))) {
          return this.isEqual(String(left), String(right));
        }

        throw new RuntimeError(
          expr.operator,
          'Both operands must be either numbers or strings',
        );

      case TokenType.EQUAL_EQUAL:
        if (this.checkOperandsType(left, right, (val) => _.isNumber(val))) {
          return this.isEqual(Number(left), Number(right));
        } else if (this.checkOperandsType(left, right, (val) => _.isString(val))) {
          return this.isEqual(String(left), String(right));
        }

        throw new RuntimeError(
          expr.operator,
          'Both operands must be either numbers or strings',
        );

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
