let elemToolbar = null;
let elemCommandTemplate = null;

let elemInputSaveAs = null;
let elemSelectLoadName = null;

const debugPrintAST = window.location.hostname === 'localhost';

const COMMAND_KIND = [
  'MOVE_FORWARD'    ,
  'MOVE_BACKWARD'   ,

  'ROTATE_YAW'      ,
  'ROTATE_PITCH'    ,
  'ROTATE_ROLL'     ,

  'REPEAT'          ,

  'STATE_PUSH'      ,
  'STATE_POP'       ,

  'PEN_DOWN'        ,
  'PEN_UP'          ,
  'PEN_COLOR'       ,

  'DEFINE_MACRO'    ,
  'SUBSTITUTE'      ,
  'RECURSION_LIMIT' ,
];

const argumentPatterns = {
  'decimal' : '^[+-]?\\d*\\.?\\d+$',
  'integer' : '^\\d+$',
};

const commandDescriptors = new Map([
  ['MOVE_FORWARD', {
    argumentPatternKey : 'decimal',
    label : 'Move forward',
    cssClass : 'cmdMove',
  }],
  ['MOVE_BACKWARD', {
    argumentPatternKey : 'decimal',
    label : 'Move backward',
    cssClass : 'cmdMove',
  }],
  ['ROTATE_YAW', {
    argumentPatternKey : 'decimal',
    label : 'Rotate yaw',
    cssClass : 'cmdRotate',
  }],
  ['ROTATE_PITCH', {
    argumentPatternKey : 'decimal',
    label : 'Rotate pitch',
    cssClass : 'cmdRotate',
  }],
  ['ROTATE_ROLL', {
    argumentPatternKey : 'decimal',
    label : 'Rotate roll',
    cssClass : 'cmdRotate',
  }],
  ['REPEAT', {
    argumentPatternKey : 'integer',
    label : 'Repeat N times',
    hasSubcommands : true,
    cssClass : 'cmdControl',
  }],
  ['STATE_PUSH', {
    hasArgument : false,
    label : 'Save state',
    cssClass : 'cmdStack',
  }],
  ['STATE_POP', {
    hasArgument : false,
    label : 'Restore state',
    cssClass : 'cmdStack',
  }],
  ['PEN_DOWN', {
    hasArgument : false,
    label : 'Pen down',
    cssClass : 'cmdPen',
  }],
  ['PEN_UP', {
    hasArgument : false,
    label : 'Pen up',
    cssClass : 'cmdPen',
  }],
  ['PEN_COLOR', {
    label : 'Set pen color',
    cssClass : 'cmdPen',
    inputType : 'color',
  }],
  ['DEFINE_MACRO', {
    label : 'Define macro',
    cssClass : 'cmdMacro',
    hasSubcommands : true,
  }],
  ['SUBSTITUTE', {
    label : 'Substitute',
    cssClass : 'cmdMacro',
  }],
  ['RECURSION_LIMIT', {
    label : 'Recursion limit',
    cssClass : 'cmdLimit',
    argumentPatternKey : 'integer',
  }],
]);

function insertNewCommand(commandInsertZone, kind) {
  let elemCmd = createCommand(kind, false);
  // Replace the old Command Insertion Zone with the command
  commandInsertZone.replaceWith(elemCmd);
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
  let elemPrevCIZ = elemCommand.nextElementSibling;
  let elemNextCIZ = elemCommand.previousElementSibling;
  elemPrevCIZ.remove();
  elemNextCIZ.remove();
  // Replace the command itself with a new CIZ
  elemCommand.replaceWith(makeCommandInsertZone());
}

