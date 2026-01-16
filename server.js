const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

let waitingUser = null;

io.on("connection", socket => {

  socket.on("start", () => {
    if (waitingUser && waitingUser.id !== socket.id) {
      socket.partner = waitingUser.id;
      waitingUser.partner = socket.id;

      socket.emit("match", waitingUser.id);
      waitingUser.emit("match", socket.id);

      waitingUser = null;
    } else {
      waitingUser = socket;
    }
  });

  socket.on("signal", data => {
    io.to(data.to).emit("signal", {
      from: socket.id,
      data: data.data
    });
  });

  socket.on("skip", () => {
    if (socket.partner) {
      io.to(socket.partner).emit("end");
    }
    socket.partner = null;
  });

  socket.on("disconnect", () => {
    if (waitingUser === socket) waitingUser = null;
    if (socket.partner) {
      io.to(socket.partner).emit("end");
    }
  });

});

server.listen(process.env.PORT || 3000);
