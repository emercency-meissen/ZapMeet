const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

let waitingUsers = [];
let blockedUsers = {}; // {socketId: [blockedId,...]}

io.on('connection', (socket) => {
  console.log('Neuer Benutzer:', socket.id);

  socket.on('join', (data) => {
    socket.language = data.language || '';
    matchUser(socket);
  });

  function matchUser(user) {
    const partner = waitingUsers.find(u =>
      u.socket.id !== user.id &&
      (user.language === '' || u.language === user.language) &&
      (!blockedUsers[user.id] || !blockedUsers[user.id].includes(u.socket.id)) &&
      (!blockedUsers[u.socket.id] || !blockedUsers[u.socket.id].includes(user.id))
    );

    if (partner) {
      user.partnerId = partner.socket.id;
      partner.socket.partnerId = user.id;
      user.emit('match', partner.socket.id);
      partner.socket.emit('match', user.id);
      waitingUsers = waitingUsers.filter(u => u.socket.id !== user.id && u.socket.id !== partner.socket.id);
    } else {
      waitingUsers.push({ socket: user, language: user.language });
    }
  }

  socket.on('offer', (data) => {
    io.to(data.target).emit('offer', { sdp: data.sdp, from: socket.id });
  });

  socket.on('answer', (data) => {
    io.to(data.target).emit('answer', { sdp: data.sdp, from: socket.id });
  });

  socket.on('ice-candidate', (data) => {
    io.to(data.target).emit('ice-candidate', { candidate: data.candidate, from: socket.id });
  });

  socket.on('message', (msg) => {
    if(socket.partnerId) io.to(socket.partnerId).emit('message', { message: msg.message });
  });

  socket.on('skip', () => {
    if(socket.partnerId) {
      io.to(socket.partnerId).emit('partner-left');
      socket.partnerId = null;
    }
    matchUser(socket);
  });

  socket.on('block', () => {
    if(socket.partnerId) {
      blockedUsers[socket.id] = blockedUsers[socket.id] || [];
      blockedUsers[socket.id].push(socket.partnerId);
      io.to(socket.partnerId).emit('partner-left');
      socket.partnerId = null;
    }
    matchUser(socket);
  });

  socket.on('disconnect', () => {
    waitingUsers = waitingUsers.filter(u => u.socket.id !== socket.id);
    console.log('Benutzer getrennt:', socket.id);
    if(socket.partnerId) io.to(socket.partnerId).emit('partner-left');
  });
});

server.listen(3000, () => console.log('ZapMeet läuft auf http://localhost:3000'));
