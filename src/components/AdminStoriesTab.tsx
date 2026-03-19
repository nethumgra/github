"use client";
import React, { useState, useEffect, useRef } from "react";
import { db } from "../lib/firebase";
import {
  collection, addDoc, deleteDoc, doc, onSnapshot,
  orderBy, query, serverTimestamp, updateDoc, getDocs
} from "firebase/firestore";
import {
  Plus, Trash2, Loader2, X, Image as ImageIcon,
  UploadCloud, Edit3, Save, Eye, Heart, MessageCircle,
  Sparkles, BookOpen, Tag, ShoppingBag, Search, PackageX
} from "lucide-react";
import { toast } from "react-hot-toast";

// ─── Types ───────────────────────────────────
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

interface Product {
  id: string;
  name: string;
  discountedPrice?: number;
  price?: number;
  images?: string[];
  mainCategory?: string;
  category?: string;
}

const IMGBB_KEY = process.env.NEXT_PUBLIC_IMGBB_API_KEY;

async function uploadToImgBB(file: File): Promise<string | null> {
  if (!IMGBB_KEY) { toast.error("ImgBB API key missing!"); return null; }
  const fd = new FormData();
  fd.append("image", file);
  try {
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method: "POST", body: fd });
    const data = await res.json();
    return data.success ? data.data.url : null;
  } catch { return null; }
}

