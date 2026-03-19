"use client";
import React, { useState, useEffect } from 'react';
import { db } from "../../../lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Plus, Trash2, Save, RefreshCw, Image as ImageIcon } from 'lucide-react';

const AdminWheelManager = () => {
    const [prizes, setPrizes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // 1. දැනට තියෙන දත්ත Firestore එකෙන් ලබා ගැනීම
    useEffect(() => {
        const fetchSettings = async () => {
            const docRef = doc(db, "settings", "wheel");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setPrizes(docSnap.data().prizes || []);
            }
            setLoading(false);
        };
        fetchSettings();
    }, []);

    // 2. අලුත් Prize එකක් එකතු කිරීම
    const addPrize = () => {
        const newPrize = {
            id: prizes.length,
            text: "New Gift",
            type: "physical", // physical, currency, or none
            chance: 10,
            img: "https://cdn-icons-png.flaticon.com/128/726/726476.png",
            color: "#e11d48",
            value: 0
        };
        setPrizes([...prizes, newPrize]);
    };

    // 3. Prize එකක් අයින් කිරීම
    const removePrize = (index: number) => {
        const updated = prizes.filter((_, i) => i !== index);
        // IDs ටික පිළිවෙලකට හදනවා
        const reIndexed = updated.map((p, i) => ({ ...p, id: i }));
        setPrizes(reIndexed);
    };

    // 4. දත්ත වෙනස් කිරීම (Edit Inputs)
    const updatePrize = (index: number, field: string, value: any) => {
        const updated = [...prizes];
        updated[index] = { ...updated[index], [field]: value };
        setPrizes(updated);
    };

    // 5. Firestore එකට Save කිරීම
    const saveSettings = async () => {
        try {
            const totalChance = prizes.reduce((acc, p) => acc + Number(p.chance), 0);
            if (totalChance !== 100) {
                alert(`ප්‍රතිශතයන්හි එකතුව 100% විය යුතුය. (දැනට: ${totalChance}%)`);
                return;
            }

            const docRef = doc(db, "settings", "wheel");
            await updateDoc(docRef, { prizes: prizes });
            alert("Settings සාර්ථකව Save වුණා! ❤️");
        } catch (err) {
            alert("Error saving settings");
        }
    };

    if (loading) return <div className="p-10 text-center">Loading Settings...</div>;

    return (
        <div className="p-6 max-w-5xl mx-auto bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-black text-gray-800">Spin Wheel Admin</h1>
                    <p className="text-sm text-gray-500 font-bold">Manage prizes and winning chances</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={addPrize} className="flex items-center gap-2 bg-rose-500 text-white px-5 py-2.5 rounded-2xl font-bold hover:bg-rose-600 transition-all shadow-lg shadow-rose-100 text-sm">
                        <Plus size={18} /> Add Sector
                    </button>
                    <button onClick={saveSettings} className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-2xl font-bold hover:bg-black transition-all shadow-lg shadow-gray-200 text-sm">
                        <Save size={18} /> Save All
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {prizes.map((prize, index) => (
                    <div key={index} className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm relative group overflow-hidden">
                        <div className="absolute top-0 left-0 w-2 h-full" style={{ backgroundColor: prize.color }}></div>
                        
                        <div className="flex justify-between items-start mb-4">
                            <span className="bg-gray-100 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">Sector #{index + 1}</span>
                            <button onClick={() => removePrize(index)} className="text-gray-300 hover:text-red-500 transition-colors">
                                <Trash2 size={18} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-3">
                                <label className="block text-[10px] font-black text-gray-400 uppercase">Item Name</label>
                                <input value={prize.text} onChange={(e) => updatePrize(index, 'text', e.target.value)} className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 text-xs font-bold focus:ring-2 ring-rose-100" />
                                
                                <label className="block text-[10px] font-black text-gray-400 uppercase">Winning Chance (%)</label>
                                <input type="number" value={prize.chance} onChange={(e) => updatePrize(index, 'chance', Number(e.target.value))} className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 text-xs font-bold focus:ring-2 ring-rose-100" />
                            </div>

                            <div className="space-y-3">
                                <label className="block text-[10px] font-black text-gray-400 uppercase">Color (Hex)</label>
                                <div className="flex gap-2">
                                    <input type="color" value={prize.color} onChange={(e) => updatePrize(index, 'color', e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer border-none" />
                                    <input value={prize.color} onChange={(e) => updatePrize(index, 'color', e.target.value)} className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-2 text-[10px] font-mono font-bold" />
                                </div>

                                <label className="block text-[10px] font-black text-gray-400 uppercase">Image URL</label>
                                <div className="relative">
                                    <input value={prize.img} onChange={(e) => updatePrize(index, 'img', e.target.value)} className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 text-[10px] font-bold pr-10" />
                                    <ImageIcon className="absolute right-3 top-2 text-gray-300" size={16} />
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-dashed border-gray-100 flex gap-4">
                             <div className="flex-1">
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Type</label>
                                <select value={prize.type} onChange={(e) => updatePrize(index, 'type', e.target.value)} className="w-full bg-gray-50 border-none rounded-xl px-3 py-2 text-[10px] font-bold">
                                    <option value="physical">Physical Gift</option>
                                    <option value="currency">Coins/Points</option>
                                    <option value="none">Nothing (Try Again)</option>
                                </select>
                             </div>
                             {prize.type === 'currency' && (
                                <div className="flex-1">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Coin Value</label>
                                    <input type="number" value={prize.value} onChange={(e) => updatePrize(index, 'value', Number(e.target.value))} className="w-full bg-gray-50 border-none rounded-xl px-3 py-2 text-[10px] font-bold" />
                                </div>
                             )}
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="mt-10 bg-amber-50 p-6 rounded-[2rem] border border-amber-100 flex items-center gap-4">
                <div className="bg-amber-100 p-3 rounded-full text-amber-600"><RefreshCw size={24} /></div>
                <div>
                    <h4 className="font-black text-amber-800 text-sm">වැදගත් උපදෙස්:</h4>
                    <p className="text-amber-700 text-xs font-bold mt-1">Images වලට Background එක නැති (Transparent) PNG URLs පාවිච්චි කරන්න. එවිට Wheel එක ලස්සනට පෙනේ.</p>
                </div>
            </div>
        </div>
    );
};

export default AdminWheelManager;