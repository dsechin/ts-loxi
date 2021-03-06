import _ from 'lodash';
import * as AST from './ast';
import {ICallable, TClass, TFunction, TInstance, TLambda, TMetaClass, TMethodMap} from './callable';
import {Environment} from './environment';
import {reportRuntimeError, RuntimeError, Break, Return} from './error';
import * as NativeFunctions from './native-functions';
import {Token, TokenType} from './token';

export class Interpreter implements
  AST.ExprVisitor<unknown>,
  AST.StmtVisitor<void> {

  private environment: Environment;

  public readonly globals: Environment;
  public locals: Map<AST.Expr, number>;

  constructor() {
    this.globals = new Environment();
    this.environment = this.globals;

    this.locals = new Map<AST.Expr, number>();

    this.globals.define('clock', new NativeFunctions.Clock());
    this.globals.define('str', new NativeFunctions.Str());
  }

  private execute(stmt: AST.Stmt): void {
    stmt.accept(this);
  }

  public resolve(expr: AST.Expr, distance: number): void {
    this.locals.set(expr, distance);
  }

  public executeBlock(statements: AST.Stmt[], environment: Environment): void {
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

  private lookUpVariable(name: Token, expr: AST.Expr): unknown {
    const distance = this.locals.get(expr);

    if (_.isUndefined(distance)) {
      return this.globals.get(name);
    }

    return this.environment.getAt(distance, name);
  }

  public interpret(statements: AST.Stmt[]): void {
    try {
      statements.forEach(statement => {
        this.execute(statement);
      });
    } catch (error) {
      reportRuntimeError(error);
    }
  }

  public visitClassStmt(stmt: AST.ClassStmt): void {
    this.environment.define(stmt.name.lexeme, null);

    const [staticMethodsList, instanceMethodsList] = _.partition(stmt.methods, method => method.isStatic);

    const staticMethods: TMethodMap = staticMethodsList.reduce<TMethodMap>(
      (acc, method) => {
        const instance = new TFunction(
          method,
          this.environment,
          false,
        );

        acc.set(method.name.lexeme, instance);

        return acc;
      },
      new Map<string, TFunction>(),
    );

    const instanceMethods: TMethodMap = instanceMethodsList.reduce<TMethodMap>(
      (acc, method) => {
        const instance = new TFunction(
          method,
          this.environment,
          method.name.lexeme === 'init',
        );

        acc.set(method.name.lexeme, instance);

        return acc;
      },
      new Map<string, TFunction>(),
    );

    const metaclass = new TMetaClass(stmt.name, staticMethods);
    const _class = new TClass(stmt.name, metaclass, instanceMethods);

    this.environment.assign(stmt.name, _class);
  }

  public visitFunctionStmt(stmt: AST.FunctionStmt): void {
    const env = !stmt.isStatic || stmt.name.lexeme === 'init'
      ? this.environment
      : this.environment.copyWithoutThis();

    const func = new TFunction(stmt, env, false);

    this.environment.define(stmt.name.lexeme, func);
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public visitBreakStmt(stmt: AST.BreakStmt): void {
    throw new Break();
  }

  public visitWhileStmt(stmt: AST.WhileStmt): void {
    while (this.isTruthly(this.evaluate(stmt.condition))) {
      try {
        this.execute(stmt.body);
      } catch (err) {
        if (err instanceof Break) {
          break;
        } else {
          throw err; // rethrow
        }
      }
    }
  }

  public visitAssignExpr(expr: AST.AssignExpr): unknown {
    const value = this.evaluate(expr.value);

    const distance = this.locals.get(expr);

    if (_.isUndefined(distance)) {
      this.globals.assign(expr.name, value);
    } else {
      this.environment.assignAt(distance, expr.name, value);
    }

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
          return !this.isEqual(Number(left), Number(right));
        } else if (this.checkOperandsType(left, right, (val) => _.isString(val))) {
          return !this.isEqual(String(left), String(right));
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

  public visitGetExpr(expr: AST.GetExpr): unknown {
    const obj = this.evaluate(expr.object);

    if (obj instanceof TInstance) {
      return obj.get(expr.name);
    }

    throw new RuntimeError(
      expr.name,
      'Only instances can have properties',
    );
  }

  public visitSetExpr(expr: AST.SetExpr): void {
    const obj = this.evaluate(expr.object);

    if (!(obj instanceof TInstance)) {
      throw new RuntimeError(
        expr.name,
        'Only instances can fields',
      );
    }

    const value = this.evaluate(expr.value);

    obj.set(expr.name, value);
  }

  public visitThisExpr(expr: AST.ThisExpr): unknown {
    return this.lookUpVariable(expr.keyword, expr);
  }

  public visitCallExpr(expr: AST.CallExpr): unknown {
    const callee = this.evaluate(expr.callee);

    const args = expr.args.map(arg => {
      return this.evaluate(arg);
    });

    // if (!(callee instanceof ICallable)) {
    //   throw new RuntimeError(expr.paren,
    //       'Can only call functions and classes.');
    // }

    const func: ICallable = <ICallable>(callee);

    if (args.length !== func.arity()) {
      throw new RuntimeError(
        expr.paren,
        `Expected ${func.arity()} arguments, but got ${args.length}.`,
      );
    }

    return func.call(this, args);
  }

  public visitReturnStmt(stmt: AST.ReturnStmt): unknown {
    const value = _.isNull(stmt.value)
      ? null
      : this.evaluate(stmt.value);

    throw new Return(value);
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public visitNoOpExpr(expr: AST.NoOpExpr): unknown {
    return null;
  }

  public visitGroupingExpr(expr: AST.GroupingExpr): unknown{
    return this.evaluate(expr.expression);
  }

  public visitVariableExpr(expr: AST.VariableExpr): unknown {
    return this.lookUpVariable(expr.name, expr);
  }

  public visitLambdaExpr(expr: AST.LambdaExpr): unknown {
    const func = new TLambda(expr, this.environment);

    if (!_.isNull(expr.name)) {
      this.environment.define(expr.name.lexeme, func);
    }

    return func;
  }
}
