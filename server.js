const dotenv = require("dotenv");
const path = require("path");
const cors = require("cors");
const https = require("https");
const fs = require("fs");
const express = require("express");
const http = require("http");

dotenv.config();

const app = express();
app.use(
  "/socket.io",
  express.static(path.join(__dirname, "node_modules/socket.io/client-dist"))
);
app.use(express.static(path.join(__dirname, "public")));

const options = {
  key: fs.readFileSync("./certs/privkey.pem"),
  cert: fs.readFileSync("./certs/fullchain.pem"),
};

const server = https.createServer(options, app);
http
  .createServer((req, res) => {
    res.writeHead(301, { Location: `https://${req.headers.host}${req.url}` });
    res.end();
  })
  .listen(80, () => {
    console.log("HTTP server redirecting to HTTPS");
  });

http.createServer(app).listen(8081, () => {
  console.log("HTTP server running on http://localhost:8081");
});

const io = require("socket.io")(server, {
  cors: {
    origin: ["https://chat.finetunedfunctions.com", "http://localhost:8081"],
    methods: ["GET", "POST"],
  },
  path: "/quickchat/socket.io",
});

app.use(cors({ origin: "https://finetunedfunctions.com" }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/quickchat", express.static(path.join(__dirname, "public")));

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
  roomUsers[defaultRoom] = roomUsers[defaultRoom] || new Set();
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
    roomUsers[roomName] = roomUsers[roomName] || new Set();
    roomUsers[roomName].add(nickname);
    io.to(roomName).emit("userList", Array.from(roomUsers[roomName]));
    socket.emit("roomMap", roomMap[roomName]);
    socket.emit("message", `You have joined the ${roomName} chat.`);
    socket
      .to(roomName)
      .emit("message", `${nickname || "A user"} has joined the room.`);
  });

  socket.on("message", ({ roomName, message }) => {
    const nickname = userNicknames[socket.id] || "Anonymous";
    const fullMessage = `${nickname}: ${message}`;
    io.to(roomName).emit("message", fullMessage);
  });

  socket.on("disconnect", () => {
    const nickname = userNicknames[socket.id];
    delete userNicknames[socket.id];

    for (const roomName in roomUsers) {
      if (roomUsers[roomName].has(nickname)) {
        roomUsers[roomName].delete(nickname);
        io.to(roomName).emit("userList", Array.from(roomUsers[roomName]));
      }
    }
  });
});

const PORT = process.env.PORT || 443;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on https://chat.finetunedfunctions.com`);
});
