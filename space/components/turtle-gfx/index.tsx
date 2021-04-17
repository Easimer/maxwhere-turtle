const { wom } = require('maxwhere');
const { ipcMain  } = require('electron');
const ws = require('ws');
const log = require('electron-log');
const math = require('./math');
import { Vec3, Euler3Deg, Color } from './math';
import { Turtle, createVM, World } from './logic';

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
function createLineSegment(position: Vec3, rotation: Euler3Deg, length: number, color: Color) {
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

function executeProgram(program) {
  const world: World = {
    resetWorld: resetGlobalState,
    drawLine: createLineSegment,
    updateTurtle: updateTurtleObject,
  };
  const vm = createVM();
  vm.executeProgram(program, world);
}

function onMessageReceived(message: string) {
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
  wsServer = new ws.Server({ port: 8080 });

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