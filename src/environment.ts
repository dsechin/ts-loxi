import _ from 'lodash';
import {RuntimeError} from './error';
import {Token} from './token';

export class Environment {
  private values: Record<string, unknown> = {};

  constructor(
    private enclosing: Environment | null = null,
  ) {}

  private isDefined(name: string): boolean {
    return Object.keys(this.values).includes(name);
  }

  public define(name: string, value: unknown): void {
    this.values[name] = value;
  }

  public assign(name: Token, value: unknown): void {
    if (this.isDefined(name.lexeme)) {
      this.values[name.lexeme] = value;

      return;
    }

    if (!_.isNull(this.enclosing)) {
      this.enclosing.assign(name, value);

      return;
    }

    throw new RuntimeError(
      name,
      `Undefined variable '${name.lexeme}'.`,
    );
  }

  public get(name: Token): unknown {
    if (this.isDefined(name.lexeme)) {
      return this.values[name.lexeme];
    }

    if (!_.isNull(this.enclosing)) {
      return this.enclosing.get(name);
    }

    throw new RuntimeError(
      name,
      `Undefined variable '${name.lexeme}'.`,
    );
  }
}
