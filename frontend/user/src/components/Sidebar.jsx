import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import {
  IconDash, IconPipe, IconCart,
  IconCheck, IconTruck, IconRefresh, IconUsers, IconUser,
} from '../components/Icons';

const NAV_ITEMS = [
  { to: '/',              label: 'Deal Health',           icon: IconDash,    end: true },
  { to: '/pipeline',      label: 'Pipeline',              icon: IconPipe         },
  { to: '/builder',       label: 'Quotation Builder',     icon: IconCart         },
  { to: '/approval',      label: 'Approvals',             icon: IconCheck        },
  { to: '/fulfillment',   label: 'Fulfillment',           icon: IconTruck        },
  { to: '/subscriptions', label: 'Subscriptions',         icon: IconRefresh      },
  { to: '/portal',        label: 'Customer Portal',       icon: IconUsers        },
  { to: '/profile',       label: 'User Profile & Authority', icon: IconUser      },
];

export function Sidebar() {
  const navigate = useNavigate();

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

      <div style={{ display: 'flex', alignItems: 'center', borderTop: '1px solid var(--line-dark)' }}>
        <NavLink 
          to="/profile" 
          className={({ isActive }) => `sidebar-footer${isActive ? ' active' : ''}`}
          style={{ textDecoration: 'none', cursor: 'pointer', transition: 'background .15s ease', flex: 1, borderTop: 'none' }}
        >
          <div className="avatar">SA</div>
          <div>
            <div style={{ color: '#fff', fontWeight: 600 }}>Sade Adeyemi</div>
            <div style={{ fontSize: '11.5px', color: 'rgba(220,234,230,0.65)' }}>Sales Rep · East Region</div>
          </div>
        </NavLink>
        <button
          type="button"
          onClick={() => navigate('/login')}
          title="Sign Out"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(220,234,230,0.5)',
            cursor: 'pointer',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color .15s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#F1DAD5'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(220,234,230,0.5)'}
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
