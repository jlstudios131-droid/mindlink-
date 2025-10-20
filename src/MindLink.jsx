MindLink.jsx
// Single-file, high-polish MindLink app (pure English JavaScript)
// Requires: React, Framer Motion, Tailwind CSS configured in project
// Drop into src/ as MindLink.jsx and import/route it from your App.

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* =========================
   THE UNIQUE "ADDICTIVE" THEME
   ========================= */
const THEME = {
  palette: {
    deep: "#0b1020",       // near-black base
    neon: "#00ffd5",       // neon teal accent
    violet: "#8b5cf6",     // vibrant violet
    glass: "rgba(255,255,255,0.06)",
    card: "rgba(255,255,255,0.06)",
  },
  gradients: {
    hero: "bg-gradient-to-br from-[#071021] via-[#0f1530] to-[#120b28]",
  },
};

/* =========================
   SAFE LOCAL STORAGE HELPERS
   ========================= */
const safeGet = (key, fallback) => {
  try {
    if (typeof window === "undefined" || !window.localStorage) return fallback;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};
const safeSet = (key, value) => {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

/* =========================
   MOCK SERVER / DB / AUTH
   ========================= */
const MockService = (() => {
  // in-memory data
  let users = [
    { id: "u_you", username: "you", display: "You", avatar: "Y", premium: false, streak: 2 },
    { id: "u_ava", username: "ava", display: "Ava", avatar: "A", premium: true, streak: 8 },
    { id: "u_rui", username: "rui", display: "Rui", avatar: "R", premium: false, streak: 0 },
  ];

  let communities = [
    { id: "c1", name: "Mindful Makers", members: ["u_you", "u_ava"], desc: "Design systems that care." },
    { id: "c2", name: "Green Builders", members: ["u_rui", "u_ava"], desc: "Sustainable infra & ideas." },
  ];

  let posts = [
    {
      id: "p_1",
      authorId: "u_ava",
      content: "Micro-break coding: 52 minutes focused, 5 minutes creativity sprint. Try it.",
      tags: ["productivity", "habits"],
      likes: 12,
      createdAt: Date.now() - 1000 * 60 * 30,
    },
    {
      id: "p_2",
      authorId: "u_rui",
      content: "Proposal: community solar + knowledge nodes for remote towns.",
      tags: ["sustainability", "systems"],
      likes: 9,
      createdAt: Date.now() - 1000 * 60 * 60 * 6,
    },
  ];

  let messages = [
    { id: "m1", from: "u_ava", to: "u_you", body: "Loved your last idea!", createdAt: Date.now() - 1000 * 60 * 40 },
  ];

  const fetchPosts = async () => Promise.resolve(posts.slice().sort((a, b) => b.createdAt - a.createdAt));
  const createPost = async (post) => {
    const p = { ...post, id: "p_" + Date.now(), likes: 0, createdAt: Date.now() };
    posts.unshift(p);
    return Promise.resolve(p);
  };
  const likePost = async (id) => {
    posts = posts.map((p) => (p.id === id ? { ...p, likes: p.likes + 1 } : p));
    return Promise.resolve(true);
  };
  const fetchUsers = async () => Promise.resolve(users.map((u) => ({ ...u })));
  const getUserByUsername = async (username) => users.find((u) => u.username === username) || null;
  const registerUser = async ({ username, display }) => {
    const existing = users.find((u) => u.username === username);
    if (existing) throw new Error("username_taken");
    const id = "u_" + Date.now();
    const u = { id, username, display: display || username, avatar: display ? display[0].toUpperCase() : username[0].toUpperCase(), premium: false, streak: 0 };
    users.push(u);
    return u;
  };
  const sendMessage = async ({ from, to, body }) => {
    const m = { id: "m_" + Date.now(), from, to, body, createdAt: Date.now() };
    messages.push(m);
    return m;
  };
  const fetchMessages = async (forUserId) => messages.filter((m) => m.to === forUserId || m.from === forUserId);

  const fetchCommunities = async () => Promise.resolve(communities.slice());

  return {
    fetchPosts,
    createPost,
    likePost,
    fetchUsers,
    getUserByUsername,
    registerUser,
    sendMessage,
    fetchMessages,
    fetchCommunities,
  };
})();

/* =========================
   MICRO-UX HELPERS (ADDICITVE INTERACTIONS)
   ========================= */
const microReward = (el) => {
  // subtle pop animation using class toggle if element exists
  if (!el) return;
  el.animate([{ transform: "scale(1.0)" }, { transform: "scale(1.08)" }, { transform: "scale(1.0)" }], { duration: 260, easing: "ease-out" });
};

/* =========================
   INSIGHT ENGINE (LOCAL)
   ========================= */
const Insight = (() => {
  const KEY = "ml_insight_v2";
  const base = safeGet(KEY, { tags: {}, mood: [], engages: 0 });

  const recordTags = (tags = []) => {
    const s = safeGet(KEY, base);
    tags.forEach((t) => {
      s.tags[t] = (s.tags[t] || 0) + 1;
    });
    s.engages = (s.engages || 0) + 1;
    safeSet(KEY, s);
  };
  const suggest = (limit = 5) => {
    const s = safeGet(KEY, base);
    return Object.entries(s.tags).sort((a, b) => b[1] - a[1]).slice(0, limit).map((r) => r[0]);
  };
  const recordMood = (v) => {
    const s = safeGet(KEY, base);
    s.mood = (s.mood || []).concat({ v, t: Date.now() }).slice(-80);
    safeSet(KEY, s);
  };
  return { recordTags, suggest, recordMood, dump: () => safeGet(KEY, base) };
})();

/* =========================
   SMALL UI BUILDING BLOCKS
   ========================= */

const Avatar = ({ letter, size = 10 }) => (
  <div className={`w-${size} h-${size} rounded-full flex items-center justify-center font-semibold text-sm`} style={{ background: THEME.palette.violet, color: "#fff" }}>
    {letter}
  </div>
);

/* =========================
   LOGIN / ONBOARDING COMPONENT
   ========================= */
function AuthView({ onAuthSuccess }) {
  const [mode, setMode] = useState("login"); // login | register
  const [username, setUsername] = useState("");
  const [display, setDisplay] = useState("");
  const [error, setError] = useState("");

  const tryLogin = async () => {
    setError("");
    if (!username.trim()) return setError("Enter username");
    try {
      const u = await MockService.getUserByUsername(username.trim());
      if (!u) return setError("No user found. Try register.");
      safeSet("ml_current_user", u);
      onAuthSuccess(u);
    } catch (e) {
      setError("Login failed");
      console.error(e);
    }
  };

  const tryRegister = async () => {
    setError("");
    if (!username.trim()) return setError("Enter username");
    try {
      const u = await MockService.registerUser({ username: username.trim(), display: display.trim() || username.trim() });
      safeSet("ml_current_user", u);
      onAuthSuccess(u);
    } catch (e) {
      if (e.message === "username_taken") setError("Username already taken");
      else setError("Registration failed");
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: THEME.gradients.hero }}>
      <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.36 }} className="w-full max-w-md p-6 rounded-2xl" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.02))", border: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="flex items-center gap-3 mb-4">
          <div style={{ width: 52, height: 52, borderRadius: 12, background: "linear-gradient(90deg,#00ffd5,#8b5cf6)" }} className="flex items-center justify-center text-white font-bold text-lg">ML</div>
          <div>
            <div className="text-white font-semibold text-lg">Welcome to MindLink</div>
            <div className="text-xs text-slate-300">A living social surface that adapts to you.</div>
          </div>
        </div>

        <div className="mb-3">
          <div className="text-xs text-slate-300 mb-1">Mode</div>
          <div className="flex gap-2">
            <button className={`flex-1 py-2 rounded-lg ${mode === "login" ? "bg-white/8 ring-1 ring-white/20" : "bg-transparent border border-white/6"}`} onClick={() => setMode("login")}>Login</button>
            <button className={`flex-1 py-2 rounded-lg ${mode === "register" ? "bg-white/8 ring-1 ring-white/20" : "bg-transparent border border-white/6"}`} onClick={() => setMode("register")}>Register</button>
          </div>
        </div>

        <div className="mb-2">
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username (lowercase)" className="w-full px-3 py-2 rounded-md bg-transparent border border-white/6 text-white text-sm" />
        </div>

        {mode === "register" && (
          <div className="mb-2">
            <input value={display} onChange={(e) => setDisplay(e.target.value)} placeholder="display name (optional)" className="w-full px-3 py-2 rounded-md bg-transparent border border-white/6 text-white text-sm" />
          </div>
        )}

        {error && <div className="text-xs text-rose-400 mb-2">{error}</div>}

        <div className="flex gap-2">
          {mode === "login" ? (
            <button onClick={tryLogin} className="flex-1 py-2 rounded-lg text-black font-semibold" style={{ background: "linear-gradient(90deg,#00ffd5,#8b5cf6)" }}>Enter MindLink</button>
          ) : (
            <button onClick={tryRegister} className="flex-1 py-2 rounded-lg text-black font-semibold" style={{ background: "linear-gradient(90deg,#00ffd5,#8b5cf6)" }}>Create Account</button>
          )}
          <button onClick={() => { setUsername("you"); setDisplay("You"); }} className="px-3 py-2 rounded-lg border border-white/6 text-xs">Demo</button>
        </div>

        <div className="mt-4 text-xs text-slate-400">Pro tip: create a memorable username. MindLink rewards consistent engagement (streaks & badges).</div>
      </motion.div>
    </div>
  );
}