function createCommand(kind, isTemplate) {
  console.assert(elemCommandTemplate !== null);

  // Fetch descriptor
  let descriptor = commandDescriptors.get(kind);
  console.assert(descriptor !== null);

  // Clone the command template
  let template = elemCommandTemplate;
  let elemCommand = template.cloneNode(/* deep: */ true);

  // Set event listeners, class name and some attributes
  elemCommand.id = '';
  elemCommand.addEventListener('dragstart', handlerCommandDragStart);
  elemCommand.addEventListener('drag', function() {});
  elemCommand.className += ' ' + descriptor.cssClass;
  elemCommand.setAttribute('commandkind', kind);

  // Find the label element and set it
  let elemLabel = elemCommand.querySelector('.label');
  if(elemLabel !== null) {
    elemLabel.innerHTML = descriptor.label;
  }

  let elemArgument = elemCommand.querySelector('.argument');
  if(elemArgument !== null) {
    // Does this command have an argument?
    if(descriptor.hasArgument || descriptor.hasArgument === undefined) {
      // Set the validation pattern
      let patternKey = descriptor.argumentPatternKey;
      if(patternKey !== undefined) {
        let pattern = argumentPatterns[descriptor.argumentPatternKey];
        elemArgument.setAttribute('pattern', pattern);
      }
      // Force validation on each input event
      elemArgument.setAttribute('oninput', 'onCommandInput(event)');

      let inputType = descriptor.inputType;
      if(inputType !== undefined) {
        elemArgument.setAttribute('type', inputType);
      }
    } else {
      // No argument, remove the input field
      elemArgument.remove();
    }
  }

  if(descriptor.hasSubcommands === true && !isTemplate) {
    // This command has subcommands, enable the subblock area

    // Make the subblock div visible
    elemCommand.className += ' commandHasSubcommands';

    // Enable the command insertion zone
    let elemInsertZone = elemCommand.querySelector('.commandInsertZone');
    elemInsertZone.removeAttribute('disabled');

    // Make the zone a dropzone
    elemInsertZone.addEventListener('drop', handlerCommandBlockDrop);
    elemInsertZone.addEventListener('dragover', ev => {
      ev.preventDefault();
    });
  }

  if(!isTemplate) {
    let elemDeleteBtn = elemCommand.querySelector('.delete-cmd');
    elemDeleteBtn.addEventListener('click', () => removeCommand(elemCommand));
    elemDeleteBtn.removeAttribute('disabled');
  }

  return elemCommand;
}

function makeCommandInsertZone() {
  let elem = document.createElement('div');
  elem.className = 'commandInsertZone';
  return elem;
}

function handlerCommandDragStart(ev) {
  ev.dataTransfer.dropEffect = 'copy';
  // Set the transfered data to our kind identifier
  let commandKind = ev.target.getAttribute('commandkind');
  ev.dataTransfer.setData('text/plain', commandKind);
}

function handlerDragOver(ev) {
  ev.preventDefault();

  let target = ev.target;
  if(target.className === 'commandInsertZone' && !target.hasAttribute('disabled')) {
    ev.dataTransfer.dropEffect = 'copy';
  }
}

function handlerDragEnter(ev) {
  ev.preventDefault();
}

function handlerDragLeave() {
}

function handlerDragDrop(ev) {
  ev.preventDefault();

  let target = ev.target;
  if(target.className === 'commandInsertZone' && !target.hasAttribute('disabled')) {
    let kind = ev.dataTransfer.getData('text/plain');
    insertNewCommand(target, kind);
  }
}

function handlerDragEnd(ev) {
  ev.preventDefault();
}

function handlerCommandBlockDrop(ev) {
  ev.preventDefault();
}

import { makeProgramAST, dumpAST } from './compiler.js';
import { sendProgram } from './vm-client.js';

function handlerRunProgram() {
  let elemProgram = document.querySelector('.program');
  let programAST = makeProgramAST(elemProgram);

  if(debugPrintAST) {
    console.log(dumpAST(programAST));
  }

  const onError = () => {
    alert('Failed to connect to ws://localhost:8080!');
  };

  const onSuccess = () => {
    console.log('Sent program!');
  };

  sendProgram('ws://localhost:8080', programAST, onSuccess, onError);
}

function clearProgram() {
  let elemProgram = document.querySelector('.program');
  // Remove all child nodes
  while(elemProgram.childNodes.length > 0) {
    elemProgram.removeChild(elemProgram.lastChild);
  }

  elemProgram.appendChild(makeCommandInsertZone());
}

