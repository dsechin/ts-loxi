import * as fs from 'fs';
import * as path from 'path';
import {generateAstClasses} from './ast-utils';

const exprSubclasses = generateAstClasses(
  [
    'Ternary  -> condition : Expr, truthly : Expr, falsey : Expr',
    'Binary   -> left : Expr, operator : Token, right : Expr',
    'Grouping -> expression : Expr',
    'Literal  -> value : unknown',
    'Unary    -> operator : Token, right : Expr',
    'Variable -> name : Token',
    'NoOp     -> ',
  ],
  'Expr',
);

const stmtSubclasses = generateAstClasses(
  [
    'Expression -> expression : Expr',
    'Print      -> expression : Expr',
    'Var        -> name : Token, initializer: Expr',
  ],
  'Stmt',
);

const fullFile = `
import {Token} from './token';

/* EXPRESSIONS */
${exprSubclasses}

/* STATEMENTS */
${stmtSubclasses}
`;

const fullPath = path.join(__dirname, '..', 'src', 'ast.ts');

fs.writeFileSync(fullPath, fullFile.trimStart());
