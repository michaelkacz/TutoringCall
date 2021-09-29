'use strict';

//variable '$self' is used for things on users side of call
//starts by setting audio to off and video to on
const $self = {
  rtcConfig: null,
  constraints: { audio: false, video: true }
};

//$peer object is used as the second person in syscal
//Sets up a connection between two people ($self and $peer)
const $peer = {
  connection: new RTCPeerConnection($self.rtcConfig)
};

requestUserMedia($self.constraints);

//requests media usage from user in pop up
//finding video instance and setting video object to $self stream
async function requestUserMedia(constraints) {
  const video = document.querySelector('$self');
  $self.stream = await navigator.mediaDevices
    .getUserMedia(constraints);
  video.srcObject = $self.stream;
}

//Socket server events and callbacks
const button = document.querySelector('#join-call');
const sc = io({ autoConnect: false });
//Opens socket.io connection when 'join-call' button is clicked
button.addEventListener('click', function() {
  sc.open();
});

sc.on('connect', function() {
  console.log('Socket.io connection established');
});
