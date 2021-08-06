export const error = (line: number, message: string): void => {
  report(line, '', message);
};

export const report = (
  line: number,
  where: string,
  message: string,
): void => {
  const errMsg = `[line ${line}] Error ${where}: ${message}`;

  process.stderr.write(errMsg);
};
