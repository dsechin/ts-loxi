#!/usr/bin/env node
import * as fs from 'fs';
import * as readline from 'readline';
import yargs from 'yargs/yargs';
import * as _ from 'lodash';
import {Scanner} from './scanner';
import {Parser} from './parser';
import {AstPrinter} from './ast-printer';
import {Interpreter} from './interpreter';
import {RuntimeError} from './error';

const argv = yargs(process.argv.slice(2))
  .usage('$0 [script]')
  .options({
    script: {type: 'string', demandOption: false},
  })
  .argv;

const run = (source: string): void => {
  const scanner = new Scanner(source);
  const tokens = scanner.scanTokens();

  const parser = new Parser(tokens);
  const expression = parser.parse();

  // Stop if there was a syntax error.
  if (!expression) {
    return;
  }

  console.log(new AstPrinter().print(expression));

  const interpreter = new Interpreter();

  interpreter.interpret(expression);
};

const runFile = (path: string) => {
  if (!fs.existsSync(path) || !fs.statSync(path).isFile) {
    console.log(`Passed script "${path}" does not exist or is not a file`);
    process.exit(-1);
  }

  run(fs.readFileSync(path, {encoding: 'utf-8'}));
};

const runPrompt = () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const readSingleLine = () => {
    rl.question('> ', (line) => {
      if (line === 'exit') {
        return rl.close();
      }

      run(line);
      readSingleLine();
    });
  };

  readSingleLine();
};

if (_.has(argv, 'script')) {
  runFile(_.get(argv, 'script', ''));
} else {
  runPrompt();
}
