// OTP configuration
export const OTP_LENGTH = 6;
export const OTP_EXPIRATION_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds
export const DEFAULT_DEV_OTP = "123456"; // Default OTP value for development
export const OTP_RATE_LIMIT = 5; // Max OTP requests per minute
export const OTP_BLOCK_DURATION = 10 * 60; // 10 minutes in seconds
export const OTP_IP_RATE_LIMIT = 15; // Max OTP requests per IP per minute
export const OTP_IP_BLOCK_DURATION = 60 * 60; // 1 hour in seconds

// Token Configuration
export const TOKEN_EXPIRATION_TIME = 30 * 24 * 60 * 60; // 30 days in seconds
export const REFRESH_TOKEN_EXPIRATION_TIME = 30 * 24 * 60 * 60; // 30 days in seconds

// Image upload
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
]; // no gif

// Socket.IO Configuration
export const SOCKET_PORT = process.env.SOCKET_PORT || 8001;
export const TYPING_TIMEOUT = 10; // seconds
export const MAX_MESSAGE_LENGTH = 5000;
export const MAX_MESSAGES_PER_PAGE = 100;
export const DEFAULT_MESSAGES_PER_PAGE = 50;

// Chat Configuration
export const CHAT_RATE_LIMIT = 30; // Max messages per minute per user
export const CHAT_BURST_LIMIT = 5; // Max messages in 10 seconds
export const CHAT_BLOCK_DURATION = 5 * 60; // 5 minutes in seconds
