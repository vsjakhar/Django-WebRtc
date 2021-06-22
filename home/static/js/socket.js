// const SIGNALING_SERVER_URL = 'ws://127.0.0.1:8003';
const SIGNALING_SERVER_URL = 'ws://127.0.0.1/ws/video/st/';
// WebRTC config: you don't have to change this for the example to work
// If you are testing on localhost, you can just use PC_CONFIG = {}
const PC_CONFIG = {};

// Signaling methods
let socket = io(SIGNALING_SERVER_URL, {autoConnect: false});

socket.on('data', (data) => {
    console.log('Data received: ', data);
    handleSignalingData(data);
});

socket.on('ready', (msg) => {
    console.log('Ready');
    // Connection with signaling server is ready, and so is local stream
    peers[msg.sid] = createPeerConnection();
    sendOffer(msg.sid);
    addPendingCandidates(msg.sid);
});

let sendData = (data) => {
    socket.emit('data', data);
};

// WebRTC methods
let peers = {}
let pendingCandidates = {}
let localStream;

let getLocalStream = () => {
    navigator.mediaDevices.getUserMedia({audio: true, video: true})
        .then((stream) => {
            console.log('Stream found');
            localStream = stream;
            // Connect after making sure thzat local stream is availble
            socket.connect();
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
    const sid = data.sid;
    delete data.sid;
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
