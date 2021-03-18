const { wom } = require('maxwhere');
const { ipcMain } = require('electron');
const path = require('path');
const WebSocket = require('ws');
const log = require('electron-log');

var wss = null;

function onMessageReceived(message) {
  log.info("message: '" + message + "'");

  const msg = JSON.parse(message);
  if(msg != null) {
    log.info("Message received:");
    log.info(msg);
  }
}

const init = (props) => {
  log.info(props);
  wss = new WebSocket.Server({ port: 8080 });
  if(wss) {
    log.info('WS server running');
  } else {
    log.info('WS server didn\'t start');
  }

  if(wss != null) {
    wss.on('connection', function connection(ws) {
      log.info("new connection: " + ws);
      ws.on('message', onMessageReceived);
    });
  }

  log.info('ready');
};

const done = () => {
  log.info('done');
};

const IPC_CHANNEL_DEBUG = 'turtle-debug';

const render = (props, children) => {
  let debug_panel = wom.create('billboard', {
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
  wom.render(debug_panel);
  
  // using ipc listeners
  // IMPORTANT: callback registrations are not idempotent!
  // if you run a space N times and register the same callback N times
  // the callback will be executed N times. So, first we remove all listeners
  // for the given channel:
  ipcMain.removeAllListeners(IPC_CHANNEL_DEBUG);
  ipcMain.on(IPC_CHANNEL_DEBUG, (event, payload) => {
    log.info('IPC: ', payload);
    if (payload == "kill-ws") {
      if(ws != null) {
        ws.close();
        ws = null;
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
