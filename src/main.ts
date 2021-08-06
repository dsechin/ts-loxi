#!/usr/bin/env node
import * as fs from 'fs';
import * as readline from 'readline';
import yargs from 'yargs/yargs';
import * as _ from 'lodash';

const argv = yargs(process.argv.slice(2))
  .usage('$0 [script]')
  .options({
    script: {type: 'string', demandOption: false},
  })
  .argv;

console.log(argv);

const runFile = (path: string) => {
  if (!fs.existsSync(path) || !fs.statSync(path).isFile) {
    console.log(`Passed script "${path}" does not exist or is not a file`);
    process.exit(-1);
  }
};

const runPrompt = () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const readSingleLine = () => {
    rl.question('> ', (answer) => {
      if (answer === 'exit') {
        return rl.close();
      }

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
