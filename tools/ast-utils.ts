const INDENT = '  ';

const splitAndTrim = (s: string, sep: string): string[] => {
  return s.split(sep).map((c: string) => c.trim());
};

const getVisitMethodName = (
  className: string,
  baseClass: string,
): string => {
  return `visit${className}${baseClass}`;
};

const getBaseClassDecl = (baseClass: string): string => {
  const exprDecl = `
export abstract class ${baseClass} {
  abstract accept<T>(visitor: Visitor<T>): T;
}`;

  return exprDecl.trim();
};

const getVisitorDecl = (
  subclassesList: string[],
  baseClass: string,
): string => {
  const visitMethods = subclassesList
    .map((className) => {
      const argType = `${className}${baseClass}`;
      const methodName = getVisitMethodName(className, baseClass);

      return `${methodName}(expr: ${argType}): T;`;
    });

  const visitorDecl = `
export interface Visitor<T> {
  ${visitMethods.join('\n' + INDENT)}
}`;

  return visitorDecl.trim();
};

const generateExprSubclass = (
  className: string,
  baseClass: string,
  args: Record<string, string>,
): string => {
  const constructorArgs = Object.keys(args)
    .map(key => `public ${key}: ${args[key]},`)
    .join('\n' + INDENT + INDENT);

  const argsDecl = constructorArgs !== ''
    ? `\n${INDENT}${INDENT}${constructorArgs}\n${INDENT}`
    : '';

  const classDecl = `
export class ${className}${baseClass} extends ${baseClass} {
  constructor(${argsDecl}) {
    super();
  }

  accept<T>(visitor: Visitor<T>): T {
    return visitor.${getVisitMethodName(className, baseClass)}(this);
  }
}`;

  return classDecl.trim();
};

export const generateAstClasses = (
  grammar: string[],
  baseClass: string,
): string => {
  const subclassNames = grammar.map(line => line.split('->')[0].trim());

  const subclasses = grammar
    .map(line => {
      const [className, params] = splitAndTrim(line, '->');

      const paramsDict = params
        .split(',')
        .filter(Boolean)
        .reduce<Record<string, string>>(
          (acc, chunk) => {
            const [name, type] = splitAndTrim(chunk, ':');

            return {
              ...acc,
              [name]: type,
            };
          },
          {},
        );

        return generateExprSubclass(className, baseClass, paramsDict);
    })
    .join('\n\n');

  const declarations = [
    getBaseClassDecl(baseClass),
    getVisitorDecl(subclassNames, baseClass),
    subclasses,
  ].join('\n\n');

  return declarations + '\n';
};
