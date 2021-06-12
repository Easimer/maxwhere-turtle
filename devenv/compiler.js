function getCommandKind(node) {
  return node.getAttribute('commandkind');
}

function getCommandArgument(node) {
  let elemArgument = node.querySelector('.argument');
  if(elemArgument !== null) {
    return elemArgument.value;
  } else {
    return null;
  }
}

const parserNodeConverter = {
  nextUid: 0,
  makeEmpty : function() {
    return { id: 'TOP', arg: '', children: [], node: null, uid: this.nextUid++ };
  },
  convert : function(root) {
    return { id: getCommandKind(root), arg: getCommandArgument(root), children: [], node: root, uid: this.nextUid++ };
  },
  appendResult : function(accumulator, result) {
    accumulator.children.push(result);
    return accumulator;
  },
};

function makeStackTrace(context) {
  let ret = '';

  for(let i = 0; i < context.stackTrace.length; i++) {
    const kind = getCommandKind(context.stackTrace[i]);
    const arg = getCommandArgument(context.stackTrace[i]);
    ret += `${i+1}: ${kind}(${arg})\n`;
  }

  return ret;
}

function printWarning(context, msg) {
  const stackTrace = makeStackTrace(context);
  if(context.strictMode) {
    context.numErrors += 1;
    throw {
      message: msg,
      stackTrace: stackTrace,
    };
  } else {
    context.numWarnings += 1;
    if(console !== undefined && console !== null) {
      console.warn(`${msg}\nStacktrace:\n${stackTrace}`);
    }
  }
}

function processSubcommands(context, ret, elemSubcommands, nodeConverter) {
  let children = elemSubcommands.childNodes;
  let stop = false;

  for(let i = 0; i < children.length && !stop; i++) {
    let child = children[i];
    if(child.classList === undefined) {
      continue;
    }
    if(child.classList.contains('baseCommand')) {
      switch(getCommandKind(child)) {
        case 'DEFINE_MACRO': {
          const macroName = getCommandArgument(child);
          // NOTE: we're saving the macro define command itself here
          context.scope[macroName] = child;
          break;
        }
        case 'SUBSTITUTE': {
          const macroName = getCommandArgument(child);
          if(macroName in context.scope) {
            context.recursionCounter += 1;
            const substitutedAST = traverseHtmlTree(context, context.scope[macroName], nodeConverter);
            context.recursionCounter -= 1;
            for(const subcommand of substitutedAST.children) {
              ret = nodeConverter.appendResult(ret, subcommand);
            }
          } else {
            printWarning(context, `Substituting undefined macro '${macroName}'`);
          }
          break;
        }
        case 'RECURSION_LIMIT': {
          const arg = parseInt(getCommandArgument(child));
          if(context.recursionCounter > arg) {
            stop = true;
          }
          break;
        }
        default: {
          let result = traverseHtmlTree(context, child, nodeConverter);
          ret = nodeConverter.appendResult(ret, result);
          break;
        }
      }
    }
  }

  return ret;
}

function traverseHtmlTree(context, tree, nodeConverter) {
  let ret = nodeConverter.convert(tree);

  context.scopeStack.push(context.scope);
  context.stackTrace.push(tree);

  let elemSubcommands = tree.querySelector('.subcommands');
  ret = processSubcommands(context, ret, elemSubcommands, nodeConverter);

  context.stackTrace.pop();
  context.scope = context.scopeStack.pop();

  return ret;
}

function optimizeRemoveEmptyRepeats(program) {
  const nodes = [program];
  
  let totalOrigCommands = 0;
  let totalNewCommands = 0;

  while(nodes.length > 0) {
    const node = nodes.pop();

    if(node.id === null) {
      continue;
    }

    totalOrigCommands += node.children.length;

    nodes.push(...node.children);

    const nodesToMarkForDelete = node.children
      .map((node, idx) => [idx, node])
      .filter(kv => kv[1].id === 'REPEAT')
      .filter(kv => kv[1].children.length === 0 || kv[1].arg === '0')
      .map(kv => kv[1]);

    for(const node of nodesToMarkForDelete) {
      node.id = null;
    }

    node.children = node.children.filter(node => node.id !== null);
    totalNewCommands += node.children.length;
  }

  return { name: 'Empty REPEATs', from: totalOrigCommands, to: totalNewCommands };
}

