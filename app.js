const socket = io();

let localStream;
let peerConnection;
let currentPartnerId = null;

const startBtn = document.getElementById('startBtn');
const startScreen = document.getElementById('startScreen');
const connectOverlay = document.getElementById('connectOverlay');
const mainUI = document.getElementById('mainUI');

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

const languageSelect = document.getElementById('language');

const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const skipBtn = document.getElementById('skipBtn');
const blockBtn = document.getElementById('blockBtn');
const reportBtn = document.getElementById('reportBtn');

const config = { iceServers: [{ urls:'stun:stun.l.google.com:19302' }] };

// === Startscreen Button ===
startBtn.addEventListener('click', ()=>{
  startScreen.style.display='none';
  connectOverlay.style.display='flex';
  mainUI.style.display='flex';
  startConnection();
});

async function startConnection(){
  localStream = await navigator.mediaDevices.getUserMedia({ video:true, audio:true });
  localVideo.srcObject = localStream;
  socket.emit('join',{ language: languageSelect.value });
}

// === Matching / Overlay ===
socket.on('match', partnerId=>{
  currentPartnerId = partnerId;
  connectOverlay.style.display='none';
  createPeerConnection(partnerId);
});

socket.on('partner-left', ()=>{
  endConnection();
  currentPartnerId=null;
  connectOverlay.style.display='flex';
  socket.emit('join',{ language: languageSelect.value });
});

// === WebRTC ===
function createPeerConnection(partnerId){
  peerConnection = new RTCPeerConnection(config);
  localStream.getTracks().forEach(track=>peerConnection.addTrack(track,localStream));
  peerConnection.ontrack=e=>remoteVideo.srcObject=e.streams[0];
  peerConnection.onicecandidate=e=>{ if(e.candidate) socket.emit('ice-candidate',{ target:partnerId, candidate:e.candidate }); };
  peerConnection.createOffer().then(offer=>{
    peerConnection.setLocalDescription(offer);
    socket.emit('offer',{ sdp:offer, target:partnerId });
  });
}

socket.on('offer', async ({ from, sdp })=>{
  currentPartnerId = from;
  peerConnection = new RTCPeerConnection(config);
  localStream.getTracks().forEach(track=>peerConnection.addTrack(track,localStream));
  peerConnection.ontrack=e=>remoteVideo.srcObject=e.streams[0];
  await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit('answer',{ sdp:answer, target:from });
});

socket.on('answer', async ({ sdp })=>{ await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp)); });
socket.on('ice-candidate', async ({ candidate })=>{ if(candidate) await peerConnection.addIceCandidate(candidate); });

// === Chat ===
sendBtn.addEventListener('click', ()=>{
  const msg = messageInput.value.trim();
  if(!msg || !currentPartnerId) return;
  socket.emit('message',{ message: msg, target:currentPartnerId });
  const el=document.createElement('div'); el.textContent="Du: "+msg; messagesDiv.appendChild(el); messagesDiv.scrollTop=messagesDiv.scrollHeight;
  messageInput.value='';
});

socket.on('message', ({ message })=>{ const el=document.createElement('div'); el.textContent=message; messagesDiv.appendChild(el); messagesDiv.scrollTop=messagesDiv.scrollHeight; });

// === Skip / Block / Report ===
skipBtn.addEventListener('click', ()=>socket.emit('skip'));
blockBtn.addEventListener('click', ()=>socket.emit('block'));
reportBtn.addEventListener('click', ()=>socket.emit('block'));

// === End Connection ===
function endConnection(){ if(peerConnection){ peerConnection.close(); peerConnection=null; remoteVideo.srcObject=null; } }
