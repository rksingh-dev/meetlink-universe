
import React, { useRef, useEffect } from "react";
import { Mic, MicOff, User } from "lucide-react";

interface VideoPlayerProps {
  stream: MediaStream | null;
  isLocal?: boolean;
  username?: string;
  isMuted?: boolean;
  isVideoEnabled?: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  stream,
  isLocal = false,
  username = "You",
  isMuted = false,
  isVideoEnabled = true,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="video-container aspect-video bg-secondary">
      {isVideoEnabled && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-secondary">
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
            <User size={40} className="text-muted-foreground" />
          </div>
          <span className="mt-2 text-sm text-muted-foreground">{username}</span>
        </div>
      )}

      <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/70 backdrop-blur-sm">
        <span className="text-sm font-medium">{username}</span>
        {isMuted && (
          <MicOff size={14} className="text-destructive" />
        )}
        {!isMuted && !isLocal && (
          <Mic size={14} className="text-green-500" />
        )}
      </div>
    </div>
  );
};

export default VideoPlayer;
