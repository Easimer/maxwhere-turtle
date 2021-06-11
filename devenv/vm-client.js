'use strict';

function sendMessageNoReply(dest, msgObj, onSuccess, onError) {
  const message = JSON.stringify(msgObj);
  const ws = new WebSocket(dest);

  ws.addEventListener('open', () => {
    ws.send(message);
    ws.close();
    onSuccess(dest);
  });

  ws.addEventListener('error', () => {
    onError();
  });
}

function sendMessageReceiveReply(dest, msgObj, onSuccess, onError) {
  const message = JSON.stringify(msgObj);
  const ws = new WebSocket(dest);

  ws.addEventListener('message', (ev) => {
    ws.close();
    const response = JSON.parse(ev.data);
    onSuccess(response);
  });

  ws.addEventListener('open', () => {
    ws.send(message);
  });

  ws.addEventListener('error', () => {
    ws.close();
    onError();
  });
}

function sendProgram(dest, program, onSuccess, onError) {
  const message = {
    'type': 'execProgram',
    'program': program
  };
  sendMessageNoReply(dest, message, onSuccess, onError);
}

function sendPing(dest, onSuccess, onError) {  
  const message = {
    'type': 'ping'
  };

  sendMessageReceiveReply(dest, message, (response) => {
    if(response.type === 'pong') {
      onSuccess(response);
    } else {
      console.error(`Server responded to ping with '${response}'`);
      onError();
    }
  }, () => {
    onError();
  });
}

function beginSingleStep(dest, program, onSuccess, onError) {
  const message = {
    'type': 'beginSingleStep',
    'program': program
  };
  
  sendMessageReceiveReply(dest, message, (response) => {
    if(response.type === 'vmStarted') {
      onSuccess();
    } else {
      onError();
    }
  }, () => {
    onError();
  });
}

function step(dest, onSuccess, onError) {
  const message = {
    'type': 'step'
  };
  sendMessageReceiveReply(dest, message, (response) => {
    switch(response.type) {
      case 'vmReport':
        onSuccess(response.report);
        break;
      case 'vmDied':
        onError('vmDied');
        break;
    }
  }, () => {
    onError('wsError');
  });
}

export default {
  sendProgram,
  sendPing,
  beginSingleStep,
  step,
};
