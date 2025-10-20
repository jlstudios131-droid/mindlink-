// src/MindLink.jsx
import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

/*
  MindLink — Dark Neon UI prototype
  - single-file app component
  - requires Tailwind + Framer Motion + React
  - paste into src/MindLink.jsx and keep main.jsx importing it.
*/

/* -------------------- THEME / HELPERS -------------------- */
const LS = {
  get: (k, def) => {
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : def;
    } catch {
      return def;
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  },
};

const THEME = {
  dark: {
    bg: "linear-gradient(180deg,#07060b 0%, #12031a 100%)",
    text: "#e9f6ff",
    card: "rgba(255,255,255,0.04)",
    soft: "rgba(255,255,255,0.03)",
    accentA: "#ff007a", // pink
    accentB: "#00ff9d", // neon green
  },
  light: {
    bg: "linear-gradient(180deg,#ffffff 0%, #f7f7fb 100%)",
    text: "#0b1020",
    card: "rgba(11,16,32,0.03)",
    soft: "rgba(11,16,32,0.02)",
    accentA: "#8b5cf6",
    accentB: "#ff6b6b",
  },
};

const uid = (p = "") => `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}${p}`;

/* -------------------- MOCK SERVICE -------------------- */
const MockService = (() => {
  let users = [
    { id: "u_you", username: "you", display: "You", avatar: "Y", premium: false },
    { id: "u_ava", username: "ava", display: "Ava", avatar: "A", premium: true },
    { id: "u_rui", username: "rui", display: "Rui", avatar: "R", premium: false },
  ];

  let posts = [
    {
      id: "p1",
      authorId: "u_ava",
      content: "Micro-break coding: short sprints help focus — try 52/5.",
      media: null,
      mediaType: null,
      likes: 8,
      createdAt: Date.now() - 1000 * 60 * 45,
      tags: ["productivity"],
      comments: [], // {id, authorId, body, private}
    },
    {
      id: "p2",
      authorId: "u_rui",
      content: "Community solar nodes — sketching the network architecture.",
      media: null,
      mediaType: null,
      likes: 5,
      createdAt: Date.now() - 1000 * 60 * 60 * 6,
      tags: ["sustainability"],
      comments: [],
    },
  ];

  let messages = [
    { id: "m1", from: "u_ava", to: "u_you", body: "Loved your last idea.", createdAt: Date.now() - 1000 * 60 * 40 },
  ];

  return {
    fetchPosts: async () => Promise.resolve(posts.slice().sort((a, b) => b.createdAt - a.createdAt)),
    createPost: async (p) => {
      const post = { ...p, id: uid("p"), likes: 0, createdAt: Date.now(), comments: [] };
      posts.unshift(post);
      return Promise.resolve(post);
    },
    likePost: async (id) => {
      posts = posts.map((x) => (x.id === id ? { ...x, likes: x.likes + 1 } : x));
      return Promise.resolve(true);
    },
    addComment: async (postId, comment) => {
      posts = posts.map((p) => (p.id === postId ? { ...p, comments: [...(p.comments || []), comment] } : p));
      return Promise.resolve(comment);
    },
    fetchUsers: async () => Promise.resolve(users.map((u) => ({ ...u }))),
    getUserById: async (id) => users.find((u) => u.id === id) || null,
    sendMessage: async ({ from, to, body }) => {
      const m = { id: uid("m"), from, to, body, createdAt: Date.now() };
      messages.push(m);
      return Promise.resolve(m);
    },
    fetchMessages: async (id) => messages.filter((m) => m.to === id || m.from === id),
  };
})();

/* -------------------- MICRO UX -------------------- */
const microPop = (el) => {
  if (!el) return;
  el.animate([{ transform: "scale(1)" }, { transform: "scale(1.06)" }, { transform: "scale(1)" }], {
    duration: 260,
    easing: "ease-out",
  });
};

