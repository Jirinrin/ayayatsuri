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
    try {
      const argsArray = 
        args
          .split(',,')
          .map(arg => eval(arg));
      func(...argsArray);
      r.clearBufferedCommand(); /// Doesn't seem to do much
    } catch (err) {
      console.error('An error occurred:', err);
    }
  };
}

function startRepl() {
  r = repl.start();

  // TODO: for setters, console.log the new value afterwards
  r.defineCommand('cd', {
    help: 'Change current directory',
    action: (newFolderName) => U.changeDirectory(newFolderName),
  });
  r.defineCommand('helpp', {
    help: 'Get help for specific command',
    action: (commandName: string) => U.getCommandHelp(r, commandName),
  });
  r.defineCommand('set-depth', {
    help: 'Set recursion depth for deep functions to {$1: number}',
    action: (newDepth: string) => U.setEnvVar('recursionDepth', Number(newDepth)),
  });
  // r.defineCommand('toggle-mm', {
  //   help: 'toggle access to music metadata',
  //   action: () => U.setEnvVar('musicMetadata', !ENV.musicMetadata),
  // });
  Object.keys(ENV).forEach((key) => {
    r.defineCommand(key, {
      help: `Print current value of ${key}`,
      action: () => console.log(ENV[key]),
    })
  });
  
  r.defineCommand('fee', {
    help: 'For every entry in folder execute callback {$1: (folder: string (irrelevant), entry: Dirent) => void}',
    action: evall((callback: FileIteratorCallback) => U.forEveryEntry(ENV.folder, callback)),
  });
  r.defineCommand('fee-deep', {
    help: 'For every entry in folder execute callback {$1: (folder: string (irrelevant?), entry: Dirent) => void} - does this recursively until the set depth',
    action: evall((callback: FileIteratorCallback) => U.forEveryEntryDeep(ENV.folder, callback)),
  });
  r.defineCommand('e', {
    help: 'Execute (eval) code in the underlying node.js environment',
    action: eval,
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

function setFolderRecursive(repeatTimes: number, rootResolve?: () => void): Promise<void> {
  const triesLeft = repeatTimes - 1;

  return new Promise((res, rej) => {
    try {
      rl.question(`What folder (type nothing to use the current working directory)\n`, (answer) => {
        const resolve = rootResolve || res;

        if (!triesLeft)
          return console.log('Max tries were exceeded. Please set the folder via the .cd command');
        if (U.changeDirectory(answer) || triesLeft <= 0)
          return resolve();
        else if (!answer) {
          console.log('...Never mind that => using cwd');
          U.changeDirectory(process.cwd());
          // U.changeDirectory(path.resolve('.'));
          return resolve();
        }
        return setFolderRecursive(triesLeft, resolve);

      });
    } catch {
      rej();
    }
  });
}

setFolderRecursive(10)
.then(() => {
  rl.close();
  startRepl();
})
.catch(console.error);
