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
  Copy,
  Check,
  ShieldAlert,
  AtSign,
  KeyRound,
  ShieldCheck
} from 'lucide-react';
import { 
  generateAuthorityUsername, 
  getStoredAuthorities, 
  saveStoredAuthorities, 
  DEFAULT_AUTHORITIES,
  STORAGE_KEY
} from '../../utils/authorityAuth';
import styles from '../../pages/AuthorityManagement.module.css';

export default function AuthorityManagement() {
  const [authorities, setAuthorities] = useState(() => getStoredAuthorities());

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Sales Representative');
  const [notification, setNotification] = useState('');
  const [isRotating, setIsRotating] = useState(false);
  const [copiedField, setCopiedField] = useState('');

  // Newly appointed credentials modal state
  const [createdCredentials, setCreatedCredentials] = useState(null);

  // Compute next Authority ID
  const nextIdNumber = authorities.length + 1;
  const currentAuthId = `AUTH-${String(nextIdNumber).padStart(3, '0')}`;

  // Live generated username preview
  const liveUsername = fullName.trim() 
    ? generateAuthorityUsername(fullName, role, authorities)
    : '';

  useEffect(() => {
    saveStoredAuthorities(authorities);
  }, [authorities]);

  const handleAppoint = (e) => {
    e.preventDefault();

    if (!fullName.trim()) {
      setNotification('Please enter full name.');
      setTimeout(() => setNotification(''), 3000);
      return;
    }

    if (!email.trim()) {
      setNotification('Please enter official email.');
      setTimeout(() => setNotification(''), 3000);
      return;
    }

    const generatedUser = generateAuthorityUsername(fullName, role, authorities);
    const tempPassword = currentAuthId;

    const newAuthority = {
      id: currentAuthId,
      authorityId: currentAuthId,
      fullName: fullName.trim(),
      name: fullName.trim(),
      email: email.trim(),
      role: role,
      username: generatedUser,
      password: tempPassword,
      isFirstLogin: true,
      createdAt: new Date().toISOString()
    };

    setAuthorities(prev => [newAuthority, ...prev]);

    // Show credential success modal
    setCreatedCredentials({
      fullName: newAuthority.fullName,
      username: generatedUser,
      tempPassword: tempPassword,
      authorityId: currentAuthId,
      role: role
    });

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
      setAuthorities(getStoredAuthorities());
      setIsRotating(false);
    }, 400);
  };

  const handleDelete = (id) => {
    setAuthorities(prev => prev.filter(a => a.id !== id && a.authorityId !== id));
  };

  const copyToClipboard = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(''), 2000);
  };

  const copyAllCredentials = () => {
    if (!createdCredentials) return;
    const text = `DealFlow360 Authority Account\nUsername: ${createdCredentials.username}\nTemporary Password: ${createdCredentials.tempPassword}\nAuthority ID: ${createdCredentials.authorityId}\nRole: ${createdCredentials.role}`;
    navigator.clipboard.writeText(text);
    setCopiedField('all');
    setTimeout(() => setCopiedField(''), 2000);
  };

  return (
    <div className={styles.adminSection}>
      
      {/* Header */}
      <div className={styles.sectionHeader}>
        <div>
          <div className={styles.eyebrow}>Administration</div>
          <h2 className={styles.title}>Authority management</h2>
          <p className={styles.subtitle}>
            Only admins can provision internal authorities. Customers remain self-service; every authority receives an official email, auto-generated username, and temporary Authority ID password.
          </p>
        </div>
        <div className={styles.topIcon}>
          <Boxes size={28} />
        </div>
      </div>

      {/* Main Grid */}
      <div className={styles.gridTwoCol}>
        
        {/* Left Form */}
        <div className={styles.formCard}>
          <form onSubmit={handleAppoint} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            <div className={styles.formGrid}>
              {/* Full name */}
              <div className={styles.fieldGroup}>
                <label className={styles.label}>
                  <UserPlus size={14} />
                  <span>Full name</span>
                </label>
                <input 
                  type="text"
                  placeholder="e.g. John Doe or Jam Patel"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={styles.input}
                  required
                />
                {liveUsername && (
                  <div className={styles.livePreview}>
                    <AtSign size={12} />
                    <span>Username: <strong>{liveUsername}</strong></span>
                  </div>
                )}
              </div>

              {/* Official email */}
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
                  required
                />
              </div>

              {/* Authority ID */}
              <div className={styles.fieldGroup}>
                <label className={styles.label}>
                  <CreditCard size={14} />
                  <span>Authority ID (Temp Password)</span>
                </label>
                <input 
                  type="text"
                  value={currentAuthId}
                  disabled
                  className={styles.input}
                  style={{ background: '#F5F7F6', color: 'var(--burnham)', fontWeight: 600, fontFamily: 'monospace' }}
                />
              </div>

              {/* Role */}
              <div className={styles.fieldGroup}>
                <label className={styles.label}>
                  <Users size={14} />
                  <span>Role</span>
                </label>
                <select 
                  value={role} 
                  onChange={(e) => setRole(e.target.value)}
                  className={styles.select}
                >
                  <option value="Sales Representative">Sales Representative</option>
                  <option value="Sales Manager / Approver">Sales Manager / Approver</option>
                  <option value="Finance / Operation User">Finance / Operation User</option>
                </select>
              </div>
            </div>

            {/* Appoint Button */}
            <button type="submit" className={styles.appointBtn}>
              <Plus size={16} />
              <span>Appoint authority</span>
            </button>

            {/* Notification Banner */}
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

        {/* Right List Panel */}
        <div className={styles.listCard}>
          <div className={styles.listHeader}>
            <h3 className={styles.listTitle}>Provisioned authorities</h3>
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
              <div key={auth.id || auth.authorityId} className={styles.authorityRow}>
                <div>
                  <div className={styles.authorityName}>{auth.fullName || auth.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--viridian-600)', fontWeight: 600 }}>
                      @{auth.username || 'auth'}
                    </span>
                    <span className={styles.authorityEmail}>· {auth.email}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className={styles.tagAuth}>{auth.authorityId || auth.id}</span>
                  <span className={styles.roleText}>{auth.role}</span>
                  
                  {auth.isFirstLogin ? (
                    <span className={styles.statusBadgePending} title="User has not set permanent password yet">
                      First Login Pending
                    </span>
                  ) : (
                    <span className={styles.statusBadgeActive} title="Permanent password created">
                      Active
                    </span>
                  )}

                  <button 
                    type="button" 
                    onClick={() => handleDelete(auth.id || auth.authorityId)}
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

      {/* Authority Created Credentials Modal */}
      <AnimatePresence>
        {createdCredentials && (
          <div className={styles.credentialBackdrop}>
            <motion.div 
              className={styles.credentialModal}
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ duration: 0.2 }}
            >
              <div className={styles.credentialHeader}>
                <div className={styles.credentialTag}>
                  <ShieldCheck size={14} />
                  <span>Authority Appointed</span>
                </div>
                <h3 className={styles.credentialTitle}>Authority Created Successfully</h3>
              </div>

              <div className={styles.credentialCard}>
                <div className={styles.credentialField}>
                  <span className={styles.credentialFieldLabel}>Full Name</span>
                  <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--burnham)' }}>
                    {createdCredentials.fullName} ({createdCredentials.role})
                  </span>
                </div>

                <div className={styles.credentialField}>
                  <span className={styles.credentialFieldLabel}>Username</span>
                  <div className={styles.credentialFieldValue}>
                    <code className={styles.credentialCode}>{createdCredentials.username}</code>
                    <button 
                      type="button" 
                      onClick={() => copyToClipboard(createdCredentials.username, 'username')}
                      className={styles.copyButton}
                      title="Copy Username"
                    >
                      {copiedField === 'username' ? <Check size={14} color="#2E6A60" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <div className={styles.credentialField}>
                  <span className={styles.credentialFieldLabel}>Temporary Password</span>
                  <div className={styles.credentialFieldValue}>
                    <code className={styles.credentialCode}>{createdCredentials.tempPassword}</code>
                    <button 
                      type="button" 
                      onClick={() => copyToClipboard(createdCredentials.tempPassword, 'password')}
                      className={styles.copyButton}
                      title="Copy Temporary Password"
                    >
                      {copiedField === 'password' ? <Check size={14} color="#2E6A60" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.credentialNotice}>
                <strong>Important:</strong> The user must log in using the above credentials. On first login they will be required to create a permanent password.
              </div>

              <div className={styles.credentialActions}>
                <button 
                  type="button" 
                  onClick={copyAllCredentials} 
                  className={styles.secondaryBtn}
                >
                  {copiedField === 'all' ? 'Copied All!' : 'Copy Credentials'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setCreatedCredentials(null)} 
                  className={styles.primaryBtn}
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
