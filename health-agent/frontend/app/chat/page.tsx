"use client";

import { AgentCardList } from "@/components/cards";
import { createThread, postMessage, streamRun } from "@/lib/api";
import { AgentCard, AgentMessage, RunStepType, StreamEvent } from "@/lib/types";
import { useEffect, useRef, useState } from "react";

interface TimelineEvent {
  id: string;
  type: RunStepType;
  title: string;
  summary: string;
}

const initialMessages: AgentMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "Welcome to Health Agent. Ask about recovery, workout planning, or nearby gyms. This page shows the real agent run stream.",
    reasoningSummary:
      "This UI subscribes to the run stream and displays thinking summary, tool activity, card rendering, and the final message."
  }
];

const quickPrompts = [
  "I slept 5 hours and my legs are still sore. Should I train tonight?",
  "Build me a 4-day fat-loss workout plan for this week. Wednesday evening is unavailable.",
  "What gyms are around me and good for beginner strength training?"
];

function getEventSummary(event: StreamEvent): string {
  const payload = event.data.payload;

  if (event.event === "thinking_summary") {
    return typeof payload.summary === "string" ? payload.summary : "Reasoning summary received.";
  }

  if (event.event === "tool_call_started" || event.event === "tool_call_completed") {
    return typeof payload.summary === "string" ? payload.summary : "Tool event received.";
  }

  if (event.event === "card_render") {
    return typeof payload.description === "string" ? payload.description : "Card rendered.";
  }

  if (event.event === "final_message") {
    return typeof payload.content === "string" ? payload.content : "Final message received.";
  }

  return "Agent event received.";
}

function getCardPayload(payload: Record<string, unknown>): AgentCard | null {
  const type = payload.type;
  const title = payload.title;
  const description = payload.description;
  const bullets = payload.bullets;

  if (typeof type !== "string" || typeof title !== "string" || typeof description !== "string") {
    return null;
  }

  return {
    type: type as AgentCard["type"],
    title,
    description,
    bullets: Array.isArray(bullets) ? bullets.filter((item): item is string => typeof item === "string") : []
  };
}

export default function ChatPage() {
  const [threadId, setThreadId] = useState("");
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<AgentMessage[]>(initialMessages);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [activeCards, setActiveCards] = useState<AgentCard[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Initializing agent thread...");
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }
    initializedRef.current = true;

    createThread()
      .then((result) => {
        setThreadId(result.threadId);
        setStatus("Thread ready. Send a message to watch the agent run.");
      })
      .catch(() => {
        setStatus("Thread initialization failed. The page will retry when you send a message.");
      });
  }, []);

  async function ensureThread(): Promise<string> {
    if (threadId) {
      return threadId;
    }

    const result = await createThread();
    setThreadId(result.threadId);
    return result.threadId;
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
    setTimeline([]);
    setActiveCards([]);
    setStatus("Posting message...");

    try {
      const activeThreadId = await ensureThread();
      const response = await postMessage(activeThreadId, content);

      setStatus("Message accepted. Streaming run events...");
      const streamCards: AgentCard[] = [];
      let finalContent = response.content;
      let finalReasoning = response.reasoningSummary;

      await streamRun(response.runId, (event) => {
        setTimeline((current) => [
          ...current,
          {
            id: event.data.id,
            type: event.event,
            title: event.data.title,
            summary: getEventSummary(event)
          }
        ]);

        if (event.event === "thinking_summary") {
          if (typeof event.data.payload.summary === "string") {
            finalReasoning = event.data.payload.summary;
          }
          setStatus("Thinking summary received.");
          return;
        }

        if (event.event === "tool_call_started") {
          setStatus(`Running tool: ${event.data.title}`);
          return;
        }

        if (event.event === "tool_call_completed") {
          setStatus(`Tool completed: ${event.data.title}`);
          return;
        }

        if (event.event === "card_render") {
          const card = getCardPayload(event.data.payload);
          if (card) {
            streamCards.push(card);
            setActiveCards([...streamCards]);
            setStatus(`Card rendered: ${card.title}`);
          }
          return;
        }

        if (event.event === "final_message") {
          if (typeof event.data.payload.content === "string") {
            finalContent = event.data.payload.content;
          }
          setStatus("Final message received.");
        }
      });

      setMessages((current) => [
        ...current,
        {
          id: response.id,
          role: "assistant",
          content: finalContent,
          reasoningSummary: finalReasoning,
          cards: streamCards.length > 0 ? streamCards : response.cards
        }
      ]);
      setActiveCards(streamCards.length > 0 ? streamCards : response.cards);
      setStatus("Run completed.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown agent error.";
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Agent request failed: ${message}`,
          reasoningSummary:
            "The browser did not receive a complete run stream. Check frontend, backend, and agent-service connectivity."
        }
      ]);
      setStatus("Run failed.");
    } finally {
      setBusy(false);
    }
  }

  const latestAssistant = [...messages].reverse().find((message) => message.role === "assistant");

  return (
    <div className="page">
      <section className="hero">
        <span className="pill">Live Agent Stream</span>
        <h2>Real-time Agent Debug View</h2>
        <p>
          This page posts a message, subscribes to the run stream, and renders thinking summary,
          tool calls, card rendering, and the final assistant message in order.
        </p>
      </section>

      <div className="chat-layout">
        <section className="card chat-panel">
          <div className="chat-status">
            <strong>Run status</strong>
            <span>{status}</span>
          </div>

          <div className="messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message ${message.role === "user" ? "user" : "assistant"}`}
              >
                <small>{message.role === "user" ? "User" : "Health Agent"}</small>
                <div>{message.content}</div>
                {message.reasoningSummary ? (
                  <p className="muted message-meta">Reasoning summary: {message.reasoningSummary}</p>
                ) : null}
              </div>
            ))}
          </div>

          <div className="composer">
            <textarea
              rows={4}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Example: I slept 5 hours and my legs are still sore. Should I train tonight?"
            />
            <div className="actions">
              <button className="button" onClick={onSubmit} disabled={busy}>
                {busy ? "Running..." : "Send to Agent"}
              </button>
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  className="button secondary"
                  onClick={() => setText(prompt)}
                  disabled={busy}
                >
                  Quick fill
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="page">
          <div className="card">
            <h3>Current thread</h3>
            <p className="muted">{threadId || "Not created yet"}</p>
          </div>

          <div className="card">
            <h3>Live run events</h3>
            <div className="event-list">
              {timeline.length === 0 ? (
                <p className="muted">
                  After you send a message, this panel will show thinking summary, tool calls, and
                  the final message as the run unfolds.
                </p>
              ) : (
                timeline.map((event) => (
                  <div key={event.id} className={`event-item ${event.type}`}>
                    <strong>{event.type}</strong>
                    <span>{event.title}</span>
                    <p className="muted">{event.summary}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {activeCards.length > 0 ? (
            <AgentCardList cards={activeCards} />
          ) : latestAssistant?.cards && latestAssistant.cards.length > 0 ? (
            <AgentCardList cards={latestAssistant.cards} />
          ) : null}
        </section>
      </div>
    </div>
  );
}
