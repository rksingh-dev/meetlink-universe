
import { toast } from "@/components/ui/use-toast";
import { Socket, io } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

type MediaStreamHandler = (stream: MediaStream) => void;
type DataChannelMessageHandler = (message: any) => void;

// Configuration for WebRTC connections
const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ]
};

// For demo purposes, we'll use a free public signaling server
// In production, you would use your own secure server
const SIGNALING_SERVER = "https://simple-signal-demo.onrender.com";

class WebRTCService {
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private onNewRemoteStreamCallbacks: MediaStreamHandler[] = [];
  private onMessageCallbacks: DataChannelMessageHandler[] = [];
  private remoteStreams: Map<string, MediaStream> = new Map();
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private socket: Socket | null = null;
  private userId: string = uuidv4();
  private roomId: string | null = null;
  
  constructor() {
    // Initialize socket connection
    this.setupSocketConnection();
  }

  private setupSocketConnection() {
    try {
      this.socket = io(SIGNALING_SERVER);
      
      this.socket.on('connect', () => {
        console.log('Connected to signaling server');
      });
      
      this.socket.on('disconnect', () => {
        console.log('Disconnected from signaling server');
      });
      
      this.socket.on('error', (error) => {
        console.error('Socket error:', error);
      });
      
      // Handle incoming signaling messages
      this.socket.on('signal', async (data) => {
        try {
          if (data.userId === this.userId) return; // Ignore messages from self
          
          if (data.type === 'offer') {
            await this.handleOffer(data);
          } else if (data.type === 'answer') {
            await this.handleAnswer(data);
          } else if (data.type === 'ice-candidate') {
            await this.handleIceCandidate(data);
          } else if (data.type === 'user-disconnected') {
            this.handleUserDisconnected(data.userId);
          }
        } catch (error) {
          console.error('Error handling signal:', error);
        }
      });
      
      this.socket.on('chat-message', (message) => {
        // Notify all callbacks about the new message
        this.onMessageCallbacks.forEach(callback => callback(message));
      });
    } catch (error) {
      console.error('Error setting up socket connection:', error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to signaling server",
        variant: "destructive",
      });
    }
  }

  private async createPeerConnection(userId: string): Promise<RTCPeerConnection> {
    try {
      const peerConnection = new RTCPeerConnection(configuration);
      
      // Add local tracks to the peer connection
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          peerConnection.addTrack(track, this.localStream!);
        });
      }
      
      // Create data channel for chat
      const dataChannel = peerConnection.createDataChannel('chat');
      this.setupDataChannel(dataChannel, userId);
      
      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.sendSignal({
            type: 'ice-candidate',
            userId: this.userId,
            targetUserId: userId,
            candidate: event.candidate,
            roomId: this.roomId
          });
        }
      };
      
      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log(`Connection state for ${userId}:`, peerConnection.connectionState);
      };
      
      // Handle incoming tracks (remote streams)
      peerConnection.ontrack = (event) => {
        console.log(`Received track from ${userId}`);
        const remoteStream = new MediaStream();
        event.streams[0].getTracks().forEach(track => {
          remoteStream.addTrack(track);
        });
        
        this.remoteStreams.set(userId, remoteStream);
        this.onNewRemoteStreamCallbacks.forEach(callback => callback(remoteStream));
      };
      
      // Handle data channel events
      peerConnection.ondatachannel = (event) => {
        this.setupDataChannel(event.channel, userId);
      };
      
      this.peerConnections.set(userId, peerConnection);
      return peerConnection;
    } catch (error) {
      console.error('Error creating peer connection:', error);
      throw error;
    }
  }

  private setupDataChannel(dataChannel: RTCDataChannel, userId: string) {
    dataChannel.onopen = () => {
      console.log(`Data channel with ${userId} is open`);
      this.dataChannels.set(userId, dataChannel);
    };
    
    dataChannel.onclose = () => {
      console.log(`Data channel with ${userId} is closed`);
      this.dataChannels.delete(userId);
    };
    
    dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.onMessageCallbacks.forEach(callback => callback(message));
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };
  }

  private async handleOffer(data: any) {
    try {
      const peerConnection = await this.createPeerConnection(data.userId);
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
      
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      this.sendSignal({
        type: 'answer',
        userId: this.userId,
        targetUserId: data.userId,
        answer,
        roomId: this.roomId
      });
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }

  private async handleAnswer(data: any) {
    try {
      const peerConnection = this.peerConnections.get(data.userId);
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }

  private async handleIceCandidate(data: any) {
    try {
      const peerConnection = this.peerConnections.get(data.userId);
      if (peerConnection) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }

  private handleUserDisconnected(userId: string) {
    // Close and remove peer connection
    const peerConnection = this.peerConnections.get(userId);
    if (peerConnection) {
      peerConnection.close();
      this.peerConnections.delete(userId);
    }
    
    // Remove data channel
    this.dataChannels.delete(userId);
    
    // Remove remote stream
    this.remoteStreams.delete(userId);
    
    // Notify user
    toast({
      title: "User disconnected",
      description: `User ${userId} has left the meeting`,
    });
  }

  private sendSignal(data: any) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('signal', data);
    }
  }

  // Join a meeting room
  async joinRoom(roomId: string): Promise<void> {
    try {
      this.roomId = roomId;
      
      if (this.socket) {
        this.socket.emit('join-room', {
          roomId,
          userId: this.userId
        });
        
        // Listen for existing users in the room
        this.socket.on('room-users', async (users) => {
          console.log('Users in room:', users);
          
          // Create peer connections with all existing users
          for (const userId of users) {
            if (userId !== this.userId) {
              try {
                const peerConnection = await this.createPeerConnection(userId);
                const offer = await peerConnection.createOffer();
                await peerConnection.setLocalDescription(offer);
                
                this.sendSignal({
                  type: 'offer',
                  userId: this.userId,
                  targetUserId: userId,
                  offer,
                  roomId
                });
              } catch (error) {
                console.error(`Error connecting to user ${userId}:`, error);
              }
            }
          }
        });
      }
    } catch (error) {
      console.error('Error joining room:', error);
      toast({
        title: "Failed to join meeting",
        description: "Could not connect to the meeting room",
        variant: "destructive",
      });
      throw error;
    }
  }

  async getLocalStream(audio = true, video = true): Promise<MediaStream> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio,
        video,
      });
      return this.localStream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      toast({
        title: "Camera/Microphone Error",
        description: "Could not access your camera or microphone",
        variant: "destructive",
      });
      throw error;
    }
  }

  async startScreenShare(): Promise<MediaStream | null> {
    try {
      // @ts-ignore - TypeScript doesn't recognize getDisplayMedia on mediaDevices
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      
      // Replace video track with screen track in all peer connections
      if (this.localStream && this.screenStream) {
        const videoTrack = this.screenStream.getVideoTracks()[0];
        
        this.peerConnections.forEach(peerConnection => {
          const senders = peerConnection.getSenders();
          const videoSender = senders.find(sender => 
            sender.track && sender.track.kind === 'video'
          );
          
          if (videoSender) {
            videoSender.replaceTrack(videoTrack);
          }
        });
      }
      
      return this.screenStream;
    } catch (error) {
      console.error("Error sharing screen:", error);
      toast({
        title: "Screen Sharing Error",
        description: "Could not share your screen",
        variant: "destructive",
      });
      return null;
    }
  }

  stopScreenShare(): void {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      
      // Replace screen track with video track in all peer connections
      if (this.localStream) {
        const videoTrack = this.localStream.getVideoTracks()[0];
        
        this.peerConnections.forEach(peerConnection => {
          const senders = peerConnection.getSenders();
          const videoSender = senders.find(sender => 
            sender.track && sender.track.kind === 'video'
          );
          
          if (videoSender && videoTrack) {
            videoSender.replaceTrack(videoTrack);
          }
        });
      }
      
      this.screenStream = null;
    }
  }

  onNewRemoteStream(callback: MediaStreamHandler): void {
    this.onNewRemoteStreamCallbacks.push(callback);
    
    // Also send existing remote streams to the new callback
    this.remoteStreams.forEach(stream => {
      callback(stream);
    });
  }

  onMessage(callback: DataChannelMessageHandler): void {
    this.onMessageCallbacks.push(callback);
  }

  sendMessage(message: string): void {
    const formattedMessage = {
      id: uuidv4(),
      sender: "You",
      text: message,
      timestamp: new Date(),
    };
    
    // Broadcast to all data channels
    this.dataChannels.forEach(dataChannel => {
      if (dataChannel.readyState === 'open') {
        dataChannel.send(JSON.stringify(formattedMessage));
      }
    });
    
    // Also send through socket for users without data channel yet
    if (this.socket) {
      this.socket.emit('chat-message', {
        ...formattedMessage,
        roomId: this.roomId
      });
    }
    
    // Notify local callbacks about the message
    this.onMessageCallbacks.forEach(callback => callback(formattedMessage));
  }

  disconnect(): void {
    // Stop all media tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
    }
    
    // Close all peer connections
    this.peerConnections.forEach(connection => {
      connection.close();
    });
    
    // Clear all collections
    this.peerConnections.clear();
    this.dataChannels.clear();
    this.remoteStreams.clear();
    this.onNewRemoteStreamCallbacks = [];
    this.onMessageCallbacks = [];
    
    // Leave room and disconnect socket
    if (this.socket) {
      if (this.roomId) {
        this.socket.emit('leave-room', {
          roomId: this.roomId,
          userId: this.userId
        });
      }
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.roomId = null;
  }
}

// Singleton instance
export const webRTCService = new WebRTCService();