// ─────────────────────────────────────────────
// PRODUCT PICKER MODAL
// ─────────────────────────────────────────────
function ProductPickerModal({
  allProducts,
  onSelect,
  onClose,
}: {
  allProducts: Product[];
  onSelect: (p: Product) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const categories = [
    "All",
    ...Array.from(new Set(
      allProducts.map(p => p.mainCategory || p.category || "Other").filter(Boolean)
    ))
  ];

  const filtered = allProducts.filter(p => {
    const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "All" || (p.mainCategory || p.category) === category;
    return matchSearch && matchCat;
  });

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6"
      onClick={onClose}
    >
      <div
        className="bg-white w-full md:max-w-2xl rounded-t-[3rem] md:rounded-[3rem] max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-black text-gray-900 uppercase tracking-tight text-lg">Select Product</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {filtered.length} of {allProducts.length} products
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-all"
            >
              <X size={18} />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative mb-3">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              autoFocus
              type="text"
              placeholder="Search by product name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-gray-50 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-rose-300 placeholder:font-normal"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-2 rounded-full text-[10px] font-black uppercase whitespace-nowrap transition-all shrink-0 ${
                  category === cat
                    ? "bg-rose-500 text-white shadow-md shadow-rose-200"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <PackageX className="mx-auto text-gray-200 mb-3" size={48} />
              <p className="font-black text-gray-300 uppercase text-sm tracking-widest">No products found</p>
              <p className="text-[11px] text-gray-300 font-bold mt-2">Try a different search or category</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filtered.map(p => {
                const price = p.discountedPrice || p.price || 0;
                const img = p.images?.[0] || "";
                return (
                  <button
                    key={p.id}
                    onClick={() => { onSelect(p); onClose(); }}
                    className="group text-left bg-gray-50 rounded-2xl overflow-hidden hover:bg-rose-50 hover:shadow-lg hover:shadow-rose-100 transition-all duration-300 border border-transparent hover:border-rose-200 active:scale-95"
                  >
                    <div className="aspect-square bg-white overflow-hidden">
                      {img ? (
                        <img
                          src={img}
                          alt={p.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag size={24} className="text-gray-200" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-0.5">
                        {p.mainCategory || p.category || "Product"}
                      </p>
                      <p className="text-[11px] font-black text-gray-800 line-clamp-2 leading-snug group-hover:text-rose-600 transition-colors">
                        {p.name}
                      </p>
                      <p className="text-[12px] font-black text-rose-500 mt-1">
                        Rs. {price.toLocaleString()}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function AdminStoriesTab() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  // ── Product Picker ──
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // ── Form State ──
  const [form, setForm] = useState({
    title: "",
    caption: "",
    authorName: "LoverSmart",
    tagsInput: "",
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);

  // ── Load Stories ──
  useEffect(() => {
    const q = query(collection(db, "stories"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setStories(snap.docs.map(d => ({ id: d.id, ...d.data() } as Story)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ── Load Products when form opens ──
  useEffect(() => {
    if (!showForm || allProducts.length > 0) return;
    const fetchProducts = async () => {
      setProductsLoading(true);
      try {
        const snap = await getDocs(collection(db, "products"));
        setAllProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
      } catch {
        toast.error("Failed to load products");
      } finally {
        setProductsLoading(false);
      }
    };
    fetchProducts();
  }, [showForm]);

  // ── Reset Form ──
  const resetForm = () => {
    setForm({ title: "", caption: "", authorName: "LoverSmart", tagsInput: "" });
    setImageFiles([]);
    setImagePreviews([]);
    setExistingImages([]);
    setSelectedProduct(null);
    setEditingStory(null);
    setShowForm(false);
  };

  // ── Start Editing ──
  const startEdit = (story: Story) => {
    setEditingStory(story);
    setForm({
      title: story.title,
      caption: story.caption,
      authorName: story.authorName || "LoverSmart",
      tagsInput: story.tags?.join(", ") || "",
    });
    setExistingImages(story.images || []);
    setImageFiles([]);
    setImagePreviews([]);
    if (story.linkedProductId) {
      setSelectedProduct({
        id: story.linkedProductId,
        name: story.linkedProductName || "",
        discountedPrice: story.linkedProductPrice,
        images: story.linkedProductImage ? [story.linkedProductImage] : [],
        mainCategory: "",
      });
    } else {
      setSelectedProduct(null);
    }
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Handle Image Select ──
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const totalAllowed = 5 - existingImages.length - imagePreviews.length;
    const selected = files.slice(0, totalAllowed);
    setImageFiles(prev => [...prev, ...selected]);
    selected.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => setImagePreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
    });
  };

  // ── Submit ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Title required!"); return; }
    if (imageFiles.length === 0 && existingImages.length === 0) { toast.error("At least one image required!"); return; }

    setSaving(true);
    setUploadingImages(imageFiles.length > 0);

    try {
      const uploadedUrls: string[] = [];
      for (const file of imageFiles) {
        const url = await uploadToImgBB(file);
        if (url) uploadedUrls.push(url);
        else toast.error(`Upload failed: ${file.name}`);
      }
      setUploadingImages(false);

      const allImages = [...existingImages, ...uploadedUrls];
      const tags = form.tagsInput.split(",").map(t => t.trim().toLowerCase()).filter(Boolean);

      const storyData: any = {
        title: form.title.trim(),
        caption: form.caption.trim(),
        authorName: form.authorName.trim() || "LoverSmart",
        images: allImages,
        tags,
        likes: editingStory?.likes || [],
        views: editingStory?.views || 0,
        commentCount: editingStory?.commentCount || 0,
        linkedProductId: selectedProduct?.id || null,
        linkedProductName: selectedProduct?.name || null,
        linkedProductPrice: selectedProduct ? (selectedProduct.discountedPrice || selectedProduct.price || 0) : null,
        linkedProductImage: selectedProduct?.images?.[0] || null,
      };

      if (editingStory) {
        await updateDoc(doc(db, "stories", editingStory.id), storyData);
        toast.success("Story updated! ✅");
      } else {
        storyData.createdAt = serverTimestamp();
        await addDoc(collection(db, "stories"), storyData);
        toast.success("Story published! 🎉");
      }

      resetForm();
    } catch (error: any) {
      toast.error("Failed: " + error.message);
    } finally {
      setSaving(false);
      setUploadingImages(false);
    }
  };

  // ── Delete ──
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, "stories", id));
      toast.success("Story deleted.");
    } catch { toast.error("Delete failed."); }
  };

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto pb-32">

      {/* ── HEADER ── */}
      <div className="flex justify-between items-center bg-white/90 backdrop-blur-md p-6 rounded-[2rem] shadow-xl border border-rose-50 sticky top-5 z-40">
        <div>
          <h1 className="font-black text-2xl text-gray-800 tracking-tighter flex items-center gap-3">
            <BookOpen className="text-rose-500" size={28} />
            STORIES MANAGER
          </h1>
          <p className="text-[10px] text-rose-400 font-bold uppercase tracking-widest mt-1">
            {stories.length} Stories Published
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-rose-500 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-black transition-all shadow-lg shadow-rose-100 text-sm"
        >
          <Plus size={20} /> NEW STORY
        </button>
      </div>

      {/* ── FORM ── */}
      {showForm && (
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-rose-500 to-pink-500 p-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">
                  {editingStory ? "✏️ Edit Story" : "✨ Create New Story"}
                </h2>
                <p className="text-white/70 text-[11px] font-bold uppercase tracking-widest mt-1">
                  {editingStory ? `Editing: ${editingStory.title}` : "Share a new story with customers"}
                </p>
              </div>
              <button onClick={resetForm} className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all">
                <X size={18} />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-8">

            {/* ── IMAGES ── */}
            <div>
              <label className="flex items-center gap-2 text-[11px] font-black uppercase text-gray-400 mb-4">
                <ImageIcon size={14} className="text-rose-500" /> Images (Max 5)
              </label>

              {existingImages.length > 0 && (
                <div className="flex flex-wrap gap-3 mb-4">
                  {existingImages.map((url, i) => (
                    <div key={i} className="relative w-24 h-24 rounded-2xl overflow-hidden border border-gray-200 group">
                      <img src={url} className="w-full h-full object-cover" alt="" />
                      <button type="button"
                        onClick={() => setExistingImages(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                        <X size={20} className="text-white" />
                      </button>
                      <div className="absolute top-1 left-1 bg-blue-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">SAVED</div>
                    </div>
                  ))}
                </div>
              )}

              {imagePreviews.length > 0 && (
                <div className="flex flex-wrap gap-3 mb-4">
                  {imagePreviews.map((src, i) => (
                    <div key={i} className="relative w-24 h-24 rounded-2xl overflow-hidden border border-dashed border-rose-300 group">
                      <img src={src} className="w-full h-full object-cover" alt="" />
                      <button type="button" onClick={() => {
                        setImageFiles(prev => prev.filter((_, idx) => idx !== i));
                        setImagePreviews(prev => prev.filter((_, idx) => idx !== i));
                      }} className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                        <X size={20} className="text-white" />
                      </button>
                      <div className="absolute top-1 left-1 bg-rose-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">NEW</div>
                    </div>
                  ))}
                </div>
              )}

              {(existingImages.length + imagePreviews.length) < 5 && (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-3xl cursor-pointer hover:border-rose-300 hover:bg-rose-50/30 transition-all group">
                  <UploadCloud size={24} className="text-gray-300 group-hover:text-rose-400 transition-colors mb-2" />
                  <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Click to upload</p>
                  <p className="text-[10px] text-gray-300 font-bold mt-1">
                    {5 - existingImages.length - imagePreviews.length} slots remaining
                  </p>
                  <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageSelect} />
                </label>
              )}
            </div>

            {/* ── TITLE & AUTHOR ── */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase text-gray-400">Story Title *</label>
                <input required type="text" placeholder="e.g. Summer Collection 2025"
                  className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-rose-300 font-bold text-gray-800 placeholder:font-normal"
                  value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase text-gray-400">Author Name</label>
                <input type="text" placeholder="LoverSmart"
                  className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-rose-300 font-bold text-gray-800 placeholder:font-normal"
                  value={form.authorName} onChange={e => setForm({ ...form, authorName: e.target.value })} />
              </div>
            </div>

            {/* ── CAPTION ── */}
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase text-gray-400">Caption / Description</label>
              <textarea rows={4} placeholder="Write a compelling story caption..."
                className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-rose-300 font-medium text-gray-700 placeholder:font-normal resize-none"
                value={form.caption} onChange={e => setForm({ ...form, caption: e.target.value })} />
            </div>

            {/* ── TAGS ── */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[11px] font-black uppercase text-gray-400">
                <Tag size={12} className="text-rose-500" /> Tags (comma separated)
              </label>
              <input type="text" placeholder="e.g. new arrivals, summer, sale"
                className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-rose-300 font-medium text-gray-700 placeholder:font-normal"
                value={form.tagsInput} onChange={e => setForm({ ...form, tagsInput: e.target.value })} />
              {form.tagsInput && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.tagsInput.split(",").map(t => t.trim()).filter(Boolean).map(tag => (
                    <span key={tag} className="text-[9px] font-black text-rose-500 bg-rose-50 px-2.5 py-1 rounded-full uppercase">#{tag}</span>
                  ))}
                </div>
              )}
            </div>

            {/* ── LINKED PRODUCT — Smart Picker ── */}
            <div className="bg-gray-50/50 rounded-3xl p-6 border border-gray-100 space-y-4">
              <label className="flex items-center gap-2 text-[11px] font-black uppercase text-gray-400">
                <ShoppingBag size={12} className="text-rose-500" /> Link a Product (Optional)
              </label>

              {selectedProduct ? (
                /* ── Selected State ── */
                <div className="flex items-center gap-4 bg-white border border-rose-100 rounded-2xl p-4 shadow-sm">
                  {selectedProduct.images?.[0] && (
                    <img
                      src={selectedProduct.images[0]}
                      className="w-16 h-16 rounded-xl object-cover shrink-0 border border-gray-100"
                      alt=""
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-0.5">✅ Linked Product</p>
                    <p className="font-black text-gray-800 truncate text-sm">{selectedProduct.name}</p>
                    <p className="text-sm font-black text-rose-500 mt-0.5">
                      Rs. {(selectedProduct.discountedPrice || selectedProduct.price || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowProductPicker(true)}
                      className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-[10px] font-black uppercase hover:bg-gray-200 transition-all"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedProduct(null)}
                      className="px-4 py-2 bg-red-50 text-red-400 rounded-xl text-[10px] font-black uppercase hover:bg-red-100 transition-all"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                /* ── Empty State — Pick Button ── */
                <button
                  type="button"
                  onClick={() => setShowProductPicker(true)}
                  disabled={productsLoading}
                  className="w-full flex items-center justify-center gap-3 py-5 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 hover:border-rose-300 hover:text-rose-500 hover:bg-rose-50/30 transition-all font-black text-[12px] uppercase tracking-widest disabled:opacity-50 group"
                >
                  {productsLoading ? (
                    <><Loader2 size={18} className="animate-spin" /> Loading Products...</>
                  ) : (
                    <>
                      <ShoppingBag size={18} className="group-hover:scale-110 transition-transform" />
                      Browse &amp; Select Product
                    </>
                  )}
                </button>
              )}
            </div>

            {/* ── SUBMIT ── */}
            <div className="flex items-center gap-4 pt-4">
              <button type="submit" disabled={saving}
                className="flex-1 py-5 bg-rose-500 text-white rounded-3xl font-black text-[13px] uppercase tracking-[0.15em] flex items-center justify-center gap-3 hover:bg-rose-600 transition-all shadow-xl shadow-rose-200 disabled:opacity-60">
                {saving ? (
                  <><Loader2 size={20} className="animate-spin" />{uploadingImages ? "Uploading Images..." : "Saving..."}</>
                ) : editingStory ? (
                  <><Save size={20} /> UPDATE STORY</>
                ) : (
                  <><Sparkles size={20} /> PUBLISH STORY</>
                )}
              </button>
              <button type="button" onClick={resetForm}
                className="px-8 py-5 bg-gray-100 text-gray-500 rounded-3xl font-black text-[12px] uppercase tracking-widest hover:bg-gray-200 transition-all">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── PRODUCT PICKER MODAL ── */}
      {showProductPicker && (
        <ProductPickerModal
          allProducts={allProducts}
          onSelect={p => { setSelectedProduct(p); setShowProductPicker(false); }}
          onClose={() => setShowProductPicker(false)}
        />
      )}

      {/* ── STORIES LIST ── */}
      <div>
        <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.25em] mb-6 flex items-center gap-2">
          <Sparkles size={12} className="text-rose-400" /> Published Stories
        </h2>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-rose-400" size={40} />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-300">Loading...</p>
          </div>
        ) : stories.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
            <div className="text-6xl mb-4">📖</div>
            <p className="text-gray-300 font-black uppercase tracking-widest text-sm">No stories yet</p>
            <p className="text-gray-300 text-xs font-bold mt-2">Click "NEW STORY" to publish your first story!</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {stories.map(story => (
              <div key={story.id}
                className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden hover:shadow-xl hover:shadow-rose-50 transition-all duration-500 group">
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-48 md:h-48 aspect-square md:aspect-auto shrink-0 relative overflow-hidden bg-gray-50">
                    {story.images?.[0] ? (
                      <img src={story.images[0]} alt={story.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-rose-100 to-pink-50 flex items-center justify-center">
                        <Sparkles className="text-rose-300" size={32} />
                      </div>
                    )}
                    {story.images?.length > 1 && (
                      <div className="absolute top-3 right-3 bg-black/50 text-white text-[9px] font-black px-2 py-1 rounded-full">
                        +{story.images.length - 1}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 p-6 flex flex-col justify-between">
                    <div>
                      {story.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {story.tags.slice(0, 4).map(tag => (
                            <span key={tag} className="text-[9px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full uppercase">#{tag}</span>
                          ))}
                        </div>
                      )}
                      <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-1">{story.title}</h3>
                      <p className="text-[12px] text-gray-500 font-medium line-clamp-2 mb-3">{story.caption}</p>
                      {story.linkedProductId && (
                        <div className="flex items-center gap-2 bg-rose-50 px-3 py-2 rounded-xl w-fit">
                          <ShoppingBag size={12} className="text-rose-500" />
                          <span className="text-[10px] font-black text-rose-600 uppercase">
                            {story.linkedProductName} · Rs. {story.linkedProductPrice?.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <Eye size={14} className="text-gray-300" />
                          <span className="text-[11px] font-black text-gray-400">{story.views || 0}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Heart size={14} className="text-rose-300" />
                          <span className="text-[11px] font-black text-gray-400">{story.likes?.length || 0}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MessageCircle size={14} className="text-blue-300" />
                          <span className="text-[11px] font-black text-gray-400">{story.commentCount || 0}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => startEdit(story)}
                          className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-900 hover:text-white transition-all flex items-center gap-1">
                          <Edit3 size={12} /> Edit
                        </button>
                        <button onClick={() => handleDelete(story.id)}
                          className="p-2.5 bg-gray-100 text-gray-400 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
