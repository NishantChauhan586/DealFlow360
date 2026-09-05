import { NavLink } from 'react-router-dom';
import {
  IconDash, IconPipe, IconCart,
  IconCheck, IconTruck, IconRefresh, IconUsers,
} from '../components/Icons';

const NAV_ITEMS = [
  { to: '/',              label: 'Deal Health',           icon: IconDash,    end: true },
  { to: '/pipeline',      label: 'Pipeline',              icon: IconPipe         },
  { to: '/builder',       label: 'Quotation Builder',     icon: IconCart         },
  { to: '/approval',      label: 'Approvals',             icon: IconCheck        },
  { to: '/fulfillment',   label: 'Fulfillment',           icon: IconTruck        },
  { to: '/subscriptions', label: 'Subscriptions',         icon: IconRefresh      },
  { to: '/portal',        label: 'Customer Portal',       icon: IconUsers        },
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="mark">DealFlow360</div>
        <div className="tag">Self-governing sales ops</div>
      </div>

      <div className="nav-section-label">Workspace</div>

      <nav className="nav">
        {NAV_ITEMS.map((item) => (
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
        <div className="avatar">SA</div>
        <div>
          <div style={{ color: '#fff', fontWeight: 600 }}>Sade Adeyemi</div>
          <div>Sales Rep · East Region</div>
        </div>
      </div>
    </aside>
  );
}
