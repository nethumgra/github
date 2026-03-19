"use client";
import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import {
  doc, getDoc, setDoc,
  collection, onSnapshot, addDoc, updateDoc, deleteDoc
} from "firebase/firestore";
import {
  Plus, Trash2, Save, Image as ImageIcon,
  UploadCloud, Loader2, Layout, List, Edit3, Check, X, Monitor, Smartphone, ChevronLeft, ChevronRight
} from "lucide-react";
import { toast } from "react-hot-toast";

// ─── Types ──────────────────────────────────────────────────────────
interface Category {
  id: string;
  name: string;
  img: string;
  bgColor: string;
  subCategories: string[];
}

interface BannerSlide {
  id: number;
  pc: string;
  mobile: string;
}

interface SectionBanner {
  pc: string;
  mobile: string;
}

type LayoutType = "horizontal-scroll" | "vertical-infinite";

// ─── Special Category ────────────────────────────────────────────────
interface SpecialCategory {
  id: string;
  name: string;
  description: string; // shown in "Chat with us for ?" banner
  accentColor: string; // button/badge accent color
  chatLink: string;    // WhatsApp or chat URL
}

interface ProductArea {
  id: number;
  title: string;
  subtitle: string;
  targetCategory: string; // category name OR "__all__"
  targetSubCategory?: string; // sub-category name (optional, only when targetCategory is a specific category)
  layoutType: LayoutType;
  banner?: SectionBanner; // optional banner below the section title
}

