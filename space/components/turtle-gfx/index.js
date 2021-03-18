const { wom } = require('maxwhere')
const { ipcMain } = require('electron')


const path = require('path')


const init = (props) => {
}

const done = () => {
}

const render = (props, children) => {
  /*
  let devenv = wom.create('billboard', {
    url: path.resolve(__dirname, 'devenv.html'),
    nodeIntegration: true, // need this for IPC communication
    width: 586,
    height: 330,
    'resolution-width': 1600,
    'resolution-height': 900,
    position: { "x": 100, "y": 100, "z": -10 },
    orientation: { "x": 0, "y": 0, "z": 0, "w": -1 },
    physical: {raycast: true} // accept mouse events to make it orbitable
  })
  wom.render(devenv)
  */
  
  // using ipc listeners
  // IMPORTANT: callback registrations are not idempotent!
  // if you run a space N times and register the same callback N times
  // the callback will be executed N times. So, first we remove all listeners
  // for the given channel:
  ipcMain.removeAllListeners('turtle-channel')
  ipcMain.on('turtle-channel', (event, payload) => {
    console.log('IPC: ', payload)
  })
  
  return <node />
}

module.exports = {
  init,
  done,
  render
}
