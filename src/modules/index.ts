import minimist = require('minimist');
import { Module, Operation, RawOperationShallowDeep, RawModule, RawOperation, RawOperationSimple, RawOperationCompiled, ActionFunction, ActionFunctionEvall } from '../types';
import { evall, evalls, forEveryEntry, forEveryEntryDeep, getFunctionData } from '../util';
import ENV from '../ENV';

import Rename from './Rename';
import FolderOperations from './FolderOperations';
import Base from './Base';

const rawModules: RawModule[] = [
  Base,
  Rename,
  FolderOperations,
];

function makeShallow(op: RawOperationShallowDeep, info: CommandInfo): ActionFunctionEvall {
  const { paramNames } = getFunctionData(op.getRun(null as any));

  const [actionShallow, actionDeep] = [forEveryEntry, forEveryEntryDeep].map(iter => {
    const output = op.getRun(cb => iter(ENV.cwd, cb));
    output.paramNames = paramNames;
    return evall(output, info);
  });

  return (body, opts) => {
    const run = opts.deep ? actionDeep : actionShallow;
    return run(body, opts);
  };
}

function isShallowDeep(op: RawOperation): op is RawOperationShallowDeep {
  return !!op['getRun'];
}
function isCompiled(op: RawOperation): op is RawOperationCompiled {
  return !!op['run_c'];
}
function isSimp(op: RawOperation): op is RawOperationSimple {
  return !!op['run_s'];
}
function actionIsSimple(op: RawOperation, a: ActionFunction|ActionFunctionEvall): a is ActionFunction {
  return isCompiled(op) || isSimp(op);
}


export interface CommandInfo {
  help: string;
  opts?: string[];
  renderOpts?: string[]; // parallel to opts
  optsValues?: Record<string, string[]>;
  optsAliases?: Record<string, string>;
}
export const cmdInfo: Record<string, CommandInfo> = {};

function getCmdInfo(help: string): CommandInfo {
  const info: CommandInfo = { help };
  help
    .match(/--[\w=|\(\)-]+/g)
    ?.forEach(o => {
      let [_, opt, alias, val] = o.match(/^--([^\(\)=]+)(?:\(-(\w)\))?(?:=(.+))?$/) ?? [];
      if (!_) return;
      (info.opts??=[]).push(opt);
      (info.renderOpts??=[]).push(`--${opt}` + (val ? '=' : ''));
      if (val?.includes('|'))
        (info.optsValues??={})[opt] = val.split('|');
      if (alias)
        (info.optsAliases??={})[alias] = opt;
    });
  return info;
}


function parseArgs(argsString: string, info: CommandInfo): [body: string, opts: Record<string, any>] {
  const opts: Record<string, any> & minimist.ParsedArgs = minimist(argsString.split(' '), {alias: info.optsAliases});
  const body = opts._.join(' ').trim();
  delete opts._;

  return [body, opts];
}


function makeOperation(op: RawOperation, cmdName: string): Operation {
  let help = op.help;
  let action: ActionFunction|ActionFunctionEvall = null;
  if (isShallowDeep(op))
    help += `${help.includes('opts:') ? ',' : ' | opts:'} --deep(-d)`;

  const info = getCmdInfo(help);
  cmdInfo[cmdName] = info;  // side effect yay! Though maybe this whole global object is unnecessary?

  if (isShallowDeep(op)) action = makeShallow(op, info);
  else if (isCompiled(op)) action = op.run_c;
  else action = isSimp(op) ? evalls(op.run_s) : evall(op.run, info);

  return {
    cmdName,
    help,
    action: (argsString) => {
      const [body, opts] = parseArgs(argsString, info);

      if (opts.help)
        return (Base.helpp as RawOperationCompiled).run_c(cmdName);

      if (actionIsSimple(op, action))
        return action(argsString);
      else
        return action(body, opts);
    },
  };
}


const modules: Module[] = rawModules.map(m =>
  Object.entries(m).map(([k, op]) => {
    return makeOperation(op, k)
  })
);

export default modules;
