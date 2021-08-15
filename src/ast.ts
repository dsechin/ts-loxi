import {Token} from './token';

/* EXPRESSIONS */
export abstract class Expr {
  abstract accept<T>(visitor: ExprVisitor<T>): T;
}

export interface ExprVisitor<T> {
  visitAssignExpr(expr: AssignExpr): T;
  visitTernaryExpr(expr: TernaryExpr): T;
  visitBinaryExpr(expr: BinaryExpr): T;
  visitCallExpr(expr: CallExpr): T;
  visitGroupingExpr(expr: GroupingExpr): T;
  visitLiteralExpr(expr: LiteralExpr): T;
  visitLogicalExpr(expr: LogicalExpr): T;
  visitUnaryExpr(expr: UnaryExpr): T;
  visitVariableExpr(expr: VariableExpr): T;
  visitNoOpExpr(expr: NoOpExpr): T;
}

export class AssignExpr extends Expr {
  constructor(
    public name: Token,
    public value: Expr,
  ) {
    super();
  }

  accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitAssignExpr(this);
  }
}

export class TernaryExpr extends Expr {
  constructor(
    public condition: Expr,
    public truthly: Expr,
    public falsey: Expr,
  ) {
    super();
  }

  accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitTernaryExpr(this);
  }
}

export class BinaryExpr extends Expr {
  constructor(
    public left: Expr,
    public operator: Token,
    public right: Expr,
  ) {
    super();
  }

  accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitBinaryExpr(this);
  }
}

export class CallExpr extends Expr {
  constructor(
    public callee: Expr,
    public paren: Token,
    public args: Expr[],
  ) {
    super();
  }

  accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitCallExpr(this);
  }
}

export class GroupingExpr extends Expr {
  constructor(
    public expression: Expr,
  ) {
    super();
  }

  accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitGroupingExpr(this);
  }
}

export class LiteralExpr extends Expr {
  constructor(
    public value: unknown,
  ) {
    super();
  }

  accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitLiteralExpr(this);
  }
}

export class LogicalExpr extends Expr {
  constructor(
    public left: Expr,
    public operator: Token,
    public right: Expr,
  ) {
    super();
  }

  accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitLogicalExpr(this);
  }
}

export class UnaryExpr extends Expr {
  constructor(
    public operator: Token,
    public right: Expr,
  ) {
    super();
  }

  accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitUnaryExpr(this);
  }
}

export class VariableExpr extends Expr {
  constructor(
    public name: Token,
  ) {
    super();
  }

  accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitVariableExpr(this);
  }
}

export class NoOpExpr extends Expr {
  constructor() {
    super();
  }

  accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitNoOpExpr(this);
  }
}


/* STATEMENTS */
export abstract class Stmt {
  abstract accept<T>(visitor: StmtVisitor<T>): T;
}

export interface StmtVisitor<T> {
  visitBlockStmt(expr: BlockStmt): T;
  visitExpressionStmt(expr: ExpressionStmt): T;
  visitFunctionStmt(expr: FunctionStmt): T;
  visitIfStmt(expr: IfStmt): T;
  visitWhileStmt(expr: WhileStmt): T;
  visitBreakStmt(expr: BreakStmt): T;
  visitPrintStmt(expr: PrintStmt): T;
  visitReturnStmt(expr: ReturnStmt): T;
  visitVarStmt(expr: VarStmt): T;
}

export class BlockStmt extends Stmt {
  constructor(
    public statements: Stmt[],
  ) {
    super();
  }

  accept<T>(visitor: StmtVisitor<T>): T {
    return visitor.visitBlockStmt(this);
  }
}

export class ExpressionStmt extends Stmt {
  constructor(
    public expression: Expr,
  ) {
    super();
  }

  accept<T>(visitor: StmtVisitor<T>): T {
    return visitor.visitExpressionStmt(this);
  }
}

export class FunctionStmt extends Stmt {
  constructor(
    public name: Token,
    public params: Token[],
    public body: Stmt[],
  ) {
    super();
  }

  accept<T>(visitor: StmtVisitor<T>): T {
    return visitor.visitFunctionStmt(this);
  }
}

export class IfStmt extends Stmt {
  constructor(
    public condition: Expr,
    public thenBranch: Stmt,
    public elseBranch: Stmt | null,
  ) {
    super();
  }

  accept<T>(visitor: StmtVisitor<T>): T {
    return visitor.visitIfStmt(this);
  }
}

export class WhileStmt extends Stmt {
  constructor(
    public condition: Expr,
    public body: Stmt,
  ) {
    super();
  }

  accept<T>(visitor: StmtVisitor<T>): T {
    return visitor.visitWhileStmt(this);
  }
}

export class BreakStmt extends Stmt {
  constructor() {
    super();
  }

  accept<T>(visitor: StmtVisitor<T>): T {
    return visitor.visitBreakStmt(this);
  }
}

export class PrintStmt extends Stmt {
  constructor(
    public expression: Expr,
  ) {
    super();
  }

  accept<T>(visitor: StmtVisitor<T>): T {
    return visitor.visitPrintStmt(this);
  }
}

export class ReturnStmt extends Stmt {
  constructor(
    public keyword: Token,
    public value: Expr | null,
  ) {
    super();
  }

  accept<T>(visitor: StmtVisitor<T>): T {
    return visitor.visitReturnStmt(this);
  }
}

export class VarStmt extends Stmt {
  constructor(
    public name: Token,
    public initializer: Expr,
  ) {
    super();
  }

  accept<T>(visitor: StmtVisitor<T>): T {
    return visitor.visitVarStmt(this);
  }
}

