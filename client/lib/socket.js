import ShareDB from 'sharedb/lib/client'
import otText from 'ot-text'

ShareDB.types.register(otText.type);

const protocol = location.protocol === 'https:' ? 'wss://' : 'ws://';
const sws = new WebSocket(protocol + location.host + '/sharedb');
const cws = new WebSocket(protocol + location.host + '/cursor');
const shareConnection = new ShareDB.Connection(sws);

export default {
  sws: sws,
  cws: cws,
  shareConnection: shareConnection
}