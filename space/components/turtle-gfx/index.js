const { wom } = require('maxwhere');
const { ipcMain  } = require('electron');
const WebSocket = require('ws');
const log = require('electron-log');
const math = require('./math');

const TURTLE_INIT_POSITION = { x: 0, y: 0, z: 0 };
const TURTLE_INIT_ORIENTATION = { w: -1, x: 0, y: 0, z: 0 };
const TURTLE_INIT_SCALE = 1.0;

let wsServer = null;
let hTurtle = null;

let lineSegmentContainer = null;

/**
 * Resets global state. Called before every program execution.
 */
function resetGlobalState() {
  hTurtle.setPosition(TURTLE_INIT_POSITION, 'absolute', 'world');
  hTurtle.setOrientation(TURTLE_INIT_ORIENTATION);

  lineSegmentContainer.clear();
}

/**
 * Updates the position and orientation of the turtle node.
 * @param {Turtle} turtle Turtle state
 */
function updateTurtleObject(turtle) {
  const rotation = turtle.rotation;
  hTurtle.setOrientation(math.eulerToQuaternion(math.degreesToRadians(rotation)));
  hTurtle.setPosition(turtle.position.toObject());
}

/**
 * Creates a line segment of a given length, at the given position
 * with the specified orientation.
 * @param {vec3} position Line origin
 * @param {euler3} rotation Line orientation
 * @param {number} length Line length
 * @param {rgba} color Line color
 */
function createLineSegment(position, rotation, length, color) {
  const segment = wom.create('mesh', {
    url: 'line.mesh',
    position: position.toObject(),
    scale: { x: 1, y: 1, z: length }
  });

  const funcSetColorOnMaterial = (segment, color, i) => {
    try {
      const subvisuals = segment.subvisuals();
      subvisuals.forEach(sv => {
        sv.material.SetDiffuse(color);
      });
    } catch(ex) {
      // Mesh is not loaded yet
      if(i < 8) {
        setTimeout(() => {
          funcSetColorOnMaterial(segment, color, i + 1);
        }, 100);
      }
    }
  };

  funcSetColorOnMaterial(segment, color, 0);

  lineSegmentContainer.appendChild(segment);
  wom.render(segment);

  // NOTE: setting the rotation in the node property object above
  // doesn't actually work.
  const rotationQuat = math.eulerToQuaternion(math.degreesToRadians(rotation));
  segment.setOrientation(rotationQuat);
}

/**
 * Decodes a hex-encoded color into an RGBA object.
 * @param {string} Hex-encoded color, like #FF1212 or #FFF.
 */
function decodeHexColor(hexStr) {
  let R, G, B;

  if(hexStr.length == 4) {
    const pattern = /^#(?<R>[a-z0-9])(?<G>[a-z0-9])(?<B>[a-z0-9])$/gi;
    const result = pattern.exec(hexStr);
    R = parseInt(result.groups.R + result.groups.R, 16);
    G = parseInt(result.groups.G + result.groups.G, 16);
    B = parseInt(result.groups.B + result.groups.B, 16);
  } else if(hexStr.length == 7) {
    const pattern = /^#(?<R>[a-z0-9]{2})(?<G>[a-z0-9]{2})(?<B>[a-z0-9]{2})$/gi;
    const result = pattern.exec(hexStr);
    R = parseInt(result.groups.R, 16);
    G = parseInt(result.groups.G, 16);
    B = parseInt(result.groups.B, 16);
  }

  return { r: R / 255, g: G / 255, b: B / 255, a: 1 };
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
    const dir = math.getDirectionVector(math.degreesToRadians(turtle.rotation));
    const newPos = turtle.position.addScaled(distance, dir);
    if(turtle.pen_active) {
      createLineSegment(turtle.position, turtle.rotation, distance, turtle.pen_color);
    }
    turtle.position = newPos;
    updateTurtleObject(turtle);
  },

  'MOVE_BACKWARD' : (state, instruction) => {
    const turtle = state.turtle;

    const distance = parseInt(instruction.arg);
    let dir = math.getDirectionVector(math.degreesToRadians(turtle.rotation));
    const newPos = turtle.position.addScaled(-distance, dir);
    if(turtle.pen_active) {
      createLineSegment(turtle.position, turtle.rotation, distance, turtle.pen_color);
    }
    turtle.position = newPos;
    updateTurtleObject(turtle);
  },

  'ROTATE_YAW' : (state, instruction) => {
    const turtle = state.turtle;
    
    let degrees = parseInt(instruction.arg);
    turtle.rotation.yaw += degrees;
    updateTurtleObject(turtle);
  },

  'ROTATE_PITCH' : (state, instruction) => {
    const turtle = state.turtle;
    
    let degrees = parseInt(instruction.arg);
    turtle.rotation.pitch += degrees;
    updateTurtleObject(turtle);
  },

  'ROTATE_ROLL' : (state, instruction) => {
    const turtle = state.turtle;
    
    let degrees = parseInt(instruction.arg);
    turtle.rotation.roll += degrees;
    updateTurtleObject(turtle);
  },

  'REPEAT' : (state, instruction) => {
    const times = parseInt(instruction.arg);
    for(var i = 0; i < times; i++) {
      for(const child of instruction.children) {
        decodeInstruction(state, child);
      }
    }
  },

  'STATE_PUSH' : (state) => {
    state.stack.push(Object.assign({}, state.turtle));
  },

  'STATE_POP' : (state) => {
    state.turtle = Object.assign({}, state.stack.pop());
    updateTurtleObject(state.turtle);
  },

  'PEN_DOWN' : (state) => {
    state.turtle.pen_active = true;
  },

  'PEN_UP' : (state) => {
    state.turtle.pen_active = false;
  },

  'PEN_COLOR' : (state, instruction) => {
    state.turtle.pen_color = decodeHexColor(instruction.arg);
    log.debug(`Pen color := ${JSON.stringify(state.turtle.pen_color)}`);
  },
};

function decodeInstruction(state, instruction) {
  vmDispatchTable[instruction.id](state, instruction);
}

function executeProgram(program) {
  var state = {
    stack: [],
    turtle: {
      position: new math.Vec3(),
      rotation: { yaw: 0, pitch: 0, roll: 0 },
      pen_active: true,
      pen_color: { r: 1, g: 0, b: 0, a: 1 },
    }
  };
  resetGlobalState();
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