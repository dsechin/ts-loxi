#!/usr/bin/env node
import * as fs from 'fs';
import * as readline from 'readline';
import yargs from 'yargs/yargs';
import * as _ from 'lodash';
import {Scanner} from './scanner';
import {Parser} from './parser';
import {Interpreter} from './interpreter';
import {Resolver} from './resolver';
import {errCount} from './error';

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
  const statements = parser.parse();

  if (errCount.scanner > 0 || errCount.parser > 0) {
    console.warn('\n--- Scanner or parser error ---\n');

    return;
  }

  const interpreter = new Interpreter();
  const resolver = new Resolver(interpreter);

  resolver.resolve(statements);

  if (errCount.resolver > 0) {
    console.warn('\n--- Resolver error ---\n');

    return;
  }

  interpreter.interpret(statements);
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
