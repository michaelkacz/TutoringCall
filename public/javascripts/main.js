'use strict';

//variable '$self' is used for things on users side of call
//starts by setting audio to off and video to on
const $self = {
  constraints: { audio: false, video: true }
};

requestUserMedia($self.constraints);

//requests media usage from user in pop up
//finding video instance and setting video object to $self stream
async function requestUserMedia(constraints) {
  cont video = document.querySelector('$self');
  $self.stream = await navigator.mediaDevices
    .getUserMedia(constraints);
  video.srcObject = $self.stream;
}
