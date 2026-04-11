"use client";

import type { AgentMessage } from "@/lib/types";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createThread, postMessage } from "@/lib/api";

const initialMessages: AgentMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "Ask about training, recovery, diet, or your current plan. Responses now depend on the live backend and agent services."
  }
];

const quickPrompts = [
  "Should I train tonight if I slept badly and my legs are sore?",
  "Adjust my current plan for a low-energy week.",
  "What exercise should replace goblet squat if my knee feels irritated?"
];

export default function ChatPage() {
  const [threadId, setThreadId] = useState("");
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<AgentMessage[]>(initialMessages);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Connecting to the agent");

  const mountedRef = useRef(true);
  const threadPromiseRef = useRef<Promise<string> | null>(null);
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    void ensureThread();
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      scrollAnchorRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
    });

      return () => window.cancelAnimationFrame(frame);
  }, [messages, busy]);

  async function ensureThread(): Promise<string> {
    if (threadId) {
      return threadId;
    }

    if (!threadPromiseRef.current) {
      threadPromiseRef.current = createThread()
        .then((result) => {
          if (mountedRef.current) {
            setThreadId(result.threadId);
            setStatus("Agent connected");
          }

          return result.threadId;
        })
        .catch((error) => {
          if (mountedRef.current) {
            const message = error instanceof Error ? error.message : "Unable to create chat thread";
            setStatus(message);
          }

          throw error;
        })
        .finally(() => {
          threadPromiseRef.current = null;
        });
    }

    return threadPromiseRef.current;
  }

  async function onSubmit() {
    if (!text.trim() || busy) {
      return;
    }

    const content = text.trim();
    const userMessage: AgentMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content
    };

    setMessages((current) => [...current, userMessage]);
    setText("");
    setBusy(true);
    setStatus("Sending message");

    try {
      const activeThreadId = await ensureThread();
      const response = await postMessage(activeThreadId, content);

      setMessages((current) => [
        ...current,
        {
          id: response.id,
          role: "assistant",
          content: response.content,
          reasoningSummary: response.reasoningSummary
        }
      ]);
      setStatus("Ready");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Request failed: ${message}`,
          reasoningSummary: "The page no longer fabricates demo responses. This error reflects the real backend or agent state."
        }
      ]);
      setStatus("Request failed");
    } finally {
      if (mountedRef.current) {
        setBusy(false);
      }
    }
  }

  return (
    <div className="page chat-page">
      <section className="chat-surface">
        <div className="chat-meta-row">
          <span className="section-label">Agent</span>
          <div className="chip-row">
            <span className={`status-pill ${busy ? "live" : "idle"}`}>{status}</span>
            <span className="mini-chip">{threadId ? "Connected" : "No thread yet"}</span>
          </div>
        </div>

        <div className="messages chat-feed">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`message-row ${message.role === "user" ? "user" : "assistant"}`}
            >
              {message.role === "assistant" ? (
                <>
                  <div className="message-avatar assistant">
                    <Image
                      src="/brand/gympal-logo.jpg"
                      alt="GymPal"
                      width={36}
                      height={36}
                      className="message-avatar-image"
                    />
                  </div>

                  <div className="message-bubble assistant">
                    <small>GymPal</small>
                    <div>{message.content}</div>
                    {message.reasoningSummary ? (
                      <p className="muted message-meta">{message.reasoningSummary}</p>
                    ) : null}
                  </div>
                </>
              ) : (
                <>
                  <div className="message-bubble user">
                    <small>You</small>
                    <div>{message.content}</div>
                    {message.reasoningSummary ? (
                      <p className="muted message-meta">{message.reasoningSummary}</p>
                    ) : null}
                  </div>

                  <div className="message-avatar user">
                    <span>U</span>
                  </div>
                </>
              )}
            </div>
          ))}
          <div ref={scrollAnchorRef} />
        </div>

        <div className="composer chat-composer">
          <textarea
            rows={4}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                void onSubmit();
              }
            }}
            placeholder="Ask about training, recovery, diet, or exercise substitutions. Press Ctrl/Cmd + Enter to send."
          />
          <div className="chat-composer-row">
            <div className="chip-row">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="chip-button"
                  onClick={() => setText(prompt)}
                  disabled={busy}
                >
                  {prompt}
                </button>
              ))}
            </div>
            <div className="action-row">
              <button type="button" className="ghost-button" onClick={() => setText("")} disabled={busy}>
                Clear
              </button>
              <button type="button" className="button" onClick={onSubmit} disabled={busy}>
                {busy ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
