'use strict';

//variable '$self' is used for things on users side of call
//starts by setting audio to off and video to on
const $self = {
  rtcConfig: null,
  audio: false,
  constraints: { audio: false, video: true },
  isPolite: false,
  isMakingoffer: false,
  isIgnoringOffer: false,
  isSettingRemoteAnswerPending: false
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
  $self.stream = await navigator.mediaDevices
    .getUserMedia(constraints);
  displayStream('#self', $self.stream);
  audioStream('#self', $self.stream);
}

//Socket server events and callbacks
//namespace to use hash in window
const namespace = prepareNamespace(window.location.hash, true);

//pass in namespace for particular hash
const sc = io(`/${namespace}`, { autoConnect: false });

registerScEvents();

const button = document
  .querySelector('#join-call');

  function audioStream(selector, stream) {
    const audio = document.querySelector(selector);
    audio.srcObject = stream;
  }

  const mute = document.querySelector('#mutebutton');
    mutebutton.onclick = function (){
    if ($self.audio === false) {
           $self.audio = true;
           console.log('Audio turned On!');
           mutebutton.innerText = 'Mute';
      }
    else {
            $self.audio = false;
            console.log('Audio turned Off!');
            mutebutton.innerText = 'Unmute';
  }};

//Opens socket.io connection when 'join-call' button is clicked
button.addEventListener('click', handleButton);

function displayStream(selector, stream) {
  const video = document.querySelector(selector);
  video.srcObject = stream;
}

//if call is joined, button changes to leave call
function handleButton(e) {
  const button = e.target;
  if (button.className === 'join') {
    button.className = 'leave';
    button.innerText = 'Leave Call';
    joinCall();
  } else {
    button.className = 'join';
    button.innerText = 'Join Call';
    leaveCall();
  }
}

const selfvideo = document.querySelector('#selfvideo');

  selfvideo.onclick = function (){
    const vid = document.getElementById("self");
  if ($self.constraints.video === true) {
         $self.constraints.video = false;
         vid.pause();
         console.log('Video turned off!');
         selfvideo.innerText = 'Video On';
    }
  else if ($self.constraints.video === false) {
          $self.constraints.video = true;
          vid.play();
          console.log('Video turned On!');
          selfvideo.innerText = 'Video Off';

}};

chat.onclick = function (){
const form = document.getElementsByTagName('form');
  if (form.hasAttribute("hidden")) {
       form.removeAttribute("hidden");
       console.log('Chat Closed!');
       selfvideo.innerText = 'Close Chat';
  }
else {
        form.setAttribute("hidden")
        console.log('Chat Opened!!');
        selfvideo.innerText = 'Open Chat';

}};

//join and leave call callbacks
function joinCall() {
  sc.open();
  //registers events after connecting to server
  registerRtcEvents($peer);
  establishCallFeatures($peer);
}
function leaveCall() {
  $peer.connection.close();
  $peer.connection = new RTCPeerConnection($self.rtcConfig);
  displayStream('#peer', null);
  audioStream('#peer', null);
  sc.close();
}
//
function establishCallFeatures(peer) {
  peer.connection.addTrack($self.stream.getTracks()[0], $self.stream);
  peer.connection.addTrack($self.stream.getTracks()[1], $self.stream);
}

function registerRtcEvents(peer) {
  peer.connection.onnegotiationneeded = handleRtcNegotiation;
  peer.connection.onicecandidate = handleIceCandidate;
  peer.connection.ontrack = handleRtcTrack;
}

async function handleRtcNegotiation() {
  console.log('RTC negotiation needed');
  $self.isMakingoffer = true;
  await $peer.connection.setLocalDescription();
  //emit SDP signal
  sc.emit('signal', { description:
    $peer.connection.localDescription })
  //As soon as offer is sent, it will be set back to false
  $self.isMakingoffer = false;
}

//start to chat log JS
/*
const chatbutton = document
  .querySelector('#chat-form');

button.addEventListener('click', sendChat);

function sendChat() {
  sendchat.onclick = openForm();
}

function endChat() {
  closebutton.onclick = exitForm();
}

*/

//emits signal for candidate
//sets up video stream to display when joined call

function handleIceCandidate({ candidate }) {
  sc.emit('signal', { candidate:
    candidate })
}

//function for streaming peer on the RTC track
function handleRtcTrack({ track, streams: [stream] }) {
  displayStream('#peer', stream);
  audioStream('#peer', stream);
}

//Calling a reference to the function that gets executed
//Connecting and disconnecting peers
function registerScEvents() {
  sc.on('connect', handleScConnect);
  sc.on('connected peer', handleScConnectedPeer);
  sc.on('signal', handleScSignal);
  sc.on('disconnected peer', handleScDisconnectedPeer);
}

//Calling functions to log connections and disconnections in console
async function handleScSignal({ description, candidate }) {
  console.log('Heard signal event');
  if (description) {
    console.log('SDP signal:', description);
    //getting ready to accept or reject an offer
    const readyForOffer =
    //self must not be making an offer to accept
        !$self.isMakingOffer &&
    //signaling state has to be stable or setting is set to remote
    //answer pending
        ($peer.connection.signalingState === 'stable'
          || $self.isSettingRemoteAnswerPending);
    //locally created variable seeing if the description type is an offer
    //and if it isnt ready for an offer
    const offerCollision = description.type === 'offer' && !readyForOffer;
    //only the impolite peer will ignore offers
    $self.isIgnoringOffer = !$self.isPolite && offerCollision;
    //if self is ignoring offers sent drop return and exit function
    if ($self.isIgnoringOffer) {
      return;
    }

    //remote answer pending is true if description type is 'answer'
    $self.isSettingRemoteAnswerPending = description.type === 'answer';
    await $peer.connection.setRemoteDescription(description);

    $self.isSettingRemoteAnswerPending = false;

    //if description type is an offer an answer must be set
    //re-run setLocalDescription and it will generate an answer
    if (description.type === 'offer') {
      await $peer.connection.setLocalDescription();
      sc.emit('signal',
        { description:
          $peer.connection.localDescription });
    }
  } else if (candidate) {
    console.log('Received ICE candidate:', candidate);
    try {
      await $peer.connection.addIceCandidate(candidate);
    } catch(e) {
      if (!$self.isIgnoringOffer) {
        console.error('Unable to add ICE candidate for peer', e);
      }
    }
  }
}

function handleScConnect() {
  console.log('Socket.io connection established');
}

function handleScConnectedPeer() {
  console.log('Peer connected event');
  $self.isPolite = true;
}

function handleScDisconnectedPeer() {
  console.log('Peer disconnected event');
  displayStream('#peer', null);
  audioStream('#peer', null);
  $peer.connection.close();
  $peer.connection = new RTCPeerConnection($self.rtcConfig);
  registerRtcEvents($peer);
  establishCallFeatures($peer);
}

//function to generate random namespace
function prepareNamespace(hash, set_location) {
  let ns = hash.replace(/^#/, ''); // remove # from the hash
  if (/^[0-9]{6}$/.test(ns)) {
    console.log('Testing namespace...', ns);
    return ns;
  }
  ns = Math.random().toString().substring(2, 8);
  console.log('New namespace generated!', ns);
  if (set_location) window.location.hash = ns;
  return ns;
}
