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

// === Start ===
async function start() {
  localStream = await navigator.mediaDevices.getUserMedia({ video:true, audio:true });
  localVideo.srcObject = localStream;
  socket.emit('join', { language: languageSelect.value });
}
start();

// === Matching ===
socket.on('match', (partnerId) => { currentPartnerId = partnerId; createConnection(partnerId); });

// === WebRTC ===
async function createConnection(partnerId) {
  peerConnection = new RTCPeerConnection(config);
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
  peerConnection.ontrack = e => remoteVideo.srcObject = e.streams[0];
  peerConnection.onicecandidate = e => { if(e.candidate) socket.emit('ice-candidate', { candidate:e.candidate, target:partnerId }); };
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit('offer', { sdp:offer, target:partnerId });
}

// === Signaling ===
socket.on('offer', async ({ from, sdp }) => {
  currentPartnerId = from;
  peerConnection = new RTCPeerConnection(config);
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
  peerConnection.ontrack = e => remoteVideo.srcObject = e.streams[0];
  await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit('answer', { sdp: answer, target: from });
});

socket.on('answer', async ({ sdp }) => { await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp)); });
socket.on('ice-candidate', async ({ candidate }) => { if(candidate) await peerConnection.addIceCandidate(candidate); });
socket.on('partner-left', () => { endConnection(); currentPartnerId=null; start(); });

// === Chat ===
sendBtn.addEventListener('click', () => {
  const message = messageInput.value.trim();
  if(!message || !currentPartnerId) return;
  socket.emit('message', { message, target:currentPartnerId });
  const msgEl = document.createElement('div'); msgEl.textContent="Du: "+message; messagesDiv.appendChild(msgEl); messagesDiv.scrollTop = messagesDiv.scrollHeight; messageInput.value='';
});

socket.on('message', ({ message }) => { const msgEl=document.createElement('div'); msgEl.textContent=message; messagesDiv.appendChild(msgEl); messagesDiv.scrollTop = messagesDiv.scrollHeight; });

// === Skip / Block / Report ===
skipBtn.addEventListener('click', () => { socket.emit('skip'); });
blockBtn.addEventListener('click', () => { socket.emit('block'); });
reportBtn.addEventListener('click', () => { socket.emit('block'); });

// === End Connection ===
function endConnection() { if(peerConnection){ peerConnection.close(); peerConnection=null; remoteVideo.srcObject=null; } }
