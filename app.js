const socket = io();
let localStream;

const overlay = document.getElementById("overlay");
const localVideo = document.getElementById("localVideo");

document.getElementById("startBtn").onclick = async () => {
  overlay.style.display = "flex";

  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });

  localVideo.srcObject = localStream;
  socket.emit("start");
};

document.getElementById("stopBtn").onclick = () => {
  socket.emit("skip");
};

socket.on("waiting", () => {
  overlay.style.display = "flex";
});

socket.on("match", () => {
  overlay.style.display = "none";
});

socket.on("solo", () => {
  overlay.style.display = "none";
});
