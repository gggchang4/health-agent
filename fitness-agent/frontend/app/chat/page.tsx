"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { AgentCardList } from "@/components/cards";
import type { AgentMessage } from "@/lib/types";
import { approveProposal, createThread, getThreadMessages, postMessage, rejectProposal } from "@/lib/api";

const storageKey = "fitness-agent-chat-thread";

const initialMessages: AgentMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    content: "你可以直接询问训练、恢复、饮食，或者让我帮你整理一条待确认的可执行提案。这里的回复会实时依赖后端和 Agent 服务。"
  }
];

const quickPrompts = [
  "如果我昨晚没睡好，而且腿很酸，今晚还适合训练吗？",
  "帮我把当前计划调整成低能量周版本。",
  "记录我今天睡了 6.5 小时，走了 7000 步。"
];

export default function ChatPage() {
  const [threadId, setThreadId] = useState("");
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<AgentMessage[]>(initialMessages);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("正在连接助手");
  const [pendingProposalId, setPendingProposalId] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const threadPromiseRef = useRef<Promise<string> | null>(null);
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const hydrateThread = useCallback(async (existingThreadId: string) => {
    const history = await getThreadMessages(existingThreadId);
    if (!mountedRef.current) {
      return;
    }
    setMessages(history.length > 0 ? history : initialMessages);
    setStatus("助手已连接");
  }, []);

  const ensureThread = useCallback(async (): Promise<string> => {
    if (threadId) {
      return threadId;
    }

    if (!threadPromiseRef.current) {
      threadPromiseRef.current = (async () => {
        const cachedThreadId = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : "";
        if (cachedThreadId) {
          await hydrateThread(cachedThreadId);
          if (mountedRef.current) {
            setThreadId(cachedThreadId);
          }
          return cachedThreadId;
        }

        const result = await createThread();
        if (mountedRef.current) {
          setThreadId(result.threadId);
          setStatus("助手已连接");
          window.localStorage.setItem(storageKey, result.threadId);
        }
        return result.threadId;
      })()
        .catch((error) => {
          if (mountedRef.current) {
            const message = error instanceof Error ? error.message : "无法创建对话线程";
            setStatus(message);
          }
          throw error;
        })
        .finally(() => {
          threadPromiseRef.current = null;
        });
    }

    return threadPromiseRef.current;
  }, [hydrateThread, threadId]);

  useEffect(() => {
    void ensureThread();
  }, [ensureThread]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      scrollAnchorRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [messages, busy, pendingProposalId]);

  async function refreshMessages(activeThreadId: string) {
    const history = await getThreadMessages(activeThreadId);
    if (!mountedRef.current) {
      return;
    }
    setMessages(history.length > 0 ? history : initialMessages);
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
    setStatus("正在发送");

    try {
      const activeThreadId = await ensureThread();
      await postMessage(activeThreadId, content);
      await refreshMessages(activeThreadId);
      setStatus("已就绪");
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `请求失败：${message}`,
          reasoningSummary: "这里不再回退静态演示内容，报错反映的是当前后端或 Agent 的真实状态。"
        }
      ]);
      setStatus("请求失败");
    } finally {
      if (mountedRef.current) {
        setBusy(false);
      }
    }
  }

  async function handleProposalDecision(proposalId: string, decision: "approve" | "reject") {
    if (pendingProposalId || !threadId) {
      return;
    }

    setPendingProposalId(proposalId);
    setStatus(decision === "approve" ? "正在执行提案" : "正在拒绝提案");
    try {
      if (decision === "approve") {
        await approveProposal(proposalId);
      } else {
        await rejectProposal(proposalId);
      }
      await refreshMessages(threadId);
      setStatus("已就绪");
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `提案处理失败：${message}`,
          reasoningSummary: "这次确认或拒绝没有完成，请检查 backend 和 agent 的日志。"
        }
      ]);
      setStatus("提案处理失败");
    } finally {
      if (mountedRef.current) {
        setPendingProposalId(null);
      }
    }
  }

  return (
    <div className="page chat-page">
      <section className="chat-surface">
        <div className="chat-meta-row">
          <span className="section-label">Agent</span>
          <div className="chip-row">
            <span className={`status-pill ${busy || pendingProposalId ? "live" : "idle"}`}>{status}</span>
            <span className="mini-chip">{threadId ? "已连接线程" : "尚未建立线程"}</span>
          </div>
        </div>

        <div className="messages chat-feed">
          {messages.map((message) => (
            <div key={message.id} className={`message-row ${message.role === "user" ? "user" : "assistant"}`}>
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
                    {message.reasoningSummary ? <p className="muted message-meta">{message.reasoningSummary}</p> : null}
                    {message.cards && message.cards.length > 0 ? (
                      <AgentCardList
                        cards={message.cards}
                        pendingProposalId={pendingProposalId}
                        onApproveProposal={(proposalId) => void handleProposalDecision(proposalId, "approve")}
                        onRejectProposal={(proposalId) => void handleProposalDecision(proposalId, "reject")}
                      />
                    ) : null}
                  </div>
                </>
              ) : (
                <>
                  <div className="message-bubble user">
                    <small>你</small>
                    <div>{message.content}</div>
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
            placeholder="可以询问训练安排、恢复建议、饮食调整，也可以直接让我帮你生成待确认提案。按 Ctrl/Cmd + Enter 发送。"
          />

          <div className="chat-composer-row">
            <div className="chip-row">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="chip-button"
                  onClick={() => setText(prompt)}
                  disabled={busy || Boolean(pendingProposalId)}
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="action-row">
              <button
                type="button"
                className="ghost-button"
                onClick={() => setText("")}
                disabled={busy || Boolean(pendingProposalId)}
              >
                清空
              </button>
              <button type="button" className="button" onClick={onSubmit} disabled={busy || Boolean(pendingProposalId)}>
                {busy ? "发送中..." : "发送"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
