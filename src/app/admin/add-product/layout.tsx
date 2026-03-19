"use client";
import React, { useState } from 'react';
import { 
  LayoutDashboard, ShoppingBag, Users, 
  Package, BarChart3, Settings, LogOut, 
  Megaphone, HeartHandshake, Home,
  BookOpen // ✅ Stories icon
} from 'lucide-react';

// Tabs Component Import
import AdminOrdersTab from "../../../components/AdminOrdersTab";
import ProductsTab from "../../../components/ProductsTab";
import AdminHomeSettingsTab from "../../../components/AdminHomeSettingsTab";
import AdminStoriesTab from "../../../components/AdminStoriesTab"; // ✅ Already imported

export default function AdminLayout() {
  const [activeTab, setActiveTab] = useState('Products');

  const menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Home Settings', icon: <Home size={20} /> },
    { name: 'Orders', icon: <ShoppingBag size={20} /> },
    { name: 'Reseller Orders', icon: <HeartHandshake size={20} /> },
    { name: 'Products', icon: <Package size={20} /> },
    { name: 'Stories', icon: <BookOpen size={20} /> }, // ✅ NEW
    { name: 'Financials', icon: <BarChart3 size={20} /> },
    { name: 'Manage Resellers', icon: <Users size={20} /> },
    { name: 'Marketing', icon: <Megaphone size={20} /> },
    { name: 'Settings', icon: <Settings size={20} /> },
  ];

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'Home Settings':
        return <AdminHomeSettingsTab />;
      case 'Orders':
        return <AdminOrdersTab />;
      case 'Products':
        return <ProductsTab />;
      case 'Stories': // ✅ NEW
        return <AdminStoriesTab />;
      default:
        return (
          <div className="p-20 text-center uppercase font-black text-gray-300">
            {activeTab} Section coming soon...
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-[#fcfcfc]">
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col sticky top-0 h-screen shadow-sm">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-[#c12a52] font-black">T</div>
            <div>
              <h2 className="text-sm font-black text-gray-800 uppercase leading-none">TUTU Admin</h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Control Panel</p>
            </div>
          </div>

          <nav className="space-y-1">
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-4 ml-2">Main Menu</p>
            {menuItems.map((item) => (
              <button
                key={item.name}
                onClick={() => setActiveTab(item.name)}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all font-bold text-sm ${
                  activeTab === item.name 
                  ? 'bg-rose-50 text-[#c12a52] shadow-sm' 
                  : 'text-gray-400 hover:bg-gray-50'
                }`}
              >
                {item.icon}
                {item.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-8">
          <button className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-gray-400 hover:bg-rose-50 hover:text-red-500 transition-all font-bold text-sm border border-gray-50">
            <LogOut size={20} /> Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {renderActiveTab()}
        </div>
      </main>
    </div>
  );
}
