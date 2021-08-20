import {ICallable} from './callable';
import {Interpreter} from './interpreter';

export class Clock implements ICallable {
    public arity(): number {
        return 0;
    }

    public call(interpreter: Interpreter, args: unknown[]): unknown {
        return new Date().getTime() / 1000.0;
    }

    public toString() {
        return '<native function>';
    }
}

export class Str implements ICallable {
    public arity(): number {
        return 1;
    }

    public call(interpreter: Interpreter, args: unknown[]): unknown {
        return String(args[0]);
    }

    public toString() {
        return '<native function>';
    }
}
