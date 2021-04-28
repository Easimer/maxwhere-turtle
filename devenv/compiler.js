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

function processSubcommands(context, ret, elemSubcommands, nodeConverter) {
  let children = elemSubcommands.childNodes;

  for(let i = 0; i < children.length; i++) {
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
            const substitutedAST = traverseHtmlTree(context, context.scope[macroName], nodeConverter);
            for(const subcommand of substitutedAST.children) {
              ret = nodeConverter.appendResult(ret, subcommand);
            }
          } else {
            if(context.strictMode) {
              throw new SyntaxError('Substituting undefined macro ' + macroName);
            }
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

  let elemSubcommands = tree.querySelector('.subcommands');
  ret = processSubcommands(context, ret, elemSubcommands, nodeConverter);

  context.scope = context.scopeStack.pop();

  return ret;
}

export function makeProgramAST(treeRoot, strictMode) {
  let ret = parserNodeConverter.makeEmpty();
  const context = {
    scopeStack: [],
    scope: {},
    strictMode: strictMode
  };
  ret = processSubcommands(context, ret, treeRoot, parserNodeConverter);
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
