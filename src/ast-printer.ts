import _ from 'lodash';
import * as AST from './ast';

export class AstPrinter implements AST.ExprVisitor<string> {
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

  public visitBinaryExpr(expr: AST.BinaryExpr): string {
    return this.parenthesize(
      expr.operator.lexeme,
      expr.left,
      expr.right,
    );
  }

  public visitAssignExpr(expr: AST.AssignExpr): string {
    return `[[${expr.name.lexeme} <- ${expr.value.accept(this)}]]`;
  }

  public visitCallExpr(expr: AST.CallExpr): string {
    const argsStr: string = expr.args
      .map(arg => arg.accept(this))
      .join(',');

    return `call <${expr.callee.accept(this)}> (${argsStr})`;
  }

  public visitLogicalExpr(expr: AST.LogicalExpr): string {
    const binaryStr = this.parenthesize(
      expr.operator.lexeme,
      expr.left,
      expr.right,
    );

    return `TF ${binaryStr}`;
  }

  public visitVariableExpr(expr: AST.VariableExpr): string {
    return `VAR ${expr.name.lexeme}`;
  }

  public visitTernaryExpr(expr: AST.TernaryExpr): string {
    const chunks: string[] = [
      expr.condition.accept(this),
      `? ${expr.truthly.accept(this)}`,
      `: ${expr.falsey.accept(this)}`,
    ];

    return `( ${chunks.join(' ')} )`;
  }

  public visitUnaryExpr(expr: AST.BinaryExpr): string {
    return this.parenthesize(
      expr.operator.lexeme,
      expr.right,
    );
  }

  public visitLiteralExpr(expr: AST.LiteralExpr): string {
    if (_.isNull(expr.value)) {
      return 'nil';
    }

    return String(expr.value);
  }

  public visitNoOpExpr(expr: AST.NoOpExpr): string {
    return '';
  }

  public visitGroupingExpr(expr: AST.GroupingExpr): string {
    return this.parenthesize('group', expr.expression);
  }
}
