import * as U from './IndexUtil';
import * as repl from 'repl';
import { createInterface } from 'readline';
import Modules from './modules';
import { Operation, FileIteratorCallback } from './types';
import ENV from './ENV';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});
let r: repl.REPLServer;


function evall(func: Function) {
  return (args: string) => {
    const argsArray = 
      args
        .split(',,')
        .map(arg => eval(arg));
    func(...argsArray);
    r.clearBufferedCommand(); /// Doesn't seem to do much
  };
}

function startRepl() {
  r = repl.start();

  // TODO: for setters, console.log the new value afterwards
  r.defineCommand('cd', {
    help: 'change current directory',
    action: (newFolderName) => U.changeDirectory(newFolderName),
  })
  r.defineCommand('set-depth', {
    help: 'set recursion depth for deep functions to {$1: number}',
    action: (newDepth: string) => U.setEnvVar('recursionDepth', Number(newDepth)),
  });
  r.defineCommand('toggle-mm', {
    help: 'toggle access to music metadata',
    action: () => U.setEnvVar('musicMetadata', !ENV.musicMetadata),
  });
  Object.keys(ENV).forEach((key) => {
    r.defineCommand(key, {
      help: `print current value of ${key}`,
      action: () => console.log(ENV[key]),
    })
  });
  
  r.defineCommand('fee', {
    help: 'for every entry in folder execute callback {$1: (folder: string (irrelevant), entry: Dirent) => void}',
    action: evall((callback: FileIteratorCallback) => U.forEveryEntry(ENV.folder, callback)),
  });
  r.defineCommand('fee-deep', {
    help: 'for every entry in folder execute callback {$1: (folder: string (irrelevant), entry: Dirent) => void} - does this recursively until the set depth',
    action: evall((callback: FileIteratorCallback) => U.forEveryEntryDeep(ENV.folder, callback)),
  });

  Modules.forEach((mod) => {
    mod.forEach((op: Operation) => {
      r.defineCommand(op.abbrev, {
        help: `${op.help}`,
        action: evall(op.run),
      });
    });
  });
}

rl.question('What folder\n', (answer) => {
  U.changeDirectory(answer);
  rl.close();

  startRepl();
});