/* =========================
   MAIN EXPERIENCE: FEED, CHAT, COMMUNITIES
   ========================= */

function Composer({ currentUser, onPostCreated }) {
  const [text, setText] = useState("");
  const [tags, setTags] = useState("");
  const [energy, setEnergy] = useState(0.6);
  const areaRef = useRef(null);

  const detectIssue = (content) => {
    if (!content || !content.trim()) return { type: "empty", message: "Your post is empty." };
    const linkCount = (content.match(/https?:\/\/[^\s]+/g) || []).length;
    if (linkCount > 4) return { type: "spam", message: "Too many links might be flagged." };
    if (content.length > 3000) return { type: "length", message: "This post is long. Consider summarizing." };
    return null;
  };

  const submit = async () => {
    const issue = detectIssue(text);
    if (issue) {
      const cont = window.confirm(issue.message + " Continue?");
      if (!cont) return;
    }
    const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
    const post = {
      authorId: currentUser.id,
      content: text.trim(),
      tags: tagList,
    };
    const created = await MockService.createPost(post);
    Insight.recordTags(tagList);
    Insight.recordMood(energy);
    setText("");
    setTags("");
    if (areaRef.current) microReward(areaRef.current);
    onPostCreated(created);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-2xl" style={{ background: THEME.palette.card, border: "1px solid rgba(255,255,255,0.02)" }}>
      <div className="flex gap-3">
        <div className="flex-shrink-0"><Avatar letter={currentUser.avatar} /></div>
        <div className="flex-1">
          <textarea ref={areaRef} rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="What's alive in your mind?" className="w-full bg-transparent outline-none resize-none text-sm" />
          <div className="mt-2 flex items-center gap-2">
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tags, comma separated" className="px-2 py-1 rounded-md text-xs bg-transparent border border-white/6 flex-1" />
            <div className="text-xs">Energy</div>
            <input type="range" min={0} max={1} step={0.1} value={energy} onChange={(e) => setEnergy(Number(e.target.value))} className="w-28" />
            <button onClick={submit} className="px-3 py-1 rounded-md font-semibold" style={{ background: "linear-gradient(90deg,#00ffd5,#8b5cf6)", color: "#041024" }}>Share</button>
          </div>
          <div className="mt-2 text-xs text-slate-300">Suggested: {Insight.suggest(4).map((t) => <span key={t} className="px-2 py-0.5 text-[11px] rounded-full border mr-2">#{t}</span>)}</div>
        </div>
      </div>
    </motion.div>
  );
}

function PostCard({ post, author, onLike }) {
  const likeRef = useRef(null);
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="p-4 rounded-2xl" style={{ background: THEME.palette.card, border: "1px solid rgba(255,255,255,0.02)" }}>
      <div className="flex gap-3">
        <Avatar letter={author?.avatar || "?"} />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">{author?.display || "Unknown"}</div>
              <div className="text-xs text-slate-400">{new Date(post.createdAt).toLocaleString()}</div>
            </div>
            <div className="text-xs text-slate-300">{post.likes} ❤</div>
          </div>
          <div className="mt-3 text-sm leading-relaxed">{post.content}</div>
          <div className="mt-3 flex gap-2 text-xs">
            {(post.tags || []).map((t) => <span key={t} className="px-2 py-0.5 rounded-full border">#{t}</span>)}
          </div>
          <div className="mt-3 flex gap-2">
            <button ref={likeRef} onClick={() => { onLike(post.id); microReward(likeRef.current); }} className="px-2 py-1 rounded-md border text-xs">Like</button>
            <button className="px-2 py-1 rounded-md border text-xs">Share</button>
            <button className="px-2 py-1 rounded-md border text-xs">Save</button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* =========================
   CHAT: Direct Messages AND COMMUNITIES
   ========================= */

function DirectMessages({ currentUser }) {
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
    const msg = await MockService.sendMessage({ from: currentUser.id, to: "u_ava", body: text.trim() });
    setConvo((s) => [...s, msg]);
    setText("");
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 rounded-2xl" style={{ background: THEME.palette.card, border: "1px solid rgba(255,255,255,0.02)" }}>
      <div className="text-sm font-semibold mb-2">Messages</div>
      <div className="max-h-40 overflow-y-auto space-y-2 mb-2">
        {convo.map((m) => <div key={m.id} className={`p-2 rounded-md ${m.from === currentUser.id ? "ml-auto bg-white/5" : "bg-white/3"}`}><div className="text-xs font-semibold">{m.from === currentUser.id ? "You" : "Ava"}</div><div className="text-sm">{m.body}</div></div>)}
      </div>
      <div className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} className="flex-1 px-2 py-1 rounded-md bg-transparent border border-white/6 text-sm" placeholder="Message Ava..." />
        <button onClick={send} className="px-3 py-1 rounded-md" style={{ background: "linear-gradient(90deg,#00ffd5,#8b5cf6)", color: THEME.deep }}>Send</button>
      </div>
    </motion.div>
  );
}

function CommunitiesPanel({ currentUser }) {
  const [rooms, setRooms] = useState([]);
  const [selected, setSelected] = useState(null);
  const [roomMessages, setRoomMessages] = useState({}); // map roomId -> messages
  const [text, setText] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const rc = await MockService.fetchCommunities();
      if (mounted) setRooms(rc);
    })();
    return () => { mounted = false; };
  }, []);

  const joinRoom = (room) => {
    setSelected(room);
    // create local empty room messages if not present
    setRoomMessages((prev) => ({ ...prev, [room.id]: prev[room.id] || [{ id: "r_" + Date.now(), from: "system", body: `Welcome to ${room.name}`, createdAt: Date.now() }] }));
  };

  const sendRoomMsg = () => {
    if (!selected || !text.trim()) return;
    setRoomMessages((prev) => {
      const list = prev[selected.id] || [];
      const msg = { id: "rm_" + Date.now(), from: currentUser.id, body: text.trim(), createdAt: Date.now() };
      return { ...prev, [selected.id]: [...list, msg] };
    });
    setText("");
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 rounded-2xl" style={{ background: THEME.palette.card, border: "1px solid rgba(255,255,255,0.02)" }}>
      <div className="text-sm font-semibold mb-2">Communities</div>
      <div className="flex gap-3">
        <div className="w-1/3">
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {rooms.map((r) => <button key={r.id} onClick={() => joinRoom(r)} className={`w-full text-left p-2 rounded-md ${selected?.id === r.id ? "ring-1 ring-white/20" : "hover:bg-white/2"}`}>{r.name}</button>)}
          </div>
        </div>
        <div className="flex-1">
          {selected ? (
            <>
              <div className="text-xs text-slate-300 mb-2">{selected.desc}</div>
              <div className="max-h-36 overflow-y-auto space-y-2 mb-2">
                {(roomMessages[selected.id] || []).map((m) => <div key={m.id} className={`p-2 rounded-md ${m.from === currentUser.id ? "ml-auto bg-white/5" : "bg-white/3"}`}>{m.from === "system" ? <div className="text-xs text-slate-400">{m.body}</div> : <div className="text-sm">{m.body}</div>}</div>)}
              </div>
              <div className="flex gap-2">
                <input value={text} onChange={(e) => setText(e.target.value)} className="flex-1 px-2 py-1 rounded-md bg-transparent border border-white/6 text-sm" placeholder={`Talk in ${selected.name}...`} />
                <button onClick={sendRoomMsg} className="px-3 py-1 rounded-md" style={{ background: "linear-gradient(90deg,#00ffd5,#8b5cf6)", color: THEME.deep }}>Send</button>
              </div>
            </>
          ) : <div className="text-xs text-slate-400">Select a community to join the conversation.</div>}
        </div>
      </div>
    </motion.div>
  );
}

