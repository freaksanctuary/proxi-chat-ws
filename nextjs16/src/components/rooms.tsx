"use client";

import { client } from "@/lib/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
type HomePageProps = {
  roomId: string;
  userName: string | undefined;
};

type Message = {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  roomId: string;
  token?: string | undefined;
};

export default function RoomPage({ roomId, userName }: HomePageProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [isPending, setIsPending] = useState<boolean>(false);
  const [input, setInput] = useState("");
  const [wsMessages, setWsMessages] = useState<Message[]>([]);

  const { data: messageData } = useQuery({
    queryKey: ["messages", roomId],
    queryFn: async () => {
      const res = await client.messages.get({ query: { roomId } });
      if (res.status === 401) router.push("/search/?error=room-not-found");

      return res.data;
    },
  });

  const sendMessage = ({ text }: { text: string }) => {
    if (isPending) return;
    console.log("sending");
    setIsPending(true);
    setInput("");
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "publish",
          roomId: roomId,
          message: {
            id: crypto.randomUUID(),
            sender: userName,
            timestamp: Date.now(),
            text: text,
          },
        }),
      );
    }
  };

  useEffect(() => {
    if (messageData?.messages !== undefined)
      setWsMessages(messageData.messages);
  }, [messageData]);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//54.179.120.31:82/ws/room`;
    console.log("🔌 Attempting to connect to:", wsUrl);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "subscribe",
          roomId: roomId,
        }),
      );
    };

    ws.onerror = (error) => {
      console.error("❌ WebSocket ERROR:", error);
    };

    ws.onclose = (event) => {
      console.log("❌ WebSocket CLOSE:", {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
      });
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "ack") {
        console.log("sent");
        setIsPending(false);
      }
      if (data.type === "error") {
        console.log(data);
        setIsPending(false);
      }
      setWsMessages((prevMessages) => [...prevMessages, data]);
    };

    // Cleanup function
    return () => {
      console.log("🧹 Cleanup called - closing WebSocket");
      const ws = wsRef.current;
      if (!ws) return;

      if (
        ws.readyState === WebSocket.CONNECTING ||
        ws.readyState === WebSocket.OPEN
      ) {
        try {
          ws.send(JSON.stringify({ type: "unsubscribe", room: roomId }));
        } catch (err) {
          console.warn("Failed to send unsubscribe", err);
        }
        ws.close(1000, "Component unmounting");
      }
    };
  }, []);

  return (
    <main className="flex flex-col h-screen max-h-screen overflow-hidden">
      <header className="border-b border-zinc-800 p-4 flex items-center justify-between bg-zinc-900/30">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-xs text-zinc-500 uppercase">Room ID</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-green-500 truncate">
                {roomId.slice(0, 10) + "..."}
              </span>
            </div>
          </div>

          <div className="h-8 w-px bg-zinc-800" />

          <div className="flex flex-col">
            <span className="text-xs text-zinc-500 uppercase">
              Self-Destruct
            </span>
          </div>
        </div>
      </header>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {wsMessages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-zinc-600 text-sm font-mono">
              No messages yet, start the conversation.
            </p>
          </div>
        )}

        {wsMessages.map((msg) => (
          <div key={msg.id} className="flex flex-col items-start">
            <div className="max-w-[80%] group">
              <div className="flex items-baseline gap-3 mb-1">
                <span
                  className={`text-xs font-bold ${
                    msg.sender === userName ? "text-green-500" : "text-blue-500"
                  }`}
                >
                  {msg.sender === userName ? "YOU" : msg.sender}
                </span>

                <span className="text-[10px] text-zinc-600">
                  {msg.timestamp}
                </span>
              </div>

              <p className="text-sm text-zinc-300 leading-relaxed break-all">
                {msg.text}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-zinc-800 bg-zinc-900/30">
        <div className="flex gap-4">
          <div className="flex-1 relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-green-500 animate-pulse">
              {">"}
            </span>
            <input
              autoFocus
              type="text"
              value={input}
              onKeyDown={(e) => {
                if (e.key === "Enter" && input.trim()) {
                  sendMessage({ text: input });
                  inputRef.current?.focus();
                }
              }}
              placeholder="Type message..."
              onChange={(e) => setInput(e.target.value)}
              className="w-full bg-black border border-zinc-800 focus:border-zinc-700 focus:outline-none transition-colors text-zinc-100 placeholder:text-zinc-700 py-3 pl-8 pr-4 text-sm"
            />
          </div>

          <button
            onClick={() => {
              sendMessage({ text: input });
              inputRef.current?.focus();
            }}
            disabled={!input.trim() || isPending}
            className="bg-zinc-800 text-zinc-400 px-6 text-sm font-bold hover:text-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            SEND
          </button>
        </div>
      </div>
    </main>
  );
}
