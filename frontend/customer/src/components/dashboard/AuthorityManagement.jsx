import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserPlus, 
  Mail, 
  CreditCard, 
  Users, 
  Plus, 
  RotateCw, 
  CheckCircle2, 
  Boxes,
  Trash2,
  ShieldCheck,
  GitMerge,
  FileText
} from 'lucide-react';
import styles from '../../pages/AuthorityManagement.module.css';
import { fetchAuditLogs } from '../../utils/apiClient';

const DEFAULT_AUTHORITIES = [];

const STORAGE_KEY = 'dealflow_provisioned_authorities';

const PERMISSION_MATRIX = [
  { module: 'Dashboard Metrics', admin: true, manager: true, rep: true, finance: true, customer: false },
  { module: 'Create & Edit Quotations', admin: true, manager: false, rep: true, finance: false, customer: true },
  { module: 'Apply Discounts', admin: true, manager: true, rep: 'Within Ceiling', finance: false, customer: false },
  { module: 'Approve Discount Overages', admin: true, manager: 'Tier 1 (<=20%)', rep: false, finance: 'Tier 2 (>20%)', customer: false },
  { module: 'Configure Products & Pricing', admin: true, manager: 'Read Only', rep: 'Read Only', finance: 'Read Only', customer: false },
  { module: 'Warehouse Allocation', admin: true, manager: false, rep: 'Tracking Only', finance: true, customer: false },
  { module: 'Subscriptions & Billing', admin: true, manager: false, rep: false, finance: true, customer: 'View Account' },
  { module: 'Authority & User Management', admin: true, manager: false, rep: false, finance: false, customer: false },
];

