// MindLink.jsx
// Single-file React prototype (Vite + Tailwind + Framer Motion)
// - Pure English JavaScript
// - Mobile-first responsive layout
// - Mock local API (in-memory)
// - Simple Insight Engine with local storage (guarded for SSR)
// - Subtle Framer Motion animations
// - Comments and pseudocode in English

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./index.css";
/* ----------------------------- THEME / CONSTANTS --------------------------- */

const THEME = {
  colors: {
    mentalBlue: "bg-[#e8f0ff]",
    card: "bg-white/80",
  },
};

/* ----------------------------- MOCK LOCAL API ------------------------------ */

const mockDB = (() => {
  let posts = [
    {
      id: 1,
      author: "Ava",
      avatar: "A",
      content: "Trying mindful coding — short breaks helped me focus.",
      tags: ["mindful", "productivity"],
      mood: "calm",
      likes: 4,
      createdAt: Date.now() - 1000 * 60 * 60 * 6,
    },
    {
      id: 2,
      author: "Rui",
      avatar: "R",
      content: "Idea: decentralized knowledge nodes for neighborhoods.",
      tags: ["ideas", "sustainability"],
      mood: "energetic",
      likes: 8,
      createdAt: Date.now() - 1000 * 60 * 60 * 24,
    },
  ];

  let users = [
    { id: "u1", name: "You", avatar: "Y", interests: ["AI", "Sustainability"], moodScore: 0.6 },
    { id: "u2", name: "Ava", avatar: "A", interests: ["Mindfulness", "Design"], moodScore: 0.8 },
    { id: "u3", name: "Rui", avatar: "R", interests: ["Systems", "Energy"], moodScore: 0.3 },
  ];

  return {
    fetchPosts: () => Promise.resolve(posts.slice().sort((a, b) => b.createdAt - a.createdAt)),
    createPost: (post) => {
      const newPost = { ...post, id: Date.now(), likes: 0, createdAt: Date.now() };
      posts = [newPost, ...posts];
      return Promise.resolve(newPost);
    },
    likePost: (id) => {
      posts = posts.map((p) => (p.id === id ? { ...p, likes: p.likes + 1 } : p));
      return Promise.resolve(true);
    },
    fetchUsers: () => Promise.resolve(users),
    sendMessage: (from, to, body) => Promise.resolve({ id: Date.now(), from, to, body, createdAt: Date.now() }),
  };
})();

/* ----------------------------- HELPERS ------------------------------------ */

