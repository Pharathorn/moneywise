import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, ArrowLeftRight, CreditCard, Wallet, Settings, Menu, X } from 'lucide-react';
import styles from './Layout.module.css';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/accounts', icon: Wallet, label: 'Cuentas' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transacciones' },
  { to: '/subscriptions', icon: CreditCard, label: 'Suscripciones' },
  { to: '/settings', icon: Settings, label: 'Ajustes' },
];

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={styles.layout}>
      <div className={styles['mobile-header']}>
        <div className={styles['mobile-logo']}>
          <div className={styles['logo-icon']}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <span className={styles['logo-text']}>MoneyWise</span>
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
          <span className={styles['logo-text']}>MoneyWise</span>
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
      </aside>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
