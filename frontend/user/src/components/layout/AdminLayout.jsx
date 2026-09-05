import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNavbar } from './TopNavbar';
import styles from './AdminLayout.module.css';

/**
 * AdminLayout — Root shell for the Admin Portal.
 * Composes Sidebar + TopNavbar + page content via <Outlet>.
 */
export function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className={styles.shell}>
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className={styles.main}>
        <TopNavbar
          onMobileMenuToggle={() => setMobileOpen((v) => !v)}
          mobileMenuOpen={mobileOpen}
        />

        <main className={styles.content} id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
