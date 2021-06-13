const { wom } = require('maxwhere');
const { ipcMain  } = require('electron');
import ws from 'ws';
const log = require('electron-log');
const math = require('./math');
const pkg = require('./package.json');
import { Vec3, Quat, Color, eulerToQuaternion } from './math';
import { Turtle, createVM, World, CSingleStepVM, ISingleStepVM, Instruction } from './logic';

const TURTLE_INIT_POSITION = { x: 0, y: 100, z: 0 };
const TURTLE_INIT_ORIENTATION = { w: 1, x: 0, y: 0, z: 0 };
const TURTLE_INIT_SCALE = 0.5;

let wsServer = null;
let hTurtle = null;

let singleStepSession: ISingleStepVM = null;

let lineSegmentContainer = null;
let lineSegmentCounter = 0;

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
function updateTurtleObject(turtle: Turtle) {
  const rotation = turtle.rotation;
  hTurtle.setOrientation(math.eulerToQuaternion(math.degreesToRadians(rotation)));
  hTurtle.setPosition(turtle.position.toObject());
}

/**
 * Creates a line segment of a given length, at the given position
 * with the specified orientation.
 * @param {Vec3} position Line origin
 * @param {Euler3Deg} rotation Line orientation
 * @param {number} length Line length
 * @param {rgba} color Line color
 */
function createLineSegment(position: Vec3, rotation: Quat, length: number, width: number, color: Color) {
  const segment = wom.create('mesh', {
    url: 'line.mesh',
    position: position.toObject(),
    orientation: rotation,
    scale: { x: width, y: width, z: length }
  });

  log.debug(width);

  const funcSetColorOnMaterial = () => {
    try {
      const name = `mat_line${lineSegmentCounter}`;
      const clonedMat = segment.material(segment.subvisual(0)).clone(name);
      clonedMat.setDiffuse(color);
      segment.setMaterial(name, 0);
      lineSegmentCounter += 1;
    } catch(ex) {
      // Mesh is not loaded yet
      setTimeout(funcSetColorOnMaterial, 500);
    }
  };

  funcSetColorOnMaterial();

  lineSegmentContainer.appendChild(segment);
  wom.render(segment);
}

function getInitialState() {
  return {
    position: Vec3.fromObject(TURTLE_INIT_POSITION),
    rotation: {yaw: 0, pitch: 0, roll: 0}
  };
}

function executeProgram(program) {
  singleStepSession = null;

  const world: World = {
    getInitialState: getInitialState,
    resetWorld: resetGlobalState,
    drawLine: createLineSegment,
    updateTurtle: updateTurtleObject,
  };
  const vm = createVM();
  vm.executeProgram(program, world);
}

function sendSimpleResponse(client: WebSocket, type: string) {
  const response = {
    'type': type
  };
  client.send(JSON.stringify(response));
}

function sendResponse(client: WebSocket, type: string, payloadKey: string, payload: any) {
  const response = {
    'type': type,
  };
  response[payloadKey] = payload;

  client.send(JSON.stringify(response));
}

function pong(client: WebSocket): void {
  sendResponse(client, 'pong', 'version', pkg.version);
}

function beginSingleStep(client: WebSocket, program) {
  const world: World = {
    getInitialState: getInitialState,
    resetWorld: resetGlobalState,
    drawLine: createLineSegment,
    updateTurtle: updateTurtleObject,
  };

  singleStepSession = new CSingleStepVM(world, program);
  sendSimpleResponse(client, 'vmStarted');
}

function singleStep(client: WebSocket) {
  if (singleStepSession === null) {
    sendSimpleResponse(client, 'vmDied');
    return;
  }

  const world: World = {
    getInitialState: getInitialState,
    resetWorld: resetGlobalState,
    drawLine: createLineSegment,
    updateTurtle: updateTurtleObject,
  };

  const [turtle, instruction] = singleStepSession.step(world);

  const report = {
    ended: (instruction === null),
    turtle: turtle,
    uid: null
  };

  if (instruction !== null) {
    report.uid = (instruction as Instruction).uid;
  }

  sendResponse(client, 'vmReport', 'report', report);
}

function onMessageReceived(client: WebSocket, message: string): void {
  const msg = JSON.parse(message);
  if(msg != null) {
    log.debug('Message received:');
    log.debug(msg);

    switch(msg.type) {
      case 'execProgram':
        executeProgram(msg.program);
        break;
      case 'beginSingleStep':
        beginSingleStep(client, msg.program);
        break;
      case 'step':
        singleStep(client);
        break;
      case 'ping':
        pong(client);
        break;
    }
  } else {
    log.error('message received didn\'t parse!');
  }

  client.close();
}

module.exports.init = () => {
  wsServer = new ws.Server({ port: 8080 });

  if(wsServer) {
    log.debug('WS server running');
  } else {
    log.debug('WS server didn\'t start');
  }

  if(wsServer != null) {
    wsServer.on('connection', (client: WebSocket) => {
      log.debug('new connection: ' + client);
      client.onmessage = (message: MessageEvent) => {
        onMessageReceived(client, message.data);
      };
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
    url: 'turtle.mesh',
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