function optimizeRemoveNoops(program) {
  const nodes = [program];

  let totalOrigCommands = 0;
  let totalNewCommands = 0;

  while(nodes.length > 0) {
    const node = nodes.pop();

    for(const child of node.children) {
      nodes.push(child);
    }
    
    // If the current node has grandchildren then we can't perform this optimization
    // (it's not impossible, it's just harder)
    const singleLevel = node.children.reduce((prev, cur) => prev && (cur.children.length === 0), true);

    if(!singleLevel) {
      console.debug(`${node.id} is not single-level!`);
      continue;
    }

    const numPushCmd = node.children.filter(op => op.id === 'STATE_PUSH').length;
    const numPopCmd = node.children.filter(op => op.id === 'STATE_POP').length;
    if(numPushCmd !== numPopCmd) {
      console.debug(`${node} has mismatching PUSH/POP ops!`);
      continue;
    }
    
    totalOrigCommands += node.children.length;

    const rangesToRemove = [];
    const pushIndices = [];
    let noopArray = [];
    for(let i = 0; i < node.children.length; i++) {
      const op = node.children[i];

      if(op.id === 'STATE_PUSH') {
        pushIndices.push(i);
        noopArray.push(true);
      } else if(op.id === 'STATE_POP') {
        const matchingPush = pushIndices.pop();
        const wasItNoop = noopArray.pop();
        if(wasItNoop) {
          rangesToRemove.push([matchingPush, i]);
        }
      } else if(op.id === 'MOVE_FORWARD' || op.id === 'MOVE_BACKWARD') {
        // Drawing ops taint the entire noopArray
        noopArray = noopArray.map(() => false);
      }
    }

    console.assert(pushIndices.length === 0);

    if(rangesToRemove.length === 0) {
      continue;
    }

    for(const range of rangesToRemove) {
      for(let i = range[0]; i <= range[1]; i++) {
        // Mark for deletion
        node.children[i].id = null;
      }
    }

    node.children = node.children.filter(op => op.id !== null);

    totalNewCommands += node.children.length;
  }

  return { name: 'PUSH:POP noop range', from: totalOrigCommands, to: totalNewCommands };
}

function mapOptimizationEfficiencyToColor(e) {
  if(e < 10) {
    return '#FF0000';
  } else if(e < 20) {
    return '#CC0000';
  } else if(e < 40) {
    return '#AA0000';
  } else if(e < 80) {
    return '#660000';
  } else {
    return '#440000';
  }
}

export function makeProgramAST(treeRoot, strictMode) {
  parserNodeConverter.nextUid = 0;
  let ret = parserNodeConverter.makeEmpty();
  const context = {
    scopeStack: [],
    scope: {},
    stackTrace: [],
    strictMode: strictMode,
    numWarnings: 0,
    numErrors: 0,
    recursionCounter: 0,
  };
  ret = processSubcommands(context, ret, treeRoot, parserNodeConverter);
  
  const optimizationResults = [];
  optimizationResults.push(optimizeRemoveNoops(ret));
  optimizationResults.push(optimizeRemoveEmptyRepeats(ret));

  // Print optimizations performed

  console.group('Optimizations performed:');
  for(const opt of optimizationResults) {
    const percentageReduction = opt.to / opt.from * 100;
    const color = mapOptimizationEfficiencyToColor(percentageReduction);

    console.log(`%c${opt.name} - ${opt.from} -> ${opt.to} (${percentageReduction}%)`, `color: ${color}`);
  }
  console.groupEnd();

  if(context.numWarnings > 0 || context.numErrors > 0) {
    console.warn(`Compilation resulted in ${context.numWarnings} warnings and ${context.numErrors} errors!`);
  }

  console.log("ret", ret);

  return ret;
}

function repeat(times, func) {
  for(let i = 0; i < times; i++) {
    func();
  }
}

export function dumpAST(ast, level) {
  if(level === undefined) {
    level = 0;
  }

  let ret = '(' + ast.id + ', ' + ast.arg + ')';
  repeat(level, () => { ret = '    ' + ret; });

  if(ast.children.length > 0) {
    ret += '[\n';
    for(let i = 0; i < ast.children.length; i++) {
      ret += dumpAST(ast.children[i], level + 1);
      if(i !== ast.children.length - 1) {
        ret += ',';
      }
      ret += '\n';
    }
    repeat(level, () => { ret += '    '; });
    ret += ']';
  }

  return ret;
}
