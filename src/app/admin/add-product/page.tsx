"use client";
import React, { useState, useEffect } from "react";
import { db } from "../../../lib/firebase";
import { 
  collection, addDoc, getDocs, query, orderBy, 
  serverTimestamp, updateDoc, doc, deleteDoc 
} from "firebase/firestore";
import { 
  Plus, Search, X, Loader2, Save, Trash2, Package, Image as ImageIcon, PlusCircle, Truck
} from "lucide-react";
import AdminOrdersTab from "../../../components/AdminOrdersTab";
import AdminHomeSettingsTab from "../../../components/AdminHomeSettingsTab";
import { toast } from "react-hot-toast";


export default function AdminDashboard() {
  const [products, setProducts] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  

  const initialFormState = {
    name: "",
    mainCategory: "Clothes",
    subCategory: "",
    originalPrice: "",
    discountedPrice: "",
    deliveryCharge: "450", // මචං මෙතනින් Default Delivery Charge එක වෙනස් කරන්න පුළුවන්
    description: "",
    images: [] as string[],
    variations: [] as { name: string, price: string, image: string }[],
  };

  const [formData, setFormData] = useState(initialFormState);
  const IMGBB_API_KEY = process.env.NEXT_PUBLIC_IMGBB_API_KEY || "";

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    try {
      const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) { console.error(error); }
  };

  const uploadToImgBB = async (file: File) => {
    const form = new FormData();
    form.append("image", file);
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: form });
    const data = await res.json();
    return data.success ? data.data.url : null;
  };

  const handleMainImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploading(true);
    const newUrls = [...(formData.images || [])];
    for (let i = 0; i < files.length; i++) {
      const url = await uploadToImgBB(files[i]);
      if (url) newUrls.push(url);
    }
    setFormData({ ...formData, images: newUrls });
    setUploading(false);
  };

  const handleVariationImageUpload = async (index: number, file: File) => {
    setUploading(true);
    const url = await uploadToImgBB(file);
    if (url) {
      const newVars = [...(formData.variations || [])];
      newVars[index].image = url;
      setFormData({ ...formData, variations: newVars });
    }
    setUploading(false);
  };

 const handleSave = async () => {
  if (!formData.name || !formData.discountedPrice) {
    toast.error("Name and Sale Price required!");
    return;
  }
  setLoading(true);

const payload = {
  ...formData,
  originalPrice: Number(formData.originalPrice) || 0,
  discountedPrice: Number(formData.discountedPrice) || 0,
  deliveryCharge: Number(formData.deliveryCharge) || 0,
  price: Number(formData.discountedPrice) || 0,

  variations: (formData.variations || []).map(v => ({
    ...v,
    price: Number(v.price) || 0 
  })),
  updatedAt: serverTimestamp(),
};

  try {
    if (editingId) {
      await updateDoc(doc(db, "products", editingId), payload);
      toast.success("Product updated! ✅");
    } else {
      await addDoc(collection(db, "products"), { ...payload, createdAt: serverTimestamp() });
      toast.success("Product saved & published! 🎉");
    }
    setIsModalOpen(false);
    fetchProducts();
    setEditingId(null);
    setFormData(initialFormState);
  } catch (e) { 
    console.error(e); 
    toast.error("Save failed! Check console.");
  }
  setLoading(false);
};

  return (
    <div className="p-10 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-black text-gray-800">Product Manager 🚀</h1>
        <button 
          onClick={() => { setEditingId(null); setFormData(initialFormState); setIsModalOpen(true); }} 
          className="bg-[#c12a52] text-white px-8 py-4 rounded-2xl font-black shadow-lg flex items-center gap-2"
        >
          <Plus size={20} /> Add Product
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-[2.5rem] shadow-sm overflow-hidden border border-gray-100">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50">
            <tr>
              <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Product Info</th>
              <th className="p-6 text-[10px] font-black text-gray-400 uppercase text-center">Price</th>
              <th className="p-6 text-[10px] font-black text-gray-400 uppercase text-center">Delivery</th>
              <th className="p-6 text-[10px] font-black text-gray-400 uppercase text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {products.map(p => (
              <tr key={p.id}>
                <td className="p-6">
                  <div className="flex items-center gap-4">
                    <img src={p.images?.[0] || 'https://via.placeholder.com/150'} className="w-12 h-12 rounded-xl object-cover" />
                    <p className="font-black text-gray-800 text-sm uppercase">{p.name}</p>
                  </div>
                </td>
                <td className="p-6 text-center font-bold text-[#c12a52]">LKR {p.discountedPrice}</td>
                <td className="p-6 text-center text-xs font-bold text-gray-500">LKR {p.deliveryCharge || '0'}</td>
                <td className="p-6 text-center">
                  <button onClick={() => { setEditingId(p.id); setFormData({...initialFormState, ...p}); setIsModalOpen(true); }} className="text-[#c12a52] font-black text-[10px] uppercase">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-6xl h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex animate-in zoom-in-95">
            
            {/* Gallery Left */}
            <div className="w-80 bg-[#12141d] p-8 overflow-y-auto">
              <p className="text-white text-[10px] font-black uppercase mb-6 flex items-center gap-2"><ImageIcon size={14}/> Main Gallery</p>
              <div className="grid grid-cols-2 gap-4">
                {(formData.images || []).map((img, i) => (
                  <div key={i} className="relative aspect-square">
                    <img src={img} className="w-full h-full object-cover rounded-xl" />
                    <button onClick={() => setFormData({...formData, images: formData.images.filter((_, idx) => idx !== i)})} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1"><X size={10}/></button>
                  </div>
                ))}
                <label className="aspect-square border-2 border-dashed border-white/20 rounded-xl flex items-center justify-center cursor-pointer hover:border-rose-500 text-white">
                  {uploading ? <Loader2 className="animate-spin" /> : <Plus />}
                  <input type="file" multiple className="hidden" onChange={handleMainImagesUpload} />
                </label>
              </div>
            </div>

            {/* Form Right */}
            <div className="flex-1 p-12 overflow-y-auto">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black uppercase text-gray-800">{editingId ? "Update Product" : "New Listing"}</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-300 hover:text-red-500"><X size={30}/></button>
              </div>

              <div className="space-y-6">
                {/* Title */}
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Product Name</label>
                  <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Designer Handbag" className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" />
                </div>
                
                {/* Pricing & Delivery Grid */}
                <div className="grid grid-cols-3 gap-4 bg-gray-50 p-6 rounded-3xl border border-gray-100">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase block mb-2">Original Price</label>
                    <input type="number" value={formData.originalPrice} onChange={e => setFormData({...formData, originalPrice: e.target.value})} className="w-full bg-white p-4 rounded-xl font-bold outline-none text-gray-400 line-through" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase block mb-2 text-[#c12a52]">Sale Price</label>
                    <input type="number" value={formData.discountedPrice} onChange={e => setFormData({...formData, discountedPrice: e.target.value})} className="w-full bg-white p-4 rounded-xl font-black outline-none text-[#c12a52]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase block mb-2 text-blue-500 flex items-center gap-1"><Truck size={12}/> Delivery</label>
                    <input type="number" value={formData.deliveryCharge} onChange={e => setFormData({...formData, deliveryCharge: e.target.value})} className="w-full bg-white p-4 rounded-xl font-black outline-none text-blue-600" />
                  </div>
                </div>

                {/* VARIATIONS */}
                <div className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-[10px] font-black uppercase text-gray-400">Variations (Color/Size)</p>
                    <button onClick={() => setFormData({...formData, variations: [...(formData.variations || []), { name: "", price: formData.discountedPrice, image: "" }]})} className="text-[10px] font-black text-[#c12a52] flex items-center gap-1">
                      <PlusCircle size={14} /> Add Variation
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(formData.variations || []).map((v, i) => (
                      <div key={i} className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-gray-100">
                        <label className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center cursor-pointer overflow-hidden relative">
                          {v.image ? <img src={v.image} className="w-full h-full object-cover" /> : <ImageIcon size={16} className="text-gray-300" />}
                          <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleVariationImageUpload(i, e.target.files[0])} />
                        </label>
                        <input placeholder="Name" value={v.name} onChange={(e) => { const n = [...formData.variations]; n[i].name = e.target.value; setFormData({...formData, variations: n}); }} className="flex-1 outline-none font-bold text-sm" />
                        <input placeholder="Price" type="number" value={v.price} onChange={(e) => { const n = [...formData.variations]; n[i].price = e.target.value; setFormData({...formData, variations: n}); }} className="w-24 outline-none font-black text-sm text-[#c12a52]" />
                        <button onClick={() => setFormData({...formData, variations: formData.variations.filter((_, idx) => idx !== i)})} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* DESCRIPTION */}
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Product Description</label>
                  <textarea 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                    placeholder="Describe the product features, quality, and details..." 
                    rows={5} 
                    className="w-full p-5 bg-gray-50 rounded-[2rem] outline-none font-medium text-sm text-gray-600 resize-none border border-transparent focus:border-rose-100"
                  />
                </div>

                {/* FOOTER ACTIONS */}
                <div className="flex justify-between items-center pt-6">
                  {editingId && (
                    <button onClick={async () => { if(confirm('Delete Product?')) { try { await deleteDoc(doc(db, "products", editingId)); toast.success("Product deleted."); setIsModalOpen(false); fetchProducts(); } catch(e) { toast.error("Delete failed!"); } } }} className="text-red-500 font-black text-[10px] uppercase flex items-center gap-2">
                      <Trash2 size={16}/> Delete Product
                    </button>
                  )}
                  <div className="flex gap-4 ml-auto">
                    <button onClick={() => setIsModalOpen(false)} className="px-8 py-4 font-black uppercase text-[10px] text-gray-400">Cancel</button>
                    <button onClick={handleSave} disabled={loading} className="bg-[#c12a52] px-12 py-4 rounded-full font-black text-white uppercase text-[10px] flex items-center gap-2 shadow-xl shadow-rose-200 hover:scale-105 active:scale-95 transition-all">
                      {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Save & Publish
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}