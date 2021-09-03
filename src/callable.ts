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
    private isInitializer: boolean,
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
        if (this.isInitializer) {
          return this.closure.getThis();
        }

        return err.value;
      } else {
        throw err; // rethrow
      }
    }

    // explicit call to an instance 'init' method always returns the same instance
    if (this.isInitializer) {
      return this.closure.getThis();
    }

    return null;
  }

  public bind(self: TInstance): TFunction {
    const env = new Environment(this.closure);

    env.define('this', self);

    return new TFunction(this.declaration, env, this.isInitializer);
  }

  public arity(): number {
    return this.declaration.params.length;
  }

  public toString(): string {
    return `<fn "${this.declaration.name.lexeme}">`;
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
      return `<lambda "${this.declaration.name.lexeme}">`;
    } else {
      return '<lambda>';
    }
  }
}

export type TMethodMap = Map<string, TFunction>;
export class TClassBase {
  constructor(
    public readonly name: string,
    public readonly methods: TMethodMap,
  ) {
  }

  public findMethod(name: string): TFunction | null {
    return this.methods.get(name) || null;
  }
}

export class TMetaClass extends TClassBase {
  public readonly name: string;

  constructor(
    public readonly nameToken: Token,
    public readonly methods: TMethodMap,
  ) {
    super(nameToken.lexeme, methods);

    this.name = nameToken.lexeme;
  }
}

export class TInstance {
  private fields: Record<string, unknown> = {};

  constructor(
    private _class: TClassBase,
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
    return `<instance "${this._class.name}">`;
  }
}

export class TClass extends TInstance implements ICallable {
  public readonly name: string;

  constructor(
    private readonly nameToken: Token,
    private readonly metaclass: TMetaClass,
    public readonly methods: TMethodMap,
  ) {
    super(metaclass);

    this.name = nameToken.lexeme;
  }

  public call(interpreter: Interpreter, args: unknown[]): unknown {
    const instance = new TInstance(this);
    const initializer = this.findMethod('init'); // constructor (if defined)

    if (!_.isNull(initializer)) {
      initializer.bind(instance).call(interpreter, args);
    }

    return instance;
  }

  public findMethod(name: string): TFunction | null {
    return this.methods.get(name) || null;
  }

  public arity(): number {
    const initializer = this.findMethod('init');

    return _.isNull(initializer)
      ? 0
      : initializer.arity();
  }

  public toString(): string {
    return `<class "${this.name}">`;
  }
}
