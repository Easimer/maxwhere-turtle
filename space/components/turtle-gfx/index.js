const { wom } = require('maxwhere');
const { ipcMain  } = require('electron');
const path = require('path');
const WebSocket = require('ws');
const log = require('electron-log');

const TURTLE_INIT_POSITION = { x: 0, y: 0, z: 0 };
const TURTLE_INIT_ORIENTATION = { w: -1, x: 0, y: 0, z: 0 };
const TURTLE_INIT_SCALE = 1.0

let wsServer = null;
let hTurtle = null

function resetTurtle() {
  hTurtle.setPosition(TURTLE_INIT_POSITION, 'absolute', 'world');
  hTurtle.setOrientation(TURTLE_INIT_ORIENTATION);
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

function getTurtleDirectionVector(state) {
  let dx = Math.cos(state.yaw) * Math.cos(state.pitch);
  let dy = Math.sin(state.yaw) * Math.cos(state.pitch);
  let dz = Math.sin(state.pitch);
  return { x: dx, y: dy, z: dz };
}

function setStatePosition(state, vec) {
  state.x = vec.x;
  state.y = vec.y;
  state.z = vec.z;
}

function getStatePosition(state) {
  return { x: state.x, y: state.y, z: state.z };
}

function updateTurtleObject(state) {
  hTurtle.setOrientation(eulerToQuaternion(state.yaw, state.pitch, state.roll));
  hTurtle.setPosition(getStatePosition(state));
}

function vecScaleAdd(lhs, scale, rhs) {
  return {
    x: lhs.x + scale * rhs.x,
    y: lhs.y + scale * rhs.y,
    z: lhs.z + scale * rhs.z,
  };
}

const vmDispatchTable = {
  'TOP' : (state, instruction) => {
    log.debug("processing children");
    for(const child of instruction.children) {
      log.debug("processing child " + child.id);
      decodeInstruction(state, child);
    }
  },
  'MOVE_FORWARD' : (state, instruction) => {
    const distance = parseInt(instruction.arg);
    let dir = getTurtleDirectionVector(state.state);
    let newPos = vecScaleAdd(getStatePosition(state.state), distance, dir);
    setStatePosition(state.state, newPos);
    updateTurtleObject(state.state);
  },

  "MOVE_BACKWARD" : (state, instruction) => {
    const distance = parseInt(instruction.arg);
    let dir = getTurtleDirectionVector(state.state);
    let newPos = vecScaleAdd(getStatePosition(state.state), -distance, dir);
    setStatePosition(state.state, newPos);
    updateTurtleObject(state.state);
  },

  "ROTATE_YAW" : (state, instruction) => {
  },

  "ROTATE_PITCH" : (state, instruction) => {
  },

  "ROTATE_ROLL" : (state, instruction) => {
  },

  "REPEAT" : (state, instruction) => {
    const times = parseInt(instruction.arg);
    for(var i = 0; i < times; i++) {
      for(const child of instruction.children) {
        decodeInstruction(state, child);
      }
    }
  },

  "STATE_PUSH" : (state, instruction) => {
    state.stack.push(Object.assign({}, state.state));
  },

  "STATE_POP" : (state, instruction) => {
    state.state = Object.assign({}, state.stack.pop());
    updateTurtleObject(state.state);
  },

  "PEN_DOWN" : (state, instruction) => {
  },

  "PEN_UP" : (state, instruction) => {
  },

  "PEN_COLOR" : (state, instruction) => {
  },
};

function decodeInstruction(state, instruction) {
  log.debug("decodeInstruction: " + instruction.id + " " + instruction.arg);

  vmDispatchTable[instruction.id](state, instruction);
}

function executeProgram(program) {
  var state = {
    stack: [],
    state: {
      x: 0, y: 0, z: 0,
      yaw: 0, pitch: 0, roll: 0,
      pen_active: true,
      r: 255, g: 0, b: 0,
    }
  };
  resetTurtle();
  // Start at TOP block
  decodeInstruction(state, program);
}

function onMessageReceived(message) {
  const msg = JSON.parse(message);
  if(msg != null) {
    log.debug("Message received:");
    log.debug(msg);

    switch(msg.type) {
      case 'execProgram':
        executeProgram(msg.program);
        break;
    }
  } else {
    log.error("message received didn't parse!");
  }
}

const init = (props) => {
  wsServer = new WebSocket.Server({ port: 8080 });

  if(wsServer) {
    log.debug('WS server running');
  } else {
    log.debug('WS server didn\'t start');
  }

  if(wsServer != null) {
    wsServer.on('connection', function connection(pClient) {
      log.debug("new connection: " + pClient);
      pClient.on('message', onMessageReceived);
    });
  }

  log.debug('ready');
};

const done = () => {
  log.debug('done');
};

const IPC_CHANNEL_DEBUG = 'turtle-debug';

const render = (props, children) => {
  let debugPanel = wom.create('billboard', {
    url: path.resolve(__dirname, 'index.html'),
    nodeIntegration: true, // need this for IPC communication
    width: 586,
    height: 330,
    'resolution-width': 1600,
    'resolution-height': 900,
    position: { "x": 100, "y": 100, "z": -10 },
    orientation: { "x": 0, "y": 0, "z": 0, "w": -1 },
    physical: {raycast: true} // accept mouse events to make it orbitable
  });
  wom.render(debugPanel);

  hTurtle = wom.create('mesh', {
    id: 'turtle',
    url: 'penguin.mesh',
    position: TURTLE_INIT_POSITION,
    orientation: TURTLE_INIT_ORIENTATION,
    scale: TURTLE_INIT_SCALE,
    autophysical: true
  });
  wom.render(hTurtle);
  
  ipcMain.removeAllListeners(IPC_CHANNEL_DEBUG);
  ipcMain.on(IPC_CHANNEL_DEBUG, (event, payload) => {
    log.debug('IPC: ', payload);
    if (payload == "kill-ws") {
      if(ws != null) {
        ws.close();
      }
    }
  });
  
  return <node />;
};

module.exports = {
  init,
  done,
  render
};