const timeAgo = (timestamp) => {
  const s = Math.floor((Date.now() - timestamp) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

const safeLocalStorageGet = (key, fallback) => {
  try {
    if (typeof window === "undefined" || !window.localStorage) return fallback;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const safeLocalStorageSet = (key, value) => {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

/* ----------------------------- INSIGHT ENGINE ----------------------------- */

/**
 * Lightweight Insight Engine:
 * - stores tag counts and mood signals locally
 * - suggests frequent topics
 * - infers a simple mood value 0..1
 */

const InsightEngine = (() => {
  const KEY = "mindlink_insights_v1";
  const initial = { tagCounts: {}, moodSignals: [] };

  let state = safeLocalStorageGet(KEY, initial);

  const persist = () => safeLocalStorageSet(KEY, state);

  return {
    recordTags(tags = []) {
      tags.forEach((t) => {
        if (!t) return;
        state.tagCounts[t] = (state.tagCounts[t] || 0) + 1;
      });
      persist();
    },
    recordMood(value) {
      if (typeof value !== "number" || Number.isNaN(value)) return;
      state.moodSignals.push({ v: value, t: Date.now() });
      if (state.moodSignals.length > 50) state.moodSignals.shift();
      persist();
    },
    suggestTopics(limit = 5) {
      return Object.entries(state.tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map((x) => x[0]);
    },
    inferMood() {
      if (!state.moodSignals.length) return 0.5;
      const avg = state.moodSignals.reduce((s, x) => s + x.v, 0) / state.moodSignals.length;
      return Math.max(0, Math.min(1, avg));
    },
    // For debugging/testing
    _dump() {
      return JSON.parse(JSON.stringify(state));
    },
  };
})();

/* ----------------------------- ANTECEDENT PSEUDOCODE ----------------------- */

/*
PSEUDOCODE: Detect issues before posting

function detectIssue(post):
  if post.content.trim() === "":
    return { type: 'empty', message: 'Post is empty. Suggest adding text or audio.' }
  if countLinks(post.content) > 3:
    return { type: 'spam', message: 'Possible spam: many links detected.' }
  if post.content.length > 2000:
    return { type: 'length', message: 'Post too long — suggest summarizing.' }
  if user.moodScore < 0.2 and content.isAggressive:
    return { type: 'flow_block', message: 'Aggressive tone detected. Suggest rephrasing.' }
  return null

Use detectIssue before submitting post. Offer gentle guidance, not hard-block.
*/

/* ----------------------------- UI COMPONENTS ------------------------------ */

const Icon = ({ children }) => (
  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-white/30">
    {children}
  </div>
);

function Header({ moodValue, onToggle }) {
  const label = moodValue > 0.6 ? "Energetic" : moodValue < 0.4 ? "Calm" : "Balanced";
  return (
    <header className={`flex items-center justify-between p-3 sticky top-0 z-20 ${THEME.colors.mentalBlue} backdrop-blur-sm`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl font-bold bg-gradient-to-br from-[#dfe7ff] to-[#eef6ff]">ML</div>
        <div>
          <div className="text-sm font-semibold">MindLink</div>
          <div className="text-xs text-slate-600">The social network that understands and evolves with you.</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={onToggle} className="px-3 py-1 rounded-lg border border-transparent text-xs font-medium bg-white/90 shadow-sm">
          Mood: {label}
        </button>
        <Icon>⚙️</Icon>
      </div>
    </header>
  );
}

function ProfileCard({ user, suggestedTopics }) {
  return (
    <aside className="p-4 w-full md:w-72">
      <motion.div layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className={`p-4 rounded-2xl ${THEME.colors.card} shadow-sm`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold bg-gradient-to-br from-[#eef6ff] to-[#f7f3ff]">{user.avatar}</div>
          <div>
            <div className="font-semibold">{user.name}</div>
            <div className="text-xs text-slate-500">{user.interests.join(" • ")}</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-sm font-bold">{Math.round(user.moodScore * 100)}</div>
            <div className="text-xs text-slate-500">Mood</div>
          </div>
          <div>
            <div className="text-sm font-bold">12</div>
            <div className="text-xs text-slate-500">Connections</div>
          </div>
          <div>
            <div className="text-sm font-bold">42</div>
            <div className="text-xs text-slate-500">Ideas</div>
          </div>
        </div>

        <div className="mt-4">
          <div className="text-xs text-slate-600">Suggested topics</div>
          <div className="flex gap-2 mt-2 flex-wrap">
            {suggestedTopics.length ? (
              suggestedTopics.map((s) => (
                <span key={s} className="px-2 py-1 text-xs rounded-full border">
                  {s}
                </span>
              ))
            ) : (
              <div className="text-xs text-slate-400">No suggestions yet — share something!</div>
            )}
          </div>
        </div>
      </motion.div>
    </aside>
  );
}

function Composer({ onCreate, suggestedTopics }) {
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [mood, setMood] = useState(0.6);

  const detectIssue = (post) => {
    if (!post.content || !post.content.trim()) return { type: "empty", message: "The post is empty." };
    const linkCount = (post.content.match(/https?:\/\/[^\s]+/g) || []).length;
    if (linkCount > 3) return { type: "spam", message: "Many links detected (possible spam)." };
    if (post.content.length > 2000) return { type: "length", message: "Post too long — consider summarizing." };
    if (/\b(hate|idiot|stupid)\b/i.test(post.content) && mood < 0.3) return { type: "flow_block", message: "Aggressive tone detected. Consider rephrasing." };
    return null;
  };

  const submit = async () => {
    const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
    const post = { author: "You", avatar: "Y", content, tags: tagList, mood: mood > 0.6 ? "energetic" : mood < 0.4 ? "calm" : "balanced" };
    const issue = detectIssue(post);
    if (issue) {
      // gentle confirmation for prototype
      // in production, show a UI modal with better UX
      const proceed = window.confirm(`${issue.message} Do you want to continue?`);
      if (!proceed) return;
    }
    const created = await mockDB.createPost(post);
    onCreate(created);
    InsightEngine.recordTags(tagList);
    InsightEngine.recordMood(mood);
    setContent("");
    setTags("");
    setMood(0.6);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`p-3 rounded-2xl ${THEME.colors.card} shadow-sm`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-[#eef6ff] to-[#f7f3ff] text-sm font-bold">Y</div>
        <div className="flex-1">
          <textarea
            placeholder="Share an idea, thought or simulated audio..."
            className="w-full resize-none min-h-[72px] bg-transparent outline-none text-sm"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          <div className="mt-2 flex items-center gap-2">
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tags, separated, by, comma" className="text-xs px-2 py-1 rounded-md border w-full md:w-2/3" />
            <div className="text-xs">Mood</div>
            <input type="range" min={0} max={1} step={0.1} value={mood} onChange={(e) => setMood(Number(e.target.value))} className="w-24" />
            <button onClick={submit} className="px-3 py-1 rounded-md bg-gradient-to-br from-[#5b6bff] to-[#7b8dff] text-white text-xs font-semibold">Publish</button>
          </div>

          <div className="mt-3 text-xs text-slate-500">
            Suggestions: {suggestedTopics.map((t) => <span key={t} className="mr-2">#{t}</span>)}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function PostCard({ post, onLike }) {
  const safeTags = Array.isArray(post.tags) ? post.tags : [];
  return (
    <motion.article layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className={`p-4 rounded-2xl ${THEME.colors.card} shadow-sm`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#f3f6ff] font-bold">{post.avatar}</div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-sm">{post.author}</div>
              <div className="text-xs text-slate-500">{timeAgo(post.createdAt)} • {post.mood}</div>
            </div>
            <div className="text-xs text-slate-400">{post.likes} ♥</div>
          </div>

          <div className="mt-3 text-sm leading-relaxed">{post.content}</div>

          <div className="mt-3 flex items-center gap-2 text-xs">
            {safeTags.map((t) => <span key={t} className="px-2 py-1 rounded-full border">#{t}</span>)}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button onClick={() => onLike(post.id)} className="text-xs px-2 py-1 rounded-md border">Like</button>
            <button className="text-xs px-2 py-1 rounded-md border">Share</button>
            <button className="text-xs px-2 py-1 rounded-md border">Save</button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function Feed({ posts, onLike }) {
  return (
    <div className="space-y-3">
      <AnimatePresence>
        {posts.map((p) => <PostCard key={p.id} post={p} onLike={onLike} />)}
      </AnimatePresence>
    </div>
  );
}

function MindChat({ messages = [], onSend }) {
  const [text, setText] = useState("");

  const submit = async () => {
    if (!text.trim()) return;
    await onSend(text);
    setText("");
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`p-3 rounded-2xl ${THEME.colors.card} shadow-sm`}>
      <div className="text-xs text-slate-600 mb-2">Contextual chat</div>
      <div className="max-h-36 overflow-y-auto space-y-2 mb-2">
        {messages.map((m) => (
          <div key={m.id} className="text-sm">
            <span className="font-semibold">{m.from}</span>: {m.body}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Send a message..." className="flex-1 px-2 py-1 rounded-md border text-sm" />
        <button onClick={submit} className="px-3 py-1 rounded-md bg-white/90">Send</button>
      </div>
    </motion.div>
  );
}

/* ----------------------------- MAIN APP ---------------------------------- */

export default function MindLink() {
  const [posts, setPosts] = useState([]);
  const [user] = useState({ id: "u1", name: "You", avatar: "Y", interests: ["AI", "Sustainability"], moodScore: 0.6 });
  const [suggestions, setSuggestions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [mood, setMood] = useState(() => InsightEngine.inferMood());

  // initial load
  useEffect(() => {
    let mounted = true;
    (async () => {
      const p = await mockDB.fetchPosts();
      if (!mounted) return;
      setPosts(p);
      setSuggestions(InsightEngine.suggestTopics(6));
    })();
    return () => { mounted = false; };
  }, []);

  // record mood when it changes
  useEffect(() => {
    InsightEngine.recordMood(mood);
  }, [mood]);

  const handleCreate = (newPost) => setPosts((prev) => [newPost, ...prev]);

  const handleLike = async (id) => {
    await mockDB.likePost(id);
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, likes: p.likes + 1 } : p)));
  };

  const handleSend = async (text) => {
    const m = await mockDB.sendMessage(user.name, "Ava", text);
    setMessages((prev) => [...prev, m]);
  };

  const toggleMood = () => setMood((cur) => (cur > 0.6 ? 0.3 : 0.8));

  const uiTone = mood > 0.65 ? "energetic" : mood < 0.4 ? "calm" : "balanced";

  const containerMotion = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.45, ease: "easeOut" },
  };

  return (
    <motion.div {...containerMotion} className="min-h-screen p-3 md:p-6 bg-gradient-to-br from-[#fbfdff] to-[#f8f7ff] text-slate-800">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-4">
          <Header moodValue={mood} onToggle={toggleMood} />
        </div>

        <div className="md:col-span-1 order-2 md:order-1">
          <ProfileCard user={user} suggestedTopics={suggestions} />
        </div>

        <main className="md:col-span-2 order-1 md:order-2">
          <div className="space-y-3">
            <Composer onCreate={handleCreate} suggestedTopics={suggestions} />

            <motion.div className={`p-3 rounded-2xl ${THEME.colors.card} shadow-sm`} layout>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">Insight Engine</div>
                  <div className="text-xs text-slate-500">Learns from your actions and suggests connections.</div>
                </div>
                <div className="text-xs">Tone: {uiTone}</div>
              </div>

              <div className="mt-2 text-xs text-slate-600">
                Popular topics: {InsightEngine.suggestTopics(4).map((t) => <span key={t} className="mr-2">#{t}</span>)}
              </div>

              <div className="mt-3 text-xs text-slate-500">
                <div>Privacy-first local signals. Efficiency: component reuse, local cache, render optimization.</div>
              </div>
            </motion.div>

            <Feed posts={posts} onLike={handleLike} />
          </div>
        </main>

        <aside className="md:col-span-1 order-3 md:order-3">
          <div className="space-y-3">
            <MindChat messages={messages} onSend={handleSend} />

            <motion.div className={`p-3 rounded-2xl ${THEME.colors.card} shadow-sm`}>
              <div className="text-sm font-semibold">Connections</div>
              <div className="mt-2 text-xs text-slate-600">Ava • Rui • plus 10</div>

              <div className="mt-3 text-xs">
                UI adapts to your state — when energetic, cards show stronger elevation and faster micro-animations.
              </div>
            </motion.div>
          </div>
        </aside>
      </div>

      <style>{`
        /* Small visual tweak variable for adaptive elevation */
        :root { --ml-elevation: ${uiTone === "energetic" ? "12" : uiTone === "calm" ? "2" : "6"}; }
      `}</style>
    </motion.div>
  );
}
