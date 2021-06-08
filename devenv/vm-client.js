'use strict';

function sendProgram(dest, program, onSuccess, onError) {
  const ws = new WebSocket(dest);

  ws.addEventListener('open', () => {
    const message = {
      'type': 'execProgram',
      'program': program
    };
    const messageJson = JSON.stringify(message);

    ws.send(messageJson);
    ws.close();
    onSuccess(dest);
  });

  ws.addEventListener('error', () => {
    onError();
  });
}

function sendPing(dest, onSuccess, onError) {  
  const message = {
    'type': 'ping'
  };
  const messageJson = JSON.stringify(message);

  const ws = new WebSocket(dest);

  ws.addEventListener('message', (ev) => {
    ws.close();
    const response = JSON.parse(ev.data);
    if(response.type === 'pong') {
      onSuccess(response);
    }
  });

  ws.addEventListener('open', () => {
    ws.send(messageJson);
  });

  ws.addEventListener('error', () => {
    ws.close();
    onError();
  });
}

export default {
  sendProgram,
  sendPing,
};
