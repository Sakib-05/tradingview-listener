"use client";
import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

export default function ChatView() {
  const socketRef = useRef<Socket | null>(null);
  const receivedEventIds = useRef<Set<string>>(new Set());
  const [subscribedTopics, setSubscribedTopics] = useState<Set<string>>(new Set());
  const [messages, setMessages] = useState<
    Array<{ eventId: string; topic: string; message: string; timestamp: string }>
  >([]);
  const timeframes = [
    { label: "1m", topic: "timeframe:1m" },
    { label: "5m", topic: "timeframe:5m" },
    { label: "15m", topic: "timeframe:15m" },
    { label: "1h", topic: "timeframe:1h" },
    { label: "4h", topic: "timeframe:4h" },
  ];
  const serverUrl =
    process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

  useEffect(() => {
    const socket = io(serverUrl, {
      autoConnect: false,
    });

    socket.on(
      "timeframe:update",
      (data: {
        eventId: string;
        topic: string;
        timeframe?: string;
        message: string;
        audioPath?: string;
        timestamp: string;
      }) => {
        if (receivedEventIds.current.has(data.eventId)) {
          return;
        }

        receivedEventIds.current.add(data.eventId);
        setMessages((previousMessages) => [
          ...previousMessages,
          {
            eventId: data.eventId,
            topic: data.topic,
            message: data.message,
            timestamp: data.timestamp,
          },
        ]);

        if (data.audioPath) {
          void new Audio(`${serverUrl}${data.audioPath}`).play();
        }
      }
    );

    socketRef.current = socket;
    socket.connect();

    return () => {
      socket.off("timeframe:update");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [serverUrl]);

  function handleTimeFrame(topic: string) {
    const socket = socketRef.current;
    if (!socket?.connected) return;

    setSubscribedTopics((previousTopics) => {
      const nextTopics = new Set(previousTopics);

      if (nextTopics.has(topic)) {
        socket.emit("unsubscribe", topic);
        nextTopics.delete(topic);
      } else {
        socket.emit("subscribe", topic);
        nextTopics.add(topic);
      }

      return nextTopics;
    });
  }

  async function triggerTest(timeframe: string) {
    await fetch(`${serverUrl}/test/${timeframe}`, {
      method: "POST",
    });
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center px-6 py-10">
      <div className="w-full rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-2xl shadow-black/30 sm:p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">Market Feed</h1>
          <p className="mt-2 text-sm text-slate-400">
            Select the timeframes you want to receive
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {timeframes.map(({ label, topic }) => {
            const subscribed = subscribedTopics.has(topic);

            return (
              <button
                key={topic}
                type="button"
                onClick={() => handleTimeFrame(topic)}
                className={`rounded-2xl border-2 px-4 py-5 text-center transition-all duration-200 ${
                  subscribed
                    ? "border-emerald-400 bg-emerald-400/10 shadow-lg shadow-emerald-500/10"
                    : "border-red-500 bg-slate-900 hover:border-red-400 hover:bg-slate-800"
                }`}
              >
                <p className="text-lg font-bold text-white">{label}</p>
                <p
                  className={`mt-1 text-xs font-medium ${
                    subscribed ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {subscribed ? "Subscribed" : "Not subscribed"}
                </p>
              </button>
            );
          })}
        </div>

        <div className="mt-8 border-t border-slate-800 pt-6">
          <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-slate-400">
            Test Audio
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {timeframes
              .filter(({ label }) => ["1m", "5m", "15m", "1h"].includes(label))
              .map(({ label, topic }) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => void triggerTest(label)}
                  className="rounded-full border border-sky-500/60 bg-sky-500/10 px-5 py-2 text-sm font-semibold text-sky-300 transition hover:border-sky-400 hover:bg-sky-500/20"
                >
                  Test {label}
                </button>
              ))}
          </div>
        </div>

        <div className="mt-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-slate-400">
            Messages
          </p>
          <div className="min-h-32 rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
            {messages.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-500">
                No messages yet
              </p>
            ) : (
              <div className="space-y-2">
                {messages.map((item, index) => {
                  const time = new Date(item.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  });

                  return (
                    <div
                      key={`${item.eventId}-${index}`}
                      className="flex items-center justify-between gap-6 rounded-xl border border-slate-700/70 bg-slate-800 px-4 py-3"
                    >
                      <p className="min-w-0 text-left text-sm text-slate-100">
                        <span className="mr-2 font-bold text-sky-400">
                          {item.topic}
                        </span>
                        {item.message}
                      </p>
                      <time className="shrink-0 text-right text-xs text-slate-400">
                        {time}
                      </time>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
