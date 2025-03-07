
# MeetLink - Video Conferencing Application

MeetLink is a web-based video conferencing application with features similar to Zoom or Google Meet.

## Features

- Real-time video and audio calls
- Screen sharing
- Text chat during meetings
- Responsive design for desktop and mobile
- Simple meeting creation and joining

## Running the Application

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the React application:
   ```
   npm run dev
   ```

## Setting up the Signaling Server

The signaling server is required for WebRTC connection establishment. Follow these steps to set it up:

1. Navigate to the signaling-server directory:
   ```
   cd signaling-server
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the server:
   ```
   npm start
   ```

The signaling server will run on port 3001 by default.

## Deploying to Production

For production use, you should deploy both:

1. The React application (e.g., to Netlify, Vercel, or similar services)
2. The signaling server (e.g., to Heroku, Render, or similar services)

Update the WebRTC service to use your production signaling server URL.

## Development Notes

- The WebRTC implementation uses a simple peer-to-peer mesh architecture, which works well for small groups (up to 6-8 participants).
- For larger meetings, consider implementing a Selective Forwarding Unit (SFU) architecture.
- For production, you should implement proper authentication and security measures.
