import {Token, TokenType} from './token';

export class ParseError extends Error {
  constructor(
    public token: Token,
    public message: string,
  ) {
    super(message);
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

export const report = (
  line: number,
  where: string,
  message: string,
): void => {
  const errMsg = `[line ${line}] Error ${where}: ${message}`;

  process.stderr.write(errMsg);
};
