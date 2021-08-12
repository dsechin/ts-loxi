import {RuntimeError} from './error';
import {Token} from './token';

export class Environment {
  private values: Record<string, unknown> = {};

  constructor() {}

  public define(name: string, value: unknown): void {
    this.values[name] = value;
  }

  public get(name: Token): unknown {
    if (Object.keys(this.values).includes(name.lexeme)) {
      return this.values[name.lexeme];
    }

    throw new RuntimeError(
      name,
      `Undefined variable '${name.lexeme}'.`,
    );
  }
}
