"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, User, Search, X, Gamepad2 } from 'lucide-react';
import { db } from "../lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";

const Navbar = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "categories"), (snap) => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query)}`);
    setIsSearchOpen(false);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;700;900&display=swap');

        .navbar-root {
          position: sticky;
          top: 0;
          z-index: 50;
          background: #ffffff;
          border-bottom: 1px solid #e8e8e8;
          transition: box-shadow 0.3s ease;
          font-family: 'DM Sans', sans-serif;
          will-change: transform;
        }
        .navbar-root.scrolled {
          box-shadow: 0 4px 24px rgba(0,0,0,0.07);
        }
        .navbar-inner {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 1.25rem;
          height: 4.25rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        /* Logo */
        .nav-logo {
          display: flex;
          align-items: baseline;
          gap: 1px;
          text-decoration: none;
          line-height: 1;
        }
        .nav-logo-main {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 1.75rem;
          color: #111111;
          letter-spacing: 0.04em;
          line-height: 1;
        }
        .nav-logo-dot {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 2.2rem;
          color: #111111;
          line-height: 1;
          opacity: 0.25;
        }

        /* Desktop nav links */
        .nav-links {
          display: none;
          align-items: center;
          gap: 2rem;
          list-style: none;
          margin: 0;
          padding: 0;
        }
        @media (min-width: 768px) {
          .nav-links { display: flex; }
        }
        .nav-link {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          color: #aaa;
          text-decoration: none;
          transition: color 0.2s ease;
          white-space: nowrap;
        }
        .nav-link:hover { color: #111; }

        /* Search bar */
        .nav-search-form {
          flex: 1;
          max-width: 28rem;
        }
        .nav-search-wrap {
          position: relative;
        }
        .nav-search-input {
          width: 100%;
          padding: 0.5rem 2.5rem 0.5rem 1rem;
          background: #f5f5f5;
          border: 1px solid #e0e0e0;
          border-radius: 100px;
          color: #111;
          font-size: 13px;
          font-family: 'DM Sans', sans-serif;
          outline: none;
          transition: border-color 0.2s ease, background 0.2s ease;
        }
        .nav-search-input::placeholder { color: #bbb; }
        .nav-search-input:focus {
          background: #fff;
          border-color: #bbb;
        }
        .nav-search-close {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #bbb;
          display: flex;
          align-items: center;
          padding: 0;
          transition: color 0.2s ease;
        }
        .nav-search-close:hover { color: #111; }

        /* Icon buttons */
        .nav-icons {
          display: flex;
          align-items: center;
          gap: 0.1rem;
        }
        .nav-icon-btn {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2.25rem;
          height: 2.25rem;
          border-radius: 50%;
          background: transparent;
          border: none;
          cursor: pointer;
          color: #999;
          text-decoration: none;
          transition: color 0.2s ease, background 0.2s ease;
        }
        .nav-icon-btn:hover {
          color: #111;
          background: #f5f5f5;
        }
        .nav-badge {
          position: absolute;
          top: 2px;
          right: 2px;
          background: #111;
          color: #fff;
          font-size: 9px;
          font-weight: 900;
          border-radius: 50%;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }
        .nav-game-emoji {
          position: absolute;
          top: 0;
          right: 0;
          font-size: 10px;
          animation: nav-bounce 1s infinite;
        }
        @keyframes nav-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }

        /* Bottom accent line */
        .navbar-accent {
          height: 1px;
          background: linear-gradient(90deg, transparent, #e0e0e0, transparent);
        }
      `}</style>

      <nav className={`navbar-root${scrolled ? " scrolled" : ""}`}>
        <div className="navbar-inner">

          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center" }}>
            {!isSearchOpen && (
              <Link href="/" className="nav-logo">
                <span className="nav-logo-main">CMB LK</span>
                <span className="nav-logo-dot">.</span>
              </Link>
            )}
          </div>

          {/* Desktop Nav Links */}
          {!isSearchOpen && (
            <ul className="nav-links">
              <li><Link href="/shop" className="nav-link">All Shop</Link></li>
              {categories.slice(0, 5).map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/shop?category=${encodeURIComponent(cat.name)}`}
                    className="nav-link"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {/* Search bar */}
          {isSearchOpen && (
            <form onSubmit={handleSearch} className="nav-search-form">
              <div className="nav-search-wrap">
                <input
                  autoFocus
                  type="text"
                  placeholder="Search products..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="nav-search-input"
                />
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(false)}
                  className="nav-search-close"
                >
                  <X size={16} />
                </button>
              </div>
            </form>
          )}

          {/* Icons */}
          <div className="nav-icons">
            {!isSearchOpen && (
              <button
                onClick={() => setIsSearchOpen(true)}
                className="nav-icon-btn"
                aria-label="Search"
              >
                <Search size={20} />
              </button>
            )}

            {!isSearchOpen && (
              <Link href="/account?tab=game" className="nav-icon-btn" title="Game Zone">
                <Gamepad2 size={20} />
                <span className="nav-game-emoji">🎮</span>
              </Link>
            )}

            <Link href="/wishlist" className="nav-icon-btn" aria-label="Wishlist">
              <Heart size={20} />
              <span className="nav-badge">0</span>
            </Link>

            <Link href="/account" className="nav-icon-btn" aria-label="Account">
              <User size={20} />
            </Link>
          </div>

        </div>
        <div className="navbar-accent" />
      </nav>
    </>
  );
};

export default Navbar;