
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Copy, MoreVertical } from "lucide-react";
import { Link } from "react-router-dom";

interface MeetHeaderProps {
  meetingId: string;
}

const MeetHeader = ({ meetingId }: MeetHeaderProps) => {
  const { toast } = useToast();

  const copyMeetingLink = () => {
    const meetingLink = `${window.location.origin}/join/${meetingId}`;
    navigator.clipboard.writeText(meetingLink);
    toast({
      title: "Meeting link copied",
      description: "Share this link with others to join the meeting",
    });
  };

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-background border-b border-border glass-morphism">
      <Link to="/" className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <span className="bg-meetlink h-2.5 w-2.5 rounded-full animate-pulse-opacity"></span>
          <span className="text-xl font-semibold text-meetlink">MeetLink</span>
        </div>
      </Link>
      
      <div className="flex items-center gap-3">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-2" 
          onClick={copyMeetingLink}
        >
          <Copy size={14} />
          <span className="hidden sm:inline">Copy meeting link</span>
        </Button>
        <Button variant="ghost" size="icon">
          <MoreVertical size={18} />
        </Button>
      </div>
    </header>
  );
};

export default MeetHeader;
