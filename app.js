const socket = io();
const overlay = document.getElementById("overlay");

let pc, stream, partner;

navigator.mediaDevices.getUserMedia({ video:true, audio:true })
.then(s => {
  stream = s;
  document.getElementById("local").srcObject = s;
});

document.getElementById("start").onclick = () => {
  overlay.style.display = "flex";
  socket.emit("start");
};

socket.on("waiting", () => {
  // bleibt im Overlay
});

socket.on("matched", async d => {
  overlay.style.display = "none";
  partner = d.id;

  pc = new RTCPeerConnection({
    iceServers: [{ urls:"stun:stun.l.google.com:19302" }]
  });

  stream.getTracks().forEach(t => pc.addTrack(t, stream));
  pc.ontrack = e =>
    document.getElementById("remote").srcObject = e.streams[0];

  pc.onicecandidate = e =>
    e.candidate && socket.emit("signal", { to: partner, data: e.candidate });

  if (d.init) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("signal", { to: partner, data: offer });
  }
});

socket.on("signal", async d => {
  if (d.data.type === "offer") {
    await pc.setRemoteDescription(d.data);
    const ans = await pc.createAnswer();
    await pc.setLocalDescription(ans);
    socket.emit("signal", { to: d.from, data: ans });
  } else if (d.data.type === "answer") {
    await pc.setRemoteDescription(d.data);
  } else {
    await pc.addIceCandidate(d.data);
  }
});
