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
  FileText,
  X,
  Copy,
  Check,
  Clock,
  UserCheck,
  Shield,
  Briefcase,
  User
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

  const [pendingRequests, setPendingRequests] = useState(() => {
    try {
      const saved = localStorage.getItem('dealflow_pending_registrations');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [selectedRequestForApproval, setSelectedRequestForApproval] = useState(null);
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

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authorities));
    } catch (e) {
      console.error(e);
    }
  }, [authorities]);

  const handleApproveRequest = (request, role) => {
    const generatedToken = `TKN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const newAuthId = `AUTH-${String(authorities.length + 1).padStart(3, '0')}`;
    
    const newAuthority = {
      id: newAuthId,
      name: request.name,
      email: request.email,
      role: role,
      token: generatedToken
    };

    const updatedAuthorities = [newAuthority, ...authorities];
    setAuthorities(updatedAuthorities);

    const updatedRequests = pendingRequests.filter(req => req.id !== request.id);
    setPendingRequests(updatedRequests);
    localStorage.setItem('dealflow_pending_registrations', JSON.stringify(updatedRequests));

    setNotification(`Approved ${request.name}! Access Token: ${generatedToken}`);
    
    setTimeout(() => {
      setNotification('');
    }, 10000);

    return generatedToken;
  };

  const handleRejectRequest = (requestId) => {
    const updatedRequests = pendingRequests.filter(req => req.id !== requestId);
    setPendingRequests(updatedRequests);
    localStorage.setItem('dealflow_pending_registrations', JSON.stringify(updatedRequests));
    setSelectedRequestForApproval(null);
  };

  const handleRefresh = () => {
    setIsRotating(true);
    setTimeout(() => {
      try {
        const savedAuths = localStorage.getItem(STORAGE_KEY);
        setAuthorities(savedAuths ? JSON.parse(savedAuths) : DEFAULT_AUTHORITIES);
        const savedReqs = localStorage.getItem('dealflow_pending_registrations');
        setPendingRequests(savedReqs ? JSON.parse(savedReqs) : []);
      } catch {
        setAuthorities(DEFAULT_AUTHORITIES);
        setPendingRequests([]);
      }
      setIsRotating(false);
    }, 400);
  };

  const handleDelete = (id) => {
    setAuthorities(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className={styles.adminSection}>
      
      {/* Approval Modal Popup Window */}
      <AnimatePresence>
        {selectedRequestForApproval && (
          <ApprovalModal 
            request={selectedRequestForApproval}
            onClose={() => setSelectedRequestForApproval(null)}
            onApprove={handleApproveRequest}
            onReject={handleRejectRequest}
          />
        )}
      </AnimatePresence>

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

      {/* Pending Approvals Notice Banner */}
      {pendingRequests.length > 0 && (
        <div style={{
          background: 'linear-gradient(90deg, #00221C 0%, #14352D 100%)',
          color: '#ffffff',
          borderRadius: '10px',
          padding: '12px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          boxShadow: '0 4px 14px rgba(0, 34, 28, 0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <UserCheck size={20} color="#50E3C2" />
            <div>
              <div style={{ fontWeight: 700, fontSize: '13.5px' }}>
                {pendingRequests.length} Pending Registration Approval{pendingRequests.length > 1 ? 's' : ''}
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.75)' }}>
                New staff member registrations require role assignment and token authorization.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedRequestForApproval(pendingRequests[0])}
            style={{
              background: '#50E3C2',
              color: '#00221C',
              border: 'none',
              padding: '8px 14px',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '12.5px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(80, 227, 194, 0.3)'
            }}
          >
            Review Approval Popup
          </button>
        </div>
      )}

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
          User Provisioning ({pendingRequests.length})
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
            <div className={styles.listHeader}>
              <h3 className={styles.listTitle}>Pending Registration Requests ({pendingRequests.length})</h3>
            </div>
            
            <AnimatePresence>
              {notification && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={styles.successBanner}
                  style={{ marginBottom: '16px' }}
                >
                  <CheckCircle2 size={15} color="#438A7E" />
                  <span style={{ userSelect: 'all' }}>{notification}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pendingRequests.length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--ink-60)', textAlign: 'center', padding: '20px' }}>
                  No pending registration requests.
                </div>
              ) : (
                pendingRequests.map(req => (
                  <PendingRequestCard 
                    key={req.id} 
                    request={req} 
                    onOpenModal={() => setSelectedRequestForApproval(req)} 
                  />
                ))
              )}
            </div>
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
                  <th style={{ padding: '10px 14px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Shield size={14} style={{ color: 'var(--viridian)' }} /> Admin
                    </span>
                  </th>
                  <th style={{ padding: '10px 14px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <UserCheck size={14} style={{ color: 'var(--viridian)' }} /> Sales Manager
                    </span>
                  </th>
                  <th style={{ padding: '10px 14px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Briefcase size={14} style={{ color: 'var(--viridian)' }} /> Sales Rep
                    </span>
                  </th>
                  <th style={{ padding: '10px 14px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <CreditCard size={14} style={{ color: 'var(--viridian)' }} /> Finance
                    </span>
                  </th>
                  <th style={{ padding: '10px 14px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <User size={14} style={{ color: 'var(--viridian)' }} /> Customer
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {PERMISSION_MATRIX.map((row, idx) => {
                  const renderCell = (val) => {
                    if (typeof val === 'boolean') {
                      return val ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--viridian)', fontWeight: 600 }}>
                          <CheckCircle2 size={14} /> Full
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#C53030', fontWeight: 500 }}>
                          <X size={14} /> No
                        </span>
                      );
                    }
                    return <span style={{ color: 'var(--ink-80)', fontWeight: 500 }}>{val}</span>;
                  };

                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--burnham)' }}>{row.module}</td>
                      <td style={{ padding: '12px 14px' }}>{renderCell(row.admin)}</td>
                      <td style={{ padding: '12px 14px' }}>{renderCell(row.manager)}</td>
                      <td style={{ padding: '12px 14px' }}>{renderCell(row.rep)}</td>
                      <td style={{ padding: '12px 14px' }}>{renderCell(row.finance)}</td>
                      <td style={{ padding: '12px 14px' }}>{renderCell(row.customer)}</td>
                    </tr>
                  );
                })}
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

function PendingRequestCard({ request, onOpenModal }) {
  return (
    <div style={{ border: '1px solid var(--line)', padding: '14px', borderRadius: '8px', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 600, color: 'var(--burnham)', fontSize: '14px' }}>{request.name}</div>
          <div style={{ color: 'var(--ink-60)', fontSize: '13px' }}>{request.email}</div>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--ink-60)', background: 'var(--paper-2)', padding: '2px 6px', borderRadius: '4px' }}>
          {new Date(request.date || Date.now()).toLocaleDateString()}
        </div>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button 
          onClick={onOpenModal}
          style={{
            background: 'var(--burnham)',
            color: '#fff',
            border: 'none',
            padding: '8px 14px',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <UserCheck size={14} />
          Approve in Popup Window
        </button>
      </div>
    </div>
  );
}

function ApprovalModal({ request, onClose, onApprove, onReject }) {
  const [selectedRole, setSelectedRole] = useState('Sales Representative');
  const [generatedResult, setGeneratedResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const roleDescriptions = {
    'Sales Representative': 'Can create/edit quotations, apply discounts up to auto ceiling, and track allocated inventory.',
    'Sales Manager / Approver': 'Can approve Tier-1 discount overages (up to 20%), view team performance, and reassign pipeline deals.',
    'Finance / Operation User': 'Can approve Tier-2 discount overages (>20%), manage warehouse allocations, billing & subscriptions.',
    'System Administrator': 'Full system governance: provision roles, modify discount ceilings, view audit ledgers & manage backend settings.',
  };

  const handleConfirmApproval = () => {
    const token = onApprove(request, selectedRole);
    setGeneratedResult({
      token,
      name: request.name,
      email: request.email,
      role: selectedRole
    });
  };

  const handleCopy = () => {
    if (generatedResult?.token) {
      navigator.clipboard.writeText(generatedResult.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 34, 28, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '520px',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.22)',
          border: '1px solid var(--line, rgba(8, 32, 26, 0.15))',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          background: 'var(--paper-2, #EAF0EE)',
          padding: '20px 24px',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#C07A38', marginBottom: '2px' }}>
              Registration Approval Request
            </div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--burnham, #00221C)' }}>
              {generatedResult ? 'Access Token Generated' : `Approve ${request.name}`}
            </h3>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--ink-60, #666)',
              padding: '6px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {generatedResult ? (
            /* Success Token Screen */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(67, 138, 126, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--viridian, #438A7E)' }}>
                  <CheckCircle2 size={28} />
                </div>
              </div>
              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', color: 'var(--burnham)' }}>Registration Request Approved!</h4>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--ink-60)' }}>
                  Provide the following access token to <strong>{generatedResult.name}</strong> ({generatedResult.email}) for role <strong>{generatedResult.role}</strong>.
                </p>
              </div>

              {/* Token Display Box */}
              <div style={{
                background: 'var(--burnham, #00221C)',
                borderRadius: '10px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                border: '1px solid rgba(67, 138, 126, 0.3)',
                marginTop: '8px'
              }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--viridian, #438A7E)', fontWeight: 700 }}>
                    Staff Access Token
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: '20px', fontWeight: 700, color: '#50E3C2', letterSpacing: '0.05em' }}>
                    {generatedResult.token}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopy}
                  style={{
                    background: copied ? 'var(--viridian, #438A7E)' : 'rgba(255,255,255,0.12)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                  <span>{copied ? 'Copied!' : 'Copy Token'}</span>
                </button>
              </div>

              <div style={{ marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    width: '100%',
                    background: 'var(--burnham)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '13.5px',
                    cursor: 'pointer'
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Request Review Screen */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* Applicant Card */}
              <div style={{
                background: 'var(--paper-2, #F4F7F6)',
                border: '1px solid var(--line, rgba(8,32,26,0.1))',
                borderRadius: '10px',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--burnham)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <User size={14} /> {request.name}
                  </span>
                  <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--viridian)', background: 'rgba(67,138,126,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                    {request.id || 'REQ-REGISTER'}
                  </span>
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--ink-60)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={13} /> {request.email}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--ink-60)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={13} /> Requested on: {new Date(request.date || Date.now()).toLocaleString()}
                </div>
              </div>

              {/* Role Selection */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--burnham)' }}>
                  Assign Staff Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className={styles.select}
                  style={{ width: '100%', height: '42px', fontSize: '13.5px', fontWeight: 600 }}
                >
                  <option value="Sales Representative">Sales Representative</option>
                  <option value="Sales Manager / Approver">Sales Manager / Approver</option>
                  <option value="Finance / Operation User">Finance / Operation User</option>
                  <option value="System Administrator">System Administrator</option>
                </select>
              </div>

              {/* Role Scope Preview */}
              <div style={{
                background: 'rgba(67, 138, 126, 0.08)',
                borderLeft: '4px solid var(--viridian, #438A7E)',
                padding: '10px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                color: 'var(--burnham)',
                lineHeight: 1.4
              }}>
                <strong>Role Scope:</strong> {roleDescriptions[selectedRole]}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => onReject(request.id)}
                  style={{
                    flex: 1,
                    background: '#fff',
                    color: '#B04A3D',
                    border: '1px solid rgba(176, 74, 61, 0.3)',
                    padding: '10px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Reject Request
                </button>

                <button
                  type="button"
                  onClick={handleConfirmApproval}
                  style={{
                    flex: 2,
                    background: 'var(--burnham, #00221C)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(0, 34, 28, 0.2)'
                  }}
                >
                  <CheckCircle2 size={16} />
                  Approve & Issue Token
                </button>
              </div>

            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

