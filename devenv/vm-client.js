'use strict';

function sendProgram(dest, program, onSuccess, onError) {
    const ws = new WebSocket(dest);

    ws.addEventListener('open', (ev) => {
        const message = {
            "type": "execProgram",
            "program": program
        };
        const messageJson = JSON.stringify(message);

        ws.send(messageJson);
        ws.close();
        onSuccess(dest);
    });

    ws.addEventListener('error', (ev) => {
        onError();
    });
}