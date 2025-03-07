
import React from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, PhoneOff, MonitorSmartphone, MessageSquare, UserPlus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface VideoControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => void;
  isScreenSharing: boolean;
  endCall: () => void;
  toggleChat: () => void;
}

const VideoControls: React.FC<VideoControlsProps> = ({
  isAudioEnabled,
  isVideoEnabled,
  toggleAudio,
  toggleVideo,
  toggleScreenShare,
  isScreenSharing,
  endCall,
  toggleChat,
}) => {
  const { toast } = useToast();

  const handleInvite = () => {
    // Implementation would require actual backend for meeting links
    const meetingUrl = window.location.href;
    navigator.clipboard.writeText(meetingUrl);
    toast({
      title: "Meeting link copied",
      description: "Share this link with others to join the meeting",
    });
  };

  return (
    <div className="video-controls">
      <button
        onClick={toggleAudio}
        className={`control-button ${
          isAudioEnabled ? "control-button-active" : "control-button-inactive"
        }`}
        title={isAudioEnabled ? "Mute microphone" : "Unmute microphone"}
      >
        {isAudioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
      </button>

      <button
        onClick={toggleVideo}
        className={`control-button ${
          isVideoEnabled ? "control-button-active" : "control-button-inactive"
        }`}
        title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
      >
        {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
      </button>

      <button
        onClick={toggleScreenShare}
        className={`control-button ${
          isScreenSharing ? "control-button-active" : "control-button-inactive"
        }`}
        title={isScreenSharing ? "Stop sharing screen" : "Share screen"}
      >
        <MonitorSmartphone size={20} />
      </button>

      <button
        onClick={toggleChat}
        className="control-button control-button-inactive"
        title="Open chat"
      >
        <MessageSquare size={20} />
      </button>

      <button
        onClick={handleInvite}
        className="control-button control-button-inactive"
        title="Add participants"
      >
        <UserPlus size={20} />
      </button>

      <button
        onClick={endCall}
        className="control-button bg-destructive hover:bg-destructive/90"
        title="End call"
      >
        <PhoneOff size={20} />
      </button>
    </div>
  );
};

export default VideoControls;