/* -------------------- AVATAR -------------------- */
function Avatar({ letter, size = 10, glow = false, theme }) {
  const s = `${size * 0.25}rem`;
  const style = {
    width: s,
    height: s,
    borderRadius: 999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    background: theme?.accentA,
    color: "#fff",
    boxShadow: glow ? `0 6px 30px ${theme?.accentA}55` : "none",
  };
  return <div style={style} className="flex-shrink-0">{letter}</div>;
}

/* -------------------- STORIES BAR -------------------- */
function StoriesBar({ users, onOpen }) {
  return (
    <div className="flex gap-3 overflow-x-auto py-2">
      {users.map((u) => (
        <button key={u.id} onClick={() => onOpen(u)} className="flex flex-col items-center gap-1 min-w-[64px]">
          <div className="w-14 h-14 rounded-full p-0.5" style={{ background: "linear-gradient(90deg,#ff007a,#00ff9d)" }}>
            <div className="w-full h-full rounded-full bg-black/80 flex items-center justify-center text-white font-semibold">{u.avatar}</div>
          </div>
          <div className="text-[11px] text-slate-300">{u.display}</div>
        </button>
      ))}
    </div>
  );
}

/* -------------------- COMPOSER -------------------- */
function Composer({ currentUser, onCreate, theme }) {
  const [text, setText] = useState("");
  const [tags, setTags] = useState("");
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const inputRef = useRef();

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setMediaPreview(e.target.result);
      // very simplistic type guess
      if (file.type.startsWith("image/")) setMediaType("image");
      else if (file.type.startsWith("audio/")) setMediaType("audio");
      else setMediaType("file");
    };
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    const payload = {
      authorId: currentUser.id,
      content: text.trim(),
      media: mediaPreview,
      mediaType,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    };
    if (!payload.content && !payload.media) {
      alert("Write something or attach media.");
      return;
    }
    const created = await MockService.createPost(payload);
    setText("");
    setTags("");
    setMediaPreview(null);
    setMediaType(null);
    if (inputRef.current) inputRef.current.value = "";
    microPop(document.querySelector("body"));
    onCreate(created);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-2xl" style={{ background: theme.card, border: `1px solid ${theme.soft}` }}>
      <div className="flex gap-3">
        <Avatar letter={currentUser.avatar} size={12} glow theme={theme} />
        <div className="flex-1">
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Share text, image or a creative clip..." className="w-full bg-transparent resize-none outline-none text-sm min-h-[64px]" />
          {mediaPreview && (
            <div className="mt-2">
              {mediaType === "image" ? <img src={mediaPreview} alt="preview" className="max-h-40 rounded-lg shadow-md" /> : mediaType === "audio" ? <audio src={mediaPreview} controls className="w-full" /> : <a href={mediaPreview}>Attachment</a>}
            </div>
          )}
          <div className="mt-2 flex items-center gap-2">
            <input ref={inputRef} type="file" accept="image/*,audio/*" onChange={(e) => handleFile(e.target.files?.[0])} className="text-xs" />
            <input placeholder="tags, comma separated" value={tags} onChange={(e) => setTags(e.target.value)} className="px-2 py-1 rounded-md text-xs bg-transparent border border-white/6 flex-1" />
            <button onClick={submit} className="px-3 py-1 rounded-md font-semibold" style={{ background: `linear-gradient(90deg, ${THEME.dark.accentB}, ${THEME.dark.accentA})`, color: theme.text }}>Post</button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* -------------------- POST CARD -------------------- */
