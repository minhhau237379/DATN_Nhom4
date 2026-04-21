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
  const messagesEndRef = useRef(null);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.user?._id === selectedUserId),
    [threads, selectedUserId],
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  const loadThreads = useCallback(async () => {
    setLoadingThreads(true);
    try {
      const res = await api.get("/admin/chats");
      const list = res.data.threads || [];
      setThreads(list);

      if (!selectedUserId && list.length) {
        setSelectedUserId(list[0].user?._id || "");
      } else if (selectedUserId && !list.some((item) => item.user?._id === selectedUserId)) {
        setSelectedUserId(list[0]?.user?._id || "");
      }
    } finally {
      setLoadingThreads(false);
    }
  }, [selectedUserId]);

  const loadThreadDetail = useCallback(async (userId) => {
    if (!userId) {
      setThreadDetail(null);
      return;
    }

    setLoadingMessages(true);
    try {
      const res = await api.get(`/admin/chats/${userId}`);
      setThreadDetail(res.data.thread || null);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

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
      loadThreads();
      if (selectedUserId) {
        loadThreadDetail(selectedUserId);
      }
    }, 8000);

    return () => clearInterval(timer);
  }, [loadThreads, loadThreadDetail, selectedUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [threadDetail?.messages]);

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
      setMessage("Đã gửi tin nhắn");
      await loadThreads();
      await loadThreadDetail(selectedUserId);
    } catch (err) {
      setMessage(err.response?.data?.message || "Không thể gửi tin nhắn");
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
          <p className="eyebrow">Hộp thư</p>
          <h3>Chat với khách hàng</h3>
          <p className="muted-text">
            Theo dõi hội thoại từ app mobile và trả lời trực tiếp trong admin.
          </p>
        </div>
        {message ? <div className="chat-banner">{message}</div> : null}
      </div>

      <div className="chat-layout">
        <aside className="panel chat-thread-list">
          <div className="panel-header">
            <div>
              <h3>Hội thoại</h3>
              <p className="muted-text small-text">
                {threads.length} cuộc trò chuyện
              </p>
            </div>
          </div>

          {loadingThreads ? (
            <p className="muted-text">Đang tải danh sách...</p>
          ) : threads.length === 0 ? (
            <div className="empty-thread">
              <strong>Chưa có tin nhắn</strong>
              <span>Hội thoại từ app mobile sẽ xuất hiện ở đây.</span>
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
                    <p>{thread.lastMessage?.content || "Chưa có tin nhắn"}</p>
                    <small>{thread.user?.email || ""}</small>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <section className="panel chat-panel">
          <div className="chat-panel-header">
            <div>
              <p className="eyebrow">Người dùng</p>
              <h3>{user?.username || "Chọn một hội thoại"}</h3>
              <p className="muted-text small-text">{user?.email || "Chưa có dữ liệu"}</p>
            </div>
          </div>

          <div className="chat-message-list">
            {loadingMessages ? (
              <p className="muted-text">Đang tải nội dung chat...</p>
            ) : messages.length === 0 ? (
              <div className="empty-chat">
                <strong>Chưa có tin nhắn</strong>
                <span>Hãy gửi lời nhắn đầu tiên cho khách hàng.</span>
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
                            <div className="attachment-placeholder">Ảnh</div>
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
              placeholder="Nhập tin nhắn..."
              rows={3}
            />
            <button className="btn btn-primary" type="submit" disabled={sending || !selectedUserId}>
              {sending ? "Đang gửi..." : "Gửi"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
