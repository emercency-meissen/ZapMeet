const socket = io();

let localStream;
let peerConnection;
let currentPartnerId = null;

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const skipBtn = document.getElementById('skipBtn');
const blockBtn = document.getElementById('blockBtn');
const reportBtn = document.getElementById('reportBtn');
const languageSelect = document.getElementById('language');

const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

// Lokales Video
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    localVideo.srcObject = stream;
    localStream = stream;
    joinRoom();
  }).catch(err => console.error(err));

function joinRoom() {
  socket.emit('join', { language: languageSelect.value });
}

// Matching
socket.on('match', (partnerId) => {
  currentPartnerId = partnerId;
  startConnection(partnerId);
});

// WebRTC Signalisierung
socket.on('offer', async (data) => {
  currentPartnerId = data.from;
  await startConnection(data.from);
  await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit('answer', { sdp: answer, target: data.from });
});

socket.on('answer', async (data) => {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
});

socket.on('ice-candidate', async (data) => {
  try { await peerConnection.addIceCandidate(data.candidate); } catch(e) {}
});

socket.on('partner-left', () => {
  currentPartnerId = null;
  endConnection();
  joinRoom();
});

// Chat
socket.on('message', (data) => {
  const msgEl = document.createElement('div');
  msgEl.textContent = data.message;
  messagesDiv.appendChild(msgEl);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

sendBtn.addEventListener('click', () => {
  const message = messageInput.value.trim();
  if(!message || !currentPartnerId) return;
  socket.emit('message', { message, target: currentPartnerId });
  const msgEl = document.createElement('div');
  msgEl.textContent = "Du: " + message;
  messagesDiv.appendChild(msgEl);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  messageInput.value = '';
});

// Skip / Block / Report
skipBtn.addEventListener('click', () => socket.emit('skip'));
blockBtn.addEventListener('click', () => socket.emit('block'));
reportBtn.addEventListener('click', () => socket.emit('block')); // Meldung = Block + Admin-Log möglich

// WebRTC Verbindung
async function startConnection(partnerId) {
  peerConnection = new RTCPeerConnection(config);
  peerConnection.remoteId = partnerId;

  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
  peerConnection.ontrack = e => remoteVideo.srcObject = e.streams[0];

  peerConnection.onicecandidate = e => {
    if(e.candidate) socket.emit('ice-candidate', { candidate:e.candidate, target: partnerId });
  };

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit('offer', { sdp: offer, target: partnerId });
}

function endConnection() {
  if(peerConnection){
    peerConnection.close();
    peerConnection = null;
    remoteVideo.srcObject = null;
  }
}