/* =========================
   MONETIZATION / PITCHABLE ELEMENTS
   ========================= */

function WalletPanel({ currentUser, onPurchase }) {
  const [balance, setBalance] = useState(() => safeGet("ml_wallet_balance", 10)); // demo balance
  const buyPremium = () => {
    if (balance < 5) {
      alert("Not enough balance. Top up to buy premium.");
      return;
    }
    const newB = balance - 5;
    setBalance(newB);
    safeSet("ml_wallet_balance", newB);
    onPurchase && onPurchase({ type: "premium", cost: 5 });
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 rounded-2xl" style={{ background: THEME.palette.card, border: "1px solid rgba(255,255,255,0.02)" }}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Wallet</div>
          <div className="text-xs text-slate-300">Balance: ${balance.toFixed(2)}</div>
        </div>
        <div>
          <button onClick={() => { setBalance((b) => { const nb = b + 10; safeSet("ml_wallet_balance", nb); return nb; }); }} className="px-3 py-1 rounded-md border text-xs mr-2">Top up +$10</button>
          <button onClick={buyPremium} className="px-3 py-1 rounded-md font-semibold" style={{ background: "linear-gradient(90deg,#00ffd5,#8b5cf6)", color: THEME.deep }}>Buy Premium $5</button>
        </div>
      </div>
      <div className="mt-3 text-xs text-slate-400">Premium unlocks badges, priorities, and sponsor visibility — monetizable immediately.</div>
    </motion.div>
  );
}

