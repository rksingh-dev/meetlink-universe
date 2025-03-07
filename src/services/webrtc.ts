
import { io, Socket } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

interface PeerConnection {
  id: string;
  connection: RTCPeerConnection;
  stream?: MediaStream;
}

interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: Date;
}

class WebRTCService {
  private socket: Socket | null = null;
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private peerConnections: Map<string, PeerConnection> = new Map();
  private localId: string = '';
  private username: string = '';
  private roomId: string = '';
  private onNewStreamCallback: ((stream: MediaStream) => void) | null = null;
  private onMessageCallback: ((message: Message) => void) | null = null;
  private iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ],
  };

  constructor() {
    this.localId = uuidv4();
    this.username = `User_${this.localId.substring(0, 5)}`;
  }

  private setupSocketEvents(): void {
    if (!this.socket) return;

    this.socket.on('user-joined', async (data: { userId: string }) => {
      console.log('New user joined:', data.userId);
      await this.createPeerConnection(data.userId, true);
    });

    this.socket.on('offer', async (data: { userId: string, offer: RTCSessionDescriptionInit }) => {
      console.log('Received offer from:', data.userId);
      const peerConnection = await this.createPeerConnection(data.userId, false);
      
      try {
        await peerConnection.connection.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peerConnection.connection.createAnswer();
        await peerConnection.connection.setLocalDescription(answer);
        
        this.socket?.emit('answer', {
          userId: data.userId,
          answer: peerConnection.connection.localDescription
        });
      } catch (error) {
        console.error('Error handling offer:', error);
      }
    });

    this.socket.on('answer', async (data: { userId: string, answer: RTCSessionDescriptionInit }) => {
      console.log('Received answer from:', data.userId);
      const peerConnection = this.peerConnections.get(data.userId);
      if (peerConnection) {
        try {
          await peerConnection.connection.setRemoteDescription(new RTCSessionDescription(data.answer));
        } catch (error) {
          console.error('Error setting remote description:', error);
        }
      }
    });

    this.socket.on('ice-candidate', async (data: { userId: string, candidate: RTCIceCandidateInit }) => {
      console.log('Received ICE candidate from:', data.userId);
      const peerConnection = this.peerConnections.get(data.userId);
      if (peerConnection && data.candidate) {
        try {
          await peerConnection.connection.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (error) {
          console.error('Error adding ice candidate:', error);
        }
      }
    });

    this.socket.on('user-left', (data: { userId: string }) => {
      console.log('User left:', data.userId);
      this.removePeerConnection(data.userId);
    });

    this.socket.on('chat-message', (message: Message) => {
      console.log('Received message:', message);
      if (this.onMessageCallback) {
        this.onMessageCallback(message);
      }
    });
  }

  private async createPeerConnection(userId: string, isInitiator: boolean): Promise<PeerConnection> {
    if (this.peerConnections.has(userId)) {
      return this.peerConnections.get(userId)!;
    }

    const peerConnection = new RTCPeerConnection(this.iceServers);
    const peerData: PeerConnection = {
      id: userId,
      connection: peerConnection
    };
    
    this.peerConnections.set(userId, peerData);

    // Add local tracks to the peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        if (this.localStream) {
          peerConnection.addTrack(track, this.localStream);
        }
      });
    }

    // Add screen share track if active
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => {
        if (this.screenStream) {
          peerConnection.addTrack(track, this.screenStream);
        }
      });
    }

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Sending ICE candidate to:', userId);
        this.socket?.emit('ice-candidate', {
          userId: userId,
          candidate: event.candidate
        });
      }
    };

    // Handle new remote tracks
    peerConnection.ontrack = (event) => {
      console.log('Received remote track from:', userId);
      const stream = event.streams[0];
      
      if (!peerData.stream) {
        peerData.stream = stream;
        
        if (this.onNewStreamCallback) {
          console.log('Calling onNewStreamCallback with stream:', stream.id);
          this.onNewStreamCallback(stream);
        }
      } else {
        // Add track to existing stream
        const existingStream = peerData.stream;
        event.track.onunmute = () => {
          if (!existingStream.getTracks().some(t => t.id === event.track.id)) {
            existingStream.addTrack(event.track);
          }
        };
      }
    };

    // If we're the initiator, send an offer
    if (isInitiator && this.socket) {
      try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        this.socket.emit('offer', {
          userId: userId,
          offer: peerConnection.localDescription
        });
      } catch (error) {
        console.error('Error creating offer:', error);
      }
    }

    return peerData;
  }

  private removePeerConnection(userId: string): void {
    const peerConnection = this.peerConnections.get(userId);
    if (peerConnection) {
      peerConnection.connection.close();
      this.peerConnections.delete(userId);
    }
  }

  public async connect(): Promise<void> {
    // Use a public STUN/TURN service for development
    // In production, you would use your own server
    this.socket = io('https://meetlink-signaling.onrender.com');
    
    // Fallback to local connection for testing
    if (!this.socket.connected) {
      console.log("Trying fallback connection");
      this.socket = io('http://localhost:3001');
    }
    
    this.setupSocketEvents();
  }

  public async getLocalStream(): Promise<MediaStream> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      return this.localStream;
    } catch (error) {
      console.error('Error getting local stream:', error);
      throw error;
    }
  }

  public async joinRoom(roomId: string): Promise<void> {
    this.roomId = roomId;
    await this.connect();
    
    if (!this.socket) {
      throw new Error('Socket connection failed');
    }
    
    if (!this.localStream) {
      await this.getLocalStream();
    }
    
    this.socket.emit('join-room', {
      roomId: this.roomId,
      userId: this.localId,
      username: this.username
    });
  }

  public onNewRemoteStream(callback: (stream: MediaStream) => void): void {
    this.onNewStreamCallback = callback;
  }

  public onMessage(callback: (message: Message) => void): void {
    this.onMessageCallback = callback;
  }

  public sendMessage(text: string): void {
    if (!this.socket) return;
    
    const message: Message = {
      id: uuidv4(),
      sender: this.username,
      text,
      timestamp: new Date()
    };
    
    this.socket.emit('chat-message', {
      roomId: this.roomId,
      message
    });
    
    // Also call the callback so the sender sees their own message
    if (this.onMessageCallback) {
      this.onMessageCallback(message);
    }
  }

  public async startScreenShare(): Promise<MediaStream | null> {
    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });
      
      // Add screen tracks to all peer connections
      for (const [userId, peer] of this.peerConnections.entries()) {
        if (this.screenStream) {
          this.screenStream.getTracks().forEach(track => {
            if (this.screenStream) {
              peer.connection.addTrack(track, this.screenStream);
            }
          });
        }
      }
      
      return this.screenStream;
    } catch (error) {
      console.error('Error starting screen share:', error);
      return null;
    }
  }

  public stopScreenShare(): void {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => {
        track.stop();
      });
      this.screenStream = null;
      
      // Renegotiate connections to remove screen tracks
      for (const [userId, peer] of this.peerConnections.entries()) {
        this.createPeerConnection(userId, true);
      }
    }
  }

  public disconnect(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
      });
      this.localStream = null;
    }
    
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => {
        track.stop();
      });
      this.screenStream = null;
    }
    
    for (const [userId, peer] of this.peerConnections.entries()) {
      peer.connection.close();
    }
    this.peerConnections.clear();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const webRTCService = new WebRTCService();
