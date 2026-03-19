"use client";
import React, { useState, useEffect, useRef } from "react";
import { db } from "../../lib/firebase";
import {
  collection, query, orderBy, onSnapshot,
  doc, updateDoc, increment, addDoc, serverTimestamp,
  arrayUnion, arrayRemove
} from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, MessageCircle, Share2, Send,
  X, ChevronLeft, ChevronRight, ShoppingBag,
  Sparkles, Eye, Loader2, BookOpen
} from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
interface Story {
  id: string;
  title: string;
  caption: string;
  images: string[];
  tags: string[];
  linkedProductId?: string;
  linkedProductName?: string;
  linkedProductPrice?: number;
  linkedProductImage?: string;
  likes: string[];
  views: number;
  commentCount: number;
  createdAt: any;
  authorName: string;
}

interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: any;
}

interface StoryCardProps {
  story: Story;
  index: number;
  user: any;
  onOpen: () => void;
  onLike: () => void;
  onShare: () => void;
  onComment: () => void;
}

interface StoryModalProps {
  story: Story;
  imageIndex: number;
  setImageIndex: React.Dispatch<React.SetStateAction<number>>;
  comments: Comment[];
  commentText: string;
  setCommentText: React.Dispatch<React.SetStateAction<string>>;
  sendComment: () => void;
  sendingComment: boolean;
  showComments: boolean;
  setShowComments: React.Dispatch<React.SetStateAction<boolean>>;
  user: any;
  userData: any; // ✅ යූසර්ගේ නම සහ විස්තර සඳහා
  commentInputRef: React.RefObject<HTMLInputElement | null>; // ✅ Ref එක null වෙන්න පුළුවන් නිසා | null දැම්මා
  onClose: () => void;
  onLike: () => void;
  onShare: () => void;
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────
export default function StoriesPage() {
  const { user, userData } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
const [showComments, setShowComments] = useState(false); //
const commentInputRef = useRef<HTMLInputElement>(null); //

  // ── Load Stories ──
  useEffect(() => {
    const q = query(collection(db, "stories"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setStories(snap.docs.map(d => ({ id: d.id, ...d.data() } as Story)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ── Load Comments when story opens ──
  useEffect(() => {
    if (!activeStory) return;

    const q = query(
      collection(db, "stories", activeStory.id, "comments"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Comment)));
    });

    // Track view
    updateDoc(doc(db, "stories", activeStory.id), {
      views: increment(1)
    }).catch(() => {});

    return () => unsub();
  }, [activeStory?.id]);

  // ── Like / Unlike ──
  const toggleLike = async (story: Story) => {
    if (!user) { toast.error("Login karanna like karannath! 💖"); return; }
    const ref = doc(db, "stories", story.id);
    const liked = story.likes?.includes(user.uid);
    await updateDoc(ref, {
      likes: liked ? arrayRemove(user.uid) : arrayUnion(user.uid)
    });
    if (activeStory?.id === story.id) {
      setActiveStory(prev => prev ? {
        ...prev,
        likes: liked
          ? prev.likes.filter(id => id !== user.uid)
          : [...(prev.likes || []), user.uid]
      } : null);
    }
  };

  // ── Send Comment ──
  const sendComment = async () => {
    if (!user) { toast.error("Login karanna comment karannath!"); return; }
    if (!commentText.trim() || !activeStory) return;
    setSendingComment(true);
    try {
      await addDoc(collection(db, "stories", activeStory.id, "comments"), {
        userId: user.uid,
        userName: userData?.fullName || userData?.displayName || user.email?.split("@")[0] || "User",
        text: commentText.trim(),
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, "stories", activeStory.id), {
        commentCount: increment(1)
      });
      setCommentText("");
    } catch (e) {
      toast.error("Comment denna bari una!");
    } finally {
      setSendingComment(false);
    }
  };

  // ── Share ──
  const shareStory = async (story: Story) => {
    const url = `${window.location.origin}/stories?id=${story.id}`;
    if (navigator.share) {
      await navigator.share({ title: story.title, text: story.caption, url });
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copy una! 🔗");
    }
  };

  // ── Open Story ──
  const openStory = (story: Story) => {
    setActiveStory(story);
    setActiveImageIndex(0);
    setShowComments(false);
    setComments([]); // ✅ FIX: Reset comments when opening new story
  };

  return (
    <main className="min-h-screen bg-[#fafafa] pt-6 pb-24 md:pb-8">
      <div className="max-w-2xl mx-auto px-4">

        {/* ── HEADER ── */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-1 flex items-center gap-2">
              <Sparkles size={10} />
              CMB LK
            </p>
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter leading-none">
            
            </h1>
          </div>
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            {stories.length} posts
          </div>
        </div>

        {/* ── LOADING SKELETON ── */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-[2.5rem] overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-gray-100" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-gray-100 rounded-full w-3/4" />
                  <div className="h-3 bg-gray-100 rounded-full w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── STORIES FEED ── */}
        {!loading && (
          <div className="space-y-6">
            {stories.length === 0 ? (
              <div className="text-center py-32">
                <div style={{ width: "72px", height: "72px", background: "#f5f5f5", borderRadius: "20px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem" }}>
                  <BookOpen size={32} style={{ color: "#ccc" }} strokeWidth={1.5} />
                </div>
                <p className="font-black text-gray-300 uppercase tracking-widest text-sm">
                  No stories yet
                </p>
              </div>
            ) : stories.map((story, idx) => (
              <StoryCard
                key={story.id}
                story={story}
                index={idx}
                user={user}
                onOpen={() => openStory(story)}
                onLike={() => toggleLike(story)}
                onShare={() => shareStory(story)}
                onComment={() => { openStory(story); setTimeout(() => setShowComments(true), 300); }}
              />
            ))}
          </div>
        )}
      </div>

{/* ── STORY DETAIL MODAL ── */}
      <AnimatePresence>
        {activeStory && (
          <StoryModal
            story={activeStory}
            imageIndex={activeImageIndex}
            setImageIndex={setActiveImageIndex}
            comments={comments}
            commentText={commentText}
            setCommentText={setCommentText}
            sendComment={sendComment}
            sendingComment={sendingComment}
            showComments={showComments}
            setShowComments={setShowComments} // ✅ 'setSet' අයින් කරලා මේක නිවැරදි කළා
            user={user}
            userData={userData}
            commentInputRef={commentInputRef} // ✅ Ref එක මෙතනට පාස් කළා
            onClose={() => setActiveStory(null)}
            onLike={() => toggleLike(activeStory)}
            onShare={() => shareStory(activeStory)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

// ─────────────────────────────────────────────
// STORY CARD (Feed)
// ─────────────────────────────────────────────
function StoryCard({ story, index, user, onOpen, onLike, onShare, onComment }: StoryCardProps) {
  const liked = user && story.likes?.includes(user.uid);
  const likeCount = story.likes?.length || 0;
  const [imgIdx, setImgIdx] = useState(0);

  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.4 }}
      className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-gray-100 transition-all duration-500"
    >
      {/* Image */}
      <div
        className="aspect-[4/3] relative overflow-hidden cursor-pointer bg-gray-50"
        onClick={onOpen}
      >
        {story.images?.length > 0 ? (
          <>
            <img
              src={story.images[imgIdx]}
              alt={story.title}
              className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
            />
            {story.images.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                {story.images.map((_: any, i: number) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setImgIdx(i); }}
                    className={`h-1.5 rounded-full transition-all ${i === imgIdx ? "w-5 bg-white" : "w-1.5 bg-white/60"}`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
            <Sparkles className="text-gray-400" size={40} />
          </div>
        )}

        {story.images?.length > 1 && (
          <div className="absolute top-4 right-4 bg-black/50 text-white text-[9px] font-black px-2 py-1 rounded-full backdrop-blur-sm">
            {imgIdx + 1}/{story.images.length}
          </div>
        )}

        <div className="absolute top-4 left-4 bg-black/40 text-white text-[9px] font-black px-2.5 py-1 rounded-full backdrop-blur-sm flex items-center gap-1">
          <Eye size={10} />
          {story.views || 0}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {story.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {story.tags.slice(0, 3).map((tag: string) => (
              <span key={tag} className="text-[9px] font-black text-[#111] bg-gray-50 px-2.5 py-1 rounded-full uppercase tracking-wide">
                #{tag}
              </span>
            ))}
          </div>
        )}

        <h2
          className="text-[15px] font-black text-gray-900 leading-snug mb-2 cursor-pointer hover:text-[#111] transition-colors uppercase tracking-tight"
          onClick={onOpen}
        >
          {story.title}
        </h2>

        <p className="text-[12px] text-gray-500 font-medium leading-relaxed line-clamp-2 mb-4">
          {story.caption}
        </p>

        {story.linkedProductId && (
          <Link
            href={`/product/${story.linkedProductId}`}
            className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3 mb-4 hover:bg-gray-50 transition-all group"
          >
            {story.linkedProductImage && (
              <img src={story.linkedProductImage} className="w-10 h-10 rounded-xl object-cover" alt="" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Featured Product</p>
              <p className="text-[12px] font-black text-gray-800 truncate group-hover:text-[#111] transition-colors">
                {story.linkedProductName}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[13px] font-black text-[#111]">
                Rs. {story.linkedProductPrice?.toLocaleString()}
              </p>
              <ShoppingBag size={14} className="text-gray-400 ml-auto mt-0.5 group-hover:text-gray-500 transition-colors" />
            </div>
          </Link>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1">
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={onLike}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-gray-50 transition-all group"
            >
              <Heart
                size={18}
                className={`transition-all ${liked ? "fill-[#111] text-[#111]" : "text-gray-400 group-hover:text-gray-500"}`}
              />
              <span className={`text-[11px] font-black ${liked ? "text-[#111]" : "text-gray-400"}`}>
                {likeCount}
              </span>
            </motion.button>

            <button
              onClick={onComment}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-gray-50 transition-all group"
            >
              <MessageCircle size={18} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
              <span className="text-[11px] font-black text-gray-400">
                {story.commentCount || 0}
              </span>
            </button>

            <button
              onClick={onShare}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-gray-50 transition-all group"
            >
              <Share2 size={18} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
            </button>
          </div>

          <div className="text-right">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
              {story.authorName || "LoverSmart"}
            </p>
            <p className="text-[9px] text-gray-300 font-bold">
              {story.createdAt?.toDate
                ? new Date(story.createdAt.toDate()).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                : ""}
            </p>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

// ─────────────────────────────────────────────
// STORY MODAL (Full Detail View)
// ─────────────────────────────────────────────
function StoryModal({
  story, imageIndex, setImageIndex,
  comments, commentText, setCommentText,
  sendComment, sendingComment,
  showComments, setShowComments,
  user, userData, commentInputRef,
  onClose, onLike, onShare
}: StoryModalProps) {
  const liked = user && story.likes?.includes(user.uid);
  const likeCount = story.likes?.length || 0;

  const prevImage = () => setImageIndex((i: number) => Math.max(0, i - 1));
  const nextImage = () => setImageIndex((i: number) => Math.min((story.images?.length || 1) - 1, i + 1));

return (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
    onClick={onClose} // කළු පසුබිම click කළොත් විතරක් වැහෙන්න
  >
    <motion.div
      initial={{ y: "100%", opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "100%", opacity: 0 }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="bg-white w-full max-w-lg rounded-t-[3rem] md:rounded-[3rem] max-h-[calc(100vh-5rem)] md:max-h-[95vh] overflow-hidden flex flex-col"
      onClick={(e) => e.stopPropagation()} 
    >
      
      <div className="relative aspect-[4/3] bg-gray-900 shrink-0">
        {story.images?.length > 0 ? (
          <img
            src={story.images[imageIndex]}
            alt={story.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
            <Sparkles className="text-gray-400" size={48} />
          </div>
        )}

        {/* Top bar */}
        <div className="absolute top-0 inset-x-0 p-4 flex justify-between items-start bg-gradient-to-b from-black/50 to-transparent">
          {story.images?.length > 1 && (
            <div className="flex gap-1 flex-1 mr-4">
              {story.images.map((_: any, i: number) => (
                <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                  <div className={`h-full bg-white rounded-full transition-all ${i <= imageIndex ? "w-full" : "w-0"}`} />
                </div>
              ))}
            </div>
          )}
          <button onClick={onClose} className="w-8 h-8 bg-black/40 rounded-full flex items-center justify-center text-white backdrop-blur-sm ml-auto">
            <X size={16} />
          </button>
        </div>

        {/* Prev/Next Navigation */}
        {story.images?.length > 1 && (
          <>
            {imageIndex > 0 && (
              <button onClick={prevImage} className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 rounded-full flex items-center justify-center text-white backdrop-blur-sm">
                <ChevronLeft size={18} />
              </button>
            )}
            {imageIndex < (story.images?.length || 1) - 1 && (
              <button onClick={nextImage} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 rounded-full flex items-center justify-center text-white backdrop-blur-sm">
                <ChevronRight size={18} />
              </button>
            )}
          </>
        )}

        <div className="absolute bottom-4 left-4 bg-black/40 text-white text-[9px] font-black px-2.5 py-1 rounded-full backdrop-blur-sm flex items-center gap-1">
          <Eye size={10} /> {story.views || 0} views
        </div>
      </div>

      {/* Content area - scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-5 pb-2">
          {story.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {story.tags.map((tag: string) => (
                <span key={tag} className="text-[9px] font-black text-[#111] bg-gray-50 px-2.5 py-1 rounded-full uppercase">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">
            {story.title}
          </h2>
          <p className="text-[13px] text-gray-500 leading-relaxed mb-4">
            {story.caption}
          </p>

          {story.linkedProductId && (
            <Link href={`/product/${story.linkedProductId}`} onClick={onClose}>
              <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-2xl p-3 mb-4 hover:bg-gray-100 transition-all">
                {story.linkedProductImage && (
                  <img src={story.linkedProductImage} className="w-12 h-12 rounded-xl object-cover" alt="" />
                )}
                <div className="flex-1">
                  <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Shop Now</p>
                  <p className="text-[13px] font-black text-gray-800">{story.linkedProductName}</p>
                </div>
                <p className="text-[15px] font-black text-[#111]">Rs. {story.linkedProductPrice?.toLocaleString()}</p>
              </div>
            </Link>
          )}

          {/* Action bar */}
          <div className="flex items-center gap-2 py-3 border-y border-gray-100">
            <motion.button whileTap={{ scale: 0.75 }} onClick={onLike}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-all">
              <Heart size={20} className={liked ? "fill-[#111] text-[#111]" : "text-gray-400"} />
              <span className={`text-[12px] font-black ${liked ? "text-[#111]" : "text-gray-500"}`}>{likeCount}</span>
            </motion.button>

            <button onClick={() => { setShowComments(!showComments); setTimeout(() => commentInputRef.current?.focus(), 300); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-all">
              <MessageCircle size={20} className="text-gray-400" />
              <span className="text-[12px] font-black text-gray-500">{comments.length}</span>
            </button>

            <button onClick={onShare} className="flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-all">
              <Share2 size={20} className="text-gray-400" />
            </button>

            <div className="ml-auto text-[10px] font-black text-gray-300 uppercase tracking-widest">
              by {story.authorName || "LoverSmart"}
            </div>
          </div>
        </div>

        {/* Comments section — always visible */}
        <div className="overflow-hidden">
              <div className="px-5 pb-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                  {comments.length} Comments
                </p>

                <div className="space-y-3 max-h-48 overflow-y-auto mb-4 custom-scrollbar">
                  {comments.length === 0 ? (
                    <p className="text-center text-[11px] font-bold text-gray-300 uppercase py-4">
                      First comment karanna! 👇
                    </p>
                  ) : comments.map((c) => (
                    <div key={c.id} className="flex gap-3">
                      <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-black text-[#111]">
                          {c.userName?.[0]?.toUpperCase() || "U"}
                        </span>
                      </div>
                      <div className="flex-1 bg-gray-50 rounded-2xl px-3 py-2">
                        <p className="text-[9px] font-black text-[#111] uppercase tracking-wide mb-0.5">{c.userName}</p>
                        <p className="text-[12px] text-gray-700 font-medium leading-snug">{c.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
      </div>

      {/* Comment input - always visible at bottom */}
      <div className="p-4 pb-6 border-t border-gray-100 bg-white flex gap-3 items-center shrink-0" style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
          <span className="text-[10px] font-black text-[#111]">
            {user ? (userData?.fullName?.[0] || user.email?.[0]?.toUpperCase() || "U") : "?"}
          </span>
        </div>
        <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-2xl px-4 py-2.5">
          <input
            ref={commentInputRef}
            type="text"
            placeholder={user ? "Add a comment..." : "Login to comment..."}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendComment()}
            disabled={!user || sendingComment}
            className="flex-1 bg-transparent outline-none text-[12px] font-medium text-gray-700 placeholder-gray-400 disabled:opacity-50"
          />
          <button
            onClick={sendComment}
            disabled={!commentText.trim() || !user || sendingComment}
            className="text-[#111] disabled:opacity-30 hover:text-[#111] transition-colors active:scale-90"
          >
            {sendingComment ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </motion.div>
  </motion.div>
);

}