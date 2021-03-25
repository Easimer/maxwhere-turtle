/* global __dirname */
const { wom } = require('maxwhere');
const { ipcMain  } = require('electron');
const path = require('path');
const WebSocket = require('ws');
const log = require('electron-log');

const TURTLE_INIT_POSITION = { x: 0, y: 0, z: 0 };
const TURTLE_INIT_ORIENTATION = { w: -1, x: 0, y: 0, z: 0 };
const TURTLE_INIT_SCALE = 1.0;

let wsServer = null;
let hTurtle = null;

let lineSegmentContainer = null;

function resetTurtle() {
  hTurtle.setPosition(TURTLE_INIT_POSITION, 'absolute', 'world');
  hTurtle.setOrientation(TURTLE_INIT_ORIENTATION);

  lineSegmentContainer.clear();
}

function eulerToQuaternion(yaw, pitch, roll) {
  let cy = Math.cos(yaw * 0.5);
  let sy = Math.sin(yaw * 0.5);
  let cp = Math.cos(pitch * 0.5);
  let sp = Math.sin(pitch * 0.5);
  let cr = Math.cos(roll * 0.5);
  let sr = Math.sin(roll * 0.5);

  let w = cr * cp * cy + sr * sp * sy;
  let x = sr * cp * cy - cr * sp * sy;
  let y = cr * sp * cy + sr * cp * sy;
  let z = cr * cp * sy - sr * sp * cy;

  return {w: w, x: x, y: y, z: z};
}

function getTurtleDirectionVector(rotation) {
  let dx = Math.cos(rotation.yaw) * Math.cos(rotation.pitch);
  let dy = Math.sin(rotation.yaw) * Math.cos(rotation.pitch);
  let dz = Math.sin(rotation.pitch);
  return { x: dx, y: dy, z: dz };
}

function updateTurtleObject(turtle) {
  const rotation = turtle.rotation;
  hTurtle.setOrientation(eulerToQuaternion(rotation.yaw, rotation.pitch, rotation.roll));
  hTurtle.setPosition(turtle.position);
}

function vecScaleAdd(lhs, scale, rhs) {
  return {
    x: lhs.x + scale * rhs.x,
    y: lhs.y + scale * rhs.y,
    z: lhs.z + scale * rhs.z,
  };
}

function createLineSegment(position, rotation, length) {
  log.debug('creating segment');
  let segment = wom.create('mesh', {
    url: 'line.mesh',
    position: position,
    rotation: eulerToQuaternion(rotation.yaw, rotation.pitch, rotation.roll),
    scale: { x: length, y: 1, z: 1 }
  });

  log.debug('created segment');
  lineSegmentContainer.appendChild(segment);
  log.debug('appended segment');
  wom.render(segment);
  log.debug('rendered segment');
}

const vmDispatchTable = {
  'TOP' : (state, instruction) => {
    log.debug('processing children');
    for(const child of instruction.children) {
      log.debug('processing child ' + child.id);
      decodeInstruction(state, child);
    }
  },
  'MOVE_FORWARD' : (state, instruction) => {
    const turtle = state.turtle;

    const distance = parseInt(instruction.arg);
    let dir = getTurtleDirectionVector(turtle.rotation);
    let newPos = vecScaleAdd(turtle.position, distance, dir);
    createLineSegment(turtle.position, turtle.rotation, distance);
    turtle.position = newPos;
    updateTurtleObject(turtle);
  },

  'MOVE_BACKWARD' : (state, instruction) => {
    const turtle = state.turtle;

    const distance = parseInt(instruction.arg);
    let dir = getTurtleDirectionVector(turtle.rotation);
    let newPos = vecScaleAdd(turtle.position, -distance, dir);
    turtle.position = newPos;
    updateTurtleObject(turtle);
  },

  'ROTATE_YAW' : (state, instruction) => {
  },

  'ROTATE_PITCH' : (state, instruction) => {
  },

  'ROTATE_ROLL' : (state, instruction) => {
  },

  'REPEAT' : (state, instruction) => {
    const times = parseInt(instruction.arg);
    for(var i = 0; i < times; i++) {
      for(const child of instruction.children) {
        decodeInstruction(state, child);
      }
    }
  },

  'STATE_PUSH' : (state, instruction) => {
    state.stack.push(Object.assign({}, state.turtle));
  },

  'STATE_POP' : (state, instruction) => {
    state.turtle = Object.assign({}, state.stack.pop());
    updateTurtleObject(state.turtle);
  },

  'PEN_DOWN' : (state, instruction) => {
  },

  'PEN_UP' : (state, instruction) => {
  },

  'PEN_COLOR' : (state, instruction) => {
  },
};

function decodeInstruction(state, instruction) {
  log.debug('decodeInstruction: ' + instruction.id + ' ' + instruction.arg);

  vmDispatchTable[instruction.id](state, instruction);
}

function executeProgram(program) {
  var state = {
    stack: [],
    turtle: {
      position: { x: 0, y: 0, z: 0 },
      rotation: { yaw: 0, pitch: 0, roll: 0 },
      pen_active: true,
      pen_color: { r: 255, g: 0, b: 0 },
    }
  };
  resetTurtle();
  // Start at TOP block
  decodeInstruction(state, program);
}

function onMessageReceived(message) {
  const msg = JSON.parse(message);
  if(msg != null) {
    log.debug('Message received:');
    log.debug(msg);

    switch(msg.type) {
      case 'execProgram':
        executeProgram(msg.program);
        break;
    }
  } else {
    log.error('message received didn\'t parse!');
  }
}

module.exports.init = () => {
  wsServer = new WebSocket.Server({ port: 8080 });

  if(wsServer) {
    log.debug('WS server running');
  } else {
    log.debug('WS server didn\'t start');
  }

  if(wsServer != null) {
    wsServer.on('connection', function connection(pClient) {
      log.debug('new connection: ' + pClient);
      pClient.on('message', onMessageReceived);
    });
  }

  log.debug('ready');
};

module.exports.done = () => {
  log.debug('done');
};

const IPC_CHANNEL_DEBUG = 'turtle-debug';

module.exports.render = (/*props, children*/) => {
  hTurtle = wom.create('mesh', {
    id: 'turtle',
    url: 'penguin.mesh',
    position: TURTLE_INIT_POSITION,
    orientation: TURTLE_INIT_ORIENTATION,
    scale: TURTLE_INIT_SCALE,
    autophysical: true
  });
  wom.render(hTurtle);

  lineSegmentContainer = wom.create('node');
  wom.render(lineSegmentContainer);
  
  ipcMain.removeAllListeners(IPC_CHANNEL_DEBUG);
  ipcMain.on(IPC_CHANNEL_DEBUG, (event, payload) => {
    log.debug('IPC: ', payload);
  });
  
  return <node />;
};

module.exports.clear = () => {
  log.debug('clearing');
  if(wsServer != null) {
    wsServer.close();
  }
};