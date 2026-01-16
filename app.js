const socket = io();

const overlay = document.getElementById("overlay");
const localVideo = document.getElementById("local");
const remoteVideo = document.getElementById("remote");

const startBtn = document.getElementById("start");
const nextBtn = document.getElementById("next");
const stopBtn = document.getElementById("stop");

let pc = null;
let stream = null;
let partnerId = null;

/* ===== MEDIA ===== */
async function initMedia() {
  stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });
  localVideo.srcObject = stream;
  await localVideo.play();
}

/* ===== PEER RESET ===== */
function resetPeer() {
  if (pc) {
    pc.ontrack = null;
    pc.onicecandidate = null;
    pc.close();
    pc = null;
  }
  remoteVideo.srcObject = null;
  partnerId = null;
}

/* ===== START ===== */
startBtn.onclick = async () => {
  overlay.style.display = "flex";
  startBtn.disabled = true;
  nextBtn.disabled = false;
  stopBtn.disabled = false;

  if (!stream) await initMedia();
  socket.emit("start");
};

/* ===== NEXT ===== */
nextBtn.onclick = () => {
  resetPeer();
  overlay.style.display = "flex";
  socket.emit("start");
};

/* ===== STOP ===== */
stopBtn.onclick = () => {
  resetPeer();
  overlay.style.display = "none";
  startBtn.disabled = false;
  nextBtn.disabled = true;
  stopBtn.disabled = true;
};

/* ===== SOCKET ===== */
socket.on("waiting", () => {
  // Overlay bleibt sichtbar
});

socket.on("matched", async ({ id, init }) => {
  overlay.style.display = "none";
  partnerId = id;

  pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });

  stream.getTracks().forEach(t => pc.addTrack(t, stream));

  pc.ontrack = e => {
    remoteVideo.srcObject = e.streams[0];
    remoteVideo.muted = false;
    remoteVideo.play().catch(() => {});
  };

  pc.onicecandidate = e => {
    if (e.candidate) {
      socket.emit("signal", {
        to: partnerId,
        data: e.candidate
      });
    }
  };

  if (init) {
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
