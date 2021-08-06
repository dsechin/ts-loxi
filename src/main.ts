#!/usr/bin/env node
import * as fs from 'fs';
import * as readline from 'readline';
import yargs from 'yargs/yargs';
import * as _ from 'lodash';
import {run} from './scanner';

const argv = yargs(process.argv.slice(2))
  .usage('$0 [script]')
  .options({
    script: {type: 'string', demandOption: false},
  })
  .argv;

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