// ─── Category Edit Modal ─────────────────────────────────────────────
function CategoryEditModal({
  category,
  onSave,
  onClose,
  handleImgBBUpload,
}: {
  category: Category;
  onSave: (updated: Category) => void;
  onClose: () => void;
  handleImgBBUpload: (file: File) => Promise<string | null>;
}) {
  const [editData, setEditData] = useState<Category>({ ...category });
  const [uploading, setUploading] = useState(false);
  const [newSubCat, setNewSubCat] = useState("");

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await handleImgBBUpload(file);
    if (url) {
      setEditData((prev) => ({ ...prev, img: url }));
      toast.success("Image uploaded!");
    }
    setUploading(false);
  };

  const addSubCategory = () => {
    const trimmed = newSubCat.trim();
    if (!trimmed) return;
    if (editData.subCategories.includes(trimmed)) {
      toast.error("Sub-category already exists!");
      return;
    }
    setEditData((prev) => ({ ...prev, subCategories: [...prev.subCategories, trimmed] }));
    setNewSubCat("");
  };

  const removeSubCategory = (sub: string) => {
    setEditData((prev) => ({ ...prev, subCategories: prev.subCategories.filter((s) => s !== sub) }));
  };

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-8 pt-8 pb-4">
          <div>
            <h3 className="font-black text-xl text-gray-900 uppercase tracking-tight">Edit Category</h3>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
              Modify name, color & image
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-8 pb-8 space-y-6">
          <div className="flex items-center gap-6">
            <div
              className="relative w-20 h-20 rounded-[1rem] flex items-center justify-center shadow-lg shrink-0 overflow-hidden group cursor-pointer"
              style={{ backgroundColor: editData.bgColor || "#f3f4f6" }}
            >
              {uploading ? (
                <Loader2 size={24} className="text-white animate-spin" />
              ) : editData.img ? (
                <img src={editData.img} alt={editData.name} className="w-full h-full object-cover" />
              ) : (
                <UploadCloud size={24} className="text-gray-400" />
              )}
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-[1rem]">
                <UploadCloud size={20} className="text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-[10px] font-black uppercase text-gray-400">Category Name</p>
              <input
                type="text"
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                className="w-full px-5 py-3 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-gray-300 font-black text-gray-800 text-sm uppercase"
                placeholder="e.g. Skincare"
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase text-gray-400">Background Color</p>
            <div className="flex items-center gap-4">
              <input
                type="color"
                value={editData.bgColor || "#FFC0CB"}
                onChange={(e) => setEditData({ ...editData, bgColor: e.target.value })}
                className="w-14 h-12 rounded-2xl cursor-pointer border-none outline-none"
              />
              <div className="flex gap-2 flex-wrap">
                {["#FFC0CB", "#FFD700", "#B5EAD7", "#C9DEF4", "#F4C2C2", "#E2D1F9", "#fde68a"].map((color) => (
                  <button
                    key={color}
                    onClick={() => setEditData({ ...editData, bgColor: color })}
                    className={`w-8 h-8 rounded-full transition-all hover:scale-110 ${
                      editData.bgColor === color ? "ring-2 ring-offset-2 ring-gray-800 scale-110" : ""
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-[1.5rem] p-4 flex items-center gap-4">
            <p className="text-[10px] font-black uppercase text-gray-400 shrink-0">Preview</p>
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-16 h-16 rounded-[0.75rem] overflow-hidden shadow-md"
                style={{ backgroundColor: editData.bgColor || "#f3f4f6" }}
              >
                {editData.img ? (
                  <img src={editData.img} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon size={20} className="text-gray-400" />
                  </div>
                )}
              </div>
              <span className="font-black text-[10px] uppercase text-gray-700">{editData.name || "Name"}</span>
            </div>
          </div>

          {/* Sub-categories */}
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase text-gray-400">Sub Categories</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSubCat}
                onChange={(e) => setNewSubCat(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSubCategory()}
                placeholder="e.g. Moisturizers"
                className="flex-1 px-4 py-3 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-gray-300 font-bold text-gray-800 text-sm"
              />
              <button
                type="button"
                onClick={addSubCategory}
                className="w-11 h-11 bg-[#111] text-white rounded-2xl flex items-center justify-center hover:bg-gray-700 transition-all shrink-0"
              >
                <Plus size={16} />
              </button>
            </div>
            {editData.subCategories.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {editData.subCategories.map((sub) => (
                  <div
                    key={sub}
                    className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1.5 shadow-sm group"
                  >
                    <span className="text-[11px] font-black text-gray-700 uppercase tracking-wide">{sub}</span>
                    <button
                      type="button"
                      onClick={() => removeSubCategory(sub)}
                      className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-red-500 hover:text-white transition-all"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-gray-300 font-bold">No sub-categories yet. Add some above!</p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => onSave(editData)}
              disabled={uploading}
              className="flex-1 bg-[#111] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-700 transition-all shadow-lg  disabled:opacity-60"
            >
              <Check size={16} /> Save Changes
            </button>
            <button
              onClick={onClose}
              className="px-6 bg-gray-100 text-gray-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Banner Slide Card ───────────────────────────────────────────────
function BannerSlideCard({
  slide,
  index,
  total,
  onUpdate,
  onDelete,
  onMoveLeft,
  onMoveRight,
  handleImgBBUpload,
  uploading,
  setUploading,
}: {
  slide: BannerSlide;
  index: number;
  total: number;
  onUpdate: (id: number, field: "pc" | "mobile", url: string) => void;
  onDelete: (id: number) => void;
  onMoveLeft: (index: number) => void;
  onMoveRight: (index: number) => void;
  handleImgBBUpload: (file: File) => Promise<string | null>;
  uploading: string | null;
  setUploading: (key: string | null) => void;
}) {
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "pc" | "mobile") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const key = `${slide.id}-${type}`;
    setUploading(key);
    const url = await handleImgBBUpload(file);
    if (url) {
      onUpdate(slide.id, type, url);
      toast.success(`Slide ${index + 1} ${type.toUpperCase()} banner uploaded!`);
    } else {
      toast.error("Upload failed!");
    }
    setUploading(null);
    // reset input
    e.target.value = "";
  };

  return (
    <div className="bg-white border border-gray-100 rounded-[2.5rem] shadow-sm overflow-hidden">
      {/* Slide Header */}
      <div className="flex items-center justify-between px-8 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#111] rounded-full flex items-center justify-center text-white font-black text-sm">
            {index + 1}
          </div>
          <div>
            <p className="font-black text-sm text-gray-800 uppercase tracking-tight">Slide {index + 1}</p>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
              {slide.pc && slide.mobile ? "✅ Both uploaded" : slide.pc ? "⚠️ Mobile missing" : slide.mobile ? "⚠️ PC missing" : "⚠️ No images yet"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onMoveLeft(index)}
            disabled={index === 0}
            className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 disabled:opacity-30 transition-all"
            title="Move left"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => onMoveRight(index)}
            disabled={index === total - 1}
            className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 disabled:opacity-30 transition-all"
            title="Move right"
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={() => onDelete(slide.id)}
            className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-all"
            title="Delete slide"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Upload Areas */}
      <div className="grid grid-cols-2 gap-4 px-8 pb-8">
        {/* PC Banner */}
        <div className="space-y-2">
          <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-1.5">
            <Monitor size={11} className="text-gray-500" /> PC / Desktop
          </p>
          <div className="relative aspect-[21/9] bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden group hover:border-gray-400 transition-all">
            {uploading === `${slide.id}-pc` ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 size={24} className="text-gray-500 animate-spin" />
                <p className="text-[9px] font-bold text-gray-500 uppercase">Uploading...</p>
              </div>
            ) : slide.pc ? (
              <>
                <img src={slide.pc} className="w-full h-full object-cover" alt="PC Banner" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                  <p className="text-white font-black text-[10px] uppercase tracking-widest">Change Image</p>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <UploadCloud size={24} className="text-gray-300" />
                <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">Upload PC Banner</p>
                <p className="text-[8px] text-gray-200 font-bold">Recommended: 1920×820px</p>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleUpload(e, "pc")}
              className="absolute inset-0 opacity-0 cursor-pointer"
              disabled={!!uploading}
            />
          </div>
        </div>

        {/* Mobile Banner */}
        <div className="space-y-2">
          <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-1.5">
            <Smartphone size={11} className="text-gray-500" /> Mobile
          </p>
          <div className="relative aspect-[21/9] bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden group hover:border-gray-400 transition-all">
            {uploading === `${slide.id}-mobile` ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 size={24} className="text-gray-500 animate-spin" />
                <p className="text-[9px] font-bold text-gray-500 uppercase">Uploading...</p>
              </div>
            ) : slide.mobile ? (
              <>
                <img src={slide.mobile} className="w-full h-full object-cover" alt="Mobile Banner" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                  <p className="text-white font-black text-[10px] uppercase tracking-widest">Change Image</p>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <UploadCloud size={24} className="text-gray-300" />
                <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">Upload Mobile Banner</p>
                <p className="text-[8px] text-gray-200 font-bold">Recommended: 800×1000px</p>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleUpload(e, "mobile")}
              className="absolute inset-0 opacity-0 cursor-pointer"
              disabled={!!uploading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────
export default function AdminHomeSettingsTab() {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [uploadingBanner, setUploadingBanner] = useState<string | null>(null);

  // Categories
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [newCat, setNewCat] = useState({ name: "", bgColor: "#FFC0CB", file: null as File | null });
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Special Categories
  const [specialCategories, setSpecialCategories] = useState<SpecialCategory[]>([]);
  const [isAddingSpecial, setIsAddingSpecial] = useState(false);
  const [editingSpecial, setEditingSpecial] = useState<SpecialCategory | null>(null);
  const [newSpecial, setNewSpecial] = useState<Omit<SpecialCategory, "id">>({
    name: "",
    description: "",
    accentColor: "#111111",
    chatLink: "",
  });

  // Product Areas
  const [isAddingArea, setIsAddingArea] = useState(false);
  const [newArea, setNewArea] = useState<{
    title: string;
    subtitle: string;
    targetCategory: string;
    targetSubCategory: string;
    layoutType: LayoutType;
    bannerPcFile: File | null;
    bannerMobileFile: File | null;
  }>({
    title: "",
    subtitle: "",
    targetCategory: "",
    targetSubCategory: "",
    layoutType: "horizontal-scroll",
    bannerPcFile: null,
    bannerMobileFile: null,
  });
  const [uploadingNewAreaBanner, setUploadingNewAreaBanner] = useState(false);

  // Homepage config — now mainBanners is an array of BannerSlide
  const [config, setConfig] = useState({
    mainBanners: [] as BannerSlide[],
    productAreas: [] as ProductArea[],
  });

  // Section banner upload state — key = `${areaId}-pc` or `${areaId}-mobile`
  const [uploadingSectionBanner, setUploadingSectionBanner] = useState<string | null>(null);
  // Track which section is "expanded" for editing
  const [expandedAreaId, setExpandedAreaId] = useState<number | null>(null);

  // ✅ Real-time listener — "specialCategories" collection
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "specialCategories"), (snap) => {
      setSpecialCategories(
        snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name || "",
          description: d.data().description || "",
          accentColor: d.data().accentColor || "#111111",
          chatLink: d.data().chatLink || "",
        }))
      );
    });
    return () => unsub();
  }, []);

  // ✅ Real-time listener — "categories" collection
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "categories"), (snap) => {
      setCategories(
        snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name || "",
          img: d.data().img || "",
          bgColor: d.data().bgColor || "#f3f4f6",
          subCategories: d.data().subCategories || [],
        }))
      );
    });
    return () => unsub();
  }, []);

  // ✅ Fetch homepage settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "settings", "homepage");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();

          // Handle migration: old format { pc, mobile } → new array format
          let banners: BannerSlide[] = [];
          if (Array.isArray(data.mainBanners)) {
            // New format — already an array, normalise
            banners = data.mainBanners.map((b: any) => ({
              id: b.id || Date.now() + Math.random(),
              pc: b.pc || b.img || "",
              mobile: b.mobile || "",
            }));
          } else if (data.mainBanners && typeof data.mainBanners === "object") {
            // Old format migration
            banners = [{ id: Date.now(), pc: data.mainBanners.pc || "", mobile: data.mainBanners.mobile || "" }];
          }

          setConfig({
            mainBanners: banners,
            productAreas: data.productAreas || [],
          });
        }
      } catch (err) {
        console.error("Fetch Error:", err);
      } finally {
        setFetching(false);
      }
    };
    fetchSettings();
  }, []);

  const handleImgBBUpload = async (file: File): Promise<string | null> => {
    const API_KEY = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
    if (!API_KEY) { console.error("ImgBB API Key missing!"); return null; }
    const formData = new FormData();
    formData.append("image", file);
    try {
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${API_KEY}`, {
        method: "POST", body: formData,
      });
      const data = await response.json();
      return data.success ? data.data.url : null;
    } catch (error) {
      console.error("Upload Error:", error);
      return null;
    }
  };

  // ─── Banner Actions ───────────────────────────────────────────────
  const addBannerSlide = () => {
    if (config.mainBanners.length >= 5) {
      toast.error("Maximum 5 slides allowed!");
      return;
    }
    const newSlide: BannerSlide = { id: Date.now(), pc: "", mobile: "" };
    setConfig((prev) => ({ ...prev, mainBanners: [...prev.mainBanners, newSlide] }));
    toast.success("New slide added! Upload PC & Mobile images.");
  };

  const updateBannerSlide = (id: number, field: "pc" | "mobile", url: string) => {
    setConfig((prev) => ({
      ...prev,
      mainBanners: prev.mainBanners.map((b) => b.id === id ? { ...b, [field]: url } : b),
    }));
  };

  const deleteBannerSlide = (id: number) => {
    if (!confirm("Delete this slide?")) return;
    setConfig((prev) => ({ ...prev, mainBanners: prev.mainBanners.filter((b) => b.id !== id) }));
    toast.success("Slide deleted.");
  };

  const moveBannerSlide = (index: number, direction: "left" | "right") => {
    const arr = [...config.mainBanners];
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= arr.length) return;
    [arr[index], arr[targetIndex]] = [arr[targetIndex], arr[index]];
    setConfig((prev) => ({ ...prev, mainBanners: arr }));
  };

  // ─── Category Actions ─────────────────────────────────────────────
  const submitNewCategory = async () => {
    if (!newCat.name || !newCat.file) {
      toast.error("Name & Image required!");
      return;
    }
    setLoading(true);
    const url = await handleImgBBUpload(newCat.file);
    if (url) {
      try {
        await addDoc(collection(db, "categories"), {
          name: newCat.name.trim(),
          img: url,
          bgColor: newCat.bgColor || "#f3f4f6",
          subCategories: [],
        });
        setIsAddingCat(false);
        setNewCat({ name: "", bgColor: "#FFC0CB", file: null });
        toast.success("Category added! ✅");
      } catch (err) {
        toast.error("Failed to save category.");
      }
    }
    setLoading(false);
  };

  const handleSaveEditedCategory = async (updated: Category) => {
    try {
      await updateDoc(doc(db, "categories", updated.id), {
        name: updated.name,
        img: updated.img,
        bgColor: updated.bgColor,
        subCategories: updated.subCategories || [],
      });
      setEditingCategory(null);
      toast.success("Category updated ✅");
    } catch (err) {
      toast.error("Update failed.");
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!confirm("Delete this category?")) return;
    try {
      await deleteDoc(doc(db, "categories", catId));
      toast.success("Category deleted.");
    } catch (err) {
      toast.error("Delete failed.");
    }
  };

  // ─── Special Category Actions ─────────────────────────────────────
  const submitNewSpecialCategory = async () => {
    if (!newSpecial.name.trim()) { toast.error("Name is required!"); return; }
    setLoading(true);
    try {
      await addDoc(collection(db, "specialCategories"), { ...newSpecial, name: newSpecial.name.trim() });
      setIsAddingSpecial(false);
      setNewSpecial({ name: "", description: "", accentColor: "#111111", chatLink: "" });
      toast.success("Special category added ✅");
    } catch { toast.error("Failed to save."); }
    setLoading(false);
  };

  const handleSaveSpecialCategory = async (updated: SpecialCategory) => {
    try {
      await updateDoc(doc(db, "specialCategories", updated.id), {
        name: updated.name, description: updated.description,
        accentColor: updated.accentColor, chatLink: updated.chatLink,
      });
      setEditingSpecial(null);
      toast.success("Special category updated ✅");
    } catch { toast.error("Update failed."); }
  };

  const handleDeleteSpecialCategory = async (id: string) => {
    if (!confirm("Delete this special category?")) return;
    try {
      await deleteDoc(doc(db, "specialCategories", id));
      toast.success("Deleted.");
    } catch { toast.error("Delete failed."); }
  };

  const submitNewArea = async () => {
    if (!newArea.title || !newArea.targetCategory) {
      toast.error("Title and Category are required!");
      return;
    }
    setUploadingNewAreaBanner(true);

    let banner: SectionBanner | undefined;
    if (newArea.bannerPcFile || newArea.bannerMobileFile) {
      const [pcUrl, mobileUrl] = await Promise.all([
        newArea.bannerPcFile ? handleImgBBUpload(newArea.bannerPcFile) : Promise.resolve(null),
        newArea.bannerMobileFile ? handleImgBBUpload(newArea.bannerMobileFile) : Promise.resolve(null),
      ]);
      if (pcUrl || mobileUrl) {
        banner = { pc: pcUrl || "", mobile: mobileUrl || "" };
      }
    }

    const areaItem: ProductArea = {
      id: Date.now(),
      title: newArea.title,
      subtitle: newArea.subtitle,
      targetCategory: newArea.targetCategory,
      ...(newArea.targetSubCategory ? { targetSubCategory: newArea.targetSubCategory } : {}),
      layoutType: newArea.layoutType,
      ...(banner ? { banner } : {}),
    };

    setConfig((prev) => ({ ...prev, productAreas: [...prev.productAreas, areaItem] }));
    setIsAddingArea(false);
    setNewArea({
      title: "",
      subtitle: "",
      targetCategory: "",
      targetSubCategory: "",
      layoutType: "horizontal-scroll",
      bannerPcFile: null,
      bannerMobileFile: null,
    });
    setUploadingNewAreaBanner(false);
    toast.success("Product section added! ✅");
  };

  // ✅ Save to Firestore
  const saveAllToFirebase = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, "settings", "homepage"), {
        mainBanners: config.mainBanners,           // ← array of { id, pc, mobile }
        productAreas: config.productAreas,
        mainCategories: categories.map((c) => ({
          id: c.id,
          name: c.name,
          img: c.img,
          bgColor: c.bgColor,
          subCategories: c.subCategories,
        })),
      });
      toast.success("All settings saved ✅");
    } catch (error: any) {
      toast.error("Save failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching)
    return <div className="p-20 text-center text-[#111] font-bold animate-pulse">LOADING...</div>;

  return (
    <div className="p-6 space-y-12 max-w-6xl mx-auto pb-32">

      {/* Category Edit Modal */}
      {editingCategory && (
        <CategoryEditModal
          category={editingCategory}
          onSave={handleSaveEditedCategory}
          onClose={() => setEditingCategory(null)}
          handleImgBBUpload={handleImgBBUpload}
        />
      )}

      {/* ── HEADER ── */}
      <div className="flex justify-between items-center bg-white/90 backdrop-blur-md p-6 rounded-[2rem] shadow-xl border border-gray-100 sticky top-5 z-40">
        <div>
          <h1 className="font-black text-2xl text-gray-800">STORE DESIGNER</h1>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
            Layout & Section Manager
          </p>
        </div>
        <button
          onClick={saveAllToFirebase}
          disabled={loading}
          className="bg-[#111] text-white px-10 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-black transition-all shadow-lg  disabled:opacity-60"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          CONFIRM & SAVE ALL
        </button>
      </div>

      {/* ── 1. BANNER SLIDER SECTION ── */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-black text-lg text-gray-800 uppercase flex items-center gap-2">
              <ImageIcon size={20} className="text-[#111]" /> Hero Banner Slides
            </h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
              {config.mainBanners.length} / 5 slides · Each slide has a PC and Mobile version
            </p>
          </div>
          <button
            onClick={addBannerSlide}
            disabled={config.mainBanners.length >= 5}
            className="bg-[#111] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-black transition-all shadow-lg  disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={18} /> Add Slide
          </button>
        </div>

        {/* Slides */}
        {config.mainBanners.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-gray-200 rounded-[2.5rem] p-16 flex flex-col items-center justify-center gap-4">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
              <ImageIcon size={32} className="text-gray-400" />
            </div>
            <p className="font-black text-gray-300 uppercase tracking-widest text-sm">No slides yet</p>
            <p className="text-xs text-gray-300 font-bold">Click "Add Slide" to create your first banner</p>
          </div>
        ) : (
          <div className="space-y-4">
            {config.mainBanners.map((slide, index) => (
              <BannerSlideCard
                key={slide.id}
                slide={slide}
                index={index}
                total={config.mainBanners.length}
                onUpdate={updateBannerSlide}
                onDelete={deleteBannerSlide}
                onMoveLeft={(i) => moveBannerSlide(i, "left")}
                onMoveRight={(i) => moveBannerSlide(i, "right")}
                handleImgBBUpload={handleImgBBUpload}
                uploading={uploadingBanner}
                setUploading={setUploadingBanner}
              />
            ))}
          </div>
        )}

        {/* Live Preview */}
        {config.mainBanners.length > 0 && (
          <div className="bg-gray-50 rounded-[2rem] p-6 space-y-3">
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Live Preview Order</p>
            <div className="flex gap-3 flex-wrap">
              {config.mainBanners.map((slide, i) => (
                <div key={slide.id} className="flex items-center gap-2 bg-white border border-gray-100 rounded-2xl px-4 py-2 shadow-sm">
                  <div className="w-6 h-6 bg-[#111] rounded-full flex items-center justify-center text-white font-black text-[10px]">{i + 1}</div>
                  <div className="flex gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${slide.pc ? 'bg-green-400' : 'bg-gray-200'}`} title="PC" />
                    <div className={`w-2 h-2 rounded-full ${slide.mobile ? 'bg-blue-400' : 'bg-gray-200'}`} title="Mobile" />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-300 font-bold">
              🟢 PC uploaded · 🔵 Mobile uploaded · ⚪ Missing
            </p>
          </div>
        )}
      </section>

      {/* ── 2. CATEGORIES ── */}
      <section className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-black text-lg text-gray-800 uppercase">Categories</h2>
            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block animate-pulse" />
              Live sync with ProductsTab · {categories.length} categories
            </p>
          </div>
          <button
            onClick={() => setIsAddingCat(true)}
            className="bg-gray-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-[#111] transition-all"
          >
            <Plus size={18} /> Add Category
          </button>
        </div>

        {isAddingCat && (
          <div className="bg-gray-50/30 border-2 border-gray-100 p-8 rounded-[2.5rem] grid md:grid-cols-3 gap-8">
            <div className="space-y-2">
              <p className="text-[10px] font-black text-gray-500 uppercase">Icon Image</p>
              <input
                type="file"
                accept="image/*"
                className="w-full text-xs"
                onChange={(e) => setNewCat({ ...newCat, file: e.target.files![0] })}
              />
              {newCat.file && (
                <p className="text-[10px] text-gray-400 font-bold truncate">{newCat.file.name}</p>
              )}
            </div>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Category Name"
                className="w-full p-4 rounded-xl border-none shadow-sm font-bold outline-none focus:ring-2 focus:ring-gray-300"
                value={newCat.name}
                onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
              />
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  className="w-12 h-10 rounded-lg cursor-pointer"
                  value={newCat.bgColor}
                  onChange={(e) => setNewCat({ ...newCat, bgColor: e.target.value })}
                />
                <span className="text-[10px] font-bold text-gray-400 uppercase">Background Color</span>
              </div>
            </div>
            <div className="flex flex-col justify-end gap-2">
              <button
                onClick={submitNewCategory}
                disabled={loading}
                className="bg-[#111] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                ADD CATEGORY
              </button>
              <button onClick={() => setIsAddingCat(false)} className="text-gray-400 font-bold">
                CANCEL
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="border border-gray-100 rounded-[1.5rem] overflow-hidden relative group hover:shadow-lg hover:border-gray-200 transition-all duration-300"
            >
              {/* Square image — full bleed */}
              <div
                className="aspect-square w-full overflow-hidden"
                style={{ backgroundColor: cat.bgColor || "#f3f4f6" }}
              >
                {cat.img ? (
                  <img
                    src={cat.img}
                    className="w-full h-full object-cover"
                    alt={cat.name}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon size={24} className="text-gray-300" />
                  </div>
                )}
              </div>
              {/* Name strip */}
              <div className="px-3 py-2.5 bg-white">
                <span className="font-black text-[10px] uppercase text-gray-700 tracking-wide block truncate">
                  {cat.name}
                </span>
                {cat.subCategories?.length > 0 && (
                  <span className="text-[9px] text-gray-400 font-bold">
                    {cat.subCategories.length} sub{cat.subCategories.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {/* Hover overlay */}
              <div className="absolute inset-0 rounded-[1.5rem] bg-white/85 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                <button
                  onClick={() => setEditingCategory(cat)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 text-white rounded-xl font-black text-[9px] uppercase tracking-wide hover:bg-[#111] transition-all"
                >
                  <Edit3 size={12} /> Edit
                </button>
                <button
                  onClick={() => handleDeleteCategory(cat.id)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-500 rounded-xl font-black text-[9px] uppercase tracking-wide hover:bg-red-500 hover:text-white transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
          {categories.length === 0 && (
            <div className="col-span-4 text-center py-10">
              <p className="text-gray-300 font-black uppercase tracking-widest text-xs">
                No categories yet. Add one above!
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── 2b. SPECIAL CATEGORIES ── */}
      <section className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-black text-lg text-gray-800 uppercase flex items-center gap-2">
              <span className="text-2xl">✨</span> Special Categories
            </h2>
            <p className="text-[10px] font-bold text-[#111] uppercase tracking-widest mt-0.5">
              Products in these categories show "Chat with us" instead of Buy Now/Add to Cart
            </p>
          </div>
          <button
            onClick={() => setIsAddingSpecial(true)}
            className="bg-[#111] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-gray-900 transition-all"
          >
            <Plus size={18} /> Add Special
          </button>
        </div>

        {isAddingSpecial && (
          <div className="bg-gray-50/40 border-2 border-gray-100 p-8 rounded-[2.5rem] space-y-5">
            <p className="text-[10px] font-black text-[#111] uppercase tracking-widest">New Special Category</p>
            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase">Category Name</label>
                <input
                  type="text" placeholder="e.g. Custom Bouquets"
                  className="w-full p-4 rounded-xl border-none shadow-sm font-bold outline-none focus:ring-2 focus:ring-amber-300"
                  value={newSpecial.name}
                  onChange={(e) => setNewSpecial({ ...newSpecial, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase">Chat Banner Text — "Chat with us for ___?"</label>
                <input
                  type="text" placeholder="e.g. custom designs & pricing"
                  className="w-full p-4 rounded-xl border-none shadow-sm font-bold outline-none focus:ring-2 focus:ring-amber-300"
                  value={newSpecial.description}
                  onChange={(e) => setNewSpecial({ ...newSpecial, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase">WhatsApp / Chat Link</label>
                <input
                  type="text" placeholder="https://wa.me/94XXXXXXXXX"
                  className="w-full p-4 rounded-xl border-none shadow-sm font-bold outline-none focus:ring-2 focus:ring-amber-300"
                  value={newSpecial.chatLink}
                  onChange={(e) => setNewSpecial({ ...newSpecial, chatLink: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase">Accent Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color" value={newSpecial.accentColor}
                    onChange={(e) => setNewSpecial({ ...newSpecial, accentColor: e.target.value })}
                    className="w-14 h-12 rounded-xl cursor-pointer border-none outline-none"
                  />
                  <div className="flex gap-2">
                    {["#111111","#f59e0b","#8b5cf6","#06b6d4","#10b981","#1d4ed8"].map(c => (
                      <button key={c} type="button" onClick={() => setNewSpecial({...newSpecial, accentColor: c})}
                        className={`w-8 h-8 rounded-full transition-all hover:scale-110 ${newSpecial.accentColor===c?"ring-2 ring-offset-2 ring-gray-800 scale-110":""}`}
                        style={{backgroundColor: c}} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={submitNewSpecialCategory} disabled={loading}
                className="bg-[#111] text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-gray-700 transition-all disabled:opacity-60">
                {loading ? <Loader2 size={14} className="animate-spin"/> : <Plus size={14}/>} Create
              </button>
              <button onClick={() => setIsAddingSpecial(false)} className="px-8 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black text-xs uppercase">Cancel</button>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editingSpecial && (
          <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditingSpecial(null)}>
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 space-y-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="font-black text-xl text-gray-900 uppercase tracking-tight">Edit Special Category</h3>
                <button onClick={() => setEditingSpecial(null)} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200"><X size={18}/></button>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase">Name</label>
                  <input className="w-full px-5 py-3 rounded-2xl bg-gray-50 outline-none focus:ring-2 focus:ring-amber-300 font-black text-gray-800"
                    value={editingSpecial.name} onChange={e => setEditingSpecial({...editingSpecial, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase">Chat Banner Text</label>
                  <input className="w-full px-5 py-3 rounded-2xl bg-gray-50 outline-none focus:ring-2 focus:ring-amber-300 font-bold text-gray-800"
                    value={editingSpecial.description} onChange={e => setEditingSpecial({...editingSpecial, description: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase">Chat Link</label>
                  <input className="w-full px-5 py-3 rounded-2xl bg-gray-50 outline-none focus:ring-2 focus:ring-amber-300 font-bold text-gray-800"
                    value={editingSpecial.chatLink} onChange={e => setEditingSpecial({...editingSpecial, chatLink: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase">Accent Color</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={editingSpecial.accentColor}
                      onChange={e => setEditingSpecial({...editingSpecial, accentColor: e.target.value})}
                      className="w-14 h-12 rounded-xl cursor-pointer border-none outline-none" />
                    <div className="flex gap-2">
                      {["#111111","#f59e0b","#8b5cf6","#06b6d4","#10b981","#1d4ed8"].map(c => (
                        <button key={c} type="button" onClick={() => setEditingSpecial({...editingSpecial, accentColor: c})}
                          className={`w-8 h-8 rounded-full transition-all hover:scale-110 ${editingSpecial.accentColor===c?"ring-2 ring-offset-2 ring-gray-800 scale-110":""}`}
                          style={{backgroundColor: c}} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => handleSaveSpecialCategory(editingSpecial)}
                  className="flex-1 bg-[#111] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-700">
                  <Check size={16}/> Save
                </button>
                <button onClick={() => setEditingSpecial(null)} className="px-6 bg-gray-100 text-gray-500 rounded-2xl font-black text-xs uppercase">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {specialCategories.length === 0 && !isAddingSpecial ? (
          <div className="border-2 border-dashed border-gray-100 rounded-[2.5rem] p-12 text-center">
            <p className="text-2xl mb-2">✨</p>
            <p className="font-black text-gray-300 uppercase tracking-widest text-xs">No special categories yet.</p>
            <p className="text-xs text-gray-300 font-bold mt-1">Products in special categories show custom inquiry buttons instead of cart.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {specialCategories.map(sc => (
              <div key={sc.id} className="border border-gray-100 rounded-[2rem] p-5 flex items-center justify-between gap-4 hover:shadow-md transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shrink-0"
                    style={{backgroundColor: sc.accentColor}}>✨</div>
                  <div>
                    <p className="font-black text-sm text-gray-900 uppercase tracking-tight">{sc.name}</p>
                    <p className="text-[10px] text-gray-400 font-bold mt-0.5">Chat for: {sc.description || "—"}</p>
                    {sc.chatLink && <p className="text-[9px] text-blue-400 font-bold truncate max-w-[200px]">{sc.chatLink}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditingSpecial(sc)}
                    className="p-2 bg-gray-100 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-[#111] transition-all"><Edit3 size={14}/></button>
                  <button onClick={() => handleDeleteSpecialCategory(sc.id)}
                    className="p-2 bg-red-50 rounded-xl text-red-400 hover:bg-red-500 hover:text-white transition-all"><Trash2 size={14}/></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── 3. PRODUCT AREAS ── */}
      <section className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm space-y-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Layout className="text-[#111]" />
            <h2 className="font-black text-lg text-gray-800 uppercase tracking-tighter">
              Product Sections
            </h2>
          </div>
          <button
            onClick={() => setIsAddingArea(true)}
            className="bg-[#111] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-black transition-all shadow-lg "
          >
            <Plus size={18} /> New Section
          </button>
        </div>

        {/* ── ADD NEW AREA FORM ── */}
        {isAddingArea && (
          <div className="bg-gray-50 border-2 border-gray-100 p-8 rounded-[2.5rem] space-y-8">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Configure New Section</p>

            {/* Row 1: Title + Subtitle */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Section Title *</label>
                <input
                  type="text"
                  placeholder="e.g. New Arrivals"
                  className="w-full p-4 rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-gray-300 outline-none font-bold"
                  value={newArea.title}
                  onChange={(e) => setNewArea({ ...newArea, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Subtitle (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Fresh styles just dropped"
                  className="w-full p-4 rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-gray-300 outline-none"
                  value={newArea.subtitle}
                  onChange={(e) => setNewArea({ ...newArea, subtitle: e.target.value })}
                />
              </div>
            </div>

            {/* Row 2: Category + SubCategory + Layout */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Category *</label>
                <select
                  className="w-full p-4 rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-gray-300 outline-none font-bold appearance-none bg-white"
                  value={newArea.targetCategory}
                  onChange={(e) => setNewArea({ ...newArea, targetCategory: e.target.value, targetSubCategory: "" })}
                >
                  <option value="">-- Choose Category --</option>
                  <option value="__all__">✨ All Items</option>
                  <optgroup label="── Normal Categories ──">
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </optgroup>
                  {specialCategories.length > 0 && (
                    <optgroup label="── ✨ Special Categories ──">
                      {specialCategories.map((sc) => (
                        <option key={sc.id} value={`__special__${sc.id}`}>✨ {sc.name}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">
                  Sub Category <span className="text-gray-300 normal-case font-bold">(Optional)</span>
                </label>
                {newArea.targetCategory.startsWith("__special__") ? (
                  <div className="w-full p-4 rounded-2xl bg-gray-50 border-2 border-gray-100 text-[#111] font-bold text-xs flex items-center gap-2">
                    ✨ Special category — no sub-categories
                  </div>
                ) : newArea.targetCategory && newArea.targetCategory !== "__all__" ? (() => {
                  const selCat = categories.find(c => c.name === newArea.targetCategory);
                  const subs = selCat?.subCategories ?? [];
                  return subs.length > 0 ? (
                    <select
                      className="w-full p-4 rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-gray-300 outline-none font-bold appearance-none bg-white"
                      value={newArea.targetSubCategory}
                      onChange={(e) => setNewArea({ ...newArea, targetSubCategory: e.target.value })}
                    >
                      <option value="">-- All Sub-Categories --</option>
                      {subs.map((sub) => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full p-4 rounded-2xl bg-gray-100 text-gray-400 font-bold text-xs flex items-center gap-2">
                      <span>No sub-categories for this category</span>
                    </div>
                  );
                })() : (
                  <div className="w-full p-4 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 text-gray-300 font-bold text-xs flex items-center gap-2">
                    <span>Select a category first</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Loading Style *</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setNewArea({ ...newArea, layoutType: "horizontal-scroll" })}
                    className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-wide transition-all flex items-center justify-center gap-2 ${
                      newArea.layoutType === "horizontal-scroll"
                        ? "bg-[#111] text-white shadow-lg "
                        : "bg-white text-gray-500 border border-gray-200 hover:border-gray-200"
                    }`}
                  >
                    <ChevronRight size={16} /> Horizontal
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewArea({ ...newArea, layoutType: "vertical-infinite" })}
                    className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-wide transition-all flex items-center justify-center gap-2 ${
                      newArea.layoutType === "vertical-infinite"
                        ? "bg-[#111] text-white shadow-lg "
                        : "bg-white text-gray-500 border border-gray-200 hover:border-gray-200"
                    }`}
                  >
                    <List size={16} /> Vertical
                  </button>
                </div>
                <p className="text-[9px] font-bold text-gray-300 ml-2">
                  {newArea.layoutType === "horizontal-scroll"
                    ? "→ Products load in a horizontal swipe row"
                    : "↓ Products load in a vertical infinite-scroll grid"}
                </p>
              </div>
            </div>

            {/* Row 3: Optional Section Banner */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <ImageIcon size={14} className="text-gray-500" />
                <p className="text-[10px] font-black uppercase text-gray-400">Section Banner (Optional)</p>
                <span className="text-[9px] bg-gray-100 text-gray-400 font-bold rounded-full px-3 py-1">
                  Shown below the section title
                </span>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {/* PC Banner */}
                <div className="space-y-2">
                  <p className="text-[9px] font-black uppercase text-gray-400 flex items-center gap-1.5">
                    <Monitor size={11} className="text-gray-400" /> PC / Desktop
                  </p>
                  <label className="relative flex flex-col items-center justify-center aspect-[21/9] bg-white rounded-2xl border-2 border-dashed border-gray-200 hover:border-gray-400 transition-all cursor-pointer overflow-hidden">
                    {newArea.bannerPcFile ? (
                      <>
                        <img
                          src={URL.createObjectURL(newArea.bannerPcFile)}
                          className="w-full h-full object-cover"
                          alt="PC banner preview"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <p className="text-white font-black text-[10px] uppercase tracking-widest">Change</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <UploadCloud size={22} className="text-gray-300 mb-1" />
                        <p className="text-[9px] font-bold text-gray-300 uppercase">Upload PC Banner</p>
                        <p className="text-[8px] text-gray-200 font-bold">Recommended: 1440×400px</p>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setNewArea({ ...newArea, bannerPcFile: e.target.files?.[0] ?? null })}
                    />
                  </label>
                </div>
                {/* Mobile Banner */}
                <div className="space-y-2">
                  <p className="text-[9px] font-black uppercase text-gray-400 flex items-center gap-1.5">
                    <Smartphone size={11} className="text-gray-400" /> Mobile
                  </p>
                  <label className="relative flex flex-col items-center justify-center aspect-[21/9] bg-white rounded-2xl border-2 border-dashed border-gray-200 hover:border-gray-400 transition-all cursor-pointer overflow-hidden">
                    {newArea.bannerMobileFile ? (
                      <>
                        <img
                          src={URL.createObjectURL(newArea.bannerMobileFile)}
                          className="w-full h-full object-cover"
                          alt="Mobile banner preview"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <p className="text-white font-black text-[10px] uppercase tracking-widest">Change</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <UploadCloud size={22} className="text-gray-300 mb-1" />
                        <p className="text-[9px] font-bold text-gray-300 uppercase">Upload Mobile Banner</p>
                        <p className="text-[8px] text-gray-200 font-bold">Recommended: 800×300px</p>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setNewArea({ ...newArea, bannerMobileFile: e.target.files?.[0] ?? null })}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={submitNewArea}
                disabled={uploadingNewAreaBanner}
                className="flex-1 bg-[#111] text-white py-4 rounded-2xl font-black shadow-lg  flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-black transition-all"
              >
                {uploadingNewAreaBanner ? (
                  <><Loader2 size={16} className="animate-spin" /> Uploading...</>
                ) : (
                  <><Check size={16} /> CREATE SECTION</>
                )}
              </button>
              <button
                onClick={() => {
                  setIsAddingArea(false);
                 setNewArea({ 
  title: "", 
  subtitle: "", 
  targetCategory: "", 
  targetSubCategory: "",   // ← මේ line එක add කරන්න
  layoutType: "horizontal-scroll", 
  bannerPcFile: null, 
  bannerMobileFile: null 
});
                }}
                className="px-8 bg-white text-gray-400 rounded-2xl font-bold border border-gray-100 hover:bg-gray-50 transition-all"
              >
                CANCEL
              </button>
            </div>
          </div>
        )}

        {/* ── EXISTING SECTIONS LIST ── */}
        <div className="space-y-4">
          {config.productAreas.length === 0 && (
            <p className="text-center py-10 text-gray-300 font-bold uppercase tracking-widest text-xs">
              No product sections added yet. Click "New Section" to get started.
            </p>
          )}
          {config.productAreas.map((area, idx) => (
            <div
              key={area.id}
              className="border border-gray-100 rounded-[2rem] overflow-hidden hover:shadow-lg transition-all group"
            >
              {/* Section row header */}
              <div className="flex items-center justify-between bg-gray-50/50 p-6">
                <div className="flex items-center gap-4">
                  {/* Order number + up/down */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => {
                        if (idx === 0) return;
                        const arr = [...config.productAreas];
                        [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                        setConfig(prev => ({ ...prev, productAreas: arr }));
                      }}
                      disabled={idx === 0}
                      className="w-6 h-6 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-[#111] hover:text-white hover:border-[#111] transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                      title="Move up"
                    >
                      <ChevronLeft size={12} className="-rotate-90" />
                    </button>
                    <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-[#111] shadow-sm font-black text-sm border border-gray-100">
                      {idx + 1}
                    </div>
                    <button
                      onClick={() => {
                        if (idx === config.productAreas.length - 1) return;
                        const arr = [...config.productAreas];
                        [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
                        setConfig(prev => ({ ...prev, productAreas: arr }));
                      }}
                      disabled={idx === config.productAreas.length - 1}
                      className="w-6 h-6 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-[#111] hover:text-white hover:border-[#111] transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                      title="Move down"
                    >
                      <ChevronLeft size={12} className="rotate-90" />
                    </button>
                  </div>

                  <div>
                    <h3 className="font-black text-gray-800 uppercase tracking-tight">{area.title}</h3>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {area.targetCategory.startsWith("__special__") ? (
                        <span className="text-[9px] font-bold text-[#111] uppercase tracking-widest flex items-center gap-1">
                          ✨ {specialCategories.find(sc => `__special__${sc.id}` === area.targetCategory)?.name || "Special"}
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                          {area.targetCategory === "__all__"
                            ? "✨ All Items"
                            : area.targetSubCategory
                            ? `${area.targetCategory} › ${area.targetSubCategory}`
                            : area.targetCategory}
                        </span>
                      )}
                      <span className="w-1 h-1 rounded-full bg-gray-300" />
                      <span className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${
                        area.layoutType === "horizontal-scroll" ? "text-blue-400" : "text-emerald-400"
                      }`}>
                        {area.layoutType === "horizontal-scroll" ? <><ChevronRight size={10} /> Horizontal</> : <><List size={10} /> Vertical</>}
                      </span>
                      {area.banner?.pc && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-gray-300" />
                          <span className="text-[9px] font-bold text-purple-400 uppercase tracking-widest flex items-center gap-1">
                            <ImageIcon size={10} /> Banner
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setExpandedAreaId(expandedAreaId === area.id ? null : area.id)}
                    className="p-2.5 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-white transition-all border border-transparent hover:border-gray-100"
                    title="Edit banner"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() =>
                      setConfig((prev) => ({
                        ...prev,
                        productAreas: prev.productAreas.filter((a) => a.id !== area.id),
                      }))
                    }
                    className="p-2.5 text-gray-300 hover:text-red-500 transition-colors rounded-xl hover:bg-red-50 border border-transparent hover:border-red-100"
                    title="Delete section"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Expandable editor */}
              {expandedAreaId === area.id && (
                <div className="border-t border-gray-100 bg-white px-8 py-6 space-y-6">

                  {/* ── Layout Toggle ── */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Layout Style</p>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setConfig((prev) => ({
                            ...prev,
                            productAreas: prev.productAreas.map((a) =>
                              a.id === area.id ? { ...a, layoutType: "horizontal-scroll" } : a
                            ),
                          }))
                        }
                        className={`flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-wide transition-all flex items-center justify-center gap-2 ${
                          area.layoutType === "horizontal-scroll"
                            ? "bg-blue-500 text-white shadow-lg shadow-blue-100"
                            : "bg-gray-50 text-gray-400 border border-gray-200 hover:border-blue-200 hover:text-blue-400"
                        }`}
                      >
                        <ChevronRight size={15} /> Horizontal Scroll
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setConfig((prev) => ({
                            ...prev,
                            productAreas: prev.productAreas.map((a) =>
                              a.id === area.id ? { ...a, layoutType: "vertical-infinite" } : a
                            ),
                          }))
                        }
                        className={`flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-wide transition-all flex items-center justify-center gap-2 ${
                          area.layoutType === "vertical-infinite"
                            ? "bg-emerald-500 text-white shadow-lg shadow-emerald-100"
                            : "bg-gray-50 text-gray-400 border border-gray-200 hover:border-emerald-200 hover:text-emerald-400"
                        }`}
                      >
                        <List size={15} /> Vertical Infinite
                      </button>
                    </div>
                    <p className="text-[9px] font-bold text-gray-300 ml-1">
                      {area.layoutType === "horizontal-scroll"
                        ? "→ Products load in a horizontal swipe row"
                        : "↓ Products load in a vertical infinite-scroll grid"}
                    </p>
                  </div>

                  <div className="border-t border-gray-100" />

                  {/* ── Section Banner ── */}
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                    Section Banner — Optional · Shown below section title
                  </p>
                  <div className="grid md:grid-cols-2 gap-4">
                    {(["pc", "mobile"] as const).map((type) => (
                      <div key={type} className="space-y-2">
                        <p className="text-[9px] font-black uppercase text-gray-400 flex items-center gap-1.5">
                          {type === "pc" ? <Monitor size={11} className="text-gray-400" /> : <Smartphone size={11} className="text-gray-400" />}
                          {type === "pc" ? "PC / Desktop" : "Mobile"}
                        </p>
                        <div className="relative aspect-[21/9] bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden group/banner hover:border-gray-400 transition-all">
                          {uploadingSectionBanner === `${area.id}-${type}` ? (
                            <div className="flex flex-col items-center gap-2">
                              <Loader2 size={20} className="text-gray-500 animate-spin" />
                              <p className="text-[9px] font-bold text-gray-500 uppercase">Uploading...</p>
                            </div>
                          ) : area.banner?.[type] ? (
                            <>
                              <img src={area.banner[type]} className="w-full h-full object-cover" alt={`${type} banner`} />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/banner:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 rounded-2xl">
                                <p className="text-white font-black text-[10px] uppercase tracking-widest">Change Image</p>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setConfig((prev) => ({
                                      ...prev,
                                      productAreas: prev.productAreas.map((a) =>
                                        a.id === area.id
                                          ? { ...a, banner: { ...a.banner!, [type]: "" } }
                                          : a
                                      ),
                                    }))
                                  }
                                  className="px-3 py-1 bg-red-500 text-white rounded-lg font-black text-[9px] uppercase"
                                >
                                  Remove
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              <UploadCloud size={20} className="text-gray-300" />
                              <p className="text-[9px] font-bold text-gray-300 uppercase">Upload Banner</p>
                            </div>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            disabled={!!uploadingSectionBanner}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const key = `${area.id}-${type}`;
                              setUploadingSectionBanner(key);
                              const url = await handleImgBBUpload(file);
                              if (url) {
                                setConfig((prev) => ({
                                  ...prev,
                                  productAreas: prev.productAreas.map((a) =>
                                    a.id === area.id
                                      ? { ...a, banner: { pc: a.banner?.pc || "", mobile: a.banner?.mobile || "", [type]: url } }
                                      : a
                                  ),
                                }));
                                toast.success(`${type.toUpperCase()} banner uploaded!`);
                              } else {
                                toast.error("Upload failed!");
                              }
                              setUploadingSectionBanner(null);
                              e.target.value = "";
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}