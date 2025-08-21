# Socket.IO Rooms Implementation for Group Chat

This document outlines the Socket.IO rooms implementation for the Hono chat application, following best practices for real-time group communication.

## Overview

The chat application uses Socket.IO rooms to create isolated communication channels for each group, enabling:

- **Real-time messaging** within groups
- **User presence tracking** (who's online in each room)
- **Typing indicators** scoped to specific groups
- **Automatic cleanup** when users disconnect
- **Room member management** with Redis-backed persistence

## Architecture

### Room Naming Convention

- **Group rooms**: `group:{groupId}` - For group-specific communication
- **User rooms**: `user:{userId}` - For direct user notifications

### Redis-Based Presence Tracking

The implementation uses Redis to maintain persistent user presence data:

```
room:{groupId}:users           # Set of user IDs currently in the room
user:{userId}:rooms            # Set of group IDs the user is connected to
user:{userId}:sockets:{groupId} # Set of socket IDs for user in specific room
typing:{groupId}:{userId}       # Temporary typing indicator (10s TTL)
```

## Key Features

### 1. Room Management

#### Joining a Room
```typescript
socket.emit('join_group', groupId);
```

**Server-side validation:**
- Verifies group membership via database
- Adds user to Socket.IO room
- Updates Redis presence tracking
- Notifies other room members
- Returns room statistics

#### Leaving a Room
```typescript
socket.emit('leave_group', groupId);
```

**Server-side cleanup:**
- Removes user from Socket.IO room
- Updates Redis presence data
- Notifies room members (if user completely left)
- Handles multi-socket scenarios gracefully

### 2. Enhanced Messaging

```typescript
socket.emit('send_message', {
  groupId: 'group-uuid',
  content: 'Hello everyone!',
  type: 'TEXT',
  replyToId: 'optional-message-id'
});
```

**Security features:**
- Validates user is actually in the room
- Verifies group membership
- Automatically clears typing indicators
- Broadcasts to all room members

### 3. Advanced Typing Indicators

```typescript
// Start typing
socket.emit('typing_start', { groupId });

// Stop typing  
socket.emit('typing_stop', { groupId });
```

**Smart features:**
- 10-second auto-expiration
- Redis-backed for persistence
- Automatic cleanup on disconnect
- Room-scoped visibility

### 4. Room Information

```typescript
socket.emit('get_room_info', { groupId });
```

**Returns:**
- Online member count
- List of online user IDs
- Real-time socket count

## Best Practices Implemented

### 1. **Multi-Socket Support**
Users can have multiple tabs/devices connected. The system properly:
- Tracks all sockets per user per room
- Only notifies "user left" when ALL sockets disconnect
- Maintains accurate presence data

### 2. **Graceful Disconnect Handling**
```typescript
socket.on('disconnect', async () => {
  // Clean up all typing indicators
  // Remove from all rooms
  // Notify affected rooms
  // Update presence tracking
});
```

### 3. **Input Validation**
All socket events validate:
- Required parameters
- Data types
- Group membership
- Room membership

### 4. **Error Handling**
Comprehensive error responses with:
- Descriptive messages
- Error codes
- Client-friendly formatting

### 5. **Performance Optimization**
- Redis-backed presence for scalability
- Efficient room lookups
- Minimal database queries
- Smart notification batching

## Client-Side Integration

### Connecting to Socket.IO

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:8001', {
  auth: {
    token: accessToken // JWT access token
  },
  transports: ['websocket']
});
```

### Event Listeners

```javascript
// Connection events
socket.on('connect', () => console.log('Connected'));
socket.on('disconnect', (reason) => console.log('Disconnected:', reason));

// Room events
socket.on('joined_group_success', (data) => {
  console.log('Joined room:', data.groupId, 'Members:', data.memberCount);
});

socket.on('user_joined_group', (data) => {
  console.log(`${data.userName} joined the room`);
});

// Message events
socket.on('message_received', (message) => {
  displayMessage(message);
});

// Typing events
socket.on('user_typing', (data) => {
  showTypingIndicator(data.userName);
});

socket.on('user_stopped_typing', (data) => {
  hideTypingIndicator(data.userId);
});

// Room updates
socket.on('room_members_update', (data) => {
  updateMemberList(data.onlineMembers);
});
```

## Testing

Run the comprehensive room functionality tests:

```bash
bun run test:rooms
```

This test suite covers:
- Multi-user room joining/leaving
- Real-time messaging
- Typing indicators
- Disconnect cleanup
- Room member updates

## Security Considerations

### Authentication
- JWT token validation on connection
- Per-event group membership verification
- Room membership validation for messages

### Rate Limiting
- Redis-backed typing indicator limits
- Message rate limiting (handled by API middleware)
- Connection limits per user

### Data Validation
- All inputs validated and sanitized
- Type checking for all parameters
- SQL injection prevention via Prisma

## Scaling Considerations

### Redis Adapter (Future Enhancement)
For multi-server deployments, consider adding:

```javascript
import { createAdapter } from '@socket.io/redis-adapter';

io.adapter(createAdapter(redisClient, redisClient.duplicate()));
```

### Database Optimization
- Index on `GroupMember(userId, groupId)` for fast lookups
- Consider denormalizing frequently accessed data
- Message pagination for large groups

## Error Scenarios Handled

1. **User disconnects abruptly**: Automatic cleanup via disconnect handler
2. **User tries to join room without membership**: Permission denied
3. **Invalid group ID**: Validation error response
4. **Redis connection issues**: Graceful degradation
5. **Multiple socket connections**: Proper multi-socket tracking

## Future Enhancements

- **Voice/Video calling** room indicators
- **File sharing** within rooms
- **Message reactions** with room-wide visibility
- **Room moderation** features
- **Message history** synchronization on join
- **Push notifications** for offline users

## Monitoring

Key metrics to monitor:
- Active rooms count
- Users per room distribution
- Message throughput per room
- Redis memory usage for presence data
- Socket connection count

## Troubleshooting

### Common Issues

1. **Users not receiving messages**: Check room membership and socket connection
2. **Typing indicators stuck**: Redis TTL ensures auto-cleanup
3. **Duplicate join notifications**: Multi-socket detection prevents this
4. **Memory leaks**: Proper cleanup on disconnect prevents accumulation

### Debug Commands

```bash
# Check Redis keys
redis-cli keys "room:*"
redis-cli keys "user:*"
redis-cli keys "typing:*"

# Monitor real-time Redis activity
redis-cli monitor
```

This implementation provides a robust, scalable foundation for real-time group communication with proper error handling, security, and performance optimization.
