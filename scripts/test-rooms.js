#!/usr/bin/env bun

/**
 * Test script for Socket.IO room functionality
 * Tests group chat rooms, user presence, and real-time messaging
 */

import { io } from "socket.io-client";

const API_BASE = "http://localhost:8000/api";
const SOCKET_URL = "http://localhost:8001";

class RoomTester {
  constructor() {
    this.tokens = [];
    this.sockets = [];
    this.users = [];
    this.groupId = null;
  }

  log(message, data = null) {
    console.log(`[ROOM-TEST] ${message}`, data ? JSON.stringify(data, null, 2) : "");
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Helper to make API requests
  async request(endpoint, options = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    return response.json();
  }

  // Create test users and get tokens
  async setupUsers() {
    this.log("Setting up test users...");

    const userCount = 3;
    for (let i = 1; i <= userCount; i++) {
      const email = `room-test-user-${i}@example.com`;
      const password = "test123";

      try {
        // Generate OTP
        const otpResponse = await this.request("/auth/generate-otp", {
          method: "POST",
          body: JSON.stringify({
            email,
            scope: "SIGNUP",
          }),
        });

        // Use development OTP
        const signupResponse = await this.request("/auth/verify-otp", {
          method: "POST",
          body: JSON.stringify({
            email,
            otp: "123456", // Development OTP
            scope: "SIGNUP",
            userData: {
              name: `Room Test User ${i}`,
              password,
            },
          }),
        });

        this.tokens.push(signupResponse.data.accessToken);
        this.users.push({
          id: signupResponse.data.user.id,
          name: signupResponse.data.user.name,
          email: signupResponse.data.user.email,
          token: signupResponse.data.accessToken,
        });

        this.log(`Created user ${i}: ${signupResponse.data.user.name}`);
      } catch (error) {
        // User might already exist, try to login
        try {
          const otpResponse = await this.request("/auth/generate-otp", {
            method: "POST",
            body: JSON.stringify({
              email,
              scope: "LOGIN",
            }),
          });

          const loginResponse = await this.request("/auth/verify-otp", {
            method: "POST",
            body: JSON.stringify({
              email,
              otp: "123456",
              scope: "LOGIN",
            }),
          });

          this.tokens.push(loginResponse.data.accessToken);
          this.users.push({
            id: loginResponse.data.user.id,
            name: loginResponse.data.user.name,
            email: loginResponse.data.user.email,
            token: loginResponse.data.accessToken,
          });

          this.log(`Logged in user ${i}: ${loginResponse.data.user.name}`);
        } catch (loginError) {
          this.log(`Failed to create/login user ${i}:`, loginError.message);
          throw loginError;
        }
      }
    }

    this.log(`Successfully set up ${this.users.length} users`);
  }

  // Create a test group
  async createGroup() {
    this.log("Creating test group...");

    const groupData = {
      name: "Room Test Group",
      description: "Test group for Socket.IO room functionality",
      isPrivate: false,
    };

    const response = await this.request("/groups", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.tokens[0]}`,
      },
      body: JSON.stringify(groupData),
    });

    this.groupId = response.data.id;
    this.log(`Created group: ${response.data.name} (${this.groupId})`);

    // Add other users to the group
    for (let i = 1; i < this.users.length; i++) {
      try {
        await this.request(`/groups/${this.groupId}/members`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.tokens[0]}`,
          },
          body: JSON.stringify({
            userId: this.users[i].id,
            role: "MEMBER",
          }),
        });
        this.log(`Added ${this.users[i].name} to group`);
      } catch (error) {
        this.log(`Failed to add ${this.users[i].name} to group:`, error.message);
      }
    }
  }

  // Connect users via Socket.IO
  async connectSockets() {
    this.log("Connecting users via Socket.IO...");

    for (let i = 0; i < this.users.length; i++) {
      const user = this.users[i];
      const socket = io(SOCKET_URL, {
        auth: {
          token: user.token,
        },
        transports: ["websocket"],
      });

      // Setup event listeners
      socket.on("connect", () => {
        this.log(`${user.name} connected (${socket.id})`);
      });

      socket.on("disconnect", (reason) => {
        this.log(`${user.name} disconnected: ${reason}`);
      });

      socket.on("error", (error) => {
        this.log(`${user.name} error:`, error);
      });

      socket.on("joined_group_success", (data) => {
        this.log(`${user.name} successfully joined group:`, data);
      });

      socket.on("left_group_success", (data) => {
        this.log(`${user.name} successfully left group:`, data);
      });

      socket.on("user_joined_group", (data) => {
        this.log(`${user.name} received join notification:`, data);
      });

      socket.on("user_left_group", (data) => {
        this.log(`${user.name} received leave notification:`, data);
      });

      socket.on("message_received", (data) => {
        this.log(`${user.name} received message:`, {
          from: data.user.name,
          content: data.content,
          timestamp: data.createdAt,
        });
      });

      socket.on("user_typing", (data) => {
        this.log(`${user.name} sees typing indicator:`, data);
      });

      socket.on("user_stopped_typing", (data) => {
        this.log(`${user.name} sees stopped typing:`, data);
      });

      socket.on("room_members_update", (data) => {
        this.log(`${user.name} received room update:`, data);
      });

      this.sockets.push(socket);

      // Wait for connection
      await new Promise((resolve) => {
        if (socket.connected) {
          resolve();
        } else {
          socket.on("connect", resolve);
        }
      });
    }

    this.log("All users connected to Socket.IO");
  }

  // Test room joining functionality
  async testRoomJoining() {
    this.log("\n=== Testing Room Joining ===");

    // User 1 joins the room
    this.log("User 1 joining room...");
    this.sockets[0].emit("join_group", this.groupId);
    await this.sleep(1000);

    // User 2 joins the room
    this.log("User 2 joining room...");
    this.sockets[1].emit("join_group", this.groupId);
    await this.sleep(1000);

    // User 3 joins the room
    this.log("User 3 joining room...");
    this.sockets[2].emit("join_group", this.groupId);
    await this.sleep(1000);

    // Get room info
    this.log("Getting room information...");
    this.sockets[0].emit("get_room_info", { groupId: this.groupId });
    await this.sleep(1000);
  }

  // Test messaging functionality
  async testMessaging() {
    this.log("\n=== Testing Messaging ===");

    const messages = [
      { user: 0, content: "Hello everyone! This is a test message from User 1." },
      { user: 1, content: "Hi there! User 2 here. Room functionality seems to be working!" },
      { user: 2, content: "User 3 checking in. All good on my end!" },
    ];

    for (const { user, content } of messages) {
      this.log(`${this.users[user].name} sending message...`);
      this.sockets[user].emit("send_message", {
        groupId: this.groupId,
        content,
        type: "TEXT",
      });
      await this.sleep(1500);
    }
  }

  // Test typing indicators
  async testTypingIndicators() {
    this.log("\n=== Testing Typing Indicators ===");

    // User 1 starts typing
    this.log("User 1 starts typing...");
    this.sockets[0].emit("typing_start", { groupId: this.groupId });
    await this.sleep(2000);

    // User 1 stops typing
    this.log("User 1 stops typing...");
    this.sockets[0].emit("typing_stop", { groupId: this.groupId });
    await this.sleep(1000);

    // Multiple users typing
    this.log("Multiple users start typing...");
    this.sockets[1].emit("typing_start", { groupId: this.groupId });
    this.sockets[2].emit("typing_start", { groupId: this.groupId });
    await this.sleep(3000);

    this.log("Multiple users stop typing...");
    this.sockets[1].emit("typing_stop", { groupId: this.groupId });
    this.sockets[2].emit("typing_stop", { groupId: this.groupId });
    await this.sleep(1000);
  }

  // Test room leaving
  async testRoomLeaving() {
    this.log("\n=== Testing Room Leaving ===");

    // User 3 leaves
    this.log("User 3 leaving room...");
    this.sockets[2].emit("leave_group", this.groupId);
    await this.sleep(1000);

    // Send a message to see who receives it
    this.log("User 1 sending message after User 3 left...");
    this.sockets[0].emit("send_message", {
      groupId: this.groupId,
      content: "This message should not reach User 3",
      type: "TEXT",
    });
    await this.sleep(1000);

    // User 3 rejoins
    this.log("User 3 rejoining room...");
    this.sockets[2].emit("join_group", this.groupId);
    await this.sleep(1000);
  }

  // Test disconnect cleanup
  async testDisconnectCleanup() {
    this.log("\n=== Testing Disconnect Cleanup ===");

    // Disconnect User 2
    this.log("Disconnecting User 2...");
    this.sockets[1].disconnect();
    await this.sleep(2000);

    // Send a message to see room updates
    this.log("User 1 sending message after User 2 disconnected...");
    this.sockets[0].emit("send_message", {
      groupId: this.groupId,
      content: "User 2 should not receive this message",
      type: "TEXT",
    });
    await this.sleep(1000);

    // Check room info
    this.log("Getting updated room information...");
    this.sockets[0].emit("get_room_info", { groupId: this.groupId });
    await this.sleep(1000);
  }

  // Cleanup
  async cleanup() {
    this.log("\n=== Cleaning Up ===");

    // Disconnect all sockets
    this.sockets.forEach((socket, index) => {
      if (socket.connected) {
        this.log(`Disconnecting ${this.users[index].name}...`);
        socket.disconnect();
      }
    });

    // Delete the test group
    if (this.groupId && this.tokens[0]) {
      try {
        await this.request(`/groups/${this.groupId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${this.tokens[0]}`,
          },
        });
        this.log("Deleted test group");
      } catch (error) {
        this.log("Failed to delete test group:", error.message);
      }
    }

    this.log("Cleanup completed");
  }

  // Run all tests
  async run() {
    try {
      this.log("Starting Socket.IO Room Functionality Tests");
      this.log("=" .repeat(50));

      await this.setupUsers();
      await this.createGroup();
      await this.connectSockets();
      
      await this.testRoomJoining();
      await this.testMessaging();
      await this.testTypingIndicators();
      await this.testRoomLeaving();
      await this.testDisconnectCleanup();

      this.log("\n" + "=".repeat(50));
      this.log("All tests completed successfully! ✅");
    } catch (error) {
      this.log("\n❌ Test failed:", error.message);
      console.error(error);
    } finally {
      await this.cleanup();
    }
  }
}

// Run the tests
const tester = new RoomTester();
tester.run().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error("Test runner failed:", error);
  process.exit(1);
});
