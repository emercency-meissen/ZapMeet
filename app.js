const socket = io();

let pc;
let partnerId;
let stream;

const local = document.getElementById("local");
const remote = document.getElementById("remote");

navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(s => {
    stream = s;
    local.srcObject = stream;
  });

document.getElementById("start").onclick = () => {
  socket.emit("start");
};

socket.on("waiting", () => {
  console.log("Warten auf Partner");
});

socket.on("match", async ({ partnerId: pid, initiator }) => {
  partnerId = pid;

  pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });

  stream.getTracks().forEach(t => pc.addTrack(t, stream));

  pc.ontrack = e => {
    remote.srcObject = e.streams[0];
  };

  pc.onicecandidate = e => {
    if (e.candidate) {
      socket.emit("signal", { to: partnerId, data: e.candidate });
    }
  };

  if (initiator) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("signal", { to: partnerId, data: offer });
  }
});

socket.on("signal", async ({ from, data }) => {
  if (!pc) return;

  if (data.type === "offer") {
    await pc.setRemoteDescription(data);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("signal", { to: from, data: answer });
  } 
  else if (data.type === "answer") {
    await pc.setRemoteDescription(data);
  } 
  else {
    await pc.addIceCandidate(data);
  }
});

socket.on("leave", () => {
  if (pc) pc.close();
  pc = null;
  remote.srcObject = null;
});
