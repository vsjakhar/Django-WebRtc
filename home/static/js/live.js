'use strict';

var sid = 1;
var roomName = 'st';
var ws = 'ws://';
if(window.location.protocol=="https:"){ ws = 'wss://'; }
var chatSocket = new ReconnectingWebSocket(ws + window.location.host + '/ws/video/' + roomName + '/');
chatSocket.onopen = function(msg) {
	console.log('Chat Socket Connection open', msg);
	peers[sid] = createPeerConnection();
    sendOffer(sid);
    addPendingCandidates(sid);
};

function sendMessage(message) {
  // console.log('Client sending message: ', message);
  chatSocket.send(JSON.stringify({
	'message': message
  }));
  // socket.emit('message', message);
}

// This client receives a message

chatSocket.onmessage = function(e) {
	var data = JSON.parse(e.data);
	var message = data['message'];
	handleSignalingData(data);
	
};

chatSocket.onclose = function(e) {
	// console.error('Chat socket closed unexpectedly');
	console.log('Chat socket closed unexpectedly');
};
////////////////////////////////////////////////

// Local stream that will be reproduced on the video.
let localStream;
var localVideo = document.querySelector('.localVideo');
var remoteVideo = document.querySelector('.remoteVideo');

// navigator.mediaDevices.getUserMedia({audio: false,video: true}).then(gotLocalMediaStream).catch(function(e) { alert('getUserMedia() error: ' + e.name); });

// function gotLocalMediaStream(stream) {
// 	localStream = stream;
// 	localVideo.srcObject = stream;
// 	// sendMessage('got user media');
// }

const PC_CONFIG = {};

// WebRTC methods
let peers = {}
let pendingCandidates = {}

let getLocalStream = () => {
    navigator.mediaDevices.getUserMedia({audio: true, video: true})
        .then((stream) => {
            console.log('Stream found');
            localStream = stream;
            localVideo.srcObject = stream;
            // Connect after making sure thzat local stream is availble
            // socket.connect();
        })
        .catch(error => {
            console.error('Stream not found: ', error);
        });
}

let createPeerConnection = () => {
    const pc = new RTCPeerConnection(PC_CONFIG);
    pc.onicecandidate = onIceCandidate;
    pc.onaddstream = onAddStream;
    pc.addStream(localStream);
    console.log('PeerConnection created');
    return pc;
};

let sendOffer = (sid) => {
    console.log('Send offer');
    peers[sid].createOffer().then(
        (sdp) => setAndSendLocalDescription(sid, sdp),
        (error) => {
            console.error('Send offer failed: ', error);
        }
    );
};

let sendAnswer = (sid) => {
    console.log('Send answer');
    peers[sid].createAnswer().then(
        (sdp) => setAndSendLocalDescription(sid, sdp),
        (error) => {
            console.error('Send answer failed: ', error);
        }
    );
};

let setAndSendLocalDescription = (sid, sessionDescription) => {
    peers[sid].setLocalDescription(sessionDescription);
    console.log('Local description set');
    sendData({sid, type: sessionDescription.type, sdp: sessionDescription.sdp});
};

let onIceCandidate = (event) => {
    if (event.candidate) {
        console.log('ICE candidate');
        sendData({
            type: 'candidate',
            candidate: event.candidate
        });
    }
};

let onAddStream = (event) => {
    console.log('Add stream');
    const newRemoteStreamElem = document.createElement('video');
    newRemoteStreamElem.autoplay = true;
    newRemoteStreamElem.srcObject = event.stream;
    document.querySelector('#remoteStreams').appendChild(newRemoteStreamElem);
};

let addPendingCandidates = (sid) => {
    if (sid in pendingCandidates) {
        pendingCandidates[sid].forEach(candidate => {
            peers[sid].addIceCandidate(new RTCIceCandidate(candidate))
        });
    }
}

let handleSignalingData = (data) => {
    // let msg = JSON.parse(data);
    console.log(data)
    // const sid = data.sid;
    // delete data.sid;
    switch (data.type) {
        case 'offer':
            peers[sid] = createPeerConnection();
            peers[sid].setRemoteDescription(new RTCSessionDescription(data));
            sendAnswer(sid);
            addPendingCandidates(sid);
            break;
        case 'answer':
            peers[sid].setRemoteDescription(new RTCSessionDescription(data));
            break;
        case 'candidate':
            if (sid in peers) {
                peers[sid].addIceCandidate(new RTCIceCandidate(data.candidate));
            } else {
                if (!(sid in pendingCandidates)) {
                    pendingCandidates[sid] = [];
                }
                pendingCandidates[sid].push(data.candidate)
            }
            break;
    }
};

// Start connection
getLocalStream();
