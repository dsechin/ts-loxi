import {Token, TokenType} from './token';

export class ParseError extends Error {
  constructor(
    public token: Token,
    public message: string,
  ) {
    super(message);
  }
}
export class RuntimeError extends Error {
  constructor(
    public token: Token | null,
    public message: string,
  ) {
    super(message);
  }
}

export class Break extends Error {}

export class Return extends RuntimeError {
  constructor(
    public value: unknown,
  ) {
    super(null, '');
  }
}

export const reportScannerError = (line: number, message: string): void => {
  report(line, '', message);
};

export const reportParserError = (token: Token, message: string) => {
  if (token.type === TokenType.EOF) {
    report(token.line, ' at end', message);
  } else {
    report(token.line, ` at '${token.lexeme}'`, message);
  }
};

export const reportRuntimeError = (error: RuntimeError) => {
  const {token} = error;

  report(token.line, ` at '${token.lexeme}'`, error.message);
};

export const report = (
  line: number,
  where: string,
  message: string,
): void => {
  const errMsg = `[line ${line}] Error ${where}: ${message}`;

  console.log(errMsg);
};
