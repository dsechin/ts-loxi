import _ from 'lodash';
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

export const errCount = {
  scanner: 0,
  parser: 0,
  resolver: 0,
  runtime: 0,
};

export const reportScannerError = (line: number, message: string): void => {
  report(line, '', message);

  errCount.scanner++;
};

export const reportParserError = (token: Token, message: string): void => {
  if (token.type === TokenType.EOF) {
    report(token.line, ' at end', message);
  } else {
    report(token.line, ` at '${token.lexeme}'`, message);
  }

  errCount.parser++;
};

export const reportResolverError = (token: Token, message: string): void => {
  report(token.line, ` at '${token.lexeme}'`, message);

  errCount.resolver++;
};

export const reportRuntimeError = (error: RuntimeError): void => {
  const {token} = error;

  if (!_.isNull(token)) {
    report(token.line, ` at '${token.lexeme}'`, error.message);
  }

  errCount.runtime++;
};

export const report = (
  line: number,
  where: string,
  message: string,
): void => {
  const errMsg = `[line ${line}] Error ${where}: ${message}`;

  console.log(errMsg);
};
