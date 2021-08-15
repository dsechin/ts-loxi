import * as AST from './ast';
import {Environment} from './environment';
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

        interpreter.executeBlock(this.declaration.body, environment);

        return null;
    }

    public arity(): number {
        return this.declaration.params.length;
    }

    public toString(): string {
        return `<fn ${this.declaration.name.lexeme} >`;
      }
}
