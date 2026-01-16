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

let waiting = null;

io.on("connection", socket => {
  console.log("CONNECTED", socket.id);

  socket.on("start", () => {
    if (waiting && waiting.id !== socket.id) {
      const partner = waiting;
      waiting = null;

      socket.partner = partner.id;
      partner.partner = socket.id;

      socket.emit("match", { partnerId: partner.id, initiator: true });
      partner.emit("match", { partnerId: socket.id, initiator: false });
    } else {
      waiting = socket;
      socket.emit("waiting");
    }
  });

  socket.on("signal", ({ to, data }) => {
    io.to(to).emit("signal", { from: socket.id, data });
  });

  socket.on("disconnect", () => {
    if (waiting?.id === socket.id) waiting = null;
    if (socket.partner) {
      io.to(socket.partner).emit("leave");
    }
  });
});

server.listen(process.env.PORT || 3000, () => {
  console.log("ZapMeet läuft");
});
