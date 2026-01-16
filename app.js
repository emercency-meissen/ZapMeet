const socket = io();

let localStream;
let pc;
let partnerId = null;

const overlay = document.getElementById("overlay");
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

document.getElementById("startBtn").onclick = async () => {
  overlay.style.display = "flex";

  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });

  localVideo.srcObject = localStream;
  socket.emit("start");

  // 🔥 OME-TV-LOGIK: Overlay NUR KURZ
  setTimeout(() => {
    overlay.style.display = "none";
  }, 1500);
};

document.getElementById("stopBtn").onclick = () => {
  socket.emit("skip");
  cleanup();
};

socket.on("match", id => {
  partnerId = id;
  overlay.style.display = "none";

  pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });

  localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

  pc.ontrack = e => remoteVideo.srcObject = e.streams[0];

  pc.onicecandidate = e => {
    if (e.candidate) {
      socket.emit("signal", { to: partnerId, data: e.candidate });
    }
  };

  pc.createOffer().then(offer => {
    pc.setLocalDescription(offer);
    socket.emit("signal", { to: partnerId, data: offer });
  });
});

socket.on("signal", async ({ from, data }) => {
  if (!pc) {
    pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

    pc.ontrack = e => remoteVideo.srcObject = e.streams[0];

    pc.onicecandidate = e => {
      if (e.candidate) {
        socket.emit("signal", { to: from, data: e.candidate });
      }
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
  cleanup();
});

function cleanup() {
  if (pc) pc.close();
  pc = null;
  remoteVideo.srcObject = null;
}
