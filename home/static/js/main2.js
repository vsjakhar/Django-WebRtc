'use strict';

var userlist = Array();
var userid = $('meta[name=user]').attr("content");

// WebRTC methods
let peers = {}
let pendingCandidates = {}
let localStream;
// const PC_CONFIG = {};
const PC_CONFIG = {
	iceServers: [
    {   
      urls: [ "stun:bn-turn1.xirsys.com" ]
    }, 
    {   
      username: "0kYXFmQL9xojOrUy4VFemlTnNPVFZpp7jfPjpB3AjxahuRe4QWrCs6Ll1vDc7TTjAAAAAGAG2whXZWJUdXRzUGx1cw==",   
      credential: "285ff060-5a58-11eb-b269-0242ac140004",   
      urls: [       
        "turn:bn-turn1.xirsys.com:80?transport=udp",       
        "turn:bn-turn1.xirsys.com:3478?transport=udp",       
        "turn:bn-turn1.xirsys.com:80?transport=tcp",       
        "turn:bn-turn1.xirsys.com:3478?transport=tcp",       
        "turns:bn-turn1.xirsys.com:443?transport=tcp",       
        "turns:bn-turn1.xirsys.com:5349?transport=tcp"   
       ]
     }
   ]
};
// const PC_CONFIG = null;
// const PC_CONFIG = {
// 	'iceServers': [{
// 		'urls': 'stun:stun.l.google.com:19302'
//   }]
// };

var roomName = 'st';
var ws = 'ws://';
if(window.location.protocol=="https:"){ ws = 'wss://'; }
// var chatSocket = new WebSocket(ws + window.location.host + '/ws/video/' + roomName + '/');
var chatSocket = new ReconnectingWebSocket(ws + window.location.host + '/ws/video/' + roomName + '/');
chatSocket.onopen = function(e) {
	console.log('Chat Socket Connection open for user = '+userid);
	// peers[userid] = createPeerConnection();
	// startAction();
};

function sendData(message, mtype='candidate') {
	// console.log('Client sending message: ', message);
	chatSocket.send(JSON.stringify({
		'message': message,
		'mtype': mtype
	}));
}

// This client receives a message

chatSocket.onmessage = function(e) {
	var data = JSON.parse(e.data);
	// console.log(data);
	var message = data['message'];
	handleSignalingData(data);
	// if (data['mtype']=='offer'){
	// 	// callAction();
	// 	if(userlist.indexOf(data['uid']) < 0){
	// 		sendData(userid, 'offer');
	// 		userlist.push(data['uid']);
	// 		$('.users').append('<button class="btn btn-primary">'+data['display']+'</button>');
	// 		if(userid != data['uid']){
	// 			// callAction();
	// 		}
	// 	}
	// }
	
};

chatSocket.onclose = function(e) {
	// console.error('Chat socket closed unexpectedly');
	console.log('Chat socket closed unexpectedly');
};

let getLocalStream = () => {
    navigator.mediaDevices.getUserMedia({audio: true, video: true})
        .then((stream) => {
            console.log('Stream found');
            localStream = stream;
            document.querySelector('#localVideo').srcObject = stream;
            // Connect after making sure thzat local stream is availble
            // socket.connect();
            peers[userid] = createPeerConnection();
            sendOffer(userid);
            addPendingCandidates(userid);
        })
        .catch(error => {
            console.error('Stream not found: ', error);
        });
}


let createPeerConnection = () => {
    const pc = new RTCPeerConnection(PC_CONFIG);
    // const pc = new webkitRTCPeerConnection(PC_CONFIG);
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
    document.querySelector('#remoteVideo').appendChild(newRemoteStreamElem);
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
    const sid = data.uid;
    // const sid = data.sid;
    // delete data.sid;
    data = data['message'];
    console.log(data);
    switch (data.type) {
        case 'offer':
            peers[sid] = createPeerConnection();
            peers[sid].setRemoteDescription(new RTCSessionDescription(data));
            sendAnswer(sid);
            addPendingCandidates(sid);
            break;
        case 'answer':
        		console.log(peers,sid);
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
