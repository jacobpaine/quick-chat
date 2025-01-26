const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const roomMap = {
  General: ["Tech Talk", "Casual Chat"],
  "Tech Talk": ["General", "Project Ideas"],
  "Casual Chat": ["General"],
  "Project Ideas": ["Tech Talk"],
};

const userNicknames = {};
const roomUsers = {};

io.on("connection", (socket) => {
  const defaultRoom = "General";

  socket.join(defaultRoom);
  if (!roomUsers[defaultRoom]) roomUsers[defaultRoom] = new Set();

  socket.emit("roomMap", roomMap[defaultRoom]);
  socket.emit("nicknamePrompt", "Please enter your nickname:");
  socket.emit("message", `Welcome to the ${defaultRoom} chat!`);
  socket.to(defaultRoom).emit("message", "A new user has joined the room.");

  socket.on("setNickname", (nickname) => {
    if (Object.values(userNicknames).includes(nickname)) {
      socket.emit(
        "nicknameError",
        "This nickname is already taken. Please choose another."
      );
    } else {
      userNicknames[socket.id] = nickname;
      roomUsers[defaultRoom].add(nickname);
      io.to(defaultRoom).emit("userList", Array.from(roomUsers[defaultRoom]));
      socket.emit("nicknameSuccess", `Your nickname is set to ${nickname}.`);
      socket.emit("message", `Your nickname is set to ${nickname}.`);
    }
  });

  socket.on("joinRoom", (roomName) => {
    const previousRoom = Array.from(socket.rooms)[1];
    const nickname = userNicknames[socket.id];

    if (previousRoom && roomUsers[previousRoom]) {
      roomUsers[previousRoom].delete(nickname);
      io.to(previousRoom).emit("userList", Array.from(roomUsers[previousRoom]));
    }

    socket.leave(previousRoom);
    socket.join(roomName);
    if (!roomUsers[roomName]) roomUsers[roomName] = new Set();
    roomUsers[roomName].add(nickname);
    io.to(roomName).emit("userList", Array.from(roomUsers[roomName]));
    socket.emit("roomMap", roomMap[roomName]);
    socket.emit("message", `You have joined the ${roomName} chat.`);
    socket
      .to(roomName)
      .emit(
        "message",
        `${userNicknames[socket.id] || "A user"} has joined the room.`
      );
  });

  socket.on("leaveRoom", (roomName) => {
    socket.leave(roomName);
    socket.to(roomName).emit("message", "A user has left the room.");
  });

  socket.on("message", ({ roomName, message }) => {
    const nickname = userNicknames[socket.id] || "Anonymous";
    io.to(roomName).emit("message", `${nickname}: ${message}`);
  });

  socket.on("disconnect", () => {
    const nickname = userNicknames[socket.id] || "A user";
    delete userNicknames[socket.id];

    for (const roomName in roomUsers) {
      if (roomUsers[roomName].has(nickname)) {
        roomUsers[roomName].delete(nickname);
        io.to(roomName).emit("userList", Array.from(roomUsers[roomName]));
      }
    }
    console.log(`${nickname} disconnected`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
