function getCommandKind(node) {
    return node.getAttribute("commandkind");
}

function getCommandArgument(node) {
    let elemArgument = node.querySelector(".argument");
    if(elemArgument != null) {
        return elemArgument.value;
    } else {
        return null;
    }
}

const parserNodeConverter = {
    makeEmpty : function() {
        return { id: "TOP", arg: "", children: [], node: null };
    },
    convert : function(root) {
        return { id: getCommandKind(root), arg: getCommandArgument(root), children: [], node: root };
    },
    appendResult : function(accumulator, result) {
        accumulator.children.push(result)
        return accumulator
    },
};

function processSubcommands(ret, elemSubcommands, nodeConverter) {
    let children = elemSubcommands.childNodes;

    for(let i = 0; i < children.length; i++) {
        let child = children[i];
        if(child.classList === undefined) {
            continue;
        }
        if(child.classList.contains("baseCommand")) {
            let result = traverseHtmlTree(child, nodeConverter);
            ret = nodeConverter.appendResult(ret, result)
        }
    }

    return ret;
}

function traverseHtmlTree(tree, nodeConverter) {
    var ret = nodeConverter.convert(tree)

    let elemSubcommands = tree.querySelector(".subcommands");
    ret = processSubcommands(ret, elemSubcommands, nodeConverter);

    return ret;
}

function makeProgramAST(treeRoot) {
    var ret = parserNodeConverter.makeEmpty();
    ret = processSubcommands(ret, treeRoot, parserNodeConverter);
    return ret;
}

function dumpAST(ast) {
    var ret = "(" + ast.id + ", " + ast.arg + ")";

    if(ast.children.length > 0) {
        ret += "[";
        for(let i = 0; i < ast.children.length; i++) {
            ret += dumpAST(ast.children[i]);
            if(i != ast.children.length - 1) {
                ret += ", ";
            }
        }
        ret += "]";
    }

    return ret;
}