export default function AuthorityManagement() {
  const [activeTab, setActiveTab] = useState('provisioning');

  const [authorities, setAuthorities] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_AUTHORITIES;
    } catch {
      return DEFAULT_AUTHORITIES;
    }
  });

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Sales Representative');
  const [notification, setNotification] = useState('');
  const [isRotating, setIsRotating] = useState(false);

  // Discount Threshold State
  const [repCeiling, setRepCeiling] = useState(10);
  const [managerCeiling, setManagerCeiling] = useState(20);
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    let isMounted = true;
    async function loadLogs() {
      const apiLogs = await fetchAuditLogs();
      if (isMounted && Array.isArray(apiLogs)) {
        setAuditLogs(
          apiLogs.map((l) => ({
            id: l.id || `LOG-${Math.random().toString(36).substring(2, 6)}`,
            time: l.created_at || 'Recent',
            action: l.action || 'System Audit Event',
            actor: l.user_role || l.actor || 'System',
            details: l.details || l.description || 'Authority management event logged.',
          }))
        );
      }
    }
    loadLogs();
    return () => {
      isMounted = false;
    };
  }, []);

  const nextIdNumber = authorities.length + 1;
  const currentAuthId = `AUTH-${String(nextIdNumber).padStart(3, '0')}`;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authorities));
    } catch (e) {
      console.error(e);
    }
  }, [authorities]);

  const handleAppoint = (e) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      setNotification('Please fill in both full name and official email.');
      setTimeout(() => setNotification(''), 3000);
      return;
    }

    const newAuthority = {
      id: currentAuthId,
      name: fullName.trim(),
      email: email.trim(),
      role: role
    };

    setAuthorities(prev => [newAuthority, ...prev]);
    setNotification(`Authority ${newAuthority.id} appointed successfully.`);
    setFullName('');
    setEmail('');
    setRole('Sales Representative');

    setTimeout(() => {
      setNotification('');
    }, 4000);
  };

  const handleRefresh = () => {
    setIsRotating(true);
    setTimeout(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        setAuthorities(saved ? JSON.parse(saved) : DEFAULT_AUTHORITIES);
      } catch {
        setAuthorities(DEFAULT_AUTHORITIES);
      }
      setIsRotating(false);
    }, 400);
  };

  const handleDelete = (id) => {
    setAuthorities(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className={styles.adminSection}>
      
      {/* Header */}
      <div className={styles.sectionHeader}>
        <div>
          <div className={styles.eyebrow}>Administration & Security</div>
          <h2 className={styles.title}>Authority & Role Governance</h2>
          <p className={styles.subtitle}>
            Manage internal role provisioning, role-based permission matrices, discount threshold ceilings, and audit ledgers.
          </p>
        </div>
        <div className={styles.topIcon}>
          <Boxes size={28} />
        </div>
      </div>

      {/* Tabs Bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--line)', paddingBottom: '12px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setActiveTab('provisioning')}
          className="btn"
          style={{
            background: activeTab === 'provisioning' ? 'var(--burnham)' : 'var(--paper-2)',
            color: activeTab === 'provisioning' ? '#ffffff' : 'var(--ink)',
            fontSize: '12.5px',
            fontWeight: 600,
            padding: '7px 14px',
            borderRadius: '6px'
          }}
        >
          <UserPlus size={14} style={{ display: 'inline', marginRight: 6 }} />
          User Provisioning
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('matrix')}
          className="btn"
          style={{
            background: activeTab === 'matrix' ? 'var(--burnham)' : 'var(--paper-2)',
            color: activeTab === 'matrix' ? '#ffffff' : 'var(--ink)',
            fontSize: '12.5px',
            fontWeight: 600,
            padding: '7px 14px',
            borderRadius: '6px'
          }}
        >
          <ShieldCheck size={14} style={{ display: 'inline', marginRight: 6 }} />
          Permissions Matrix
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('chains')}
          className="btn"
          style={{
            background: activeTab === 'chains' ? 'var(--burnham)' : 'var(--paper-2)',
            color: activeTab === 'chains' ? '#ffffff' : 'var(--ink)',
            fontSize: '12.5px',
            fontWeight: 600,
            padding: '7px 14px',
            borderRadius: '6px'
          }}
        >
          <GitMerge size={14} style={{ display: 'inline', marginRight: 6 }} />
          Approval Chains & Thresholds
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className="btn"
          style={{
            background: activeTab === 'audit' ? 'var(--burnham)' : 'var(--paper-2)',
            color: activeTab === 'audit' ? '#ffffff' : 'var(--ink)',
            fontSize: '12.5px',
            fontWeight: 600,
            padding: '7px 14px',
            borderRadius: '6px'
          }}
        >
          <FileText size={14} style={{ display: 'inline', marginRight: 6 }} />
          Audit Logs
        </button>
      </div>

      {/* TAB 1: User Provisioning */}
      {activeTab === 'provisioning' && (
        <div className={styles.gridTwoCol}>
          <div className={styles.formCard}>
            <form onSubmit={handleAppoint} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className={styles.formGrid}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>
                    <UserPlus size={14} />
                    <span>Full name</span>
                  </label>
                  <input 
                    type="text"
                    placeholder="e.g. John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={styles.input}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>
                    <Mail size={14} />
                    <span>Official email</span>
                  </label>
                  <input 
                    type="email"
                    placeholder="john@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={styles.input}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>
                    <CreditCard size={14} />
                    <span>Authority ID</span>
                  </label>
                  <input 
                    type="text"
                    value={currentAuthId}
                    disabled
                    className={styles.input}
                    style={{ background: '#F5F7F6', color: 'var(--burnham)', fontWeight: 600, fontFamily: 'monospace' }}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>
                    <Users size={14} />
                    <span>Role Assignment</span>
                  </label>
                  <select 
                    value={role} 
                    onChange={(e) => setRole(e.target.value)}
                    className={styles.select}
                  >
                    <option value="Sales Representative">Sales Representative</option>
                    <option value="Sales Manager / Approver">Sales Manager / Approver</option>
                    <option value="Finance / Operation User">Finance / Operation User</option>
                    <option value="System Administrator">System Administrator</option>
                  </select>
                </div>
              </div>

              <button type="submit" className={styles.appointBtn}>
                <Plus size={16} />
                <span>Appoint Authority & Grant Role</span>
              </button>

              <AnimatePresence>
                {notification && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={styles.successBanner}
                  >
                    <CheckCircle2 size={15} color="#438A7E" />
                    <span>{notification}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>

          <div className={styles.listCard}>
            <div className={styles.listHeader}>
              <h3 className={styles.listTitle}>Provisioned Authorities ({authorities.length})</h3>
              <button 
                type="button" 
                onClick={handleRefresh}
                className={styles.refreshBtn}
                title="Refresh list"
              >
                <RotateCw size={14} style={{ transform: isRotating ? 'rotate(360deg)' : 'none', transition: 'transform 0.4s ease' }} />
              </button>
            </div>

            <div className={styles.authoritiesList}>
              {authorities.map((auth) => (
                <div key={auth.id} className={styles.authorityRow}>
                  <div>
                    <div className={styles.authorityName}>{auth.name}</div>
                    <div className={styles.authorityEmail}>{auth.email}</div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className={styles.tagAuth}>{auth.id}</span>
                    <span className={styles.roleText}>{auth.role}</span>
                    <button 
                      type="button" 
                      onClick={() => handleDelete(auth.id)}
                      className={styles.deleteBtn}
                      title="Revoke authority"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Permissions Matrix */}
      {activeTab === 'matrix' && (
        <div style={{ background: '#ffffff', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', color: 'var(--burnham)', marginBottom: '14px' }}>Granular Role Permission Matrix</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--paper-2)', borderBottom: '2px solid var(--line)' }}>
                  <th style={{ padding: '10px 14px' }}>Module / Feature</th>
                  <th style={{ padding: '10px 14px' }}>🛡️ Admin</th>
                  <th style={{ padding: '10px 14px' }}>👔 Sales Manager</th>
                  <th style={{ padding: '10px 14px' }}>💼 Sales Rep</th>
                  <th style={{ padding: '10px 14px' }}>💳 Finance</th>
                  <th style={{ padding: '10px 14px' }}>👤 Customer</th>
                </tr>
              </thead>
              <tbody>
                {PERMISSION_MATRIX.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--burnham)' }}>{row.module}</td>
                    <td style={{ padding: '12px 14px' }}>
                      {typeof row.admin === 'boolean' ? (row.admin ? '✅ Full' : '❌ No') : row.admin}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {typeof row.manager === 'boolean' ? (row.manager ? '✅ Full' : '❌ No') : row.manager}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {typeof row.rep === 'boolean' ? (row.rep ? '✅ Full' : '❌ No') : row.rep}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {typeof row.finance === 'boolean' ? (row.finance ? '✅ Full' : '❌ No') : row.finance}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {typeof row.customer === 'boolean' ? (row.customer ? '✅ Full' : '❌ No') : row.customer}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Approval Chains & Thresholds */}
      {activeTab === 'chains' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          <div style={{ background: '#ffffff', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '20px' }}>
            <h3 style={{ fontSize: '16px', color: 'var(--burnham)', marginBottom: '14px' }}>Discount Ceiling Rules</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--burnham)', display: 'block', marginBottom: '6px' }}>
                  Sales Rep Auto-Approval Discount Ceiling ({repCeiling}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={repCeiling}
                  onChange={(e) => setRepCeiling(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
                <span style={{ fontSize: '11.5px', color: 'var(--ink-60)' }}>Discounts ≤ {repCeiling}% pass automatically without manager signoff.</span>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--burnham)', display: 'block', marginBottom: '6px' }}>
                  Sales Manager Signoff Ceiling ({managerCeiling}%)
                </label>
                <input
                  type="range"
                  min="10"
                  max="35"
                  value={managerCeiling}
                  onChange={(e) => setManagerCeiling(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
                <span style={{ fontSize: '11.5px', color: 'var(--ink-60)' }}>Discounts between {repCeiling + 1}% and {managerCeiling}% require Sales Manager approval.</span>
              </div>

              <div style={{ background: 'var(--paper-2)', padding: '12px', borderRadius: '6px', fontSize: '12px', color: 'var(--burnham)' }}>
                <strong>Tier 2 Finance Escrow:</strong> Any quotation discount exceeding <strong>{managerCeiling}%</strong> requires secondary Finance approval before quote dispatch.
              </div>
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '20px' }}>
            <h3 style={{ fontSize: '16px', color: 'var(--burnham)', marginBottom: '14px' }}>Multi-Stage Approval Routing Flow</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ padding: '10px 14px', background: 'rgba(67, 138, 126, 0.08)', borderRadius: '6px', borderLeft: '4px solid var(--viridian)' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--burnham)' }}>1. Quotation Submission</div>
                <div style={{ fontSize: '11.5px', color: 'var(--ink-60)' }}>Sales Rep drafts quote & applies requested discount line items.</div>
              </div>
              <div style={{ padding: '10px 14px', background: 'rgba(235, 172, 50, 0.08)', borderRadius: '6px', borderLeft: '4px solid #EBAC32' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--burnham)' }}>2. Sales Manager Review</div>
                <div style={{ fontSize: '11.5px', color: 'var(--ink-60)' }}>Triggered if discount exceeds {repCeiling}%. Blended risk score evaluated.</div>
              </div>
              <div style={{ padding: '10px 14px', background: 'rgba(209, 67, 67, 0.08)', borderRadius: '6px', borderLeft: '4px solid #D14343' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--burnham)' }}>3. Finance Tier-2 Review</div>
                <div style={{ fontSize: '11.5px', color: 'var(--ink-60)' }}>Triggered if discount exceeds {managerCeiling}%. Margin ceiling checked.</div>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* TAB 4: Audit Logs */}
      {activeTab === 'audit' && (
        <div style={{ background: '#ffffff', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', color: 'var(--burnham)', marginBottom: '14px' }}>Authority Audit Ledger</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {auditLogs.length > 0 ? (
              auditLogs.map((log) => (
                <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', border: '1px solid var(--line)', borderRadius: '6px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--burnham)' }}>{log.action}</div>
                    <div style={{ fontSize: '12px', color: 'var(--ink-60)' }}>{log.details}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="tag tag-viridian" style={{ fontSize: '11px' }}>{log.actor}</span>
                    <div style={{ fontSize: '11px', color: 'var(--ink-60)', marginTop: '2px' }}>{log.time}</div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '16px', fontSize: '12.5px', color: 'var(--ink-60)', textAlign: 'center' }}>
                No audit log entries recorded.
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
