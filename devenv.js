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

    // Fetch descriptor
    let descriptor = commandDescriptors.get(kind);
    console.assert(descriptor != null);

    // Clone the command template
    let template = elemCommandTemplate;
    let elemCommand = template.cloneNode(/* deep: */ true);

    // Set event listeners, class name and some attributes
    elemCommand.id = "";
    elemCommand.addEventListener("dragstart", handlerCommandDragStart);
    elemCommand.addEventListener("drag", function(e) {});
    elemCommand.className += ' ' + descriptor.cssClass;
    elemCommand.setAttribute('commandkind', kind);

    // Find the label element and set it
    let elemLabel = elemCommand.querySelector(".label");
    if(elemLabel != null) {
        elemLabel.innerHTML = descriptor.label;
    }

    let elemArgument = elemCommand.querySelector(".argument");
    if(elemArgument != null) {
        // Does this command have an argument?
        if(descriptor.hasArgument || descriptor.hasArgument === undefined) {
            // Set the validation pattern
            let pattern = argumentPatterns[descriptor.argumentPatternKey];
            elemArgument.setAttribute('pattern', pattern);
            // Force validation on each input event
            elemArgument.setAttribute('oninput', 'this.reportValidity()');
        } else {
            // No argument, remove the input field
            elemArgument.remove();
        }
    }

    if(descriptor.hasSubcommands === true && !isTemplate) {
        // This command has subcommands, enable the subblock area

        // Make the subblock div visible
        elemCommand.className += " commandHasSubcommands";

        // Enable the command insertion zone
        let elemInsertZone = elemCommand.querySelector(".commandInsertZone");
        elemInsertZone.removeAttribute("disabled");

        // Make the zone a dropzone
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

function setupListeners() {
    document.addEventListener("drag", ev => {});
    document.addEventListener("dragstart", ev => {});
    document.addEventListener("dragend", handlerDragEnd);

    document.addEventListener("dragover", handlerDragOver);

    document.addEventListener("dragenter", handlerDragEnter);
    document.addEventListener("dragleave", handlerDragLeave);

    document.addEventListener("drop", handlerDragDrop);
}

function linkUIElements() {
    // Find some important nodes in the DOM
    elemToolbar = document.getElementById("toolbar");
    elemControl = document.getElementById("control");
    elemCommandTemplate = document.getElementById("commandTemplate");
}

function fillToolbar() {
    // Fill the command toolbar
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
    setupListeners();
    fillToolbar();
});
