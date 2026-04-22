// src/components/Layout.js
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ── Protected Route Wrapper ──────────────────────────────────────────────────
export function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="spinner" />;
  if (!user)   return <Navigate to="/login" replace />;
  return <Layout />;
}

// ── Nav Items ────────────────────────────────────────────────────────────────
const NAV = [
  { to: '/dashboard',    icon: '◈', label: 'Dashboard'    },
  { to: '/accounts',     icon: '◉', label: 'Accounts'     },
  { to: '/transactions', icon: '⇄', label: 'Transactions' },
  { to: '/budgets',      icon: '◎', label: 'Budgets'      },
  { to: '/categories',   icon: '⊞', label: 'Categories'   },
  { to: '/recurring',    icon: '↺', label: 'Recurring'    },
  { to: '/transfers',    icon: '⇌', label: 'Transfers'    },
  { to: '/alerts',       icon: '◈', label: 'Alerts'       },
  { to: '/analytics',   icon: '◻', label: 'Analytics'    },
];

// ── Layout ───────────────────────────────────────────────────────────────────
function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.3)', zIndex:99, display:'none' }}
          className="mobile-overlay"
        />
      )}

      {/* Sidebar */}
      <aside style={{
        width: 'var(--sidebar-width)',
        background: 'var(--green-900)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        zIndex: 100,
        padding: '0',
        overflowY: 'auto',
      }}>
        {/* Brand */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: '#fff', fontWeight: 600 }}>
            Haq Halal
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2, letterSpacing: '0.06em' }}>
            ISLAMIC FINANCE
          </div>
        </div>

        {/* User pill */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>Logged in as</div>
          <div style={{ fontSize: 14, color: '#fff', fontWeight: 500 }}>{user?.full_name || user?.username}</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 0' }}>
          {NAV.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 20px',
                fontSize: 14,
                color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--gold-400)' : '3px solid transparent',
                transition: 'all 0.15s',
                fontWeight: isActive ? 500 : 400,
              })}
            >
              <span style={{ fontSize: 16 }}>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', padding: '8px 12px',
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.6)',
              borderRadius: 'var(--radius-md)',
              fontSize: 13, textAlign: 'left',
              transition: 'all 0.15s',
            }}
          >
            ⎋ &nbsp;Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{
        marginLeft: 'var(--sidebar-width)',
        flex: 1,
        padding: '32px',
        minHeight: '100vh',
        maxWidth: 'calc(100vw - var(--sidebar-width))',
      }}>
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
