import _ from 'lodash';
import {BinaryExpr, Expr, GroupingExpr, LiteralExpr, NoOpExpr, Visitor} from './ast';

export class AstPrinter implements Visitor<string> {
  private parenthesize(name: string, ...exprs: Expr[]): string {
    const exprStrings = exprs
      .map(expr => {
        return ` ${expr.accept(this)}`;
      });

    return `(${name} ${exprStrings})`;
  }

  public print(expr: Expr): string {
    return expr.accept(this);
  }

  public visitBinaryExpr(expr: BinaryExpr) {
    return this.parenthesize(
      expr.operator.lexeme,
      expr.left,
      expr.right,
    );
  }

  public visitUnaryExpr(expr: BinaryExpr) {
    return this.parenthesize(
      expr.operator.lexeme,
      expr.right,
    );
  }

  public visitLiteralExpr(expr: LiteralExpr) {
    if (_.isNull(expr.value)) {
      return 'nil';
    }

    return String(expr.value);
  }

  public visitNoOpExpr(expr: NoOpExpr) {
    return '';
  }

  public visitGroupingExpr(expr: GroupingExpr) {
    return this.parenthesize('group', expr.expression);
  }
}
