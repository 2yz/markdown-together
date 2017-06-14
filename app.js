const http = require('http');
const Koa = require('koa');
const KoaStatic = require('koa-static');
const socket = require('./server/socket');

const app = new Koa();
const router = require('koa-router')();

app.use(KoaStatic('./public'));

router.get('/test', ctx => {
  ctx.body = 'test';
});
app.use(router.routes());

const server = http.createServer(app.callback()).listen(3000);
const sharedb = socket.createServer(server);
