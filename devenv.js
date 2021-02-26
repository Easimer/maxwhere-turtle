var elemToolbar = null;
var elemControl = null;
var elemCommandTemplate = null;

const COMMAND_KIND = [
    "MOVE_FORWARD"    ,
    "MOVE_BACKWARD"   ,

    "ROTATE_YAW"      ,
    "ROTATE_PITCH"    ,
    "ROTATE_ROLL"     ,

    "REPEAT"          ,

    "STATE_PUSH"      ,
    "STATE_POP"       ,
];

const argumentPatterns = {
    "decimal" : "^\\d*\\.?\\d+$",
    "integer" : "^\\d+$",
};

const commandDescriptors = new Map([
    ["MOVE_FORWARD", {
        argumentPatternKey : "decimal",
        label : "Move forward",
        cssClass : "cmdMove",
    }],
    ["REPEAT", {
        argumentPatternKey : "integer",
        label : "Repeat N times",
        hasSubcommands : true,
        cssClass : "cmdControl",
    }],
    ["STATE_PUSH", {
        hasArgument : false,
        label : "Save state",
        cssClass : "cmdStack",
    }],
    ["STATE_POP", {
        hasArgument : false,
        label : "Restore state",
        cssClass : "cmdStack",
    }],
]);

function insertNewCommand(commandInsertZone, kind) {
    let elemCmd = createCommand(kind, false);
    // Replace the old Command Insertion Zone with the command
    commandInsertZone.replaceWith(elemCmd)
    let elemParent = elemCmd.parentNode;

    // Insert a new Command Insertion Zone before the new command
    let elemInsertZoneBefore = makeCommandInsertZone();
    elemParent.insertBefore(elemInsertZoneBefore, elemCmd);

    // Insert a new Command Insertion Zone after the new command
    let elemInsertZoneAfter = makeCommandInsertZone();
    elemParent.insertBefore(elemInsertZoneAfter, elemCmd.nextSibling);
}

function createCommand(kind, isTemplate) {
    console.assert(elemCommandTemplate != null);

    let descriptor = commandDescriptors.get(kind);
    console.assert(descriptor != null);

    let template = elemCommandTemplate;
    let elemCommand = template.cloneNode(/* deep: */ true);

    elemCommand.id = "";
    elemCommand.addEventListener("dragstart", handlerCommandDragStart);
    elemCommand.addEventListener("drag", function(e) {});
    elemCommand.className += ' ' + descriptor.cssClass;
    elemCommand.setAttribute('commandkind', kind);

    let elemLabel = elemCommand.querySelector(".label");
    if(elemLabel != null) {
        elemLabel.innerHTML = descriptor.label;
    }

    let elemArgument = elemCommand.querySelector(".argument");
    if(elemArgument != null) {
        if(descriptor.hasArgument || descriptor.hasArgument === undefined) {
            console.log(descriptor);
            let pattern = argumentPatterns[descriptor.argumentPatternKey];
            elemArgument.setAttribute('pattern', pattern);
            elemArgument.setAttribute('oninput', 'this.reportValidity()');
        } else {
            elemArgument.remove();
        }
    }

    if(descriptor.hasSubcommands === true && !isTemplate) {
        // Make the subblock div visible
        elemCommand.className += " commandHasSubcommands";

        // Enable the command insertion zone
        let elemInsertZone = elemCommand.querySelector(".commandInsertZone");
        elemInsertZone.removeAttribute("disabled");

        elemInsertZone.addEventListener("drop", handlerCommandBlockDrop);
        elemInsertZone.addEventListener("dragover", ev => {
            ev.preventDefault();
        });
    }

    return elemCommand;
}

function makeCommandInsertZone() {
    let elem = document.createElement("div");
    elem.className = "commandInsertZone";
    return elem;
}

function handlerCommandDragStart(ev) {
    ev.dataTransfer.dropEffect = "copy";
    // Set the transfered data to our kind identifier
    let commandKind = ev.target.getAttribute("commandkind");
    ev.dataTransfer.setData('text/plain', commandKind);
}

function handlerDragOver(ev) {
    ev.preventDefault();

    let target = ev.target;
    if(target.className == "commandInsertZone" && !target.hasAttribute("disabled")) {
        ev.dataTransfer.dropEffect = "copy";
    }
}

function handlerDragEnter(ev) {
    ev.preventDefault();
    let target = ev.target;
    if(target.className == "commandInsertZone" && !target.hasAttribute("disabled")) {
    }
}

function handlerDragLeave(ev) {
    let target = ev.target;
    if(target.className == "commandInsertZone" && !target.hasAttribute("disabled")) {
    }
}

function handlerDragDrop(ev) {
    ev.preventDefault();

    let target = ev.target;
    if(target.className == "commandInsertZone" && !target.hasAttribute("disabled")) {
        let kind = ev.dataTransfer.getData("text/plain");
        insertNewCommand(target, kind);
    }
}

function handlerDragEnd(ev) {
    ev.preventDefault();
    let target = ev.target;
    if(target.className == "commandInsertZone" && !target.hasAttribute("disabled")) {
    }
}

function handlerCommandBlockDrop(ev) {
    ev.preventDefault();
}

function initProgram() {
    document.addEventListener("drag", function(ev) {
    });
    document.addEventListener("dragstart", ev => {});
    document.addEventListener("dragend", handlerDragEnd);

    document.addEventListener("dragover", handlerDragOver);

    document.addEventListener("dragenter", handlerDragEnter);
    document.addEventListener("dragleave", handlerDragLeave);

    document.addEventListener("drop", handlerDragDrop);
}

function linkUIElements() {
    elemToolbar = document.getElementById("toolbar");
    elemControl = document.getElementById("control");
    elemCommandTemplate = document.getElementById("commandTemplate");
}

function fillToolbar() {
    console.assert(elemToolbar != null);

    for(let kind of COMMAND_KIND) {
        if(commandDescriptors.has(kind)) {
            let cmd = createCommand(kind, /* isTemplate: */ true)
            elemToolbar.appendChild(cmd);
        } else {
            console.log("Command kind " + kind + " is missing its descriptor!");
        }
    }
}

window.addEventListener("load", function(ev) {
    linkUIElements();
    initProgram();
    fillToolbar();
});
