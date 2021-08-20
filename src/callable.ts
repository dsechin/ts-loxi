import _ from 'lodash';
import * as AST from './ast';
import {Environment} from './environment';
import {Return} from './error';
import {Interpreter} from './interpreter';

export interface ICallable {
  arity(): number;
  call(interpreter: Interpreter, args: unknown[]): unknown;
}

export class TFunction implements ICallable {
  constructor(
    private declaration: AST.FunctionStmt,
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
