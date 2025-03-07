
// A simplified mock WebRTC service for demonstration
// In a real implementation, this would connect to a signaling server

import { toast } from "@/components/ui/use-toast";

type MediaStreamHandler = (stream: MediaStream) => void;
type DataChannelMessageHandler = (message: any) => void;

class WebRTCService {
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private onNewRemoteStreamCallbacks: MediaStreamHandler[] = [];
  private onMessageCallbacks: DataChannelMessageHandler[] = [];
  private mockRemoteStreams: MediaStream[] = [];
  private mockMessages: any[] = [];

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
      this.screenStream = null;
    }
  }

  onNewRemoteStream(callback: MediaStreamHandler): void {
    this.onNewRemoteStreamCallbacks.push(callback);
    
    // For demo purposes only: Create mock remote streams
    setTimeout(() => {
      this.createMockRemoteStreams();
    }, 2000);
  }

  onMessage(callback: DataChannelMessageHandler): void {
    this.onMessageCallbacks.push(callback);
  }

  sendMessage(message: string): void {
    const formattedMessage = {
      id: Date.now().toString(),
      sender: "You",
      text: message,
      timestamp: new Date(),
    };

    // Notify all callbacks about the new message
    this.onMessageCallbacks.forEach(callback => callback(formattedMessage));

    // For demo: simulate receiving a response after a delay
    setTimeout(() => {
      const response = {
        id: (Date.now() + 1).toString(),
        sender: "Remote User",
        text: `Reply to: ${message}`,
        timestamp: new Date(),
      };
      this.onMessageCallbacks.forEach(callback => callback(response));
    }, 1000 + Math.random() * 2000);
  }

  // For demo purposes only: Create fake remote streams
  private createMockRemoteStreams(): void {
    const mockStream = new MediaStream();
    this.mockRemoteStreams.push(mockStream);
    
    // Notify all callbacks about the new remote stream
    this.onNewRemoteStreamCallbacks.forEach(callback => callback(mockStream));
  }

  disconnect(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
    }
    
    this.onNewRemoteStreamCallbacks = [];
    this.onMessageCallbacks = [];
    this.mockRemoteStreams = [];
    this.mockMessages = [];
  }
}

// Singleton instance
export const webRTCService = new WebRTCService();
