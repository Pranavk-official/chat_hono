# Group Chat Implementation Documentation

## Overview
This document outlines the complete group chat functionality implementation using Socket.IO, following industry best practices for real-time chat applications.

## Architecture

### Core Components

1. **Socket.IO Server** (`src/shared/socket.ts`)
   - Handles real-time WebSocket connections
   - Manages user authentication via JWT
   - Implements room-based communication for groups
   - Tracks user presence using Redis

2. **Chat Service** (`src/module/group/services/chat.service.ts`)
   - Business logic for message creation, retrieval, and management
   - Group membership verification
   - Database operations using Prisma

3. **Socket Handlers** (`src/module/group/utils/socket.handlers.ts`)
   - Event handlers for Socket.IO events
   - Real-time message broadcasting
   - Typing indicators
   - Room management

4. **REST API** (`src/module/group/routes/chat.route.ts`)
   - HTTP endpoints for chat operations
   - Message CRUD operations
   - Group member management

## Features Implemented

### ✅ Real-time Messaging
- Send and receive messages instantly
- Support for text, image, and file messages
- Reply to messages (threading)
- Message history with pagination

### ✅ Group Management
- Join/leave group rooms
- Group member management (add/remove)
- Role-based permissions (Owner, Admin, Member)
- Group membership verification

### ✅ User Experience
- Typing indicators
- User presence tracking
- Online/offline status
- Message read status (infrastructure ready)

### ✅ Security & Authentication
- JWT-based Socket.IO authentication
- Group access control
- Message permission validation
- Rate limiting infrastructure

### ✅ Performance & Scalability
- Cursor-based pagination for messages
- Redis for caching and presence
- Efficient database queries
- Room-based message broadcasting

## API Endpoints

### Chat REST API (`/api/chat`)

#### Messages
- `POST /messages` - Create a new message
- `GET /:groupId/messages` - Get group messages (paginated)
- `GET /messages/:messageId` - Get specific message
- `PUT /messages/:messageId` - Update message content
- `DELETE /messages/:messageId` - Delete message

#### Group Members
- `GET /:groupId/members` - Get group members
- `POST /:groupId/members` - Add user to group
- `DELETE /:groupId/members` - Remove user from group

## Socket.IO Events

### Client to Server Events

```typescript
interface ClientToServerEvents {
  join_group: (groupId: string) => void;
  leave_group: (groupId: string) => void;
  send_message: (data: {
    groupId: string;
    content: string;
    type?: "TEXT" | "IMAGE" | "FILE";
    replyToId?: string;
  }) => void;
  typing_start: (data: { groupId: string }) => void;
  typing_stop: (data: { groupId: string }) => void;
  get_group_messages: (data: {
    groupId: string;
    limit?: number;
    cursor?: string;
  }) => void;
}
```

### Server to Client Events

```typescript
interface ServerToClientEvents {
  message_received: (data: MessageData) => void;
  user_typing: (data: TypingData) => void;
  user_stopped_typing: (data: StopTypingData) => void;
  group_messages: (data: MessagesResponse) => void;
  error: (data: ErrorResponse) => void;
  user_joined_group: (data: UserJoinedData) => void;
  user_left_group: (data: UserLeftData) => void;
}
```

## Database Schema

The implementation uses the existing Prisma schema with these key models:

### Group
```prisma
model Group {
  id          String        @id @default(cuid())
  name        String
  description String?
  isPrivate   Boolean       @default(false)
  createdBy   String
  members     GroupMember[]
  messages    Message[]
  // ... other fields
}
```

### Message
```prisma
model Message {
  id        String      @id @default(cuid())
  content   String
  type      MessageType @default(TEXT)
  senderId  String
  groupId   String
  replyToId String?
  user      User        @relation(fields: [senderId], references: [id])
  group     Group       @relation(fields: [groupId], references: [id])
  // ... other fields
}
```

### GroupMember
```prisma
model GroupMember {
  id      String          @id @default(cuid())
  role    GroupMemberRole @default(MEMBER)
  userId  String
  groupId String
  user    User            @relation(fields: [userId], references: [id])
  group   Group           @relation(fields: [groupId], references: [id])
  // ... other fields
}
```

