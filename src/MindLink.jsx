// MindLink.jsx
// Advanced MindLink single-file app (Vite + Tailwind + Framer Motion)
// - Single file prototype, pure English JavaScript
// - Login / Register -> Rich addictive feed -> DM + Community chat
// - Unique palette, micro-interactions, engagement loops, monetization UI
// - Mock local API and localStorage persistence (safe guarded)

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ========================= THEME / UNIQUE IDENTITY =========================
   Palette: electric-menthol (soft mint + deep indigo + luminous lilac)
   Purpose: Clean, futuristic, yet warm and slightly "addictive" micro-animations
   ==========================================================================*/

const THEME = {
  palette: {
    bg: "bg-gradient-to-br from-[#f8feff] via-[#f2f8ff] to-[#fbf7ff]",
    card: "bg-white/92",
    accent: "text-[#5b3cff]",
    mint: "bg-[#baf7e6]",
    deep: "#2b1152",
    glow: "shadow-[0_8px_30px_rgba(91,60,255,0.08)]",
  },
};

/* ========================= SAFE STORAGE HELPERS ============================ */

const safeGet = (k, fallback) => {
  try {
    if (typeof window === "undefined") return fallback;
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};
const safeSet = (k, v) => {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};

/* ============================ MOCK BACKEND =================================
   - in-memory DB for posts, users, communities, messages
   - supports login/create-user, posts, likes, boost (monetization), messages
   ========================================================================== */

const MockAPI = (() => {
  let users = safeGet("ml_users", [
    { id: "u_you", username: "you", name: "You", avatar: "Y", premium: false, streak: 2 },
    { id: "u_ava", username: "ava", name: "Ava", avatar: "A", premium: true, streak: 8 },
    { id: "u_rui", username: "rui", name: "Rui", avatar: "R", premium: false, streak: 1 },
  ]);
  let posts = safeGet("ml_posts", [
    {
      id: "p1",
      authorId: "u_ava",
      authorName: "Ava",
      avatar: "A",
      title: "Micro-breaks for deep focus",
      body: "I tried 5-min micro-breaks and my throughput doubled. Ask me how I schedule them.",
      tags: ["focus", "mindful"],
      mood: "calm",
      likes: 24,
      boosts: 1,
      createdAt: Date.now() - 1000 * 60 * 60 * 4,
    },
    {
      id: "p2",
      authorId: "u_rui",
      authorName: "Rui",
      avatar: "R",
      title: "Local knowledge nodes idea",
      body: "What if communities run lightweight offline-first knowledge nodes?",
      tags: ["sustainability", "infrastructure"],
      mood: "energetic",
      likes: 48,
      boosts: 0,
      createdAt: Date.now() - 1000 * 60 * 60 * 24,
    },
  ]);
  let communities = safeGet("ml_comms", [
    { id: "c1", slug: "mindful-tech", name: "Mindful Tech", members: ["u_ava", "u_you"], posts: ["p1"] },
    { id: "c2", slug: "green-systems", name: "Green Systems", members: ["u_rui"], posts: ["p2"] },
  ]);
  let messages = safeGet("ml_msgs", [
    { id: "m1", from: "u_ava", to: "u_you", body: "Welcome! Try the boost on your next post 😉", createdAt: Date.now() - 1000 * 60 * 40 },
  ]);

  const persist = () => {
    safeSet("ml_users", users);
    safeSet("ml_posts", posts);
    safeSet("ml_comms", communities);
    safeSet("ml_msgs", messages);
  };

  return {
    // auth (very simple)
    login: (username) => {
      const u = users.find((x) => x.username === username);
      if (u) return Promise.resolve(u);
      return Promise.reject(new Error("User not found"));
    },
    register: ({ username, name }) => {
      if (users.find((x) => x.username === username)) return Promise.reject(new Error("Username taken"));
      const id = "u_" + Date.now();
      const newUser = { id, username, name: name || username, avatar: (name || username)[0].toUpperCase(), premium: false, streak: 0 };
      users.push(newUser);
      persist();
      return Promise.resolve(newUser);
    },

    fetchFeed: (viewerId) => {
      // simple ranking algorithm: boosted + recent + likes + relevance (if tags match viewer interests)
      const viewer = users.find((u) => u.id === viewerId) || {};
      // compute score
      const scored = posts.map((p) => {
        const ageHours = (Date.now() - p.createdAt) / (1000 * 60 * 60);
        const recency = Math.max(0, 48 - ageHours); // prefer <48h
        const score = (p.boosts * 20 + p.likes * 1.5 + recency * 2);
        return { ...p, score };
      });
      // shuffle similar scores slightly then sort
      scored.sort((a, b) => b.score - a.score || b.createdAt - a.createdAt);
      return Promise.resolve(scored);
    },

    createPost: (payload) => {
      const id = "p_" + Date.now();
      const newP = { ...payload, id, likes: 0, boosts: 0, createdAt: Date.now() };
      posts.unshift(newP);
      persist();
      return Promise.resolve(newP);
    },

    likePost: (postId) => {
      posts = posts.map((p) => (p.id === postId ? { ...p, likes: p.likes + 1 } : p));
      persist();
      return Promise.resolve(true);
    },

    boostPost: (postId, byUserId) => {
      // monetize simulation: boosting increases boosts counter
      posts = posts.map((p) => (p.id === postId ? { ...p, boosts: (p.boosts || 0) + 1 } : p));
      persist();
      return Promise.resolve(true);
    },

    fetchCommunities: () => Promise.resolve(communities.slice()),

    createCommunity: ({ name, slug, creatorId }) => {
      const id = "c_" + Date.now();
      const newC = { id, name, slug, members: [creatorId], posts: [] };
      communities.push(newC);
      persist();
      return Promise.resolve(newC);
    },

    fetchMessagesFor: (userId) => {
      // return messages where user is from or to (simple)
      const ms = messages.filter((m) => m.to === userId || m.from === userId).slice();
      return Promise.resolve(ms);
    },

    sendMessage: ({ from, to, body }) => {
      const id = "m_" + Date.now();
      const m = { id, from, to, body, createdAt: Date.now() };
      messages.push(m);
      persist();
      return Promise.resolve(m);
    },

    fetchUserById: (id) => Promise.resolve(users.find((u) => u.id === id)),
    fetchUserByUsername: (username) => Promise.resolve(users.find((u) => u.username === username)),
    _internalDump: () => ({ users, posts, communities, messages }),
  };
})();

/* ============================= INSIGHT & ENGAGEMENT =========================
   - tracks topics, mood, daily streaks, feature suggestions
   - suggests boosts/promotions if user is high engagement
   ========================================================================== */

const Insight = (() => {
  const KEY = "ml_insight_v2";
  const initial = safeGet(KEY, { tags: {}, moodSignals: [], lastLogin: null, streakCount: 0 });
  let state = initial;
  const persist = () => safeSet(KEY, state);

  return {
    recordTags(tags = []) {
      tags.forEach((t) => (state.tags[t] = (state.tags[t] || 0) + 1));
      persist();
    },
    recordMood(v) {
      if (typeof v === "number") state.moodSignals.push({ v, t: Date.now() });
      if (state.moodSignals.length > 100) state.moodSignals.shift();
      persist();
    },
    loginHit() {
      const today = new Date().toDateString();
      if (state.lastLogin === today) return;
      if (state.lastLogin === new Date(Date.now() - 24 * 3600 * 1000).toDateString()) state.streakCount = (state.streakCount || 0) + 1;
      else state.streakCount = 1;
      state.lastLogin = today;
      persist();
    },
    getStreak() {
      return state.streakCount || 0;
    },
    suggestTopics(limit = 5) {
      return Object.entries(state.tags).sort((a, b) => b[1] - a[1]).slice(0, limit).map((x) => x[0]);
    },
    inferMood() {
      if (!state.moodSignals.length) return 0.5;
      const avg = state.moodSignals.reduce((s, x) => s + x.v, 0) / state.moodSignals.length;
      return Math.max(0, Math.min(1, avg));
    },
    _dump: () => JSON.parse(JSON.stringify(state)),
  };
})();

/* =============================== SMALL HELPERS ============================= */

const timeAgo = (ts) => {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

const uid = () => "id_" + Math.random().toString(36).slice(2, 9);

/* =============================== AUTH UI ================================== */

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login"); // login | register
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e && e.preventDefault();
    setError("");
    try {
      if (mode === "login") {
        const u = await MockAPI.login(username.trim());
        Insight.loginHit();
        onLogin(u);
      } else {
        const u = await MockAPI.register({ username: username.trim(), name: name.trim() || username.trim() });
        Insight.loginHit();
        onLogin(u);
      }
    } catch (err) {
      setError(err.message || "Auth error");
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center ${THEME.palette.bg} p-6`}>
      <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.45 }} className="w-full max-w-xl">
        <div className={`p-6 rounded-3xl ${THEME.palette.card} ${THEME.palette.glow}`}>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold bg-gradient-to-br from-[#e9f7f1] to-[#f3ecff]">ML</div>
            <div>
              <div className="text-xl font-bold" style={{ color: THEME.palette.deep }}>MindLink</div>
              <div className="text-xs text-slate-500">The social network that understands value and attention.</div>
            </div>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-3">
            <div className="text-xs text-slate-600">Start</div>

            <div className="grid grid-cols-1 gap-2">
              <input placeholder="username" value={username} onChange={(e) => setUsername(e.target.value)} className="px-3 py-2 rounded-lg border text-sm" />
              {mode === "register" && <input placeholder="display name (optional)" value={name} onChange={(e) => setName(e.target.value)} className="px-3 py-2 rounded-lg border text-sm" />}
            </div>

            {error && <div className="text-xs text-red-500">{error}</div>}

            <div className="flex items-center gap-3 justify-between mt-3">
              <button type="submit" className="px-4 py-2 rounded-lg bg-gradient-to-br from-[#5b3cff] to-[#7d55ff] text-white font-semibold">
                {mode === "login" ? "Login" : "Create account"}
              </button>

              <button type="button" onClick={() => setMode(mode === "login" ? "register" : "login")} className="text-xs text-slate-600 underline">
                {mode === "login" ? "Create an account" : "Have an account? Login"}
              </button>
            </div>
          </form>

          <div className="mt-6 text-xs text-slate-500">By continuing you accept the prototype terms. This is a demo — no real money is exchanged here.</div>
        </div>
      </motion.div>
    </div>
  );
}

/* =============================== MAIN NAV & UI ============================ */

function MiniBadge({ children }) {
  return <span className="px-2 py-1 rounded-full text-xs bg-gradient-to-br from-[#eef6ff] to-[#f8f0ff] border">{children}</span>;
}

function TopBar({ user, onLogout, unreadCount, onToggleCompose }) {
  return (
    <header className="flex items-center justify-between p-3 bg-transparent sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <div className="text-xl font-bold" style={{ color: THEME.palette.deep }}>MindLink</div>
        <MiniBadge>v2</MiniBadge>
        <div className="text-xs text-slate-500 ml-2">Feed</div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={onToggleCompose} className="px-3 py-1 rounded-lg bg-white/95 border text-sm">New</button>
        <div className="relative">
          <button className="px-3 py-1 rounded-lg bg-white/95 border text-sm">Messages</button>
          {unreadCount > 0 && <span className="absolute -top-2 -right-2 text-xs bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center">{unreadCount}</span>}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#eef6ff] to-[#f7f3ff] flex items-center justify-center font-bold">{user.avatar}</div>
          <div className="text-sm">
            <div className="font-semibold">{user.name}</div>
            <div className="text-xs text-slate-500">{user.premium ? "Premium" : "Creator"}</div>
          </div>
          <button onClick={onLogout} className="px-2 py-1 text-xs text-slate-600">Logout</button>
        </div>
      </div>
    </header>
  );
}

/* ============================== COMPOSER (NOVO POST) ====================== */

function ComposerRich({ currentUser, onCreate, suggested }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [boostAs, setBoostAs] = useState(false);
  const [mood, setMood] = useState(0.6);

  const detectIssue = (payload) => {
    if (!payload.title.trim() && !payload.body.trim()) return { type: "empty", message: "Post is empty. Add a title or body." };
    const links = (payload.body.match(/https?:\/\/[^\s]+/g) || []).length;
    if (links > 5) return { type: "spam", message: "Too many links, possible spam." };
    if (payload.body.length > 3000) return { type: "length", message: "Too long — consider summarizing." };
    return null;
  };

  const submit = async () => {
    const tagList = tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
    const payload = {
      authorId: currentUser.id,
      authorName: currentUser.name,
      avatar: currentUser.avatar,
      title: title.trim(),
      body: body.trim(),
      tags: tagList,
      mood: mood > 0.6 ? "energetic" : mood < 0.4 ? "calm" : "balanced",
    };
    const issue = detectIssue(payload);
    if (issue) {
      if (!window.confirm(`${issue.message} Continue anyway?`)) return;
    }
    const created = await MockAPI.createPost(payload);
    if (boostAs) await MockAPI.boostPost(created.id, currentUser.id);
    Insight.recordTags(tagList);
    Insight.recordMood(mood);
    onCreate(created);
    setTitle("");
    setBody("");
    setTags("");
    setBoostAs(false);
    setMood(0.6);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`p-4 rounded-2xl ${THEME.palette.card} ${THEME.palette.glow} mb-3`}>
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-gradient-to-br from-[#eafff5] to-[#f3ecff] font-bold">{currentUser.avatar}</div>
        <div className="flex-1">
          <input placeholder="Title (catchy)" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full text-lg font-semibold bg-transparent outline-none" />
          <textarea placeholder="Write something that sparks curiosity..." value={body} onChange={(e) => setBody(e.target.value)} className="w-full min-h-[80px] mt-2 bg-transparent outline-none text-sm" />
          <div className="mt-3 flex items-center gap-2">
            <input placeholder="tags, comma separated" value={tags} onChange={(e) => setTags(e.target.value)} className="px-2 py-1 rounded-md border text-xs w-1/2" />
            <div className="flex items-center gap-2 text-xs">
              <span>Mood</span>
              <input type="range" min={0} max={1} step={0.1} value={mood} onChange={(e) => setMood(Number(e.target.value))} className="w-28" />
            </div>
            <label className="ml-auto text-xs flex items-center gap-2">
              <input type="checkbox" checked={boostAs} onChange={(e) => setBoostAs(e.target.checked)} /> Boost (Feature)
            </label>
            <button onClick={submit} className="px-3 py-1 rounded-lg bg-gradient-to-br from-[#5b3cff] to-[#7d55ff] text-white text-sm">Publish</button>
          </div>

          <div className="mt-2 text-xs text-slate-500">Suggested: {suggested.map((s) => <span key={s} className="mr-2">#{s}</span>)}</div>
        </div>
      </div>
    </motion.div>
  );
}

/* ================================== POST ================================== */

function PostCardAdvanced({ p, onLike, onBoost }) {
  const [liked, setLiked] = useState(false);
  return (
    <motion.article layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className={`p-4 rounded-2xl ${THEME.palette.card} ${THEME.palette.glow}`}>
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-gradient-to-br from-[#f0fff8] to-[#f6f0ff] font-bold">{p.avatar}</div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-sm">{p.title || p.authorName}</div>
              <div className="text-xs text-slate-500">{p.authorName} • {timeAgo(p.createdAt)} • {p.mood}</div>
            </div>
            <div className="text-xs text-slate-400">{p.likes} ♥ • {p.boosts}★</div>
          </div>

          <div className="mt-2 text-sm leading-relaxed
