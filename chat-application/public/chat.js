// Connect to Socket.io
const socket = io();

// Elements
const messagesEl = document.getElementById('messages');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const contactsList = document.getElementById('contactsList');
const chatWith = document.getElementById('chatWith');
const logoutBtn = document.getElementById('logoutBtn');
const undoBtn = document.getElementById('undoBtn');
const deleteBtn = document.getElementById('deleteBtn');
const archiveBtn = document.getElementById('archiveBtn');
const voiceCallBtn = document.getElementById('voiceCallBtn');
const videoCallBtn = document.getElementById('videoCallBtn');
const addContactForm = document.getElementById('addContactForm');
const addContactEmail = document.getElementById('addContactEmail');

// Placeholder: Get current user from localStorage (to be replaced with real user data)
let currentUser = JSON.parse(localStorage.getItem('user')) || { id: 'me', name: 'You' };
let currentContact = { id: 'contact1', name: 'Contact 1' };

// Identify user to Socket.io
if (currentUser && currentUser.id) {
  socket.emit('identify', currentUser.id);
}

// Render a message with delete/undo buttons for sender
function renderMessage(msg, isMe = false) {
  const div = document.createElement('div');
  div.className = 'message' + (isMe ? ' me' : '');
  if (msg.status === 'deleted') {
    div.innerHTML = `<span style="color:#888;font-style:italic">Message deleted</span><span class="timestamp">${moment(msg.createdAt).fromNow()}</span>`;
  } else {
    div.innerHTML = `
      <span>${msg.text}</span>
      <span class="timestamp">${moment(msg.createdAt).fromNow()}</span>
    `;
    if (isMe) {
      // Add delete and undo buttons only for your own messages
      const delBtn = document.createElement('button');
      delBtn.textContent = '🗑️';
      delBtn.title = 'Delete';
      delBtn.className = 'msg-action-btn';
      delBtn.onclick = async () => {
        const token = localStorage.getItem('token');
        await fetch(`/api/messages/${msg._id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        // Emit delete event for real-time update
        socket.emit('delete-message', { _id: msg._id, receiverId: currentContact.id });
        fetchMessages();
      };
      div.appendChild(delBtn);
      // Undo button (only for last message, within 2 min)
      if (msg.isLast) {
        const undoBtn = document.createElement('button');
        undoBtn.textContent = '↩️';
        undoBtn.title = 'Undo';
        undoBtn.className = 'msg-action-btn';
        undoBtn.onclick = async () => {
          const token = localStorage.getItem('token');
          await fetch('/api/messages/undo', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ receiver: currentContact.id })
          });
          // Emit undo event for real-time update
          socket.emit('undo-message', { receiverId: currentContact.id });
          fetchMessages();
        };
        div.appendChild(undoBtn);
      }
    }
  }
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// Fetch messages from backend (mark last message for undo)
async function fetchMessages() {
  messagesEl.innerHTML = '';
  const token = localStorage.getItem('token');
  const res = await fetch(`/api/messages?user1=${currentUser.id}&user2=${currentContact.id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  if (data.messages) {
    // Find last message sent by me
    let lastIdx = -1;
    data.messages.forEach((msg, idx) => {
      if (msg.sender === currentUser.id && msg.status === 'sent') lastIdx = idx;
    });
    data.messages.forEach((msg, idx) => {
      renderMessage({
        ...msg,
        isLast: idx === lastIdx && msg.sender === currentUser.id && msg.status === 'sent',
      }, msg.sender === currentUser.id);
    });
  }
}

// Listen for messages from server (real-time for both sender and receiver)
socket.on('message', (msg) => {
  // Only render if the message is for the current chat
  if ((msg.senderId === currentUser.id && msg.receiverId === currentContact.id) ||
      (msg.senderId === currentContact.id && msg.receiverId === currentUser.id)) {
    renderMessage(msg, msg.senderId === currentUser.id);
  }
});

// Listen for delete/undo events (real-time)
socket.on('delete-message', ({ _id }) => {
  fetchMessages();
});
socket.on('undo-message', () => {
  fetchMessages();
});

// Send message via backend API and Socket.io
messageForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;
  const token = localStorage.getItem('token');
  const msg = {
    sender: currentUser.id,
    receiver: currentContact.id,
    text,
  };
  // Send to backend
  const res = await fetch('/api/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(msg)
  });
  const data = await res.json();
  if (data.message) {
    // Emit to Socket.io for real-time
    socket.emit('message', {
      senderId: currentUser.id,
      receiverId: currentContact.id,
      text,
      createdAt: data.message.createdAt,
      _id: data.message._id,
    });
    renderMessage({
      text,
      createdAt: data.message.createdAt,
      senderId: currentUser.id,
      receiverId: currentContact.id,
      _id: data.message._id,
    }, true);
    messageInput.value = '';
  }
});

let contacts = [];

// Fetch contacts from backend
async function fetchContacts() {
  const token = localStorage.getItem('token');
  const res = await fetch('/api/auth/contacts', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  if (data.contacts) {
    contacts = data.contacts;
    renderContacts();
  }
}

// Render contacts in sidebar
function renderContacts() {
  contactsList.innerHTML = '';
  contacts.forEach((c) => {
    const li = document.createElement('li');
    const infoDiv = document.createElement('div');
    infoDiv.className = 'contact-info';
    const statusSpan = document.createElement('span');
    statusSpan.className = 'contact-status ' + (c.online ? 'online' : 'offline');
    infoDiv.appendChild(statusSpan);
    const nameSpan = document.createElement('span');
    nameSpan.textContent = c.name;
    infoDiv.appendChild(nameSpan);
    li.appendChild(infoDiv);
    li.className = c.id === currentContact.id ? 'active' : '';
    li.onclick = () => {
      currentContact = c;
      chatWith.textContent = 'Chat with ' + c.name;
      fetchMessages();
      renderContacts();
    };
    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '✖';
    removeBtn.title = 'Remove contact';
    removeBtn.className = 'remove-contact-btn';
    removeBtn.onclick = async (e) => {
      e.stopPropagation();
      const token = localStorage.getItem('token');
      await fetch('/api/auth/contacts/remove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ contactId: c.id })
      });
      fetchContacts();
    };
    li.appendChild(removeBtn);
    contactsList.appendChild(li);
  });
}

// Add contact by email
if (addContactForm) {
  addContactForm.onsubmit = async (e) => {
    e.preventDefault();
    const email = addContactEmail.value.trim();
    if (!email) return;
    const token = localStorage.getItem('token');
    // Find user by email (simulate: fetch all users, or add a real endpoint)
    // For now, prompt for userId
    const contactId = prompt('Enter user ID for ' + email + ' (simulate real lookup):');
    if (!contactId) return;
    await fetch('/api/auth/contacts/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ contactId })
    });
    addContactEmail.value = '';
    fetchContacts();
  };
}

// Update chat logic to use real contacts
function loadContacts() {
  fetchContacts();
}

// On page load, fetch contacts and set current contact
loadContacts();
chatWith.textContent = 'Chat with ' + currentContact.name;
fetchMessages();

// Logout
logoutBtn.onclick = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
};

