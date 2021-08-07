import * as fs from 'fs';
import * as path from 'path';
import {generateAstClasses} from './ast-utils';

const exprSubclasses = generateAstClasses([
  'Binary   -> left : Expr, operator : Token, right : Expr',
  'Grouping -> expression: Expr',
  'Literal  -> value : unknown',
  'Unary    -> operator : Token, right : Expr',
  'NoOp     -> ',
]);

const fullFile = `
import {Token} from './token';

${exprSubclasses}
`;

const fullPath = path.join(__dirname, 'ast.ts');

fs.writeFileSync(fullPath, fullFile.trimStart());
