import _ from 'lodash';
import * as AST from './ast';

export class AstPrinter implements AST.Visitor<string> {
  private parenthesize(name: string, ...exprs: AST.Expr[]): string {
    const exprStrings = exprs
      .map(expr => {
        return ` ${expr.accept(this)}`;
      });

    return `(${name} ${exprStrings})`;
  }

  public print(expr: AST.Expr): string {
    return expr.accept(this);
  }

  public visitBinaryExpr(expr: AST.BinaryExpr) {
    return this.parenthesize(
      expr.operator.lexeme,
      expr.left,
      expr.right,
    );
  }

  public visitTernaryExpr(expr: AST.TernaryExpr) {
    const chunks: string[] = [
      expr.condition.accept(this),
      `? ${expr.truthly.accept(this)}`,
      `: ${expr.falsey.accept(this)}`,
    ];

    return `( ${chunks.join(' ')} )`;
  }

  public visitUnaryExpr(expr: AST.BinaryExpr) {
    return this.parenthesize(
      expr.operator.lexeme,
      expr.right,
    );
  }

  public visitLiteralExpr(expr: AST.LiteralExpr) {
    if (_.isNull(expr.value)) {
      return 'nil';
    }

    return String(expr.value);
  }

  public visitNoOpExpr(expr: AST.NoOpExpr) {
    return '';
  }

  public visitGroupingExpr(expr: AST.GroupingExpr) {
    return this.parenthesize('group', expr.expression);
  }
}
