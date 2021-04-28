function getCommandKind(node) {
  return node.getAttribute('commandkind');
}

function getCommandArgument(node) {
  let elemArgument = node.querySelector('.argument');
  if(elemArgument != null) {
    return elemArgument.value;
  } else {
    return null;
  }
}

const parserNodeConverter = {
  makeEmpty : function() {
    return { id: 'TOP', arg: '', children: [], node: null };
  },
  convert : function(root) {
    return { id: getCommandKind(root), arg: getCommandArgument(root), children: [], node: root };
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
          if(context.recursionCounter === arg) {
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

export function makeProgramAST(treeRoot, strictMode) {
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

  if(context.numWarnings > 0 || context.numErrors > 0) {
    console.warn(`Compilation resulted in ${context.numWarnings} warnings and ${context.numErrors} errors!`);
  }

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
      if(i != ast.children.length - 1) {
        ret += ',';
      }
      ret += '\n';
    }
    repeat(level, () => { ret += '    '; });
    ret += ']';
  }

  return ret;
}
