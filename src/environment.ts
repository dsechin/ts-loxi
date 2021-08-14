import _ from 'lodash';
import {RuntimeError} from './error';
import {Token} from './token';

export class Environment {
  private values: Record<string, unknown> = {};

  constructor(
    private enclosing: Environment | null = null,
  ) {}

  private throwUndefinedVariableError(name: Token): void {
    throw new RuntimeError(
      name,
      `Undefined variable '${name.lexeme}'.`,
    );
  }

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

    this.throwUndefinedVariableError(name);
  }

  public get(name: Token): unknown {
    if (this.isDefined(name.lexeme)) {
      const value = this.values[name.lexeme];

      if (_.isUndefined(value)) {
        throw new RuntimeError(
          name,
          `No value assigned to the '${name.lexeme}' variable.`,
        );
      } else {
        return value;
      }
    }

    if (!_.isNull(this.enclosing)) {
      return this.enclosing.get(name);
    }

    this.throwUndefinedVariableError(name);
  }
}