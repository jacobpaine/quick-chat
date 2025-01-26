const socket = io();

let currentRoom = "General";

document.getElementById("send-btn").addEventListener("click", () => {
  const input = document.getElementById("message-input");
  const message = input.value.trim();
  if (message && currentRoom) {
    socket.emit("message", { roomName: currentRoom, message });
    input.value = "";
  }
});

document
  .getElementById("message-input")
  .addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault(); // Prevent newline in the input field
      const input = event.target;
      const message = input.value.trim();
      if (message && currentRoom) {
        socket.emit("message", { roomName: currentRoom, message });
        input.value = "";
      }
    }
  });

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

socket.on("userList", (users) => {
  const userList = document.getElementById("user-list");
  userList.innerHTML = "";

  users.forEach((user) => {
    const userElement = document.createElement("li");
    userElement.textContent = user;
    userList.appendChild(userElement);
  });
});

function updateRoomMap(connectedRooms) {
  const roomMap = document.getElementById("room-map");
  roomMap.innerHTML = "";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "connections");
  svg.setAttribute("viewBox", "0 0 300 300");
  roomMap.appendChild(svg);

  const positions = [
    { room: "Top Room", row: 1, col: 2 },
    { room: "Left Room", row: 2, col: 1 },
    { room: "Center Room", row: 2, col: 2 },
    { room: "Right Room", row: 2, col: 3 },
    { room: "Bottom Room", row: 3, col: 2 },
  ];

  const connections = [
    { from: "Top Room", to: "Center Room", type: "vertical" },
    { from: "Left Room", to: "Center Room", type: "horizontal" },
    { from: "Right Room", to: "Center Room", type: "horizontal" },
    { from: "Bottom Room", to: "Center Room", type: "vertical" },
  ];

  const rooms = {};

  positions.forEach((pos) => {
    const roomTile = document.createElement("div");
    roomTile.className = `room-tile ${
      pos.room === currentRoom ? "current" : ""
    }`;
    roomTile.style.gridRow = pos.row;
    roomTile.style.gridColumn = pos.col;
    roomTile.textContent = pos.room;

    roomTile.addEventListener("click", () => {
      navigateToRoom(pos.room);
    });

    roomMap.appendChild(roomTile);
    rooms[pos.room] = roomTile;
  });
}

function navigateToRoom(roomName) {
  if (currentRoom) {
    socket.emit("leaveRoom", currentRoom);
  }
  socket.emit("joinRoom", roomName);
  currentRoom = roomName;
}

function animateRoomTransition(tile) {
  tile.classList.add("transitioning");
  setTimeout(() => {
    tile.classList.remove("transitioning");
  }, 300);
}

socket.on("message", (msg) => {
  const chatBox = document.getElementById("chat-box");
  const messageElement = document.createElement("div");
  messageElement.textContent = msg;
  chatBox.appendChild(messageElement);
});

socket.on("roomMap", (connectedRooms) => {
  updateRoomMap(connectedRooms);
});

socket.on("message", (msg) => {
  const chatBox = document.getElementById("chat-box");
  chatBox.value += `${msg}\n`; // Append message to the text area
  chatBox.scrollTop = chatBox.scrollHeight; // Scroll to the latest message
});

navigateToRoom(currentRoom);
