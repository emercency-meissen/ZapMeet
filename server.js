const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ALLES aus Root laden
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

let waiting = null;

io.on("connection", socket => {

  socket.on("start", () => {
    if (waiting) {
      socket.partner = waiting.id;
      waiting.partner = socket.id;

      socket.emit("match", waiting.id);
      waiting.emit("match", socket.id);

      waiting = null;
    } else {
      waiting = socket;
      socket.emit("waiting");
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
    socket.emit("waiting");
  });

  socket.on("disconnect", () => {
    if (waiting === socket) waiting = null;
    if (socket.partner) {
      io.to(socket.partner).emit("end");
    }
  });

});

server.listen(process.env.PORT || 3000);
