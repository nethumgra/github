"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, ShoppingBag, User } from 'lucide-react';

const MobileNav = () => {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY < 60) {
        setVisible(true);
      } else if (currentY > lastScrollY + 8) {
        setVisible(false);
      } else if (currentY < lastScrollY - 8) {
        setVisible(true);
      }
      setLastScrollY(currentY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const tabs = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/stories', label: 'Stories', icon: BookOpen },
    { href: '/shop', label: 'Shop', icon: ShoppingBag },
    { href: '/account', label: 'Account', icon: User },
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap');

        .mob-nav-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: space-around;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-top: 1px solid rgba(0, 0, 0, 0.07);
          padding: 8px 0 calc(8px + env(safe-area-inset-bottom));
          transform: translateY(0);
          transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s ease;
          font-family: 'DM Sans', sans-serif;
        }

        .mob-nav-bar.hidden {
          transform: translateY(110%);
          opacity: 0;
        }

        /* Only show on mobile */
        @media (min-width: 768px) {
          .mob-nav-bar {
            display: none;
          }
        }

        .mob-nav-tab {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          text-decoration: none;
          cursor: pointer;
          padding: 4px 0;
          position: relative;
          -webkit-tap-highlight-color: transparent;
          transition: transform 0.15s ease;
        }

        .mob-nav-tab:active {
          transform: scale(0.9);
        }

        .mob-nav-icon-wrap {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 32px;
          border-radius: 14px;
          transition: background 0.25s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .mob-nav-tab.active .mob-nav-icon-wrap {
          background: #111111;
          transform: translateY(-2px) scale(1.05);
        }

        .mob-nav-icon {
          transition: color 0.2s ease;
          color: #b0b0b0;
        }

        .mob-nav-tab.active .mob-nav-icon {
          color: #ffffff;
        }

        .mob-nav-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.02em;
          color: #b0b0b0;
          transition: color 0.2s ease;
          line-height: 1;
        }

        .mob-nav-tab.active .mob-nav-label {
          color: #111111;
        }
      `}</style>

      <nav className={"mob-nav-bar" + (!visible ? " hidden" : "")}>
        {tabs.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={"mob-nav-tab" + (isActive(href) ? " active" : "")}
          >
            <div className="mob-nav-icon-wrap">
              <Icon size={18} className="mob-nav-icon" strokeWidth={2} />
            </div>
            <span className="mob-nav-label">{label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
};

export default MobileNav;