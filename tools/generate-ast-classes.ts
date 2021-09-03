import * as fs from 'fs';
import * as path from 'path';
import {generateAstClasses} from './ast-utils';

const exprSubclasses = generateAstClasses(
  [
    'Assign   -> name: Token, value : Expr',
    'Ternary  -> condition : Expr, truthly : Expr, falsey : Expr',
    'Binary   -> left : Expr, operator : Token, right : Expr',
    'Call     -> callee : Expr, paren: Token, args : Expr[]',
    'Get      -> object : Expr, name : Token',
    'Grouping -> expression : Expr',
    'Literal  -> value : unknown',
    'Logical  -> left : Expr, operator : Token, right : Expr',
    'Set      -> object : Expr, name : Token, value : Expr',
    'This     -> keyword : Token',
    'Unary    -> operator : Token, right : Expr',
    'Variable -> name : Token',
    'Lambda   -> name : Token | null, params : Token[], body : Stmt[]',
    'NoOp     -> ',
  ],
  'Expr',
);

const stmtSubclasses = generateAstClasses(
  [
    'Block      -> statements : Stmt[]',
    'Class      -> name : Token, methods : FunctionStmt[]',
    'Expression -> expression : Expr',
    'Function   -> name : Token, params : Token[], body : Stmt[], isStatic : boolean',
    'If         -> condition : Expr, thenBranch : Stmt, elseBranch : Stmt | null',
    'While      -> condition : Expr, body : Stmt',
    'Break      -> ',
    'Print      -> expression : Expr',
    'Return     -> keyword : Token, value : Expr | null',
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
