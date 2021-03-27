const http = require('http')

const frontendPort = 4200; // typically angular
const backendPort = 3001;
const backendRoutePrefix = '/api'

const server = http.createServer((request, response) => {
  // console.log('Request: ' + request.url)

  const isApi = request.url.startsWith(backendRoutePrefix);
  const options = {
    hostname: 'localhost',
    port: isApi ? backendPort : frontendPort,
    path: request.url,
    method: request.method,
    headers: request.headers,
  };

  const proxy = http.request(options, (res) => {
    response.writeHead(res.statusCode, res.headers);
    res.pipe(response, {
      end: true
    });
  });

  proxy.on('error', error => {
    console.log('Error', error.code);
    response.destroy(error);
  })

  proxy.on('abort', error => {
    response.destroy(error);
  })

  if (proxy.writable) {
    request.pipe(proxy, {
      end: true
    });
  }

  request.on('error', error => {
    console.log('Error', error)
    response.end();
  })
});
/*
server.on('upgrade', (req, res) => {
  socket.write('HTTP/1.1 101 Web Socket Protocol Handshake\r\n' +
    'Upgrade: WebSocket\r\n' +
    'Connection: Upgrade\r\n' +
    '\r\n');

  socket.pipe(socket); // echo back
})*/

server.listen(3000)