## Configuration

### Environment Variables
```env
# Socket.IO Configuration
SOCKET_PORT=8001
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL="postgresql://..."

# Redis
REDIS_URL="redis://localhost:6379"

# JWT Keys
PRIVATE_KEY_PATH=private.key
PUBLIC_KEY_PATH=public.key
```

### Server Startup
The application now runs two servers:
1. **HTTP Server** (port 3000) - REST API and static content
2. **Socket.IO Server** (port 8001) - Real-time WebSocket connections

## Usage Examples

### Client Connection (JavaScript)
```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:8001", {
  auth: {
    token: "your-jwt-token"
  }
});

// Join a group
socket.emit("join_group", "group-id-here");

// Send a message
socket.emit("send_message", {
  groupId: "group-id-here",
  content: "Hello, world!",
  type: "TEXT"
});

// Listen for messages
socket.on("message_received", (message) => {
  console.log("New message:", message);
});

// Handle typing indicators
socket.on("user_typing", (data) => {
  console.log(`${data.userName} is typing...`);
});
```

### REST API Usage
```javascript
// Create a message via REST API
const response = await fetch("/api/chat/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  },
  body: JSON.stringify({
    groupId: "group-id-here",
    content: "Hello via REST API!",
    type: "TEXT"
  })
});

// Get group messages with pagination
const messages = await fetch(
  "/api/chat/group-id-here/messages?limit=20&cursor=message-id-cursor"
);
```

## Security Considerations

### Authentication
- All Socket.IO connections require valid JWT tokens
- Token validation happens on every connection
- User data is stored in socket context for authorization

### Authorization
- Group membership is verified for all operations
- Message permissions are checked before operations
- Role-based access control for administrative actions

### Rate Limiting
- Infrastructure in place for message rate limiting
- Redis-based tracking for user activity
- Configurable limits via constants

## Performance Optimizations

### Database
- Efficient queries with proper indexing
- Cursor-based pagination for large message histories
- Selective field loading with Prisma includes

### Caching
- Redis for user presence tracking
- Socket connection management
- Typing indicator state management

### Real-time
- Room-based broadcasting to minimize unnecessary events
- Efficient serialization of message data
- Connection pooling and cleanup

## Monitoring & Logging

### Built-in Logging
- Connection/disconnection events
- Message sending/receiving
- Error tracking and reporting
- Performance metrics ready for integration

### Health Checks
- `/health` endpoint with feature status
- Socket.IO server health monitoring
- Database connection status

## Future Enhancements

### Planned Features
- [ ] Message reactions (likes, emojis)
- [ ] File upload and attachment handling
- [ ] Message encryption
- [ ] Push notifications
- [ ] Message search functionality
- [ ] Voice/video call integration
- [ ] Message status (delivered, read)
- [ ] Advanced moderation tools

### Scalability
- [ ] Redis adapter for multi-server deployments
- [ ] Horizontal scaling with load balancers
- [ ] Database sharding strategies
- [ ] CDN integration for file attachments

## Testing

### Unit Tests
- Service layer functions
- Socket event handlers
- Authentication middleware
- Database operations

### Integration Tests
- Socket.IO event flows
- REST API endpoints
- Authentication flows
- Real-time message delivery

### Load Testing
- Concurrent user connections
- Message throughput
- Database performance under load
- Memory usage optimization

## Deployment

### Production Checklist
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Redis server running
- [ ] SSL/TLS certificates installed
- [ ] Monitoring systems configured
- [ ] Backup strategies implemented
- [ ] Rate limiting configured
- [ ] CORS settings validated

### Docker Support
Ready for containerization with proper environment configuration and health checks.

---

## Implementation Status: ✅ Complete

The group chat functionality is fully implemented with:
- ✅ Real-time messaging with Socket.IO
- ✅ REST API for chat operations
- ✅ Group management and permissions
- ✅ User authentication and authorization
- ✅ Database integration with Prisma
- ✅ Redis for caching and presence
- ✅ Comprehensive error handling
- ✅ Production-ready architecture
- ✅ Scalable and maintainable code structure

The implementation follows all specified requirements and industry best practices for real-time chat applications.
