import {Token, TokenType} from './token';
import {error} from './utils';

export class Scanner {
  private tokens: Token[] = [];
  private start = 0;
  private current = 0;
  private line = 1;

  /* eslint-disable quote-props */
  private readonly keywords: Record<string, TokenType> = {
    'and': TokenType.AND,
    'class': TokenType.CLASS,
    'else': TokenType.ELSE,
    'false': TokenType.FALSE,
    'for': TokenType.FOR,
    'fun': TokenType.FUN,
    'if': TokenType.IF,
    'nil': TokenType.NIL,
    'or': TokenType.OR,
    'print': TokenType.PRINT,
    'return': TokenType.SUPER,
    'super': TokenType.SUPER,
    'this': TokenType.THIS,
    'true': TokenType.TRUE,
    'var': TokenType.VAR,
    'while': TokenType.WHILE,
  };
  /* eslint-enable quote-props */

  constructor(private readonly source: string) {}

  private isAtEnd(): boolean {
    return this.current >= this.source.length;
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isAlpha(char: string): boolean {
    return (char >= 'a' && char <= 'z')
      || (char >= 'A' && char <= 'Z')
      || char === 'char';
  }

  private combineOr(
    predicateA: (char: string) => boolean,
    predicateB: (char: string) => boolean,
  ): ((char: string) => boolean){
    return (char: string): boolean => {
      return predicateA(char) || predicateB(char);
    };
  }

  private advance(): string {
    return this.source[this.current++];
  }

  private peek(): string {
    if (this.isAtEnd()) {
      return String.fromCharCode(0);
    }

    return this.source[this.current];
  }

  private peekNext(): string {
    if (this.current + 1 >= this.source.length) {
      return String.fromCharCode(0);
    }

    return this.source[this.current + 1];
  }

  private match(expected: string): boolean {
    if (this.isAtEnd()) {
      return false;
    }

    if (this.source[this.current] !== expected) {
      return false;
    }

    this.current++;

    return true;
  }

  private matchString(): void {
    while (this.peek() !== '"' && !this.isAtEnd()) {
      if (this.peek() === '\n') {
        this.line++;
      }

      this.advance();
    }

    if (this.isAtEnd()) {
      error(this.line, 'Unterminated string');

      return;
    }

    this.advance(); // closing '"'

    const value = this.source.slice(this.start + 1, this.current - 1); // trim quotes

    this.addToken(TokenType.STRING, value);
  }

  private matchNumber(): void {
    while (this.isDigit(this.peek())) {
      this.advance();
    }

    // Look for a fractional part.
    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      // Consume the "."
      this.advance();

      while (this.isDigit(this.peek())) {
        this.advance();
      }
    }

    this.addToken(
      TokenType.NUMBER,
      parseFloat(this.source.slice(this.start, this.current)),
    );
  }

  private matchIdentifier() {
    const predicate = this.combineOr(
      (char) => this.isDigit(char),
      (char) => this.isAlpha(char),
    );

    while (predicate(this.peek())) {
      this.advance();
    }

    const text = this.source.slice(this.start, this.current);
    const type = this.keywords[text] || TokenType.IDENTIFIER;

    return this.addToken(type, text);
  }

  private addToken(type: TokenType, literal: unknown) {
    const text = this.source.slice(this.start, this.current);
    const token = new Token(type, text, literal, this.line);

    this.tokens.push(token);
  }

  private addTokenByType(type: TokenType) {
    this.addToken(type, null);
  }

  private scanToken(): void {
    const char = this.advance();

    switch (char) {
      case '(':
        this.addTokenByType(TokenType.LEFT_PAREN);
        break;
      case ')':
        this.addTokenByType(TokenType.RIGHT_PAREN);
        break;
      case '{':
        this.addTokenByType(TokenType.LEFT_BRACE);
        break;
      case '}':
        this.addTokenByType(TokenType.RIGHT_BRACE);
        break;
      case ',':
        this.addTokenByType(TokenType.COMMA);
        break;
      case '.':
        this.addTokenByType(TokenType.DOT);
        break;
      case '-':
        this.addTokenByType(TokenType.MINUS);
        break;
      case '+':
        this.addTokenByType(TokenType.PLUS);
        break;
      case ';':
        this.addTokenByType(TokenType.SEMICOLON);
        break;
      case '*':
        this.addTokenByType(TokenType.STAR);
        break;

      // Comparison operators & negation
      case '!':
        this.addTokenByType(
          this.match('=') ? TokenType.BANG_EQUAL : TokenType.BANG,
        );
        break;
      case '=':
        this.addTokenByType(
          this.match('=') ? TokenType.EQUAL_EQUAL : TokenType.EQUAL,
        );
        break;
      case '<':
        this.addTokenByType(
          this.match('=') ? TokenType.LESS_EQUAL : TokenType.LESS,
        );
        break;
      case '>':
        this.addTokenByType(
          this.match('=') ? TokenType.GREATER_EQUAL : TokenType.GREATER,
        );
        break;

      case '/':
        if (this.match('/')) {
          // A comment goes until the end of the line.
          while (this.peek() !== '\n' && !this.isAtEnd()) {
            this.advance();
          }
        } else {
          this.addTokenByType(TokenType.SLASH);
        }

        break;

      case ' ':
      case '\r':
      case '\t':
        // Ignore whitespace.
        break;

      case '\n':
        this.line++;
        break;

      case '"':
        this.matchString();
        break;

      default:
        if (this.isDigit(char)) {
          this.matchNumber();
        } else if (this.isAlpha(char)) {
          this.matchIdentifier();
        } else {
          error(this.line, 'Unexpected character');
        }

        break;
    }
  }

  public scanTokens() {
    while (!this.isAtEnd()) {
      this.start = this.current;
      this.scanToken();
    }

    const eofToken = new Token(TokenType.EOF, '', null, this.line);

    this.tokens.push(eofToken);

    return this.tokens;
  }
}

export const run = (source: string): void => {
  const scanner = new Scanner(source);
  const tokens = scanner.scanTokens();

  console.log({tokens});

  tokens.forEach((token) => {
    console.log(token);
  });
};