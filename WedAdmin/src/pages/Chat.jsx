import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../services/api";
import { getBackendOrigin } from "../services/baseUrl";
import "./Chat.css";

const resolveChatImage = (image) => {
  const value = String(image || "").trim();

  if (!value) {
    return "";
  }

  if (value.startsWith("http") || value.startsWith("data:") || value.startsWith("blob:")) {
    return value;
  }

  return `${getBackendOrigin()}${value}`;
};

const formatTime = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleString("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

export default function Chat() {
  const [threads, setThreads] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [threadDetail, setThreadDetail] = useState(null);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState("");

  const threadListRef = useRef(null);
  const messageListRef = useRef(null);
  const messagesEndRef = useRef(null);
  const previousMessageCountRef = useRef(0);
  const activeThreadIdRef = useRef("");
  const isNearBottomRef = useRef(true);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.user?._id === selectedUserId),
    [threads, selectedUserId],
  );

  const areThreadsEqual = useCallback((prevThreads, nextThreads) => {
    if (prevThreads.length !== nextThreads.length) {
      return false;
    }

    return prevThreads.every((thread, index) => {
      const nextThread = nextThreads[index];

      return (
        thread.user?._id === nextThread.user?._id &&
        String(thread.lastMessageAt || "") === String(nextThread.lastMessageAt || "") &&
        String(thread.lastMessage?.content || "") === String(nextThread.lastMessage?.content || "")
      );
    });
  }, []);

  const areMessagesEqual = useCallback((prevMessages, nextMessages) => {
    if (prevMessages.length !== nextMessages.length) {
      return false;
    }

    return prevMessages.every((messageItem, index) => {
      const nextMessage = nextMessages[index];

      return (
        String(messageItem.createdAt || "") === String(nextMessage.createdAt || "") &&
        String(messageItem.senderRole || "") === String(nextMessage.senderRole || "") &&
        String(messageItem.senderName || "") === String(nextMessage.senderName || "") &&
        String(messageItem.content || "") === String(nextMessage.content || "") &&
        JSON.stringify(messageItem.attachment || null) === JSON.stringify(nextMessage.attachment || null)
      );
    });
  }, []);

  const scrollToBottom = useCallback(() => {
    const container = messageListRef.current;

    if (!container) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, []);

  const handleMessageListScroll = useCallback(() => {
    const container = messageListRef.current;

    if (!container) {
      return;
    }

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    isNearBottomRef.current = distanceFromBottom < 120;
  }, []);

  const handleWheelScroll = useCallback((event) => {
    const container = event.currentTarget;
    const canScroll = container.scrollHeight > container.clientHeight + 1;

    if (!canScroll) {
      return;
    }

    const nextTop = container.scrollTop + event.deltaY;
    const maxTop = container.scrollHeight - container.clientHeight;
    const clampedTop = Math.max(0, Math.min(maxTop, nextTop));

    if (clampedTop !== container.scrollTop) {
      container.scrollTop = clampedTop;
      event.preventDefault();
    }
  }, []);

  const loadThreads = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setLoadingThreads(true);
      }

      try {
        const res = await api.get("/admin/chats");
        const list = res.data.threads || [];

        setThreads((prevThreads) => (areThreadsEqual(prevThreads, list) ? prevThreads : list));

        if (!selectedUserId && list.length) {
          setSelectedUserId(list[0].user?._id || "");
        } else if (selectedUserId && !list.some((item) => item.user?._id === selectedUserId)) {
          setSelectedUserId(list[0]?.user?._id || "");
        }
      } finally {
        if (!silent) {
          setLoadingThreads(false);
        }
      }
    },
    [areThreadsEqual, selectedUserId],
  );

  const loadThreadDetail = useCallback(
    async (userId, { silent = false } = {}) => {
      if (!userId) {
        setThreadDetail(null);
        return;
      }

      if (!silent) {
        setLoadingMessages(true);
      }

      try {
        const res = await api.get(`/admin/chats/${userId}`);
        const nextThread = res.data.thread || null;

        setThreadDetail((prevThread) => {
          if (!prevThread || !nextThread) {
            return nextThread;
          }

          const prevMessages = prevThread.messages || [];
          const nextMessages = nextThread.messages || [];
          const sameMessages = areMessagesEqual(prevMessages, nextMessages);
          const sameLastMessageAt =
            String(prevThread.lastMessageAt || "") === String(nextThread.lastMessageAt || "");

          return sameMessages && sameLastMessageAt ? prevThread : nextThread;
        });
      } finally {
        if (!silent) {
          setLoadingMessages(false);
        }
      }
    },
    [areMessagesEqual],
  );

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (selectedUserId) {
      loadThreadDetail(selectedUserId);
    }
  }, [selectedUserId, loadThreadDetail]);

  useEffect(() => {
    const timer = setInterval(() => {
      loadThreads({ silent: true });
      if (selectedUserId) {
        loadThreadDetail(selectedUserId, { silent: true });
      }
    }, 8000);

    return () => clearInterval(timer);
  }, [loadThreads, loadThreadDetail, selectedUserId]);

  useEffect(() => {
    const messageCount = threadDetail?.messages?.length || 0;
    const threadId = selectedUserId || "";
    const threadChanged = activeThreadIdRef.current !== threadId;
    const hasNewMessages = messageCount > previousMessageCountRef.current;

    if (threadChanged) {
      requestAnimationFrame(scrollToBottom);
    } else if (hasNewMessages && isNearBottomRef.current) {
      requestAnimationFrame(scrollToBottom);
    }

    activeThreadIdRef.current = threadId;
    previousMessageCountRef.current = messageCount;
  }, [scrollToBottom, selectedUserId, threadDetail?.messages]);

  const handleSend = async (event) => {
    event.preventDefault();

    const content = draft.trim();
    if (!content || !selectedUserId) {
      return;
    }

    setSending(true);
    try {
      await api.post(`/admin/chats/${selectedUserId}/messages`, { content });
      setDraft("");
      setMessage("Da gui tin nhan");
      await loadThreads({ silent: true });
      await loadThreadDetail(selectedUserId, { silent: true });
    } catch (err) {
      setMessage(err.response?.data?.message || "Khong the gui tin nhan");
    } finally {
      setSending(false);
    }
  };

  const messages = threadDetail?.messages || [];
  const user = threadDetail?.user || selectedThread?.user || null;

  return (
    <div className="page-chat grid">
      <div className="panel panel-hero chat-hero">
        <div>
          <p className="eyebrow">Hop thu</p>
          <h3>Chat voi khach hang</h3>
          <p className="muted-text">
            Theo doi hoi thoai tu app mobile va tra loi truc tiep trong admin.
          </p>
        </div>
        {message ? <div className="chat-banner">{message}</div> : null}
      </div>

      <div className="chat-layout">
        <aside className="panel chat-thread-list">
          <div className="panel-header">
            <div>
              <h3>Hoi thoai</h3>
              <p className="muted-text small-text">{threads.length} cuoc tro chuyen</p>
            </div>
          </div>

          <div className="thread-scroll" ref={threadListRef} onWheel={handleWheelScroll}>
            {loadingThreads ? (
              <p className="muted-text">Dang tai danh sach...</p>
            ) : threads.length === 0 ? (
              <div className="empty-thread">
                <strong>Chua co tin nhan</strong>
                <span>Hoi thoai tu app mobile se xuat hien o day.</span>
              </div>
            ) : (
              <div className="thread-stack">
                {threads.map((thread) => {
                  const isActive = thread.user?._id === selectedUserId;

                  return (
                    <button
                      key={thread.user?._id}
                      type="button"
                      className={`thread-item ${isActive ? "active" : ""}`}
                      onClick={() => setSelectedUserId(thread.user?._id || "")}
                    >
                      <div className="thread-head">
                        <strong>{thread.user?.username || "user"}</strong>
                        <span>{formatTime(thread.lastMessageAt)}</span>
                      </div>
                      <p>{thread.lastMessage?.content || "Chua co tin nhan"}</p>
                      <small>{thread.user?.email || ""}</small>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <section className="panel chat-panel">
          <div className="chat-panel-header">
            <div>
              <p className="eyebrow">Nguoi dung</p>
              <h3>{user?.username || "Chon mot hoi thoai"}</h3>
              <p className="muted-text small-text">{user?.email || "Chua co du lieu"}</p>
            </div>
          </div>

          <div
            className="chat-message-list"
            ref={messageListRef}
            onScroll={handleMessageListScroll}
            onWheel={handleWheelScroll}
          >
            {loadingMessages ? (
              <p className="muted-text">Dang tai noi dung chat...</p>
            ) : messages.length === 0 ? (
              <div className="empty-chat">
                <strong>Chua co tin nhan</strong>
                <span>Hay gui loi nhan dau tien cho khach hang.</span>
              </div>
            ) : (
              messages.map((item, index) => {
                const isAdmin = item.senderRole === "admin";

                return (
                  <div
                    key={`${item.createdAt}-${index}`}
                    className={`chat-message-row ${isAdmin ? "right" : "left"}`}
                  >
                    <div className={`chat-bubble ${isAdmin ? "admin" : "user"}`}>
                      <div className="chat-meta">
                        <strong>{isAdmin ? "Admin" : item.senderName || "User"}</strong>
                        <span>{formatTime(item.createdAt)}</span>
                      </div>
                      {item.content ? <p>{item.content}</p> : null}

                      {item.attachment?.type === "product" ? (
                        <div className="chat-attachment">
                          {item.attachment.image ? (
                            <img
                              src={resolveChatImage(item.attachment.image)}
                              alt={item.attachment.name}
                            />
                          ) : (
                            <div className="attachment-placeholder">Anh</div>
                          )}
                          <div>
                            <strong>{item.attachment.name}</strong>
                            <span>
                              {Number(item.attachment.price || 0).toLocaleString("vi-VN")} VND
                            </span>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="chat-composer" onSubmit={handleSend}>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Nhap tin nhan..."
              rows={3}
            />
            <button className="btn btn-primary" type="submit" disabled={sending || !selectedUserId}>
              {sending ? "Dang gui..." : "Gui"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
