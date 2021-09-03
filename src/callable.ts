import _ from 'lodash';
import * as AST from './ast';
import {Environment} from './environment';
import {Return, RuntimeError} from './error';
import {Interpreter} from './interpreter';
import {Token} from './token';

export interface ICallable {
  arity(): number;
  call(interpreter: Interpreter, args: unknown[]): unknown;
}

export class TFunction implements ICallable {
  constructor(
    private declaration: AST.FunctionStmt,
    private closure: Environment,
  ) {

  }

  public call(interpreter: Interpreter, args: unknown[]): unknown {
    const environment = new Environment(interpreter.globals);
    const {params} = this.declaration;

    for (let i = 0; i < params.length; i++) {
      environment.define(
        params[i].lexeme,
        args[i],
      );
    }

    try {
      interpreter.executeBlock(this.declaration.body, environment);
    } catch (err) {
      if (err instanceof Return) {
        return err.value;
      } else {
        throw err; // rethrow
      }
    }

    return null;
  }

  public bind(self: TInstance): TFunction {
    const env = new Environment(this.closure);

    env.define('this', self);

    return new TFunction(this.declaration, env);
  }

  public arity(): number {
    return this.declaration.params.length;
  }

  public toString(): string {
    return `<fn ${this.declaration.name.lexeme} >`;
  }
}

export class TLambda implements ICallable {
  constructor(
    private declaration: AST.LambdaExpr,
    private closure: Environment,
  ) {

  }

  public call(interpreter: Interpreter, args: unknown[]): unknown {
    const environment = new Environment(this.closure);
    const {params} = this.declaration;

    for (let i = 0; i < params.length; i++) {
      environment.define(
        params[i].lexeme,
        args[i],
      );
    }

    try {
      interpreter.executeBlock(this.declaration.body, environment);
    } catch (err) {
      if (err instanceof Return) {
        return err.value;
      } else {
        throw err; // rethrow
      }
    }

    return null;
  }

  public arity(): number {
    return this.declaration.params.length;
  }

  public toString(): string {
    if (!_.isNull(this.declaration.name)) {
      return `<lambda ${this.declaration.name.lexeme}>`;
    } else {
      return '<lambda>';
    }
  }
}

export type TMethodMap = Map<string, TFunction>;
export class TClass implements ICallable {
  constructor(
    public readonly name: string,
    public readonly methods: TMethodMap,
  ) {

  }

  public call(interpreter: Interpreter, args: unknown[]): unknown {
    const instance = new TInstance(this);

    return instance;
  }

  public findMethod(name: string): TFunction | null {
    return this.methods.get(name) || null;
  }

  public arity(): number {
    return 0;
  }

  public toString(): string {
    return `<class ${this.name} >`;
  }
}

export class TInstance {
  private fields: Record<string, unknown> = {};

  constructor(
    private _class: TClass,
  ) {

  }

  public get(name: Token): unknown {
    if (_.has(this.fields, name.lexeme)) {
      return this.fields[name.lexeme];
    }

    const method = this._class.findMethod(name.lexeme);

    if (!_.isNull(method)) {
      return method.bind(this);
    }

    throw new RuntimeError(
      name,
      `Unknown property "${name}".`,
    );
  }

  public set(name: Token, value: unknown): void {
    this.fields[name.lexeme] = value;
  }

  public toString(): string {
    return `<instance ${this._class.name} >`;
  }
}
