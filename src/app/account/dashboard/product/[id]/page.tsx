"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from "../../../../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { 
  Copy, Download, ChevronLeft, Check, 
  ExternalLink, Info, DollarSign, Wallet 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from "../../../../../context/AuthContext";

const AffiliateProductDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, "products", id as string);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProduct({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (error) {
        console.error("Error fetching product:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus(field);
    setTimeout(() => setCopyStatus(null), 2000);
  };

  const downloadImage = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `CMBLK_${product?.name || 'product'}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      window.open(url, '_blank'); 
    }
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#fff" }}>
      <div style={{ width: "40px", height: "40px", border: "4px solid #f0f0f0", borderTop: "4px solid #111", borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: "1rem" }} />
      <p style={{ fontSize: "10px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.2em", color: "#bbb" }}>Loading Assets...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!product) return <div style={{ padding: "5rem", textAlign: "center", fontWeight: 700, color: "#bbb" }}>PRODUCT NOT FOUND</div>;

  const affiliateLink = `${window.location.origin}/product/${product.id}?ref=${user?.uid}`;

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5", paddingTop: "7rem", paddingBottom: "5rem", paddingLeft: "1rem", paddingRight: "1rem" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        
        {/* Navigation */}
        <button 
          onClick={() => router.back()}
          style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.2em", color: "#aaa", background: "none", border: "none", cursor: "pointer", marginBottom: "2rem", transition: "color 0.2s" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#111")}
          onMouseLeave={e => (e.currentTarget.style.color = "#aaa")}
        >
          <ChevronLeft size={15} /> Back to Store
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* Left: Product Images */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ aspectRatio: "1/1", background: "#fff", borderRadius: "2rem", overflow: "hidden", border: "1px solid #ececec", boxShadow: "0 8px 32px rgba(0,0,0,0.07)", position: "relative" }}>
              <img 
                src={product.images?.[activeImage]} 
                alt={product.name} 
                style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.6s ease" }}
                onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.04)")}
                onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
              />
              <button 
                onClick={() => downloadImage(product.images?.[activeImage])}
                style={{ position: "absolute", bottom: "1.25rem", right: "1.25rem", width: "44px", height: "44px", background: "#fff", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", color: "#111", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", border: "none", cursor: "pointer", transition: "background 0.2s, color 0.2s" }}
                onMouseEnter={e => { (e.currentTarget.style.background = "#111"); (e.currentTarget.style.color = "#fff"); }}
                onMouseLeave={e => { (e.currentTarget.style.background = "#fff"); (e.currentTarget.style.color = "#111"); }}
                title="Download Image"
              >
                <Download size={18} />
              </button>
            </div>
            
            <div style={{ display: "flex", gap: "0.75rem", overflowX: "auto", paddingBottom: "4px" }} className="no-scrollbar">
              {product.images?.map((img: string, idx: number) => (
                <button 
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  style={{ width: "72px", height: "72px", borderRadius: "14px", overflow: "hidden", border: `2px solid ${activeImage === idx ? '#111' : 'transparent'}`, opacity: activeImage === idx ? 1 : 0.5, flexShrink: 0, cursor: "pointer", transition: "all 0.2s", transform: activeImage === idx ? "scale(0.95)" : "scale(1)", background: "none", padding: 0 }}
                >
                  <img src={img} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </button>
              ))}
            </div>
          </div>

          {/* Right: Info & Tools */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            
            {/* Basic Info */}
            <div style={{ background: "#fff", padding: "1.75rem", borderRadius: "1.75rem", border: "1px solid #ececec", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "9px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.25em", color: "#888" }}>{product.category}</span>
                <button 
                  onClick={() => handleCopy(product.name, 'title')}
                  style={{ padding: "6px 10px", background: "#f5f5f5", borderRadius: "10px", border: "none", cursor: "pointer", color: "#aaa", display: "flex", alignItems: "center", transition: "background 0.2s, color 0.2s" }}
                  onMouseEnter={e => { (e.currentTarget.style.background = "#111"); (e.currentTarget.style.color = "#fff"); }}
                  onMouseLeave={e => { (e.currentTarget.style.background = "#f5f5f5"); (e.currentTarget.style.color = "#aaa"); }}
                >
                  {copyStatus === 'title' ? <Check size={13} style={{ color: "#18b06a" }} /> : <Copy size={13} />}
                </button>
              </div>
              <h1 style={{ fontSize: "22px", fontWeight: 900, color: "#111", textTransform: "uppercase", letterSpacing: "-0.02em", lineHeight: 1.1, margin: "0 0 1.25rem" }}>{product.name}</h1>
              
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "1rem", borderTop: "1px solid #f0f0f0" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
                  <p style={{ fontSize: "24px", fontWeight: 900, color: "#111", margin: 0 }}>Rs. {product.price?.toLocaleString()}</p>
                  {product.oldPrice && <p style={{ fontSize: "13px", fontWeight: 600, color: "#ccc", textDecoration: "line-through", margin: 0 }}>Rs. {product.oldPrice.toLocaleString()}</p>}
                </div>
                <button 
                  onClick={() => handleCopy(product.price?.toString(), 'price')}
                  style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", background: "#f5f5f5", borderRadius: "10px", fontSize: "9px", fontWeight: 900, color: "#888", border: "none", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.1em", transition: "background 0.2s, color 0.2s" }}
                  onMouseEnter={e => { (e.currentTarget.style.background = "#111"); (e.currentTarget.style.color = "#fff"); }}
                  onMouseLeave={e => { (e.currentTarget.style.background = "#f5f5f5"); (e.currentTarget.style.color = "#888"); }}
                >
                  {copyStatus === 'price' ? <Check size={12} style={{ color: "#18b06a" }} /> : <Copy size={12} />}
                  {copyStatus === 'price' ? 'Copied!' : 'Copy Price'}
                </button>
              </div>
            </div>

            {/* Affiliate Earnings */}
            <div style={{ background: "#111", padding: "1.25rem 1.5rem", borderRadius: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{ width: "44px", height: "44px", background: "rgba(255,255,255,0.12)", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Wallet size={20} style={{ color: "#fff" }} />
                </div>
                <div>
                  <p style={{ fontSize: "9px", fontWeight: 900, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.2em", margin: "0 0 2px" }}>Your Affiliate Earn</p>
                  <p style={{ fontSize: "20px", fontWeight: 900, color: "#fff", margin: 0 }}>
                    {product.commission ? `Rs. ${product.commission}` : "Assigning..."}
                  </p>
                </div>
              </div>
            </div>

            {/* Affiliate Link */}
            <div style={{ background: "#111", borderRadius: "1.75rem", padding: "1.75rem", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "relative", zIndex: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
                  <div style={{ width: "36px", height: "36px", background: "rgba(255,255,255,0.12)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ExternalLink size={16} style={{ color: "#fff" }} />
                  </div>
                  <h3 style={{ fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.15em", fontSize: "10px", color: "rgba(255,255,255,0.7)", margin: 0 }}>Your Promotion Link</h3>
                </div>
                
                <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: "12px", padding: "0.85rem 1rem", marginBottom: "1rem", border: "1px solid rgba(255,255,255,0.1)", fontSize: "10px", fontWeight: 600, fontFamily: "monospace", color: "rgba(255,255,255,0.7)", wordBreak: "break-all", lineHeight: 1.6 }}>
                  {affiliateLink}
                </div>
                
                <button 
                  onClick={() => handleCopy(affiliateLink, 'link')}
                  style={{ width: "100%", background: "#fff", color: "#111", padding: "0.9rem", borderRadius: "12px", fontWeight: 900, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.15em", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "background 0.2s", boxSizing: "border-box" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#f0f0f0")}
                  onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
                >
                  {copyStatus === 'link' ? <Check size={15} style={{ color: "#18b06a" }} /> : <Copy size={15} />}
                  {copyStatus === 'link' ? 'Link Copied!' : 'Copy My Link'}
                </button>
              </div>
            </div>

            {/* Description */}
            <div style={{ background: "#fff", borderRadius: "1.75rem", padding: "1.75rem", border: "1px solid #ececec", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                <h3 style={{ fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.15em", fontSize: "10px", color: "#888", display: "flex", alignItems: "center", gap: "6px", margin: 0 }}>
                  <Info size={13} /> Description Assets
                </h3>
                <button 
                  onClick={() => handleCopy(product.description, 'desc')}
                  style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", background: "#f5f5f5", borderRadius: "10px", fontSize: "9px", fontWeight: 900, color: "#888", border: "none", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.1em", transition: "background 0.2s, color 0.2s" }}
                  onMouseEnter={e => { (e.currentTarget.style.background = "#111"); (e.currentTarget.style.color = "#fff"); }}
                  onMouseLeave={e => { (e.currentTarget.style.background = "#f5f5f5"); (e.currentTarget.style.color = "#888"); }}
                >
                  {copyStatus === 'desc' ? <Check size={12} style={{ color: "#18b06a" }} /> : <Copy size={12} />}
                  Copy Info
                </button>
              </div>
              <p style={{ color: "#555", fontSize: "13px", lineHeight: 1.7, fontWeight: 500, margin: 0, whiteSpace: "pre-wrap" }}>
                {product.description || "No description provided."}
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default AffiliateProductDetails;