function PostCard({ post, author, currentUser, onLike, onComment, theme }) {
  const likeRef = useRef(null);
  return (
    <motion.article layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="p-4 rounded-2xl" style={{ background: theme.card, border: `1px solid ${theme.soft}` }}>
      <div className="flex gap-3">
        <Avatar letter={author?.avatar || "?"} size={12} glow theme={theme} />
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-semibold" style={{ color: theme.text }}>{author?.display || "Unknown"}</div>
              <div className="text-xs text-slate-400">{new Date(post.createdAt).toLocaleString()}</div>
            </div>
            <div className="text-xs text-slate-300">{post.likes} ❤</div>
          </div>

          <div className="mt-3 text-sm leading-relaxed" style={{ color: theme.text }}>{post.content}</div>

          {post.media && post.mediaType === "image" && (
            <div className="mt-3">
              <img src={post.media} alt="post-media" className="rounded-xl max-h-64 w-full object-cover shadow" />
            </div>
          )}
          {post.media && post.mediaType === "audio" && (
            <div className="mt-3"><audio controls src={post.media} className="w-full" /></div>
          )}

          <div className="mt-3 flex items-center gap-2">
            <button ref={likeRef} onClick={() => { onLike(post.id); microPop(likeRef.current); }} className="px-2 py-1 rounded-md border text-xs">Like</button>
            <button onClick={() => onComment(post.id)} className="px-2 py-1 rounded-md border text-xs">Comment</button>
            <button className="px-2 py-1 rounded-md border text-xs">Share</button>
          </div>

          {/* comments — only visible to author (private comments) */}
          <div className="mt-3 space-y-2">
            {(post.comments || []).map((c) => (
              <div key={c.id} className={`p-2 rounded-md ${c.authorId === currentUser.id ? "bg-white/6 ml-auto" : "bg-white/3"}`}>
                <div className="text-xs font-semibold">{c.authorId === currentUser.id ? "You (private)" : "Someone"}</div>
                <div className="text-sm">{c.body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

/* -------------------- MESSAGES -------------------- */
function ChatPanel({ currentUser, onClose, theme }) {
  const [convo, setConvo] = useState([]);
  const [text, setText] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const m = await MockService.fetchMessages(currentUser.id);
      if (mounted) setConvo(m);
    })();
    return () => { mounted = false; };
  }, [currentUser.id]);

  const send = async () => {
    if (!text.trim()) return;
    // for demo, always send to Ava (u_ava)
    const msg = await MockService.sendMessage({ from: currentUser.id, to: "u_ava", body: text.trim() });
    setConvo((s) => [...s, msg]);
    setText("");
  };

  return (
    <motion.div initial={{ x: 200, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="fixed right-4 bottom-4 w-[320px] md:w-[360px] p-3 rounded-2xl" style={{ background: theme.card, border: `1px solid ${theme.soft}`, zIndex: 60 }}>
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold" style={{ color: theme.text }}>Messages</div>
        <div className="flex gap-2">
          <button onClick={onClose} className="text-xs px-2 py-1 rounded-md border">Close</button>
        </div>
      </div>

      <div className="max-h-40 overflow-y-auto space-y-2 mb-2">
        {convo.map((m) => (
          <div key={m.id} className={`p-2 rounded-md ${m.from === currentUser.id ? "ml-auto bg-white/6" : "bg-white/3"}`}>
            <div className="text-xs font-semibold">{m.from === currentUser.id ? "You" : "Ava"}</div>
            <div className="text-sm">{m.body}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Send a message..." className="flex-1 px-2 py-1 rounded-md bg-transparent border border-white/6 text-sm" />
        <button onClick={send} className="px-3 py-1 rounded-md" style={{ background: `linear-gradient(90deg, ${THEME.dark.accentB}, ${THEME.dark.accentA})`, color: theme.text }}>Send</button>
      </div>
    </motion.div>
  );
}

/* -------------------- NAV / LAYOUT -------------------- */

export default function MindLink() {
  const [themeName, setThemeName] = useState(LS.get("ml_theme", "dark"));
  const theme = themeName === "dark" ? THEME.dark : THEME.light;
  const [currentUser, setCurrentUser] = useState(() => LS.get("ml_user", { id: "u_you", display: "You", avatar: "Y" }));
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [commentingPost, setCommentingPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const commentRef = useRef();

  useEffect(() => {
    LS.set("ml_theme", themeName);
  }, [themeName]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const u = await MockService.fetchUsers();
        const p = await MockService.fetchPosts();
        if (!mounted) return;
        setUsers(u);
        setPosts(p);
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleCreate = (p) => setPosts((prev) => [p, ...prev]);

  const handleLike = async (id) => {
    await MockService.likePost(id);
    setPosts((prev) => prev.map((x) => (x.id === id ? { ...x, likes: x.likes + 1 } : x)));
    microPop(document.querySelector("body"));
  };

  const openComment = (postId) => {
    setCommentingPost(postId);
    // focus/reveal is optional
  };

  const submitComment = async (postId, body, isPrivate = true) => {
    if (!body.trim()) return;
    const comment = { id: uid("c"), authorId: currentUser.id, body: body.trim(), private: !!isPrivate, createdAt: Date.now() };
    await MockService.addComment(postId, comment);
    // refresh posts
    const p = await MockService.fetchPosts();
    setPosts(p);
    setCommentingPost(null);
  };

  const authorById = (id) => users.find((u) => u.id === id) || { display: "Unknown", avatar: "?" };

  return (
    <div style={{ minHeight: "100vh", background: theme.bg, color: theme.text, fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto" }}>
      {/* NAVBAR */}
      <div className="sticky top-0 z-50" style={{ backdropFilter: "blur(6px)", background: themeName === "dark" ? "rgba(6,6,10,0.25)" : "rgba(255,255,255,0.4)" }}>
        <div className="max-w-6xl mx-auto p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div style={{ width: 44, height: 44, borderRadius: 10, background: `linear-gradient(90deg, ${THEME.dark.accentB}, ${THEME.dark.accentA})` }} className="flex items-center justify-center text-black font-bold">ML</div>
            <div>
              <div className="font-semibold text-lg">MindLink</div>
              <div className="text-xs text-slate-300">Connect — privately, beautifully</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setThemeName((t) => (t === "dark" ? "light" : "dark"))} className="px-3 py-1 rounded-md border text-xs">
              {themeName === "dark" ? "Light mode" : "Dark mode"}
            </button>
            <button onClick={() => setShowChat((s) => !s)} className="px-3 py-1 rounded-md border text-xs">Messages</button>
            <div className="text-xs">{currentUser.display}</div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* LEFT */}
        <aside className="md:col-span-1 space-y-3 order-2 md:order-1">
          <div className="p-4 rounded-2xl" style={{ background: theme.card, border: `1px solid ${theme.soft}` }}>
            <div className="flex items-center gap-3">
              <Avatar letter={currentUser.avatar} size={12} glow theme={theme} />
              <div>
                <div className="text-sm font-semibold">{currentUser.display}</div>
                <div className="text-xs text-slate-300">Creator • {currentUser?.premium ? "Premium" : "Free"}</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-400">Quick actions</div>
            <div className="mt-3 flex flex-col gap-2">
              <button className="px-3 py-2 rounded-md text-xs text-left">Profile</button>
              <button className="px-3 py-2 rounded-md text-xs text-left">Explore</button>
              <button className="px-3 py-2 rounded-md text-xs text-left">Saved</button>
              <button className="px-3 py-2 rounded-md text-xs text-left" onClick={() => { LS.set("ml_user", null); setCurrentUser({ id: "u_you", display: "You", avatar: "Y" }); }}>Switch</button>
            </div>
          </div>

          <div>
            <WalletPanelSimple theme={theme} />
          </div>

          <div>
            <div className="p-3 rounded-2xl" style={{ background: theme.card, border: `1px solid ${theme.soft}` }}>
              <div className="text-sm font-semibold">Communities</div>
              <div className="mt-2 text-xs text-slate-300">Join niche rooms for focused work & talk.</div>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="md:col-span-2 space-y-3 order-1 md:order-2">
          <div className="p-2">
            <StoriesBar users={users} onOpen={(u) => alert(`Open story for ${u.display} (demo)`)} />
          </div>

          <Composer currentUser={currentUser} onCreate={handleCreate} theme={theme} />

          <div className="space-y-3">
            <AnimatePresence>
              {loading ? (
                <div className="text-slate-300">Loading...</div>
              ) : (
                posts.map((p) => (
                  <PostCard key={p.id} post={p} author={authorById(p.authorId)} currentUser={currentUser} onLike={handleLike} onComment={openComment} theme={theme} />
                ))
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* RIGHT */}
        <aside className="md:col-span-1 space-y-3 order-3 md:order-3">
          <div className="p-3 rounded-2xl" style={{ background: theme.card, border: `1px solid ${theme.soft}` }}>
            <div className="text-sm font-semibold">Explore</div>
            <div className="mt-2 text-xs text-slate-300">Trending tags and people</div>
            <div className="mt-3 flex flex-col gap-2 text-xs">
              <button className="px-3 py-2 rounded-md text-left">#productivity</button>
              <button className="px-3 py-2 rounded-md text-left">#sustainability</button>
              <button className="px-3 py-2 rounded-md text-left">#design</button>
            </div>
          </div>

          <div className="p-3 rounded-2xl" style={{ background: theme.card, border: `1px solid ${theme.soft}` }}>
            <div className="text-sm font-semibold">Shortcuts</div>
            <div className="mt-2 text-xs text-slate-300">Composer, Stories, Messages</div>
          </div>
        </aside>
      </div>

      {/* Chat panel */}
      {showChat && <ChatPanel currentUser={currentUser} onClose={() => setShowChat(false)} theme={theme} />}

      {/* Comment modal (simple) */}
      <AnimatePresence>
        {commentingPost && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={() => setCommentingPost(null)} />
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="relative w-full md:w-[560px] p-4 rounded-2xl" style={{ background: theme.card, border: `1px solid ${theme.soft}`, zIndex: 60 }}>
              <div className="text-sm font-semibold mb-2">Write a private comment (only visible to you)</div>
              <textarea ref={commentRef} rows={4} className="w-full bg-transparent outline-none p-2 rounded-md" placeholder="Write a private note or comment..." />
              <div className="mt-3 flex items-center gap-2">
                <button onClick={() => { const body = commentRef.current?.value || ""; submitComment(commentingPost, body, true); }} className="px-3 py-1 rounded-md" style={{ background: `linear-gradient(90deg, ${THEME.dark.accentB}, ${THEME.dark.accentA})`, color: theme.text }}>Save private comment</button>
                <button onClick={() => setCommentingPost(null)} className="px-3 py-1 rounded-md border">Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* -------------------- SIMPLE WALLET PANEL (demo) -------------------- */
function WalletPanelSimple({ theme }) {
  const [balance, setBalance] = useState(() => LS.get("ml_wallet_balance", 8));
  const buy = () => {
    if (balance < 5) {
      alert("Top-up to buy premium.");
      return;
    }
    setBalance((b) => b - 5);
    LS.set("ml_wallet_balance", Math.max(0, balance - 5));
    alert("Premium unlocked (demo).");
  };
  return (
    <div className="p-3 rounded-2xl" style={{ background: theme.card, border: `1px solid ${theme.soft}` }}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Wallet</div>
          <div className="text-xs text-slate-300">Balance: ${balance.toFixed(2)}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setBalance((b) => { const nb = b + 10; LS.set("ml_wallet_balance", nb); return nb; }); }} className="px-3 py-1 rounded-md border text-xs">Top up +$10</button>
          <button onClick={buy} className="px-3 py-1 rounded-md" style={{ background: `linear-gradient(90deg, ${THEME.dark.accentB}, ${THEME.dark.accentA})`, color: theme.text }}>Buy $5</button>
        </div>
      </div>
    </div>
  );
}
