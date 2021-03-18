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

    "PEN_DOWN"        ,
    "PEN_UP"          ,
    "PEN_COLOR"       ,
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
    ["MOVE_BACKWARD", {
        argumentPatternKey : "decimal",
        label : "Move backward",
        cssClass : "cmdMove",
    }],
    ["ROTATE_YAW", {
        argumentPatternKey : "decimal",
        label : "Rotate yaw",
        cssClass : "cmdRotate",
    }],
    ["ROTATE_PITCH", {
        argumentPatternKey : "decimal",
        label : "Rotate pitch",
        cssClass : "cmdRotate",
    }],
    ["ROTATE_ROLL", {
        argumentPatternKey : "decimal",
        label : "Rotate roll",
        cssClass : "cmdRotate",
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
    ["PEN_DOWN", {
        hasArgument : false,
        label : "Pen down",
        cssClass : "cmdPen",
    }],
    ["PEN_UP", {
        hasArgument : false,
        label : "Pen up",
        cssClass : "cmdPen",
    }],
    ["PEN_COLOR", {
        label : "Set pen color",
        cssClass : "cmdPen",
        inputType : "color",
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

function removeCommand(elemCommand) {
    // Remove the command insertion zones before and after the command
    let elemPrevCIZ = elemCommand.nextElementSibling
    let elemNextCIZ = elemCommand.previousElementSibling
    elemPrevCIZ.remove()
    elemNextCIZ.remove()
    // Replace the command itself with a new CIZ
    elemCommand.replaceWith(makeCommandInsertZone())
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
            let patternKey = descriptor.argumentPatternKey;
            if(patternKey !== undefined) {
                let pattern = argumentPatterns[descriptor.argumentPatternKey];
                elemArgument.setAttribute('pattern', pattern);
                // Force validation on each input event
                elemArgument.setAttribute('oninput', 'this.reportValidity()');
            }

            let inputType = descriptor.inputType;
            if(inputType !== undefined) {
                elemArgument.setAttribute("type", inputType);
            }
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

    if(!isTemplate) {
        let elemDeleteBtn = elemCommand.querySelector(".delete-cmd")
        elemDeleteBtn.addEventListener('click', _ => removeCommand(elemCommand))
        elemDeleteBtn.removeAttribute('disabled')
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

function handlerRunProgram(ev) {
    let elemProgram = document.querySelector(".program")
    let programAST = makeProgramAST(elemProgram)
    console.log(dumpAST(programAST));
}

function clearProgram() {
    let elemProgram = document.querySelector(".program")
    // Remove all child nodes
    while(elemProgram.childNodes.length > 0) {
        elemProgram.removeChild(elemProgram.lastChild);
    }

    elemProgram.appendChild(makeCommandInsertZone())
}

function handlerClearProgram(ev) {
    clearProgram();
}

function setupListeners() {
    document.addEventListener("drag", ev => {});
    document.addEventListener("dragstart", ev => {});
    document.addEventListener("dragend", handlerDragEnd);

    document.addEventListener("dragover", handlerDragOver);

    document.addEventListener("dragenter", handlerDragEnter);
    document.addEventListener("dragleave", handlerDragLeave);

    document.addEventListener("drop", handlerDragDrop);

    document.getElementById("btnRun").addEventListener("click", handlerRunProgram);
    document.getElementById("btnClear").addEventListener("click", handlerClearProgram);
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
