import * as fs from 'fs';
import * as path from 'path';
import {generateAstClasses} from './ast-utils';

const exprSubclasses = generateAstClasses(
  [
    'Assign   -> name: Token, value : Expr',
    'Ternary  -> condition : Expr, truthly : Expr, falsey : Expr',
    'Binary   -> left : Expr, operator : Token, right : Expr',
    'Call     -> callee : Expr, paren: Token, args : Expr[]',
    'Grouping -> expression : Expr',
    'Literal  -> value : unknown',
    'Logical  -> left : Expr, operator : Token, right : Expr',
    'Unary    -> operator : Token, right : Expr',
    'Variable -> name : Token',
    'NoOp     -> ',
  ],
  'Expr',
);

const stmtSubclasses = generateAstClasses(
  [
    'Block      -> statements : Stmt[]',
    'Expression -> expression : Expr',
    'Function   -> name : Token, params : Token[], body : Stmt[]',
    'If         -> condition : Expr, thenBranch : Stmt, elseBranch : Stmt | null',
    'While      -> condition : Expr, body : Stmt',
    'Break      -> ',
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
