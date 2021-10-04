'use strict';

//variable '$self' is used for things on users side of call
//starts by setting audio to off and video to on
const $self = {
  rtcConfig: null,
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
  const video = document.querySelector('#self');
  $self.stream = await navigator.mediaDevices
    .getUserMedia(constraints);
  video.srcObject = $self.stream;
}

//Socket server events and callbacks
//namespace to use hash in window
const namespace = prepareNamespace(window.location.hash, true);

//pass in namespace for particular hash
const sc = io(`/${namespace}`, { autoConnect: false });

registerScEvents();

const button = document
  .querySelector('#join-call');

//Opens socket.io connection when 'join-call' button is clicked
button.addEventListener('click', joinCall);

//join and leave call callbacks
function joinCall() {
  sc.open();
  //registers events after connecting to server
  registerRtcEvents($peer);
  establishCallFeatures($peer);
}
function leaveCall() {
  sc.close();
}

//
function establishCallFeatures(peer) {
  peer.connection.addTrack($self.stream.getTracks()[0], $self.stream);
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

function handleIceCandidate({ candidate }) {
  sc.emit('signal', { candidate:
    candidate })
}

function handleRtcTrack() {

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
