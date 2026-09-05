import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  ShieldCheck, 
  Bell, 
  Key, 
  Check, 
  Smartphone, 
  Laptop, 
  Sliders,
  CheckCircle2,
  X,
  FileText,
  Clock,
  LogOut
} from 'lucide-react';
import { useEnter, CountUp } from '../components/Animations';
import styles from './Profile.module.css';

export default function Profile() {
  const navigate = useNavigate();
  const enterRef = useEnter([]);

  // Active Tab: 'general' | 'governance' | 'notifications' | 'security'
  const [activeTab, setActiveTab] = useState('general');

  // Sign Out Handler
  const handleSignOut = () => {
    showToast('Signing out...');
    setTimeout(() => {
      navigate('/login');
    }, 400);
  };

  // Notification Toast State
  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // General Profile State
  const [formData, setFormData] = useState({
    firstName: 'Sade',
    lastName: 'Adeyemi',
    email: 'sade.adeyemi@dealflow360.io',
    phone: '+1 (555) 382-9014',
    jobTitle: 'Senior Sales Operations Specialist',
    department: 'Commercial Operations',
    region: 'East Region · Americas',
    timezone: 'America/New_York (EST)',
    bio: 'Overseeing enterprise deal structuring, risk evaluation, and quotation governance across Tier-1 enterprise hardware and subscription contracts.',
  });

  // Delegation of Authority State
  const [delegationActive, setDelegationActive] = useState(false);
  const [delegateUser, setDelegateUser] = useState('Rasheed Okafor (Sales Manager)');
  const [delegationUntil, setDelegationUntil] = useState('2026-09-15');

  // Notifications State
  const [notifs, setNotifs] = useState({
    discountBreach: true,
    stalledDeals: true,
    approvalEscalation: true,
    warehouseShortage: false,
    counterOffer: true,
    weeklyDigest: true,
  });

  const toggleNotif = (key) => {
    setNotifs(prev => ({ ...prev, [key]: !prev[key] }));
    showToast(`Notification preference updated`);
  };

  // Security Form State
  const [passwordState, setPasswordState] = useState({
    current: '',
    newPass: '',
    confirmPass: '',
  });

  // Sessions State
  const [sessions, setSessions] = useState([
    { id: 's1', device: 'Chrome on macOS (M3 Max)', location: 'New York, USA', ip: '192.168.1.45', current: true, time: 'Active now' },
    { id: 's2', device: 'DealFlow360 Mobile App · iOS', location: 'Boston, USA', ip: '72.229.28.18', current: false, time: '2 hours ago' },
    { id: 's3', device: 'Safari on iPad Pro', location: 'New York, USA', ip: '192.168.1.52', current: false, time: 'Yesterday at 4:12 PM' },
  ]);

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    showToast('Profile information successfully saved.');
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (!passwordState.current || !passwordState.newPass) {
      showToast('Please fill in both current and new passwords.');
      return;
    }
    if (passwordState.newPass !== passwordState.confirmPass) {
      showToast('New passwords do not match.');
      return;
    }
    setPasswordState({ current: '', newPass: '', confirmPass: '' });
    showToast('Password successfully updated.');
  };

  const revokeSession = (id) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    showToast('Session revoked successfully.');
  };

  const revokeAllOtherSessions = () => {
    setSessions(prev => prev.filter(s => s.current));
    showToast('All other remote sessions have been terminated.');
  };

  return (
    <div ref={enterRef} className={styles.profileContainer}>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className={styles.toastBanner} role="status">
          <div className={styles.toastLeft}>
            <CheckCircle2 size={16} color="var(--viridian-300)" />
            <span>{toastMessage}</span>
          </div>
          <button className={styles.toastClose} onClick={() => setToastMessage('')}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Top User Header Card */}
      <div className={`${styles.userHeaderCard} fade-target`}>
        <div className={styles.userProfileLeft}>
          <div className={styles.avatarContainer}>
            <div className={styles.avatarLarge}>SA</div>
            <div className={styles.avatarBadge} title="Verified Authority">
              <Check size={12} strokeWidth={3} />
            </div>
          </div>

          <div className={styles.userInfo}>
            <h2>{formData.firstName} {formData.lastName}</h2>
            <div className={styles.userRoleRow}>
              <span>{formData.jobTitle}</span>
              <span className={styles.roleDot} />
              <span>{formData.region}</span>
              <span className={styles.roleDot} />
              <span>EMP-8492</span>
            </div>
            <div className={styles.badgesRow}>
              <span className={styles.tierBadge}>
                <ShieldCheck size={13} />
                Tier 2 Commercial Authority
              </span>
              <span className={styles.deptBadge}>{formData.department}</span>
              <span className={styles.deptBadge}>{formData.email}</span>
            </div>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button 
            type="button" 
            className="btn btn-ghost"
            onClick={handleSignOut}
            style={{ color: 'var(--rose)', borderColor: 'rgba(176,74,61,0.2)' }}
          >
            <LogOut size={14} />
            Sign Out
          </button>
          <button 
            type="button" 
            className="btn btn-primary"
            onClick={() => showToast('Activity log exported to CSV.')}
          >
            <FileText size={14} />
            Export Audit Log
          </button>
        </div>
      </div>

      {/* Key Governance Metrics Grid */}
      <div className={`${styles.statsGrid} fade-target`}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Max Discount Ceiling</span>
            <Sliders size={16} className={styles.statIcon} />
          </div>
          <div className={styles.statValue}>
            <CountUp value={15} prefix="" decimals={0} />%
          </div>
          <div className={styles.statSub}>Hardware ceiling allowance</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Single Quote Threshold</span>
            <ShieldCheck size={16} className={styles.statIcon} />
          </div>
          <div className={styles.statValue}>
            $<CountUp value={100} prefix="" decimals={0} />k
          </div>
          <div className={styles.statSub}>Tier 2 self-approval limit</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Commercial Discipline</span>
            <CheckCircle2 size={16} className={styles.statIcon} />
          </div>
          <div className={styles.statValue}>
            <CountUp value={94.2} prefix="" decimals={1} />%
          </div>
          <div className={styles.statSub}>Margin adherence rating</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Approval Turnaround</span>
            <Clock size={16} className={styles.statIcon} />
          </div>
          <div className={styles.statValue}>
            <CountUp value={3.4} prefix="" decimals={1} />h
          </div>
          <div className={styles.statSub}>Average decision velocity</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className={`${styles.tabNav} fade-target`}>
        <button 
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'general' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('general')}
        >
          <User size={15} />
          General Details
        </button>

        <button 
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'governance' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('governance')}
        >
          <ShieldCheck size={15} />
          Commercial Authority & Delegation
        </button>

        <button 
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'notifications' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          <Bell size={15} />
          Governance Alert Triggers
        </button>

        <button 
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'security' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <Key size={15} />
          Security & Active Sessions
        </button>
      </div>

      {/* Tab Content Panels */}
      <div className={styles.tabContent}>
        
        {/* TAB 1: General Details */}
        {activeTab === 'general' && (
          <div className="panel">
            <div className="panel-header">
              <h3>Personal & Operational Profile</h3>
              <span className="tag tag-green">Verified Enterprise Rep</span>
            </div>

            <form onSubmit={handleProfileSubmit} style={{ padding: '22px 24px' }}>
              <div className={styles.formGrid}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>First Name</label>
                  <input 
                    type="text" 
                    className={styles.input}
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    required
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Last Name</label>
                  <input 
                    type="text" 
                    className={styles.input}
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    required
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Official Work Email</label>
                  <input 
                    type="email" 
                    className={styles.input}
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Direct Contact Phone</label>
                  <input 
                    type="text" 
                    className={styles.input}
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Job Title / Operational Role</label>
                  <input 
                    type="text" 
                    className={styles.input}
                    value={formData.jobTitle}
                    onChange={(e) => setFormData({...formData, jobTitle: e.target.value})}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Department</label>
                  <select 
                    className={styles.select}
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                  >
                    <option value="Commercial Operations">Commercial Operations</option>
                    <option value="Enterprise Sales">Enterprise Sales</option>
                    <option value="Revenue Operations">Revenue Operations</option>
                    <option value="Finance & Deal Desk">Finance & Deal Desk</option>
                  </select>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Operating Region</label>
                  <select 
                    className={styles.select}
                    value={formData.region}
                    onChange={(e) => setFormData({...formData, region: e.target.value})}
                  >
                    <option value="East Region · Americas">East Region · Americas</option>
                    <option value="West Region · Americas">West Region · Americas</option>
                    <option value="EMEA · Europe & Middle East">EMEA · Europe & Middle East</option>
                    <option value="APAC · Asia Pacific">APAC · Asia Pacific</option>
                  </select>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Preferred Timezone</label>
                  <select 
                    className={styles.select}
                    value={formData.timezone}
                    onChange={(e) => setFormData({...formData, timezone: e.target.value})}
                  >
                    <option value="America/New_York (EST)">America/New_York (EST)</option>
                    <option value="America/Chicago (CST)">America/Chicago (CST)</option>
                    <option value="America/Los_Angeles (PST)">America/Los_Angeles (PST)</option>
                    <option value="Europe/London (GMT)">Europe/London (GMT)</option>
                  </select>
                </div>

                <div className={`${styles.fieldGroup} ${styles.formGridFull}`}>
                  <label className={styles.label}>Commercial Scope & Bio</label>
                  <textarea 
                    className={styles.textarea}
                    value={formData.bio}
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  />
                </div>
              </div>

              <div style={{ marginTop: 22, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => showToast('Changes discarded.')}>
                  Reset
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: Commercial Authority & Governance */}
        {activeTab === 'governance' && (
          <div className={styles.governanceGrid}>
            <div className="panel">
              <div className="panel-header">
                <h3>Commercial Authority Matrix</h3>
                <span className="tag tag-green">Enforced by Rules Engine</span>
              </div>

              <div className={styles.authorityList}>
                <div className={styles.authorityItem}>
                  <div>
                    <div className={styles.authorityItemTitle}>Hardware Discount Ceiling</div>
                    <div className={styles.authorityItemDesc}>Max autonomous discount on laptops, docks & accessories</div>
                  </div>
                  <div className={styles.authorityItemValue}>15.0%</div>
                </div>

                <div className={styles.authorityItem}>
                  <div>
                    <div className={styles.authorityItemTitle}>Services Discount Ceiling</div>
                    <div className={styles.authorityItemDesc}>Onsite Setup, Consulting & Implementation services</div>
                  </div>
                  <div className={styles.authorityItemValue}>10.0%</div>
                </div>

                <div className={styles.authorityItem}>
                  <div>
                    <div className={styles.authorityItemTitle}>SaaS / Subscription Ceiling</div>
                    <div className={styles.authorityItemDesc}>Fleet Manager, Security Suite recurring licenses</div>
                  </div>
                  <div className={styles.authorityItemValue}>12.0%</div>
                </div>

                <div className={styles.authorityItem}>
                  <div>
                    <div className={styles.authorityItemTitle}>Hard Margin Floor</div>
                    <div className={styles.authorityItemDesc}>Automatic quote rejection if blended margin drops below this</div>
                  </div>
                  <div className={styles.authorityItemValue}>28.5%</div>
                </div>

                <div className={styles.authorityItem}>
                  <div>
                    <div className={styles.authorityItemTitle}>Single Deal Approval Authority</div>
                    <div className={styles.authorityItemDesc}>Maximum total contract value without VP escalation</div>
                  </div>
                  <div className={styles.authorityItemValue}>$100,000</div>
                </div>
              </div>

              <div style={{ padding: '0 18px 18px' }}>
                <div className={styles.ruleBox}>
                  <div className={styles.ruleBoxTitle}>
                    <ShieldCheck size={15} color="var(--viridian-600)" />
                    Deterministic Governance Active
                  </div>
                  <p className={styles.ruleBoxDesc}>
                    Any quotation breaching the 10% Services limit or dropping below the 28.5% margin floor automatically routes to <strong>Rasheed Okafor (Sales Manager)</strong> and then <strong>Finance Deal Desk</strong>.
                  </p>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <h3>Delegation of Authority</h3>
                <span className={`tag ${delegationActive ? 'tag-green' : 'tag-amber'}`}>
                  {delegationActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div style={{ padding: '18px' }}>
                <p style={{ fontSize: '13px', color: 'var(--ink-60)', margin: '0 0 16px', lineHeight: 1.5 }}>
                  Temporarily transfer quotation approval permissions and deal routing during planned leave or travel.
                </p>

                <div className={styles.toggleRow} style={{ padding: '0 0 16px', borderBottom: '1px solid var(--line)' }}>
                  <div className={styles.toggleText}>
                    <h4>Enable Out-of-Office Delegation</h4>
                    <p>Route approvals to designated manager</p>
                  </div>
                  <label className={styles.switch}>
                    <input 
                      type="checkbox" 
                      checked={delegationActive} 
                      onChange={(e) => {
                        setDelegationActive(e.target.checked);
                        showToast(e.target.checked ? 'Delegation of authority enabled.' : 'Delegation disabled.');
                      }}
                    />
                    <span className={styles.slider} />
                  </label>
                </div>

                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Delegate Approver</label>
                    <select 
                      className={styles.select}
                      value={delegateUser}
                      disabled={!delegationActive}
                      onChange={(e) => setDelegateUser(e.target.value)}
                    >
                      <option value="Rasheed Okafor (Sales Manager)">Rasheed Okafor (Sales Manager)</option>
                      <option value="Julia Vance (Deal Desk Lead)">Julia Vance (Deal Desk Lead)</option>
                      <option value="Elena Rostova (VP Commercial)">Elena Rostova (VP Commercial)</option>
                    </select>
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Active Until</label>
                    <input 
                      type="date" 
                      className={styles.input}
                      value={delegationUntil}
                      disabled={!delegationActive}
                      onChange={(e) => setDelegationUntil(e.target.value)}
                    />
                  </div>

                  {delegationActive && (
                    <div className={styles.ruleBox} style={{ margin: '6px 0 0' }}>
                      <div className={styles.ruleBoxTitle}>
                        <Clock size={14} color="var(--viridian-600)" />
                        Delegation Status
                      </div>
                      <p className={styles.ruleBoxDesc}>
                        Pending deals will be routed to {delegateUser} through {delegationUntil}.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Governance Alert Triggers */}
        {activeTab === 'notifications' && (
          <div className={styles.notifCard}>
            <div className={styles.notifHeader}>
              Deterministic Rules & Deal Lifecycle Alerts
            </div>

            <div className={styles.toggleRow}>
              <div className={styles.toggleText}>
                <h4>Discount Ceiling Breaches</h4>
                <p>Instant alert when a line item exceeds its category ceiling (e.g. Services &gt; 10%)</p>
              </div>
              <label className={styles.switch}>
                <input 
                  type="checkbox" 
                  checked={notifs.discountBreach} 
                  onChange={() => toggleNotif('discountBreach')} 
                />
                <span className={styles.slider} />
              </label>
            </div>

            <div className={styles.toggleRow}>
              <div className={styles.toggleText}>
                <h4>Stalled Quotations Alert</h4>
                <p>Flag quotations remaining in Draft or Pending state for more than 7 days</p>
              </div>
              <label className={styles.switch}>
                <input 
                  type="checkbox" 
                  checked={notifs.stalledDeals} 
                  onChange={() => toggleNotif('stalledDeals')} 
                />
                <span className={styles.slider} />
              </label>
            </div>

            <div className={styles.toggleRow}>
              <div className={styles.toggleText}>
                <h4>Approval Chain Escalation</h4>
                <p>Notify when an approval request reaches your tier or requires finance intervention</p>
              </div>
              <label className={styles.switch}>
                <input 
                  type="checkbox" 
                  checked={notifs.approvalEscalation} 
                  onChange={() => toggleNotif('approvalEscalation')} 
                />
                <span className={styles.slider} />
              </label>
            </div>

            <div className={styles.toggleRow}>
              <div className={styles.toggleText}>
                <h4>Customer Counter-Offers</h4>
                <p>Real-time ping when a customer submits a counter-offer from the Customer Portal</p>
              </div>
              <label className={styles.switch}>
                <input 
                  type="checkbox" 
                  checked={notifs.counterOffer} 
                  onChange={() => toggleNotif('counterOffer')} 
                />
                <span className={styles.slider} />
              </label>
            </div>

            <div className={styles.toggleRow}>
              <div className={styles.toggleText}>
                <h4>Warehouse Allocation Shortage</h4>
                <p>Alert when inventory backorder occurs across US-East, EU-Central, or APAC hubs</p>
              </div>
              <label className={styles.switch}>
                <input 
                  type="checkbox" 
                  checked={notifs.warehouseShortage} 
                  onChange={() => toggleNotif('warehouseShortage')} 
                />
                <span className={styles.slider} />
              </label>
            </div>

            <div className={styles.toggleRow}>
              <div className={styles.toggleText}>
                <h4>Weekly Commercial Operations Digest</h4>
                <p>Summary of pipeline health, gross margins, and commercial discipline compliance</p>
              </div>
              <label className={styles.switch}>
                <input 
                  type="checkbox" 
                  checked={notifs.weeklyDigest} 
                  onChange={() => toggleNotif('weeklyDigest')} 
                />
                <span className={styles.slider} />
              </label>
            </div>
          </div>
        )}

        {/* TAB 4: Security & Sessions */}
        {activeTab === 'security' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="two-col">
              {/* Password Management */}
              <div className="panel">
                <div className="panel-header">
                  <h3>Change Password</h3>
                  <span className="tag tag-green">SSO & MFA Enabled</span>
                </div>

                <form onSubmit={handlePasswordSubmit} style={{ padding: '20px 22px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>Current Password</label>
                      <input 
                        type="password" 
                        className={styles.input}
                        placeholder="••••••••••••"
                        value={passwordState.current}
                        onChange={(e) => setPasswordState({...passwordState, current: e.target.value})}
                      />
                    </div>

                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>New Password</label>
                      <input 
                        type="password" 
                        className={styles.input}
                        placeholder="Min 8 chars, 1 number, 1 symbol"
                        value={passwordState.newPass}
                        onChange={(e) => setPasswordState({...passwordState, newPass: e.target.value})}
                      />
                    </div>

                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>Confirm New Password</label>
                      <input 
                        type="password" 
                        className={styles.input}
                        placeholder="Re-enter new password"
                        value={passwordState.confirmPass}
                        onChange={(e) => setPasswordState({...passwordState, confirmPass: e.target.value})}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: 20 }}>
                    <button type="submit" className="btn btn-primary">
                      Update Password
                    </button>
                  </div>
                </form>
              </div>

              {/* Two-Factor & Hardware Key */}
              <div className="panel">
                <div className="panel-header">
                  <h3>Two-Factor Authentication (2FA)</h3>
                  <span className="tag tag-green">Enforced</span>
                </div>

                <div style={{ padding: '20px 22px' }}>
                  <div className={styles.ruleBox}>
                    <div className={styles.ruleBoxTitle}>
                      <ShieldCheck size={16} color="var(--viridian-600)" />
                      Hardware Token Active
                    </div>
                    <p className={styles.ruleBoxDesc}>
                      FIDO2 WebAuthn key (YubiKey 5C NFC) registered on 12 Jan 2026.
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
                    <div className={styles.authorityItem}>
                      <div>
                        <div className={styles.authorityItemTitle}>Authenticator App (TOTP)</div>
                        <div className={styles.authorityItemDesc}>Backup verification code method</div>
                      </div>
                      <span className="tag tag-green">Configured</span>
                    </div>

                    <div className={styles.authorityItem}>
                      <div>
                        <div className={styles.authorityItemTitle}>Recovery Codes</div>
                        <div className={styles.authorityItemDesc}>8 remaining one-time backup keys</div>
                      </div>
                      <button 
                        type="button" 
                        className="btn btn-ghost" 
                        style={{ fontSize: 12, padding: '4px 8px' }}
                        onClick={() => showToast('Generated new backup recovery codes.')}
                      >
                        Regenerate
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Sessions Panel */}
            <div className="panel">
              <div className="panel-header">
                <h3>Active Enterprise Sessions</h3>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  style={{ fontSize: 12, padding: '6px 12px' }}
                  onClick={revokeAllOtherSessions}
                >
                  <LogOut size={13} />
                  Revoke All Other Sessions
                </button>
              </div>

              <div>
                {sessions.map((session) => (
                  <div key={session.id} className={styles.sessionItem}>
                    <div className={styles.sessionDetails}>
                      <div className={styles.sessionIcon}>
                        {session.device.includes('Mobile') ? <Smartphone size={18} /> : <Laptop size={18} />}
                      </div>
                      <div className={styles.sessionMeta}>
                        <div className={styles.sessionDevice}>
                          {session.device}
                          {session.current && <span className={styles.currentSessionBadge}>This Device</span>}
                        </div>
                        <div className={styles.sessionLocation}>
                          {session.location} · IP: {session.ip} · {session.time}
                        </div>
                      </div>
                    </div>

                    {!session.current && (
                      <button 
                        type="button" 
                        className="btn btn-ghost"
                        style={{ fontSize: 12, color: 'var(--rose)' }}
                        onClick={() => revokeSession(session.id)}
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
