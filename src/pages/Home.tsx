
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { Video, Users, MessageSquare, ShieldCheck } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

const Home = () => {
  const navigate = useNavigate();
  const [meetingId, setMeetingId] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const createNewMeeting = () => {
    setIsCreating(true);
    const newMeetingId = uuidv4().substring(0, 8);
    setTimeout(() => {
      navigate(`/meet/${newMeetingId}`);
    }, 500);
  };

  const joinMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (meetingId.trim()) {
      setIsJoining(true);
      setTimeout(() => {
        navigate(`/meet/${meetingId}`);
      }, 500);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 bg-meetlink rounded-full animate-pulse"></div>
            <h1 className="text-2xl font-bold text-meetlink">MeetLink</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm">Sign In</Button>
            <Button size="sm">Sign Up</Button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row">
        <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center md:text-left">
              <h2 className="text-3xl md:text-4xl font-bold">Video meetings for everyone</h2>
              <p className="mt-3 text-muted-foreground">
                Connect, collaborate, and celebrate from anywhere with MeetLink's secure video meetings
              </p>
            </div>

            <div className="space-y-4">
              <Button 
                onClick={createNewMeeting} 
                className="w-full bg-meetlink hover:bg-meetlink-dark text-white"
                disabled={isCreating}
              >
                {isCreating ? "Creating Meeting..." : "New Meeting"}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    or join existing
                  </span>
                </div>
              </div>

              <form onSubmit={joinMeeting} className="flex gap-2">
                <Input
                  value={meetingId}
                  onChange={(e) => setMeetingId(e.target.value)}
                  placeholder="Enter meeting code"
                  className="flex-1"
                />
                <Button type="submit" variant="outline" disabled={!meetingId.trim() || isJoining}>
                  {isJoining ? "Joining..." : "Join"}
                </Button>
              </form>
            </div>
          </div>
        </div>

        <div className="hidden md:flex flex-1 bg-meetlink/5 items-center justify-center">
          <div className="max-w-md px-8">
            <div className="grid grid-cols-2 gap-6">
              <div className="flex flex-col items-center text-center gap-2 p-4">
                <div className="h-12 w-12 rounded-full bg-meetlink/10 flex items-center justify-center">
                  <Video className="text-meetlink h-6 w-6" />
                </div>
                <h3 className="font-medium">HD Video</h3>
                <p className="text-sm text-muted-foreground">Crystal clear video meetings with up to 100 participants</p>
              </div>

              <div className="flex flex-col items-center text-center gap-2 p-4">
                <div className="h-12 w-12 rounded-full bg-meetlink/10 flex items-center justify-center">
                  <Users className="text-meetlink h-6 w-6" />
                </div>
                <h3 className="font-medium">Team Collaboration</h3>
                <p className="text-sm text-muted-foreground">Share your screen and work together in real-time</p>
              </div>

              <div className="flex flex-col items-center text-center gap-2 p-4">
                <div className="h-12 w-12 rounded-full bg-meetlink/10 flex items-center justify-center">
                  <MessageSquare className="text-meetlink h-6 w-6" />
                </div>
                <h3 className="font-medium">Instant Chat</h3>
                <p className="text-sm text-muted-foreground">Send messages and share links during meetings</p>
              </div>

              <div className="flex flex-col items-center text-center gap-2 p-4">
                <div className="h-12 w-12 rounded-full bg-meetlink/10 flex items-center justify-center">
                  <ShieldCheck className="text-meetlink h-6 w-6" />
                </div>
                <h3 className="font-medium">Secure Meetings</h3>
                <p className="text-sm text-muted-foreground">All meetings are encrypted and protected</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border p-4 text-center text-sm text-muted-foreground">
        <div className="max-w-7xl mx-auto">
          MeetLink &copy; {new Date().getFullYear()} • Secure Video Conferencing
        </div>
      </footer>
    </div>
  );
};

export default Home;
