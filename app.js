const socket = io();
let localStream;

async function start(){
  document.getElementById("overlay").style.display="block";
  localStream = await navigator.mediaDevices.getUserMedia({video:true,audio:true});
  document.getElementById("local").srcObject = localStream;
  socket.emit("start");
}

function stop(){
  socket.emit("skip");
}

socket.on("match",()=>{
  document.getElementById("overlay").style.display="none";
});

socket.on("waiting",()=>{
  document.getElementById("overlay").style.display="block";
});
