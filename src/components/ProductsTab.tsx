"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { db } from "../lib/firebase";
import { 
  collection, addDoc, getDocs, query, orderBy, 
  serverTimestamp, updateDoc, doc, deleteDoc, onSnapshot, arrayUnion 
} from "firebase/firestore";
import { 
  Plus, X, Loader2, Save, Trash2, Image as ImageIcon, 
  PlusCircle, Truck, Tag, LayoutGrid, Sparkles, ChevronDown,
  Crop, Check, ZoomIn, ZoomOut, RotateCw
} from "lucide-react";

export default function FullProductManager() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [specialCategories, setSpecialCategories] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiHint, setAiHint] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Crop Modal States
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string>("");
  const [cropScale, setCropScale] = useState(1);
  const [cropRotation, setCropRotation] = useState(0);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [currentFileIdx, setCurrentFileIdx] = useState(0);
  const [previewImageIdx, setPreviewImageIdx] = useState(0);
  const [isPortraitCrop, setIsPortraitCrop] = useState(false); // ✅ 3:4 portrait mode for special products
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const cropImgRef = useRef<HTMLImageElement | null>(null);

  // Category UI States
  const [isAddingMain, setIsAddingMain] = useState(false);
  const [isAddingSub, setIsAddingSub] = useState(false);
  const [newMainCat, setNewMainCat] = useState("");
  const [newSubCat, setNewSubCat] = useState("");

  const initialFormState = {
    name: "",
    mainCategory: "",
    subCategory: "",
    specialCategory: "",
    originalPrice: "",
    discountedPrice: "",
    deliveryCharge: "450",
    stock: "" as string | number,
    description: "",
    images: [] as string[],
    variations: [] as { name: string, price: string, image: string }[],
    tags: [] as string[]
  };

  const [formData, setFormData] = useState(initialFormState);
  const IMGBB_API_KEY = "aae48d54e9745d63fef9053dba417c36";

  useEffect(() => { 
    fetchProducts();
    const unsub = onSnapshot(collection(db, "categories"), (snap) => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubSpecial = onSnapshot(collection(db, "specialCategories"), (snap) => {
      setSpecialCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsub(); unsubSpecial(); };
  }, []);

  const fetchProducts = async () => {
    try {
      const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) { console.error(error); }
  };

  // --- Crop Logic ---
  const CROP_W = 400;
  const CROP_H_SQUARE = 400;
  const CROP_H_PORTRAIT = 533; // 3:4 ratio (400 * 4/3)

  const drawCropPreview = useCallback(() => {
    const canvas = cropCanvasRef.current;
    const img = cropImgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cropH = isPortraitCrop ? CROP_H_PORTRAIT : CROP_H_SQUARE;
    canvas.width = CROP_W;
    canvas.height = cropH;

    ctx.clearRect(0, 0, CROP_W, cropH);
    ctx.save();
    ctx.translate(CROP_W / 2 + cropOffset.x, cropH / 2 + cropOffset.y);
    ctx.rotate((cropRotation * Math.PI) / 180);
    ctx.scale(cropScale, cropScale);

    const aspect = img.naturalWidth / img.naturalHeight;
    let drawW = CROP_W, drawH = cropH;
    if (aspect > CROP_W / cropH) { drawH = cropH; drawW = cropH * aspect; }
    else { drawW = CROP_W; drawH = CROP_W / aspect; }

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    // Border
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, CROP_W - 2, cropH - 2);

    // Rule of thirds
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 1;
    [1/3, 2/3].forEach(f => {
      ctx.beginPath(); ctx.moveTo(CROP_W * f, 0); ctx.lineTo(CROP_W * f, cropH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, cropH * f); ctx.lineTo(CROP_W, cropH * f); ctx.stroke();
    });

    // Portrait mode label
    if (isPortraitCrop) {
      ctx.fillStyle = "rgba(251,191,36,0.9)";
      ctx.roundRect(8, 8, 72, 22, 6);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px sans-serif";
      ctx.fillText("✨ 3:4 Mode", 14, 22);
    }
  }, [cropOffset, cropScale, cropRotation, isPortraitCrop]);

  useEffect(() => { if (cropModalOpen) drawCropPreview(); }, [cropModalOpen, cropOffset, cropScale, cropRotation, drawCropPreview]);

  const openCropForFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      setCropImageSrc(src);
      const img = new Image();
      img.onload = () => { cropImgRef.current = img; setCropScale(1); setCropOffset({ x: 0, y: 0 }); setCropRotation(0); };
      img.src = src;
      // ✅ Auto portrait mode if special category is selected
      setIsPortraitCrop(!!formData.specialCategory);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const getCroppedBlob = (): Promise<Blob> => {
    return new Promise((resolve) => {
      const sourceCanvas = cropCanvasRef.current!;
      // Export at 2x resolution for quality
      const exportW = CROP_W * 2;
      const exportH = (isPortraitCrop ? CROP_H_PORTRAIT : CROP_H_SQUARE) * 2;
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = exportW;
      exportCanvas.height = exportH;
      const ctx = exportCanvas.getContext("2d")!;
      ctx.drawImage(sourceCanvas, 0, 0, exportW, exportH);
      exportCanvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.92);
    });
  };

  const handleCropConfirm = async () => {
    setUploading(true);
    const blob = await getCroppedBlob();
    const file = new File([blob], "cropped.jpg", { type: "image/jpeg" });
    const url = await uploadToImgBB(file);
    if (url) setFormData(prev => ({ ...prev, images: [...prev.images, url] }));
    // Check if more files pending
    const nextIdx = currentFileIdx + 1;
    if (nextIdx < pendingFiles.length) {
      setCurrentFileIdx(nextIdx);
      openCropForFile(pendingFiles[nextIdx]);
    } else {
      setCropModalOpen(false); setPendingFiles([]); setCurrentFileIdx(0);
    }
    setUploading(false);
  };

  const handleCropSkip = async () => {
    // Upload original without cropping
    setUploading(true);
    const url = await uploadToImgBB(pendingFiles[currentFileIdx]);
    if (url) setFormData(prev => ({ ...prev, images: [...prev.images, url] }));
    const nextIdx = currentFileIdx + 1;
    if (nextIdx < pendingFiles.length) {
      setCurrentFileIdx(nextIdx);
      openCropForFile(pendingFiles[nextIdx]);
    } else {
      setCropModalOpen(false); setPendingFiles([]); setCurrentFileIdx(0);
    }
    setUploading(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - cropOffset.x, y: e.clientY - cropOffset.y });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setCropOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleMouseUp = () => setIsDragging(false);

  // --- Category Logic ---
  const handleAddMainCategory = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newMainCat.trim()) return;
    try {
      await addDoc(collection(db, "categories"), { name: newMainCat.trim(), subCategories: [] });
      setNewMainCat(""); setIsAddingMain(false);
    } catch (e) { console.error(e); }
  };

  const handleAddSubCategory = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newSubCat.trim() || !formData.mainCategory) return;
    const catDoc = categories.find(c => c.name === formData.mainCategory);
    if (catDoc) {
      try {
        await updateDoc(doc(db, "categories", catDoc.id), { subCategories: arrayUnion(newSubCat.trim()) });
        setNewSubCat(""); setIsAddingSub(false);
      } catch (e) { console.error(e); }
    }
  };

  // --- SEO Tags Logic ---
  const addTag = (e: React.MouseEvent) => {
    e.preventDefault();
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput("");
    }
  };

  // --- Gemini AI Logic ---
  const handlePowerUp = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (formData.images.length === 0) return alert("කරුණාකර Gallery එකට පින්තූරයක් upload කර ඉන්න!");
    setAiLoading(true);
    try {
      const availableCategories = categories.map(c => c.name);
      const allSubCategories = categories.flatMap(c => 
        (c.subCategories || []).map((s: string) => ({ sub: s, parent: c.name }))
      );
      const selectedSpecialCat = formData.specialCategory
        ? specialCategories.find((sc: any) => sc.id === formData.specialCategory)
        : null;

      const response = await fetch("/api/generate-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          imageUrl: formData.images[0],
          availableCategories,
          availableSubCategories: allSubCategories.map(s => s.sub),
          productTypeHint: aiHint.trim() || null,
          specialCategoryName: selectedSpecialCat?.name || null,
          specialCategoryDescription: selectedSpecialCat?.description || null,
        }),
      });
      const aiData = await response.json();
      if (aiData.name) {
        // Main category match
        const matchedCategory = categories.find(
          c => c.name.toLowerCase() === (aiData.mainCategory || aiData.category || "").toLowerCase()
        );

        // Sub category — matched main category eke subCategories list eke හොයනවා
        const subList: string[] = matchedCategory?.subCategories || [];
        const aiSub = (aiData.subCategory || "").toLowerCase();
        const matchedSub = subList.find(
          (s: string) => s.toLowerCase() === aiSub
        ) || subList.find(
          // exact match නැත්නම් partial match try කරනවා
          (s: string) => s.toLowerCase().includes(aiSub) || aiSub.includes(s.toLowerCase())
        ) || "";

        setFormData(prev => ({ 
          ...prev, 
          name: aiData.name, 
          description: aiData.description,
          tags: aiData.tags || prev.tags,
          mainCategory: matchedCategory ? matchedCategory.name : prev.mainCategory,
          subCategory: matchedSub,
        }));
      }
    } catch (error) { console.error(error); }
    finally { setAiLoading(false); }
  };

  const uploadToImgBB = async (file: File) => {
    const form = new FormData();
    form.append("image", file);
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: form });
    const data = await res.json();
    return data.success ? data.data.url : null;
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.discountedPrice) return alert("අනේ බ්‍රෝ නමයි ගණනයි දාන්නකෝ!");
    setLoading(true);
    try {
      const payload = { 
        ...formData, 
        originalPrice: Number(formData.originalPrice), 
        discountedPrice: Number(formData.discountedPrice),
        deliveryCharge: Number(formData.deliveryCharge),
        stock: formData.stock === "" ? null : Number(formData.stock),
        updatedAt: serverTimestamp() 
      };
      if (editingId) { await updateDoc(doc(db, "products", editingId), payload); }
      else { await addDoc(collection(db, "products"), { ...payload, createdAt: serverTimestamp() }); }
      setIsModalOpen(false); setFormData(initialFormState); setAiHint(""); fetchProducts();
    } catch (e) { console.error(e); }
    setLoading(false);
  };


  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "products", deleteTarget.id));
      setProducts(prev => prev.filter(p => p.id !== deleteTarget.id));
      if (editingId === deleteTarget.id) {
        setIsModalOpen(false);
        setEditingId(null);
        setFormData(initialFormState);
      }
      setDeleteTarget(null);
    } catch (e) { console.error(e); }
    setDeleting(false);
  };

  return (
    <div className="p-10 bg-gray-50 min-h-screen font-sans text-slate-900">

      {/* ── Delete Confirm Modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 space-y-6 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
                <Trash2 size={28} className="text-red-500" />
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-lg uppercase tracking-tight">Delete Product?</h3>
                <p className="text-sm text-gray-400 font-bold mt-1">
                  &quot;<span className="text-gray-700">{deleteTarget.name}</span>&quot; permanently removed වෙයි.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-600 font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all">
                Cancel
              </button>
              <button onClick={handleDeleteConfirmed} disabled={deleting} className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-black text-gray-800">Store Inventory 📦</h1>
        <button type="button" onClick={() => { setEditingId(null); setFormData(initialFormState); setIsModalOpen(true); }} className="bg-[#c12a52] text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 shadow-lg hover:scale-105 transition-transform">
          <Plus /> Add New Product
        </button>
      </div>

      {/* Product List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map(p => {
          const stock = p.stock;
          const isSoldOut = stock !== null && stock !== undefined && stock === 0;
          const isLowStock = stock !== null && stock !== undefined && stock > 0 && stock <= 5;
          const hasStock = stock !== null && stock !== undefined;

          return (
            <div key={p.id} className={`bg-white p-6 rounded-[2rem] border shadow-sm flex items-center gap-4 transition-all ${isSoldOut ? 'border-red-100 bg-red-50/30' : isLowStock ? 'border-amber-100' : 'border-gray-100'}`}>
              <div className="relative shrink-0">
                <img src={p.images?.[0]} className={`w-20 h-20 rounded-2xl object-cover bg-gray-100 ${isSoldOut ? 'grayscale' : ''}`} />
                {isSoldOut && (
                  <div className="absolute inset-0 bg-gray-900/60 rounded-2xl flex items-center justify-center">
                    <span className="text-white text-[8px] font-black uppercase">Sold Out</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-gray-800 uppercase text-xs tracking-wider line-clamp-1">{p.name}</p>
                <p className="text-[#c12a52] font-bold">LKR {p.discountedPrice}</p>
                
                {/* Stock Badge */}
                {hasStock ? (
                  <div className={`inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wide ${
                    isSoldOut 
                      ? 'bg-red-100 text-red-600' 
                      : isLowStock 
                        ? 'bg-amber-100 text-amber-700 animate-pulse' 
                        : 'bg-green-100 text-green-700'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isSoldOut ? 'bg-red-500' : isLowStock ? 'bg-amber-500' : 'bg-green-500'}`}/>
                    {isSoldOut ? 'Sold Out' : isLowStock ? `Low — ${stock} left` : `${stock} in stock`}
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wide bg-gray-100 text-gray-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300"/>
                    No stock set
                  </div>
                )}

                <div className="flex items-center gap-3 mt-2">
                  <button type="button" onClick={() => { setEditingId(p.id); setFormData({...initialFormState, ...p, stock: p.stock ?? ""}); setIsModalOpen(true); }} className="text-[10px] font-black uppercase text-gray-400 hover:text-rose-500 transition-colors">
                    Edit Details
                  </button>
                  <span className="text-gray-200">|</span>
                  <button type="button" onClick={() => setDeleteTarget({ id: p.id, name: p.name })} className="text-[10px] font-black uppercase text-gray-300 hover:text-red-500 transition-colors flex items-center gap-1">
                    <Trash2 size={10} /> Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-6xl h-[92vh] rounded-[3rem] shadow-2xl overflow-hidden flex animate-in zoom-in-95 duration-300">
            
            {/* Sidebar (Gallery & SEO Tags) */}
            <div className="w-80 bg-[#12141d] p-8 overflow-y-auto text-white">
               <p className="text-[10px] font-black uppercase mb-6 flex items-center gap-2 tracking-widest"><ImageIcon size={14}/> Main Gallery</p>
               
               {/* Large Preview */}
               {formData.images.length > 0 && (
                 <div className="mb-4">
                   <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-white/5 border border-white/10">
                     <img 
                       src={formData.images[previewImageIdx] || formData.images[0]} 
                       className="w-full h-full object-cover"
                       alt="Preview"
                     />
                     <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[9px] font-black px-2 py-1 rounded-full">
                       {previewImageIdx + 1} / {formData.images.length}
                     </div>
                   </div>
                   <p className="text-[9px] text-white/30 font-bold mt-2 text-center tracking-widest uppercase">Click thumbnail to preview</p>
                 </div>
               )}

               <div className="grid grid-cols-3 gap-2 mb-10">
                {formData.images.map((img, i) => (
                  <div 
                    key={i} 
                    className={`relative aspect-square cursor-pointer group`}
                    onClick={() => setPreviewImageIdx(i)}
                  >
                    <img src={img} className={`w-full h-full object-cover rounded-xl transition-all ${previewImageIdx === i ? 'ring-2 ring-rose-400 ring-offset-1 ring-offset-[#12141d]' : 'opacity-70 hover:opacity-100'}`} />
                    <button 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); setFormData({...formData, images: formData.images.filter((_, idx) => idx !== i)}); if (previewImageIdx >= formData.images.length - 1) setPreviewImageIdx(Math.max(0, previewImageIdx - 1)); }} 
                      className="absolute -top-1 -right-1 bg-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                      <X size={8}/>
                    </button>
                    {i === 0 && (
                      <span className="absolute bottom-1 left-1 bg-rose-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full">MAIN</span>
                    )}
                  </div>
                ))}
                <label className="aspect-square border-2 border-dashed border-white/20 rounded-xl flex items-center justify-center cursor-pointer hover:border-rose-400 transition-colors group">
                  {uploading ? <Loader2 className="animate-spin" /> : (
                    <div className="flex flex-col items-center gap-1">
                      <Plus className="group-hover:text-rose-400 transition-colors" size={20}/>
                      <span className="text-[8px] font-black uppercase text-white/40 group-hover:text-rose-400 tracking-widest">+ Crop</span>
                    </div>
                  )}
                  <input type="file" multiple accept="image/*" className="hidden" onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    if (!files.length) return;
                    if (files.length === 1) {
                      setPendingFiles(files); setCurrentFileIdx(0); openCropForFile(files[0]);
                    } else {
                      setPendingFiles(files); setCurrentFileIdx(0); openCropForFile(files[0]);
                    }
                    e.target.value = "";
                  }} />
                </label>
              </div>

              {/* ✨ SEO TAGS SECTION */}
              <p className="text-[10px] font-black uppercase mb-4 flex items-center gap-2 tracking-widest text-rose-400"><Tag size={14}/> Search Tags</p>
              <div className="flex gap-2 mb-4">
                <input 
                  value={tagInput} 
                  onChange={e => setTagInput(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && addTag(e as any)} 
                  placeholder="Add SEO tag..." 
                  className="bg-white/10 text-white text-xs p-3 rounded-lg outline-none w-full focus:bg-white/20" 
                />
                <button type="button" onClick={addTag} className="bg-rose-500 text-white p-3 rounded-lg hover:bg-rose-600 transition-colors">
                  <Plus size={16}/>
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((t, i) => (
                  <span key={i} className="bg-white/10 text-white/70 text-[10px] px-3 py-1 rounded-full flex items-center gap-2 border border-white/5">
                    {t} <X size={10} className="cursor-pointer hover:text-white" onClick={() => setFormData({...formData, tags: formData.tags.filter((_, idx) => idx !== i)})} />
                  </span>
                ))}
              </div>
            </div>

            {/* Main Form Content */}
            <div className="flex-1 p-12 overflow-y-auto relative">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">{editingId ? "Edit Listing" : "Create Listing"}</h2>
                <button type="button" onClick={() => setIsModalOpen(false)}><X size={30} className="text-gray-300"/></button>
              </div>

              <div className="space-y-8">
                {/* AI Generator Button */}
                <div className="bg-gradient-to-br from-[#c12a52]/5 to-rose-50 p-6 rounded-[2.5rem] border border-rose-100 shadow-sm space-y-4">
                  {formData.specialCategory && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-2">
                        <Sparkles size={11} className="text-amber-400"/> AI ට කියන්න — මොකක්ද මේ product?
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={aiHint}
                          onChange={e => setAiHint(e.target.value)}
                          placeholder="e.g. frock, saree, blouse, midi dress..."
                          className="flex-1 px-5 py-3 rounded-2xl bg-white border-2 border-amber-200 outline-none focus:border-amber-400 font-bold text-gray-800 text-sm placeholder:text-gray-300 transition-all"
                        />
                        {aiHint && (
                          <button type="button" onClick={() => setAiHint("")}
                            className="w-11 h-11 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 hover:bg-gray-200 transition-all">
                            <X size={14}/>
                          </button>
                        )}
                      </div>
                      <p className="text-[9px] text-amber-500 font-bold ml-1">✨ AI ට hint දීලා accurate description generate කරවනවා</p>
                    </div>
                  )}
                  <button type="button" onClick={handlePowerUp} disabled={aiLoading || formData.images.length === 0} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl disabled:opacity-50">
                    {aiLoading ? <><Loader2 size={16} className="animate-spin"/> Gemini is thinking...</> : <><Sparkles size={16}/> AI POWER UP</>}
                  </button>
                  {formData.mainCategory && !aiLoading && (
                    <div className="flex items-center gap-2 text-[10px] font-black text-rose-500 uppercase tracking-widest">
                      <Sparkles size={10} />
                      AI selected: <span className="bg-rose-100 px-2 py-0.5 rounded-full">{formData.mainCategory}</span>
                    </div>
                  )}
                </div>

                {/* Category Selection */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase mb-2 flex justify-between items-center">
                      Main Category 
                      <PlusCircle size={16} className="cursor-pointer text-[#c12a52]" onClick={() => setIsAddingMain(!isAddingMain)}/>
                    </label>
                    {isAddingMain ? (
                      <div className="flex gap-2">
                        <input value={newMainCat} onChange={e => setNewMainCat(e.target.value)} placeholder="New Category" className="flex-1 p-4 bg-gray-50 rounded-2xl font-bold outline-none border-2 border-[#c12a52]/20 focus:border-[#c12a52]" />
                        <button type="button" onClick={handleAddMainCategory} className="bg-[#c12a52] text-white px-4 rounded-2xl"><Plus/></button>
                      </div>
                    ) : (
                      <select value={formData.mainCategory} onChange={e => setFormData({...formData, mainCategory: e.target.value, subCategory: ""})} className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none appearance-none cursor-pointer">
                        <option value="">Select Category</option>
                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase mb-2 flex justify-between items-center">
                      Sub Category 
                      <PlusCircle size={16} className={`cursor-pointer ${formData.mainCategory ? 'text-[#c12a52]' : 'text-gray-200 cursor-not-allowed'}`} onClick={() => formData.mainCategory && setIsAddingSub(!isAddingSub)}/>
                    </label>
                    {isAddingSub ? (
                      <div className="flex gap-2">
                        <input value={newSubCat} onChange={e => setNewSubCat(e.target.value)} placeholder="New Sub Name" className="flex-1 p-4 bg-gray-100 rounded-2xl font-bold outline-none border-2 border-[#c12a52]/20 focus:border-[#c12a52]" />
                        <button type="button" onClick={handleAddSubCategory} className="bg-[#c12a52] text-white px-4 rounded-2xl"><Plus/></button>
                      </div>
                    ) : (
                      <select disabled={!formData.mainCategory} value={formData.subCategory} onChange={e => setFormData({...formData, subCategory: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none appearance-none cursor-pointer disabled:opacity-40">
                        <option value="">{formData.mainCategory ? "Select Sub Category" : "Select Main First"}</option>
                        {categories.find(c => c.name === formData.mainCategory)?.subCategories?.map((s: string) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    )}
                  </div>
                </div>

                {/* ✅ SPECIAL CATEGORY SELECTOR */}
                {specialCategories.length > 0 && (
                  <div className="bg-amber-50 border-2 border-amber-100 p-6 rounded-[2.5rem] space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-2">
                        ✨ Special Category
                      </p>
                      {formData.specialCategory && (
                        <button type="button" onClick={() => setFormData({ ...formData, specialCategory: "" })}
                          className="text-[9px] font-black uppercase text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1">
                          <X size={11} /> Clear
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button type="button" onClick={() => setFormData({ ...formData, specialCategory: "" })}
                        className={`px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-wide transition-all border-2 ${
                          !formData.specialCategory ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-400 border-gray-200 hover:border-gray-400"
                        }`}>
                        None (Normal)
                      </button>
                      {specialCategories.map((sc: any) => (
                        <button key={sc.id} type="button" onClick={() => setFormData({ ...formData, specialCategory: sc.id })}
                          className={`px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-wide transition-all border-2 flex items-center gap-2 ${
                            formData.specialCategory === sc.id ? "text-white border-transparent shadow-lg scale-105" : "bg-white text-gray-600 border-gray-200 hover:scale-105"
                          }`}
                          style={formData.specialCategory === sc.id ? { backgroundColor: sc.accentColor || "#f59e0b", borderColor: sc.accentColor || "#f59e0b" } : {}}>
                          ✨ {sc.name}
                        </button>
                      ))}
                    </div>
                    {formData.specialCategory && (
                      <p className="text-[9px] text-amber-500 font-bold">✨ This product will show "Chat with us" instead of Add to Cart</p>
                    )}
                  </div>
                )}

                {/* Name & Pricing */}
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Product Name</label>
                  <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none border border-transparent focus:border-rose-200" />
                </div>

                <div className="grid grid-cols-3 gap-6 bg-gray-50 p-6 rounded-[2.5rem]">
                   <div><label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Original Price</label><input type="number" value={formData.originalPrice} onChange={e => setFormData({...formData, originalPrice: e.target.value})} className="w-full bg-white p-4 rounded-xl font-bold outline-none text-gray-400 line-through" /></div>
                   <div><label className="text-[10px] font-black text-rose-500 uppercase mb-2 block">Sale Price</label><input type="number" value={formData.discountedPrice} onChange={e => setFormData({...formData, discountedPrice: e.target.value})} className="w-full bg-white p-4 rounded-xl font-black outline-none text-rose-600" /></div>
                   <div><label className="text-[10px] font-black text-blue-500 uppercase mb-2 block flex items-center gap-1"><Truck size={12}/> Delivery</label><input type="number" value={formData.deliveryCharge} onChange={e => setFormData({...formData, deliveryCharge: e.target.value})} className="w-full bg-white p-4 rounded-xl font-black outline-none text-blue-600" /></div>
                </div>

                {/* Stock Management */}
                <div className={`p-6 rounded-[2.5rem] border-2 transition-all ${
                  formData.stock === 0 || formData.stock === "0"
                    ? "bg-red-50 border-red-200"
                    : (Number(formData.stock) > 0 && Number(formData.stock) <= 5)
                      ? "bg-amber-50 border-amber-200"
                      : "bg-gray-50 border-gray-100"
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-2">
                        📦 Stock / Inventory
                      </p>
                      <p className="text-[9px] text-gray-400 font-bold mt-0.5">
                        Order dispatch වෙද්දී automatically deduct වෙනවා
                      </p>
                    </div>
                    {/* Live stock status badge */}
                    {formData.stock !== "" && formData.stock !== null && (
                      <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        Number(formData.stock) === 0
                          ? "bg-red-500 text-white"
                          : Number(formData.stock) <= 5
                            ? "bg-amber-500 text-white"
                            : "bg-green-500 text-white"
                      }`}>
                        {Number(formData.stock) === 0 
                          ? "😢 Sold Out" 
                          : Number(formData.stock) <= 5 
                            ? `⚠️ Low — ${formData.stock} left` 
                            : `✅ ${formData.stock} in stock`}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      min="0"
                      value={formData.stock}
                      onChange={e => setFormData({...formData, stock: e.target.value === "" ? "" : Number(e.target.value)})}
                      placeholder="e.g. 50"
                      className={`flex-1 bg-white p-4 rounded-2xl font-black text-2xl outline-none border-2 transition-all focus:border-rose-300 ${
                        Number(formData.stock) === 0 && formData.stock !== ""
                          ? "text-red-500 border-red-200"
                          : Number(formData.stock) <= 5 && formData.stock !== ""
                            ? "text-amber-600 border-amber-200"
                            : "text-gray-700 border-transparent"
                      }`}
                    />
                    {/* Quick set buttons */}
                    <div className="flex flex-col gap-2">
                      {[10, 25, 50, 100].map(n => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setFormData({...formData, stock: n})}
                          className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all hover:scale-105 ${
                            formData.stock === n
                              ? "bg-[#c12a52] text-white shadow-lg shadow-rose-200"
                              : "bg-white text-gray-500 hover:bg-gray-100"
                          }`}
                        >
                          +{n}
                        </button>
                      ))}
                    </div>
                  </div>
                  {formData.stock === "" && (
                    <p className="text-[9px] text-gray-400 font-bold mt-3 text-center">
                      Stock field blank දාගත්තොත් tracking නෑ — ProductCard sold out show කරන්නේ නෑ
                    </p>
                  )}
                </div>

                {/* Variations */}
                <div className="bg-gray-50/50 p-8 rounded-[2.5rem] border border-gray-100">
                  <div className="flex justify-between items-center mb-6">
                    <p className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-2"><LayoutGrid size={14}/> Variations (Size/Color)</p>
                    <button type="button" onClick={() => setFormData({...formData, variations: [...formData.variations, { name: "", price: formData.discountedPrice, image: "" }]})} className="text-rose-500 font-black text-[10px] flex items-center gap-1 hover:underline">
                      <PlusCircle size={14}/> Add Variation
                    </button>
                  </div>
                  {formData.variations.map((v, i) => (
                    <div key={i} className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm mb-3">
                      <input placeholder="Ex: XL or Red" value={v.name} onChange={(e) => { const n = [...formData.variations]; n[i].name = e.target.value; setFormData({...formData, variations: n}); }} className="flex-1 font-bold outline-none" />
                      <input type="number" value={v.price} onChange={(e) => { const n = [...formData.variations]; n[i].price = e.target.value; setFormData({...formData, variations: n}); }} className="w-28 font-black text-[#c12a52] outline-none" />
                      <button type="button" onClick={() => setFormData({...formData, variations: formData.variations.filter((_, idx) => idx !== i)})}><Trash2 size={16} className="text-gray-300 hover:text-red-500"/></button>
                    </div>
                  ))}
                </div>

                {/* Description */}
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Description</label>
                  <textarea rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-6 bg-gray-50 rounded-[2rem] outline-none font-medium text-sm text-gray-600 border border-transparent focus:border-rose-100" placeholder="AI will help write details..."/>
                </div>

                {/* Final Actions */}
                <div className="flex justify-between items-center pt-8 border-t border-gray-100">
                  {editingId ? (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget({ id: editingId, name: formData.name })}
                      className="text-red-400 hover:text-red-600 font-black text-[10px] uppercase flex items-center gap-2 transition-colors"
                    >
                      <Trash2 size={16} /> Delete Product
                    </button>
                  ) : <div />}
                  <div className="flex gap-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-4 font-black uppercase text-[10px] text-gray-400">Cancel</button>
                    <button type="button" onClick={handleSave} disabled={loading || uploading} className="bg-[#c12a52] px-12 py-4 rounded-full font-black text-white uppercase text-[10px] shadow-xl hover:scale-105 transition-all flex items-center gap-2">
                      {loading ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Save & Publish
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ✂️ Crop Modal */}
      {cropModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-[#12141d] rounded-[2.5rem] shadow-2xl p-8 max-w-lg w-full animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-white font-black text-lg uppercase tracking-tight flex items-center gap-2">
                  <Crop size={18} className="text-rose-400"/> Crop Image
                </h3>
                {pendingFiles.length > 1 && (
                  <p className="text-white/40 text-[10px] font-bold mt-0.5">
                    Image {currentFileIdx + 1} of {pendingFiles.length}
                  </p>
                )}
              </div>
              <button type="button" onClick={() => { setCropModalOpen(false); setPendingFiles([]); }} className="text-white/40 hover:text-white">
                <X size={24}/>
              </button>
            </div>

            {/* ✅ Ratio Toggle */}
            <div className="flex gap-2 mb-5">
              <button
                type="button"
                onClick={() => setIsPortraitCrop(false)}
                className={`flex-1 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                  !isPortraitCrop
                    ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30"
                    : "bg-white/10 text-white/40 hover:bg-white/15"
                }`}
              >
                <span className="text-base leading-none">⬛</span> 1:1 Square
              </button>
              <button
                type="button"
                onClick={() => setIsPortraitCrop(true)}
                className={`flex-1 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                  isPortraitCrop
                    ? "bg-amber-400 text-white shadow-lg shadow-amber-400/30"
                    : "bg-white/10 text-white/40 hover:bg-white/15"
                }`}
              >
                <span className="text-base leading-none">✨</span> 3:4 Special
              </button>
            </div>

            {/* Canvas */}
            <div
              className="relative overflow-hidden rounded-2xl bg-black/50 mb-4 flex items-center justify-center"
              style={{ width: "100%", aspectRatio: isPortraitCrop ? "3/4" : "1/1" }}
            >
              <canvas
                ref={cropCanvasRef}
                width={400}
                height={isPortraitCrop ? 533 : 400}
                style={{ width: "100%", height: "100%", cursor: isDragging ? "grabbing" : "grab" }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
              <p className="absolute bottom-2 left-0 right-0 text-center text-white/30 text-[9px] font-black uppercase tracking-widest pointer-events-none">
                Drag to reposition
              </p>
            </div>

            {/* Controls */}
            <div className="space-y-4 mb-6">
              {/* Zoom */}
              <div className="flex items-center gap-3">
                <ZoomOut size={14} className="text-white/40 shrink-0"/>
                <input
                  type="range" min="0.5" max="3" step="0.05"
                  value={cropScale}
                  onChange={e => setCropScale(parseFloat(e.target.value))}
                  className="flex-1 accent-rose-500"
                />
                <ZoomIn size={14} className="text-white/40 shrink-0"/>
                <span className="text-white/50 text-[10px] font-black w-10 text-right">{Math.round(cropScale * 100)}%</span>
              </div>
              {/* Rotation */}
              <div className="flex items-center gap-3">
                <RotateCw size={14} className="text-white/40 shrink-0"/>
                <input
                  type="range" min="-180" max="180" step="1"
                  value={cropRotation}
                  onChange={e => setCropRotation(parseInt(e.target.value))}
                  className="flex-1 accent-rose-500"
                />
                <span className="text-white/50 text-[10px] font-black w-10 text-right">{cropRotation}°</span>
                <button type="button" onClick={() => setCropRotation(0)} className="text-white/30 hover:text-white text-[9px] font-black uppercase">Reset</button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCropSkip}
                disabled={uploading}
                className="flex-1 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white/50 border border-white/10 hover:border-white/20 transition-colors disabled:opacity-40"
              >
                Skip Crop
              </button>
              <button
                type="button"
                onClick={handleCropConfirm}
                disabled={uploading}
                className="flex-1 py-3.5 bg-rose-500 hover:bg-rose-600 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-40 shadow-lg shadow-rose-500/30"
              >
                {uploading ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>}
                {uploading ? "Uploading..." : "Confirm Crop"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}