// Undo, Delete, Archive (placeholders)
undoBtn.onclick = () => {
  alert('Undo last message (to be implemented)');
};
deleteBtn.onclick = () => {
  alert('Delete selected message (to be implemented)');
};
archiveBtn.onclick = async () => {
  const token = localStorage.getItem('token');
  await fetch('/api/messages/archive', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ user1: currentUser.id, user2: currentContact.id })
  });
  fetchMessages();
};

// --- WebRTC Voice/Video Call Logic ---
let localStream = null;
let remoteStream = null;
let peerConnection = null;
let isCalling = false;
let isVideoCall = false;

const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

const callModal = document.getElementById('callModal');
const callStatus = document.getElementById('callStatus');
const acceptCallBtn = document.getElementById('acceptCallBtn');
const declineCallBtn = document.getElementById('declineCallBtn');
const videoContainer = document.querySelector('.video-container');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const endCallBtn = document.getElementById('endCallBtn');

// Start call (voice or video)
async function startCall(video = false) {
  isVideoCall = video;
  localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: video
  });
  showVideoUI();
  peerConnection = createPeerConnection();
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
  localVideo.srcObject = localStream;
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit('call-user', {
    to: currentContact.id,
    offer
  });
  isCalling = true;
}

voiceCallBtn.onclick = () => startCall(false);
videoCallBtn.onclick = () => startCall(true);

// Create peer connection and set up handlers
function createPeerConnection() {
  const pc = new RTCPeerConnection(configuration);
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('ice-candidate', {
        to: currentContact.id,
        candidate: event.candidate
      });
    }
  };
  pc.ontrack = (event) => {
    if (!remoteStream) {
      remoteStream = new MediaStream();
      remoteVideo.srcObject = remoteStream;
    }
    remoteStream.addTrack(event.track);
  };
  return pc;
}

// Handle incoming call
socket.on('call-made', async ({ from, offer }) => {
  callModal.style.display = 'block';
  callStatus.textContent = 'Incoming call...';
  acceptCallBtn.onclick = async () => {
    callModal.style.display = 'none';
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: offer.sdp.includes('video') });
    showVideoUI();
    peerConnection = createPeerConnection();
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    localVideo.srcObject = localStream;
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer-call', { to: from, answer });
    isCalling = true;
  };
  declineCallBtn.onclick = () => {
    callModal.style.display = 'none';
    socket.emit('answer-call', { to: from, answer: null });
  };
});

// Handle answer to call
socket.on('answer-made', async ({ from, answer }) => {
  if (!answer) {
    endCall();
    alert('Call declined');
    return;
  }
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

// Handle ICE candidates
socket.on('ice-candidate', async ({ from, candidate }) => {
  if (peerConnection && candidate) {
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) { /* ignore */ }
  }
});

// End call logic
function endCall() {
  isCalling = false;
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }
  if (remoteStream) {
    remoteStream.getTracks().forEach(track => track.stop());
    remoteStream = null;
  }
  hideVideoUI();
}

endCallBtn.onclick = endCall;

function showVideoUI() {
  videoContainer.style.display = 'block';
  localVideo.style.display = 'inline-block';
  remoteVideo.style.display = 'inline-block';
}
function hideVideoUI() {
  videoContainer.style.display = 'none';
  localVideo.srcObject = null;
  remoteVideo.srcObject = null;
}