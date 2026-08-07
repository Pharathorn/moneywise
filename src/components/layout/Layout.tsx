import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, ArrowLeftRight, CreditCard, Wallet, Home, Settings, Menu, X, LogOut, Cloud, CloudOff, Loader, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/DataContext';
import styles from './Layout.module.css';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/accounts', icon: Wallet, label: 'Cuentas' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transacciones' },
  { to: '/subscriptions', icon: CreditCard, label: 'Suscripciones' },
  { to: '/housing', icon: Home, label: 'Vivienda' },
  { to: '/settings', icon: Settings, label: 'Ajustes' },
];

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signOut, user } = useAuth();
  const { syncing, isOnline, manualSync } = useApp();

  return (
    <div className={styles.layout}>
      <div className={styles['mobile-header']}>
        <div className={styles['mobile-logo']}>
          <div className={styles['logo-icon']}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <span className={styles['logo-text']}>Wash My Cash</span>
        </div>
        <button className={styles['menu-btn']} onClick={() => setSidebarOpen(true)}>
          <Menu size={24} />
        </button>
      </div>

      {sidebarOpen && (
        <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : ''}`}>
        <div className={styles.logo}>
          <div className={styles['logo-icon']}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <span className={styles['logo-text']}>Wash My Cash</span>
        </div>

        <nav className={styles.nav}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `${styles['nav-link']} ${isActive ? styles.active : ''}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className={styles['sidebar-footer']}>
          <div className={styles['sync-status']} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {syncing ? (
              <>
                <Loader size={14} className={styles.spinning} />
                <span>Sincronizando...</span>
              </>
            ) : isOnline ? (
              <>
                <Cloud size={14} style={{ color: '#22c55e' }} />
                <span>Online</span>
              </>
            ) : (
              <>
                <CloudOff size={14} style={{ color: '#f97316' }} />
                <span>Offline</span>
              </>
            )}
            {isOnline && !syncing && (
              <button
                onClick={() => manualSync()}
                title="Sincronizar ahora"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '2px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <RefreshCw size={14} />
              </button>
            )}
          </div>

          <div className={styles['user-info']}>
            <span className={styles['user-email']}>{user?.email}</span>
            <button className={styles['logout-btn']} onClick={signOut} title="Cerrar sesión">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
