'use strict';

// Local stream that will be reproduced on the video.

var isChannelReady = false;
var isInitiator = false;
var isStarted = false;
var localStream;
var pc;
var remoteStream;
var turnReady;

// var pcConfig = {
//   'iceServers': [{
// 	'urls': 'stun:stun.l.google.com:19302'
//   }]
// };

const TURN_SERVER_URL = '13.233.120.133:3478';
const TURN_SERVER_USERNAME = 'turnuser';
const TURN_SERVER_CREDENTIAL = 'redhat';

// const pcConfig = {
// 	iceServers: [
// 		{
// 			urls: 'turn:' + TURN_SERVER_URL + '?transport=tcp',
// 			username: TURN_SERVER_USERNAME,
// 			credential: TURN_SERVER_CREDENTIAL
// 		},
// 		{
// 			urls: 'turn:' + TURN_SERVER_URL + '?transport=udp',
// 			username: TURN_SERVER_USERNAME,
// 			credential: TURN_SERVER_CREDENTIAL
// 		}
// 	]
// };
const pcConfig = {}

// Set up audio and video regardless of what devices are present.
var sdpConstraints = {
	offerToReceiveAudio: true,
	offerToReceiveVideo: true
};


var roomName = 'st';
var ws = 'ws://';
if(window.location.protocol=="https:"){ ws = 'wss://'; }
var chatSocket = new ReconnectingWebSocket(ws + window.location.host + '/ws/video/' + roomName + '/');
chatSocket.onopen = function(e) {
	// console.log('Chat Socket Connection open');
	isInitiator = true;
	isChannelReady = true;
};
// isInitiator = true;
// isChannelReady = true;
// console.log(chatSocket);
////////////////////////////////////////////////


// On this codelab, you will be streaming only video (video: true).
const mediaStreamConstraints = {
	video: true,
	audio: true,
	// video: { width: { min: 1280 }, height: { min: 720 } },
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
	// console.log('Client received message:', data['message']);
	if (message === 'got user media') {
		maybeStart();
	}else if (message.type === 'offer') {
		if (!isInitiator && !isStarted) {
			maybeStart();
		}
		pc.setRemoteDescription(new RTCSessionDescription(message));
		doAnswer();
	}else if (message.type === 'answer' && isStarted) {
		console.log("Before setRemoteDescription error calling..........");
		pc.setRemoteDescription(new RTCSessionDescription(message));
	}else if (message.type === 'candidate' && isStarted) {
		var candidate = new RTCIceCandidate({
			sdpMLineIndex: message.label,
			candidate: message.candidate
		});
		pc.addIceCandidate(candidate);
	}else if (message === 'bye' && isStarted){
		handleRemoteHangup();
	}
};

chatSocket.onclose = function(e) {
	// console.error('Chat socket closed unexpectedly');
	console.log('Chat socket closed unexpectedly');
};


var localVideo = document.querySelector('.localVideo');
var remoteVideo = document.querySelector('.remoteVideo');

navigator.mediaDevices.getUserMedia({audio: false,video: true}).then(gotStream).catch(function(e) { alert('getUserMedia() error: ' + e.name); });

function gotStream(stream) {
	// console.log('Adding local stream.');
	localStream = stream;
	localVideo.srcObject = stream;
	sendMessage('got user media');
	if (isInitiator) {
		maybeStart();
	}
}

// if (location.hostname !== 'localhost') {
// 	requestTurn('https://computeengineondemand.appspot.com/turn?username=41784574&key=4080218913');
// }

function maybeStart() {
	// console.log('>>>>>>> maybeStart() ', isStarted, localStream, isChannelReady);
	if (!isStarted && typeof localStream !== 'undefined' && isChannelReady) {
		// console.log('>>>>>> creating peer connection');
		createPeerConnection();
		pc.addStream(localStream);
		isStarted = true;
		// console.log('isInitiator', isInitiator);
		if (isInitiator) {
			doCall();
		}
	}
}

window.onbeforeunload = function() {
	sendMessage('bye');
};



/////////////////////////////////////////////////////////

function createPeerConnection() {
	try {
		// pc = new RTCPeerConnection(null);
		pc = new RTCPeerConnection(pcConfig);
		pc.onicecandidate = handleIceCandidate;
		pc.onaddstream = handleRemoteStreamAdded;
		pc.onremovestream = handleRemoteStreamRemoved;
		// console.log('Created RTCPeerConnnection');
	} catch (e) {
		console.log('Failed to create PeerConnection, exception: ' + e.message);
		alert('Cannot create RTCPeerConnection object.');
		return;
	}
}

function handleIceCandidate(event) {
	console.log('icecandidate event: ', event);
	if (event.candidate) {
		sendMessage({
		  type: 'candidate',
		  label: event.candidate.sdpMLineIndex,
		  id: event.candidate.sdpMid,
		  candidate: event.candidate.candidate
		});
	} else {
		console.log('End of candidates.');
	}
}

function handleCreateOfferError(event) {
	console.log('createOffer() error: ', event);
}

function doCall() {
	// console.log('Sending offer to peer');
	pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
}

function doAnswer() {
	// console.log('Sending answer to peer.');
	pc.createAnswer().then(setLocalAndSendMessage,onCreateSessionDescriptionError);
}

function setLocalAndSendMessage(sessionDescription) {
	pc.setLocalDescription(sessionDescription);
	console.log('setLocalAndSendMessage sending message', sessionDescription);
	sendMessage(sessionDescription);
}

function onCreateSessionDescriptionError(error) {
	trace('Failed to create session description: ' + error.toString());
}

// function requestTurn(turnURL) {
// 	var turnExists = false;
// 	for (var i in pcConfig.iceServers) {
// 		if (pcConfig.iceServers[i].urls.substr(0, 5) === 'turn:') {
// 		  turnExists = true;
// 		  turnReady = true;
// 		  break;
// 		}
// 	}
// 	if (!turnExists) {
// 		console.log('Getting TURN server from ', turnURL);
// 		// No TURN server. Get one from computeengineondemand.appspot.com:
// 		var xhr = new XMLHttpRequest();
// 		xhr.onreadystatechange = function() {
// 		  if (xhr.readyState === 4 && xhr.status === 200) {
// 			var turnServer = JSON.parse(xhr.responseText);
// 			console.log('Got TURN server: ', turnServer);
// 			pcConfig.iceServers.push({
// 			  'urls': 'turn:' + turnServer.username + '@' + turnServer.turn,
// 			  'credential': turnServer.password
// 			});
// 			turnReady = true;
// 		  }
// 		};
// 		xhr.open('GET', turnURL, true);
// 		xhr.send();
// 	}
// }

function handleRemoteStreamAdded(event) {
	console.log('Remote stream added.');
	remoteStream = event.stream;
	remoteVideo.srcObject = remoteStream;
}

function handleRemoteStreamRemoved(event) {
	console.log('Remote stream removed. Event: ', event);
}

function hangup() {
	console.log('Hanging up.');
	stop();
	sendMessage('bye');
}

function handleRemoteHangup() {
	console.log('Session terminated.');
	stop();
	isInitiator = false;
}

function stop() {
	isStarted = false;
	pc.close();
	pc = null;
}
