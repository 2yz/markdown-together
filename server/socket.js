const ShareDB = require('sharedb');
const otText = require('ot-text');
const WebSocket = require('ws');
const url = require('url');
const WebSocketJSONStream = require('websocket-json-stream');
const PubSub = require('pubsub-js');

ShareDB.types.register(otText.type);

class Socket {
  constructor() {
  }

  createServer(server) {
    let sharedb = new ShareDB();
    let wss = new WebSocket.Server({server: server});
    wss.on('connection', (ws, req) => {
      if (req.url === '/sharedb') {
        let stream = new WebSocketJSONStream(ws);
        sharedb.listen(stream);
      }
      if (req.url === '/cursor') {
        this.cursorHandler(ws)
      }
    });
  }

  cursorHandler(ws) {
    let session = null;
    let token = null;
    ws.on('message', (message) => {
      console.log('received: %s', message);
      let req = JSON.parse(message);
      switch (req.fn) {
        case 'init':
          session = {
            uid: req.uid,
            uc: req.uc,
            did: req.did
          };
          if (token !== null) {
            PubSub.unsubscribe(token);
          }
          token = PubSub.subscribe(session.did, (msg, data) => {
            if (data.uid === session.uid) return;
            ws.send(JSON.stringify(data));
          });
          break;
        case 'pub':
          if (session !== null) {
            let data = {
              type: 'pub',
              uid: session.uid,
              uc: session.uc,
              cursor: req.cursor
            };
            PubSub.publish(session.did, data);
          }
          break;
      }
    });

    ws.on('close', () => {
      console.log('disconnected');
      if (session) {
        PubSub.publish(session.did, {type: 'close', uid: session.uid});
      }
      if (token !== null) {
        PubSub.unsubscribe(token);
      }
      token = null;
      session = null;
    })
  }
}


let instance = new Socket();

module.exports = instance;
