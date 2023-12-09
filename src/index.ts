import express from "express";
import http from "http";
import { Server } from "socket.io";

// Create an Express app
const app = express();

// Create an HTTP server using the Express app
const server = http.createServer(app);

// Create a Socket.IO server and attach it to the HTTP server
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Function to remove a user from the chat room
function leaveRoom(userID: string, chatRoomUsers: any[]) {
  return chatRoomUsers.filter((user) => user.id !== userID);
}

// Constant for the chat bot username
const ADMIN = "admin";

// Variable to store the current chat room
let chatRoom = "";

// Array to store all connected users
let allUsers: { id: string; username: string; room: string }[] = [];

io.on("connection", (socket) => {
  console.log(`User connected ${socket.id}`);

  socket.on("join_room", (data) => {
    const { username, room } = data;
    socket.join(room);

    let __createdtime__ = Date.now();

    // Notify other users that a new user has joined the chat room
    socket.to(room).emit("receive_message", {
      message: `${username} has joined the chat room`,
      username: ADMIN,
      __createdtime__,
    });

    // Send a welcome message to the joined user
    socket.emit("receive_message", {
      message: `Welcome ${username}`,
      username: ADMIN,
      __createdtime__,
    });

    chatRoom = room;
    allUsers.push({ id: socket.id, username, room });
    const chatRoomUsers = allUsers.filter((user) => user.room === room);
    socket.to(room).emit("chatroom_users", chatRoomUsers);
    socket.emit("chatroom_users", chatRoomUsers);
  });

  // Handle sending messages
  socket.on("send_message", (data) => {
    io.in(chatRoom).emit("receive_message", data);
  });

  // Handle leaving the chat room
  socket.on("leave_room", (data) => {
    const { username, room } = data;
    socket.leave(room);
    const __createdtime__ = Date.now();
    allUsers = leaveRoom(socket.id, allUsers);
    socket.to(room).emit("chatroom_users", allUsers);
    socket.to(room).emit("receive_message", {
      username: ADMIN,
      message: `${username} has left the chat`,
      __createdtime__,
    });
    console.log(`${username} has left the chat`);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected from the chat");
    const user = allUsers.find((user) => user.id === socket.id);
    if (user?.username) {
      allUsers = leaveRoom(socket.id, allUsers);
      socket.to(chatRoom).emit("chatroom_users", allUsers);
      socket.to(chatRoom).emit("receive_message", {
        message: `${user.username} has disconnected from the chat.`,
      });
    }
  });
});
// start listening on port 4000
server.listen(4000, () => console.log("Server is running on port 4000"));