function storageAvailable(type) {
  let storage;
  try {
    storage = window[type];
    const x = '__storage_test__';
    storage.setItem(x, x);
    storage.removeItem(x);
    return true;
  }
  catch(e) {
    return e instanceof DOMException && (
      // everything except Firefox
      e.code === 22 ||
      // Firefox
      e.code === 1014 ||
      // test name field too, because code might not be present
      // everything except Firefox
      e.name === 'QuotaExceededError' ||
      // Firefox
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
      // acknowledge QuotaExceededError only if there's something already stored
      (storage && storage.length !== 0);
  }
}

function saveProgramAs(program, name) {
  let savedPrograms = localStorage.getItem('savedPrograms');
  if(savedPrograms === null) {
    savedPrograms = '{}';
  }

  savedPrograms = JSON.parse(savedPrograms);
  savedPrograms[name] = program.innerHTML;
  savedPrograms = JSON.stringify(savedPrograms);
  localStorage.setItem('savedPrograms', savedPrograms);
}

function saveCurrentProgram() {
  if(!storageAvailable('localStorage')) {
    alert('Local storage is not available.');
    return;
  }
  
  const elemProgram = document.querySelector('.program');

  const name = elemInputSaveAs.value;
  if(name === undefined || name.length === 0) {
    alert('Program name cannot be empty!');
    return;
  }

  saveProgramAs(elemProgram, name);
  console.log('saved');
  enumerateSavedPrograms();
}

function onSelectedProgram(callback) {
  if(!storageAvailable('localStorage')) {
    return false;
  }

  const name = elemSelectLoadName.value;
  if(name === null || name.length === 0) {
    return false;
  }

  let savedPrograms = localStorage.getItem('savedPrograms');
  if(savedPrograms === null) {
    savedPrograms = '{}';
  }

  savedPrograms = JSON.parse(savedPrograms);
  
  if(savedPrograms[name] === undefined) {
    return false;
  }

  if(callback(savedPrograms, name)) {
    savedPrograms = JSON.stringify(savedPrograms);
    localStorage.setItem('savedPrograms', savedPrograms);
  }

  return true;
}

function loadSelectedProgram() {
  onSelectedProgram((savedPrograms, name) => {
    const program = savedPrograms[name];
    const elemProgram = document.querySelector('.program');
    elemProgram.innerHTML = program;
    return false;
  });
}

function deleteSelectedProgram() {
  onSelectedProgram((savedPrograms, name) => {
    delete savedPrograms[name];
    return true;
  });
  enumerateSavedPrograms();
}

function enumerateSavedPrograms() {
  if(!storageAvailable('localStorage')) {
    return;
  }

  let savedPrograms = localStorage.getItem('savedPrograms');
  if(savedPrograms === null) {
    return;
  }

  savedPrograms = JSON.parse(savedPrograms);

  while(elemSelectLoadName.firstChild !== null) {
    elemSelectLoadName.removeChild(elemSelectLoadName.firstChild);
  }

  for(let programName in savedPrograms) {
    const elemOption = document.createElement('option');
    elemOption.value = programName;
    elemOption.innerText = programName;
    elemSelectLoadName.appendChild(elemOption);
  }
}

function handlerClearProgram() {
  clearProgram();
}

function onCommandInput(ev) {
  ev.target.reportValidity();
  // Create the 'value' attribute on the input field so that the value
  // gets serialized
  ev.target.setAttribute('value', ev.target.value);
}
window.onCommandInput = onCommandInput;

function setupListeners() {
  document.addEventListener('drag', () => {});
  document.addEventListener('dragstart', () => {});
  document.addEventListener('dragend', handlerDragEnd);

  document.addEventListener('dragover', handlerDragOver);

  document.addEventListener('dragenter', handlerDragEnter);
  document.addEventListener('dragleave', handlerDragLeave);

  document.addEventListener('drop', handlerDragDrop);

  document.getElementById('btnRun').addEventListener('click', handlerRunProgram);
  document.getElementById('btnClear').addEventListener('click', handlerClearProgram);
  document.getElementById('btnSave').addEventListener('click', saveCurrentProgram);
  document.getElementById('btnLoad').addEventListener('click', loadSelectedProgram);
  document.getElementById('btnDelete').addEventListener('click', deleteSelectedProgram);
}

function linkUIElements() {
  // Find some important nodes in the DOM
  elemToolbar = document.getElementById('toolbar');
  elemCommandTemplate = document.getElementById('commandTemplate');
  
  elemInputSaveAs = document.getElementById('inputSaveAs');
  elemSelectLoadName = document.getElementById('selectLoadName');
}

function fillToolbar() {
  // Fill the command toolbar
  console.assert(elemToolbar !== null);

  for(let kind of COMMAND_KIND) {
    if(commandDescriptors.has(kind)) {
      let cmd = createCommand(kind, /* isTemplate: */ true);
      elemToolbar.appendChild(cmd);
    } else {
      console.log('Command kind ' + kind + ' is missing its descriptor!');
    }
  }
}

window.addEventListener('load', () => {
  linkUIElements();
  setupListeners();
  fillToolbar();
  enumerateSavedPrograms();
});
