const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));
app.get("/", (_, res) =>
  res.sendFile(path.join(__dirname, "index.html"))
);

let waiting = null;

io.on("connection", socket => {
  socket.on("start", () => {
    if (waiting && waiting.id !== socket.id) {
      socket.emit("matched", { id: waiting.id, init: true });
      waiting.emit("matched", { id: socket.id, init: false });
      waiting = null;
    } else {
      waiting = socket;
      socket.emit("waiting");
    }
  });

  socket.on("signal", d =>
    io.to(d.to).emit("signal", d)
  );
});

server.listen(process.env.PORT || 3000);
