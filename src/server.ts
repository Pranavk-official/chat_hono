import { serve } from "bun";
import app from "./index";
import { initializeSocket } from "@shared/socket";
import { authenticateSocket } from "@middleware/socket.auth";

// Initialize the main server
const server = serve({
  port: process.env.PORT || 3000,
  fetch: app.fetch,
});

// Initialize Socket.IO on a separate port
const socketPort = process.env.SOCKET_PORT
  ? parseInt(process.env.SOCKET_PORT)
  : 8001;
const io = initializeSocket(socketPort);

// Add authentication middleware to Socket.IO
io.use(authenticateSocket);

console.log(`HTTP Server running on port ${server.port}`);
console.log(`Socket.IO Server running on port ${socketPort}`);
console.log(`Environment: ${process.env.NODE_ENV || "development"}`);

export default server;
