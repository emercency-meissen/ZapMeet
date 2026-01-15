const socket = io();
let pc;
let localStream;
let partner = null;

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const overlay = document.getElementById("overlay");

document.getElementById("startBtn").onclick = async () => {
  overlay.style.display = "flex";
  localStream = await navigator.mediaDevices.getUserMedia({ video:true, audio:true });
  localVideo.srcObject = localStream;
  socket.emit("start");
};

document.getElementById("stopBtn").onclick = () => {
  socket.emit("skip");
};

socket.on("waiting", () => {
  overlay.style.display = "flex";
});

socket.on("match", async id => {
  partner = id;
  overlay.style.display = "none";

  pc = new RTCPeerConnection({
    iceServers: [{ urls:"stun:stun.l.google.com:19302" }]
  });

  localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

  pc.ontrack = e => remoteVideo.srcObject = e.streams[0];
  pc.onicecandidate = e => {
    if (e.candidate) socket.emit("signal", { to: partner, data: e.candidate });
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  socket.emit("signal", { to: partner, data: offer });
});

socket.on("signal", async ({ from, data }) => {
  if (!pc) {
    pc = new RTCPeerConnection({ iceServers:[{urls:"stun:stun.l.google.com:19302"}] });
    localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
    pc.ontrack = e => remoteVideo.srcObject = e.streams[0];
    pc.onicecandidate = e => {
      if (e.candidate) socket.emit("signal", { to: from, data: e.candidate });
    };
  }

  if (data.type) {
    await pc.setRemoteDescription(data);
    if (data.type === "offer") {
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("signal", { to: from, data: answer });
    }
  } else {
    await pc.addIceCandidate(data);
  }
});

socket.on("end", () => {
  overlay.style.display = "flex";
  remoteVideo.srcObject = null;
  if (pc) pc.close();
  pc = null;
});