/* =========================
   MAIN APP
   ========================= */

export default function MindLink() {
  const [currentUser, setCurrentUser] = useState(() => safeGet("ml_current_user", null));
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [view, setView] = useState("feed"); // feed | messages | communities | wallet | profile
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const p = await MockService.fetchPosts();
        const u = await MockService.fetchUsers();
        if (!mounted) return;
        setPosts(p);
        setUsers(u);
      } catch (e) {
        console.error("Failed to load initial data", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // auth persistence
  useEffect(() => {
    const stored = safeGet("ml_current_user", null);
    if (stored && !currentUser) setCurrentUser(stored);
  }, [currentUser]);

  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
  };

  const refreshPosts = async () => {
    const p = await MockService.fetchPosts();
    setPosts(p);
  };

  const onPostCreated = (p) => {
    setPosts((prev) => [p, ...prev]);
    microReward(document.querySelector("body"));
  };

  const onLike = async (id) => {
    await MockService.likePost(id);
    setPosts((prev) => prev.map((x) => (x.id === id ? { ...x, likes: x.likes + 1 } : x)));
  };

  if (!currentUser) {
    return <AuthView onAuthSuccess={handleAuthSuccess} />;
  }

  const authorById = (id) => users.find((u) => u.id === id) || { display: "Unknown", avatar: "?" };

  return (
    <div className="min-h-screen" style={{ background: THEME.gradients.hero, color: "#e6eefb" }}>
      <div className="max-w-6xl mx-auto p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <header className="md:col-span-4 flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div style={{ width: 52, height: 52, borderRadius: 12, background: "linear-gradient(90deg,#00ffd5,#8b5cf6)" }} className="flex items-center justify-center text-black font-bold">ML</div>
            <div>
              <div className="font-semibold text-lg">MindLink</div>
              <div className="text-xs text-slate-300">Grow attention, value & networks.</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-300 mr-2">Hello, {currentUser.display}</div>
            <button onClick={() => { safeSet("ml_current_user", null); setCurrentUser(null); }} className="px-3 py-1 rounded-md border text-xs">Logout</button>
          </div>
        </header>

        {/* LEFT: Profile / Wallet / Communities */}
        <aside className="md:col-span-1 space-y-3 order-2 md:order-1">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-2xl" style={{ background: THEME.palette.card }}>
            <div className="flex items-center gap-3">
              <Avatar letter={currentUser.avatar} />
              <div>
                <div className="text-sm font-semibold">{currentUser.display}</div>
                <div className="text-xs text-slate-300">{currentUser.premium ? "Premium Member" : "Free"}</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-400">Streak: {currentUser.streak}</div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setView("feed")} className={`flex-1 py-1 rounded-md text-xs ${view === "feed" ? "ring-1 ring-white/20" : ""}`}>Feed</button>
              <button onClick={() => setView("messages")} className={`flex-1 py-1 rounded-md text-xs ${view === "messages" ? "ring-1 ring-white/20" : ""}`}>Messages</button>
            </div>
          </motion.div>

          <WalletPanel currentUser={currentUser} onPurchase={(p) => { if (p.type === "premium") { setCurrentUser((u) => ({ ...u, premium: true })); } }} />

          <CommunitiesPanel currentUser={currentUser} />
        </aside>

        {/* MAIN: Composer + Feed */}
        <main className="md:col-span-2 space-y-3 order-1 md:order-2">
          <Composer currentUser={currentUser} onPostCreated={onPostCreated} />
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {loading ? <div className="text-sm text-slate-400">Loading feed...</div> : (
              posts.map((p) => <PostCard key={p.id} post={p} author={authorById(p.authorId)} onLike={onLike} />)
            )}
          </motion.div>
        </main>

        {/* RIGHT: Messages / Communities / Extra */}
        <aside className="md:col-span-1 space-y-3 order-3 md:order-3">
          {view === "messages" ? <DirectMessages currentUser={currentUser} /> : <DirectMessages currentUser={currentUser} />}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 rounded-2xl" style={{ background: THEME.palette.card }}>
            <div className="text-sm font-semibold">Growth</div>
            <div className="mt-2 text-xs text-slate-300">Daily active attention score: {Math.min(100, Math.round(Math.random() * 100))}</div>
            <div className="mt-3 text-xs text-slate-400">Sponsor slots, featured posts, and priority placement make this immediately monetizable.</div>
            <div className="mt-3">
              <button className="px-3 py-1 rounded-md" style={{ background: "linear-gradient(90deg,#00ffd5,#8b5cf6)", color: THEME.deep }}>Open Pitch</button>
            </div>
          </motion.div>
        </aside>
      </div>
    </div>
  );
}
