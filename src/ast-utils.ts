const INDENT = '  ';

const splitByAndTrim = (s: string, sep: string) => {
  return s.split(sep).map((c: string) => c.trim());
};

const getVisitMethodName = (className: string): string => {
  return `visit${className}Expr`;
};

const getExprDecl = (): string => {
  const exprDecl = `
export abstract class Expr {
  abstract accept<T>(visitor: Visitor<T>): T;
}`;

  return exprDecl.trim();
};

const getVisitorDecl = (subclassesList: string[]): string => {
  const visitMethods = subclassesList
    .map((className) => `${getVisitMethodName(className)}(expr: Expr): T;`);

  const visitorDecl = `
export interface Visitor<T> {
  ${visitMethods.join('\n' + INDENT)}
}`;

  return visitorDecl.trim();
};

const generateExprSubclass = (
  className: string,
  args: Record<string, string>,
): string => {
  const constructorArgs = Object.keys(args)
    .map(key => `public ${key}: ${args[key]},`)
    .join('\n' + INDENT + INDENT);

  const argsDecl = constructorArgs !== ''
    ? `\n${INDENT}${INDENT}${constructorArgs}\n${INDENT}`
    : '';

  const classDecl = `
export class ${className}Expr extends Expr {
  constructor(${argsDecl}) {
    super();
  }

  accept<T>(visitor: Visitor<T>): T {
    return visitor.${getVisitMethodName(className)}(this);
  }
}`;

  return classDecl.trim();
};

export const generateAstClasses = (grammar: string[]): string => {
  const subclassNames = grammar.map(line => line.split('->')[0].trim());

  const subclasses = grammar
    .map(line => {
      const [className, params] = splitByAndTrim(line, '->');

      const paramsDict = params
        .split(',')
        .filter(Boolean)
        .reduce<Record<string, string>>(
          (acc, chunk) => {
            const [name, type] = splitByAndTrim(chunk, ':');

            return {
              ...acc,
              [name]: type,
            };
          },
          {},
        );

        return generateExprSubclass(className, paramsDict);
    })
    .join('\n\n');

  const declarations = [
    getExprDecl(),
    getVisitorDecl(subclassNames),
    subclasses,
  ].join('\n\n');

  return declarations + '\n';
};
