
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MeetHeader from "@/components/MeetHeader";
import VideoPlayer from "@/components/VideoPlayer";
import VideoControls from "@/components/VideoControls";
import ChatPanel from "@/components/ChatPanel";
import { webRTCService } from "@/services/webrtc";
import { useToast } from "@/components/ui/use-toast";

interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: Date;
}

const MeetingRoom = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<MediaStream[]>([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isJoining, setIsJoining] = useState(true);

  useEffect(() => {
    const initializeMedia = async () => {
      try {
        setIsJoining(true);
        
        // Get local media stream
        const stream = await webRTCService.getLocalStream();
        setLocalStream(stream);
        
        // Join the meeting room
        if (meetingId) {
          await webRTCService.joinRoom(meetingId);
        }
        
        // Listen for remote streams
        webRTCService.onNewRemoteStream((stream) => {
          setRemoteStreams((prev) => {
            // Check if stream is already in the array to avoid duplicates
            const exists = prev.some(s => 
              s.id === stream.id || 
              s.getTracks().some(t => stream.getTracks().some(st => st.id === t.id))
            );
            if (exists) return prev;
            return [...prev, stream];
          });
        });
        
        // Listen for chat messages
        webRTCService.onMessage((message) => {
          setMessages((prev) => [...prev, message as Message]);
        });
        
        toast({
          title: "Meeting joined successfully",
          description: `You've joined meeting: ${meetingId}`,
        });
        
        setIsJoining(false);
      } catch (error) {
        console.error("Failed to initialize media:", error);
        setIsJoining(false);
        toast({
          title: "Failed to join meeting",
          description: "Could not connect to the meeting room",
          variant: "destructive",
        });
      }
    };

    initializeMedia();

    return () => {
      webRTCService.disconnect();
    };
  }, [meetingId, toast]);

  const toggleAudio = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      webRTCService.stopScreenShare();
      setScreenStream(null);
      setIsScreenSharing(false);
      return;
    }

    try {
      const stream = await webRTCService.startScreenShare();
      if (stream) {
        setScreenStream(stream);
        setIsScreenSharing(true);
        
        // Add event listener for when user stops sharing via browser UI
        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          setScreenStream(null);
          webRTCService.stopScreenShare();
        };
      }
    } catch (error) {
      console.error("Error toggling screen share:", error);
      setIsScreenSharing(false);
    }
  };

  const sendMessage = (message: string) => {
    webRTCService.sendMessage(message);
  };

  const endCall = () => {
    webRTCService.disconnect();
    navigate("/");
    toast({
      title: "Meeting ended",
      description: "You have left the meeting",
    });
  };

  // Calculate the grid layout based on number of participants
  const getGridTemplateColumns = () => {
    const participantCount = 1 + remoteStreams.length;
    if (participantCount === 1) return "1fr";
    if (participantCount === 2) return "1fr 1fr";
    if (participantCount <= 4) return "repeat(2, 1fr)";
    return "repeat(3, 1fr)";
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <MeetHeader meetingId={meetingId || ""} />
      
      {isJoining ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
              <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
            </div>
            <p className="mt-4 text-lg">Joining the meeting...</p>
          </div>
        </div>
      ) : (
        <main className="flex-1 flex flex-col p-4 overflow-hidden">
          <div 
            className="grid gap-4 flex-1 overflow-hidden"
            style={{ 
              gridTemplateColumns: getGridTemplateColumns(),
              gridAutoRows: "1fr"
            }}
          >
            {/* Screen share takes precedence if active */}
            {isScreenSharing && screenStream && (
              <div className="col-span-full row-span-2 video-container">
                <VideoPlayer 
                  stream={screenStream} 
                  username="Your screen" 
                  isLocal
                  isVideoEnabled={true}
                />
              </div>
            )}
            
            {/* Local user video */}
            <div className="video-container">
              <VideoPlayer 
                stream={localStream} 
                isLocal
                isMuted={!isAudioEnabled}
                isVideoEnabled={isVideoEnabled}
              />
            </div>
            
            {/* Remote users */}
            {remoteStreams.map((stream, index) => (
              <div key={index} className="video-container">
                <VideoPlayer 
                  stream={stream} 
                  username={`User ${index + 1}`}
                  isMuted={false}
                  isVideoEnabled={true}
                />
              </div>
            ))}
          </div>
        </main>
      )}
      
      <VideoControls 
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        toggleAudio={toggleAudio}
        toggleVideo={toggleVideo}
        toggleScreenShare={toggleScreenShare}
        isScreenSharing={isScreenSharing}
        endCall={endCall}
        toggleChat={() => setIsChatOpen(!isChatOpen)}
      />
      
      <ChatPanel 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)}
        messages={messages}
        onSendMessage={sendMessage}
      />
    </div>
  );
};

export default MeetingRoom;
