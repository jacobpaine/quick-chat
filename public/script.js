const socket = io("https://chat.finetunedfunctions.com", {
  path: "/quickchat/socket.io", // Ensure this matches the backend path
  transports: ["websocket"], // WebSocket-only for better performance
});

let currentRoom = "General";

document.getElementById("send-btn").addEventListener("click", () => {
  sendMessage();
});

document
  .getElementById("message-input")
  .addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault(); // Prevent newline
      sendMessage();
    }
  });

function sendMessage() {
  const input = document.getElementById("message-input");
  const message = input.value.trim();
  if (message && currentRoom) {
    socket.emit("message", { roomName: currentRoom, message });
    input.value = ""; // Clear the input field
  }
}

// Handle nickname setup
socket.on("nicknamePrompt", (promptMessage) => {
  const nickname = prompt(promptMessage) || "Anonymous";
  socket.emit("setNickname", nickname);
});

socket.on("nicknameError", (errorMessage) => {
  const nickname =
    prompt(`${errorMessage}\nPlease enter a different nickname:`) ||
    "Anonymous";
  socket.emit("setNickname", nickname);
});

socket.on("nicknameSuccess", (successMessage) => {
  const nickname = successMessage.split("Your nickname is set to ")[1];
  document.getElementById(
    "nickname-display"
  ).textContent = `Your name is: ${nickname}`;
});

// Display user list
socket.on("userList", (users) => {
  const userList = document.getElementById("user-list");
  userList.innerHTML = ""; // Clear the user list

  users.forEach((user) => {
    const userElement = document.createElement("li");
    userElement.textContent = user;
    userList.appendChild(userElement);
  });
});

// Update room map
function updateRoomMap(connectedRooms) {
  const roomMap = document.getElementById("room-map");
  roomMap.innerHTML = ""; // Clear the room map

  connectedRooms.forEach((room) => {
    const roomTile = document.createElement("div");
    roomTile.className = `room-tile ${room === currentRoom ? "current" : ""}`;
    roomTile.textContent = room;

    roomTile.addEventListener("click", () => {
      navigateToRoom(room);
    });

    roomMap.appendChild(roomTile);
  });
}

function navigateToRoom(roomName) {
  if (currentRoom) {
    socket.emit("leaveRoom", currentRoom);
  }
  socket.emit("joinRoom", roomName);
  currentRoom = roomName;
}

socket.on("message", (msg) => {
  console.log("Message from server:", msg); // Debug log
  const chatBox = document.getElementById("chat-box");
  const messageElement = document.createElement("div");
  messageElement.textContent = msg;
  chatBox.appendChild(messageElement);

  // Scroll to the latest message
  chatBox.scrollTop = chatBox.scrollHeight;
});

// Room map updates
socket.on("roomMap", (connectedRooms) => {
  updateRoomMap(connectedRooms);
});

// WebSocket connection
socket.on("connect", () => {
  navigateToRoom(currentRoom); // Join the default room on connection
});

socket.on("disconnect", () => {
  console.log("Disconnected from WebSocket server.");
});
