import { NavLink } from 'react-router-dom';
import {
  IconDash, IconPipe, IconCart,
  IconCheck, IconTruck, IconRefresh, IconUsers, IconShield,
} from '../components/Icons';

const ADMIN_NAV_ITEMS = [
  { to: '/dashboard',     label: 'Deal Health',           icon: IconDash,    end: true },
  { to: '/pipeline',      label: 'Pipeline',              icon: IconPipe         },
  { to: '/builder',       label: 'Quotation Builder',     icon: IconCart         },
  { to: '/approval',      label: 'Approvals',             icon: IconCheck        },
  { to: '/fulfillment',   label: 'Fulfillment',           icon: IconTruck        },
  { to: '/subscriptions', label: 'Subscriptions',         icon: IconRefresh      },
  { to: '/authorities',   label: 'Authority Management',  icon: IconShield       },
];

const CUSTOMER_NAV_ITEMS = [
  { to: '/portal',        label: 'My Quotations',         icon: IconUsers,   end: true },
];

export function Sidebar({ user }) {
  const isCustomer = user?.role === 'customer';
  const navItems = isCustomer ? CUSTOMER_NAV_ITEMS : ADMIN_NAV_ITEMS;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="mark">DealFlow360</div>
        <div className="tag">{isCustomer ? 'Client Portal' : 'Self-governing sales ops'}</div>
      </div>

      <div className="nav-section-label">
        {isCustomer ? 'Client Workspace' : 'Admin Workspace'}
      </div>

      <nav className="nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
          >
            <item.icon />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="avatar">
          {user?.name ? user.name.substring(0, 2).toUpperCase() : 'DF'}
        </div>
        <div>
          <div style={{ color: '#fff', fontWeight: 600 }}>
            {user?.name || (isCustomer ? 'Client User' : 'Admin User')}
          </div>
          <div>{isCustomer ? 'Customer Account' : 'Administrator'}</div>
        </div>
      </div>
    </aside>
  );
}
