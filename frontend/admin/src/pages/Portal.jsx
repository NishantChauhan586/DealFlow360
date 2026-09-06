import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  FileText, 
  FilePlus, 
  Eye, 
  Edit3, 
  Trash2, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  X, 
  Sparkles,
  ChevronRight,
  MessageSquare,
  ArrowRight
} from 'lucide-react';

import { 
  getQuotationsForUser, 
  saveQuotation, 
  submitQuotation, 
  deleteQuotation, 
  calculateQuotationTotals,
  subscribeQuotations
} from '../utils/quotationStore';

export default function Portal({ user }) {
  const navigate = useNavigate();

  // Current User Session
  const currentUser = user || (() => {
    try {
      const saved = localStorage.getItem('dealflow_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })();

  // State
  const [quotations, setQuotations] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [activeQuotation, setActiveQuotation] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // B8 Negotiation State
  const [lineComments, setLineComments] = useState({});
  const [counterDiscount, setCounterDiscount] = useState(12);
  const [negotiationNotice, setNegotiationNotice] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    id: null,
    companyName: '',
    title: '',
    description: '',
    currency: 'INR (₹)',
    validUntil: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    discountPercent: 0,
    lineItems: [
      { id: '1', name: '', description: '', quantity: 1, unitPrice: 0 }
    ]
  });

  // Load Quotations on Mount and listen to real-time sync events
  useEffect(() => {
    loadQuotations();
    const unsubscribe = subscribeQuotations(loadQuotations);
    return () => unsubscribe();
  }, [currentUser?.email]);

  const loadQuotations = () => {
    const list = getQuotationsForUser(currentUser?.email);
    setQuotations(list);
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Open Form for Creation
  const handleOpenCreate = () => {
    setFormData({
      id: null,
      companyName: currentUser?.name ? `${currentUser.name} Corp` : 'Acme Corporation',
      title: 'Custom Enterprise Quotation',
      description: 'Request for enterprise software licenses and implementation services.',
      currency: 'INR (₹)',
      validUntil: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      discountPercent: 0,
      lineItems: [
        { id: '1', name: 'Software Enterprise License', description: 'Annual subscription', quantity: 1, unitPrice: 1200 },
        { id: '2', name: 'Onboarding & Setup Service', description: 'Dedicated engineer setup', quantity: 1, unitPrice: 450 }
      ]
    });
    setIsFormOpen(true);
  };

  // Open Form for Editing Draft
  const handleOpenEdit = (quote) => {
    if (quote.status !== 'Draft') {
      showToast('Only Draft quotations can be edited.');
      return;
    }
    setFormData({
      id: quote.id,
      companyName: quote.companyName,
      title: quote.title,
      description: quote.description,
      currency: quote.currency || 'INR (₹)',
      validUntil: quote.validUntil,
      discountPercent: quote.discountPercent || 0,
      lineItems: quote.lineItems.map(item => ({ ...item }))
    });
    setIsFormOpen(true);
  };

  // Open Preview & Negotiation Modal
  const handleOpenPreview = (quote) => {
    setActiveQuotation(quote);
    setCounterDiscount(quote.discountPercent || 12);
    setLineComments({});
    setNegotiationNotice('');
    setIsPreviewOpen(true);
  };

  const handleLineCommentChange = (idx, text) => {
    setLineComments(prev => ({ ...prev, [idx]: text }));
  };

  // B8: Submit Negotiation Counter Request
  const handleSubmitCounterRequest = () => {
    if (!activeQuotation) return;
    const updated = {
      ...activeQuotation,
      status: 'Under Negotiation',
      discountPercent: Number(counterDiscount)
    };
    saveQuotation(updated);
    setActiveQuotation(updated);
    loadQuotations();
    setNegotiationNotice('Counter discount proposal and line comments submitted to sales rep for review.');
  };

  // B8: Confirm Quotation Flow
  const handleConfirmQuotation = () => {
    if (!activeQuotation) return;

    const requestedDiscount = Number(counterDiscount);
    const exceedsThreshold = requestedDiscount > 10; // 10% rep ceiling

    if (exceedsThreshold) {
      // Final terms exceed approval threshold -> Re-enters Approval Flow (B4)
      const updated = {
        ...activeQuotation,
        status: 'Needs Approval',
        discountPercent: requestedDiscount
      };
      saveQuotation(updated);
      setActiveQuotation(updated);
      loadQuotations();
      setNegotiationNotice('Terms confirmed! Since discount exceeds 10% threshold, quotation automatically re-entered the Manager & Finance Approval Flow.');
      setTimeout(() => {
        navigate('/approval');
      }, 2000);
    } else {
      // Terms within threshold -> Moves directly to Fulfillment
      const updated = {
        ...activeQuotation,
        status: 'Confirmed',
        discountPercent: requestedDiscount
      };
      saveQuotation(updated);
      setActiveQuotation(updated);
      loadQuotations();
      setNegotiationNotice('Quotation confirmed! Order successfully routed directly to Warehouse Fulfillment.');
      setTimeout(() => {
        navigate('/fulfillment');
      }, 2000);
    }
  };

  // Form Handlers
  const handleAddLineItem = () => {
    setFormData(prev => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        { id: String(Date.now()), name: '', description: '', quantity: 1, unitPrice: 0 }
      ]
    }));
  };

  const handleRemoveLineItem = (id) => {
    if (formData.lineItems.length <= 1) {
      showToast('Quotation must contain at least one line item.');
      return;
    }
    setFormData(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter(item => item.id !== id)
    }));
  };

  const handleLineItemChange = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      lineItems: prev.lineItems.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === 'quantity' || field === 'unitPrice') {
            const qty = field === 'quantity' ? Math.max(1, parseInt(value) || 0) : item.quantity;
            const price = field === 'unitPrice' ? Math.max(0, parseFloat(value) || 0) : item.unitPrice;
            updated.quantity = qty;
            updated.unitPrice = price;
          }
          return updated;
        }
        return item;
      })
    }));
  };

  const handleSaveDraft = () => {
    if (!formData.companyName.trim()) {
      showToast('Please enter company name.');
      return;
    }
    const saved = saveQuotation(formData, currentUser?.email, 'Draft');
    setIsFormOpen(false);
    loadQuotations();
    showToast(`Draft quotation ${saved.id} saved successfully.`);
  };

  const handleSubmitForReview = () => {
    if (!formData.companyName.trim()) {
      showToast('Please enter company name.');
      return;
    }
    const saved = saveQuotation(formData, currentUser?.email, 'Pending Review');
    setIsFormOpen(false);
    loadQuotations();
    showToast(`Quotation ${saved.id} submitted for sales review.`);
  };

  const handleSubmitExistingDraft = (id) => {
    submitQuotation(id);
    loadQuotations();
    showToast(`Quotation ${id} submitted for sales review.`);
  };

  const handleDeleteDraft = (id) => {
    deleteQuotation(id);
    loadQuotations();
    showToast(`Quotation ${id} deleted.`);
  };

  const currentTotals = calculateQuotationTotals(formData.lineItems, formData.discountPercent);
  const filteredQuotations = quotations.filter(q => 
    q.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
      
      {/* Toast Banner */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              zIndex: 2000,
              background: 'var(--burnham)',
              color: '#FFFFFF',
              padding: '12px 20px',
              borderRadius: '8px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '13px',
              fontWeight: 600
            }}
          >
            <CheckCircle2 size={16} color="#438A7E" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #00221C 0%, #08322A 100%)',
        color: '#FFFFFF',
        borderRadius: '16px',
        padding: '28px 32px',
        marginBottom: '24px',
        boxShadow: '0 10px 30px rgba(0, 34, 28, 0.15)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#438A7E', fontWeight: 700, marginBottom: '6px' }}>
            Client Self-Service Workspace
          </div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: '26px', margin: '0 0 6px 0', color: '#FFFFFF' }}>
            Customer Quotation & Negotiation Portal
          </h1>
          <p style={{ margin: 0, fontSize: '13.5px', color: 'rgba(220, 234, 230, 0.8)', maxWidth: '600px' }}>
            Review proposals, submit line-level change requests, propose counter discounts, or confirm orders.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          style={{
            background: 'var(--viridian)',
            color: '#FFFFFF',
            border: 'none',
            padding: '12px 22px',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '13.5px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(67, 138, 126, 0.3)'
          }}
        >
          <Plus size={18} />
          <span>Request New Quote</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '20px',
        border: '1px solid var(--line)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '240px' }}>
          <input 
            type="text"
            placeholder="Search quotations by ID, company, or status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 14px',
              borderRadius: '6px',
              border: '1px solid var(--line)',
              fontSize: '13px',
              outline: 'none'
            }}
          />
        </div>
        <div style={{ fontSize: '12.5px', color: 'var(--ink-60)', fontWeight: 600 }}>
          Total Quotations: <strong>{filteredQuotations.length}</strong>
        </div>
      </div>

      {/* Quotations Table */}
      {filteredQuotations.length === 0 ? (
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid var(--line)',
          padding: '60px 20px',
          textAlign: 'center'
        }}>
          <FileText size={48} color="var(--viridian)" style={{ marginBottom: '12px', opacity: 0.6 }} />
          <h3 style={{ fontFamily: 'var(--serif)', color: 'var(--burnham)', margin: '0 0 6px 0' }}>No Quotations Found</h3>
          <p style={{ color: 'var(--ink-60)', fontSize: '13.5px', margin: '0 0 20px 0' }}>
            Click below to create your first quotation request.
          </p>
          <button 
            onClick={handleOpenCreate}
            style={{ background: 'var(--burnham)', color: '#FFFFFF', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
          >
            Create Quotation
          </button>
        </div>
      ) : (
        <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid var(--line)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#F8FAF9', borderBottom: '1px solid var(--line)', color: 'var(--burnham)', fontWeight: 700, textAlign: 'left' }}>
                <th style={{ padding: '14px 20px' }}>ID & Company</th>
                <th style={{ padding: '14px 20px' }}>Proposal Title</th>
                <th style={{ padding: '14px 20px' }}>Created</th>
                <th style={{ padding: '14px 20px' }}>Valid Until</th>
                <th style={{ padding: '14px 20px' }}>Total Amount</th>
                <th style={{ padding: '14px 20px' }}>Negotiation Status</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotations.map((q) => (
                <tr key={q.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--burnham)', fontFamily: 'monospace' }}>{q.id}</div>
                    <div style={{ fontSize: '12px', color: 'var(--ink-60)' }}>{q.companyName}</div>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{q.title}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--ink-60)' }}>{q.lineItems?.length || 0} line items</div>
                  </td>
                  <td style={{ padding: '14px 20px', color: 'var(--ink-60)' }}>{q.dateCreated}</td>
                  <td style={{ padding: '14px 20px', color: 'var(--ink-60)' }}>{q.validUntil}</td>
                  <td style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--burnham)', fontSize: '14px' }}>
                    ₹{q.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: 
                        q.status === 'Confirmed' ? '#EDF7F5' :
                        q.status === 'Under Negotiation' ? '#FEF3C7' :
                        q.status === 'Sent' ? '#E0F2FE' : '#F1F5F9',
                      color:
                        q.status === 'Confirmed' ? '#00221C' :
                        q.status === 'Under Negotiation' ? '#D97706' :
                        q.status === 'Sent' ? '#0284C7' : '#475569'
                    }}>
                      {q.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    <button 
                      onClick={() => handleOpenPreview(q)}
                      title="Open Negotiation Screen"
                      style={{ background: 'var(--burnham)', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
                    >
                      Open Negotiation →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* B8 CUSTOMER PORTAL NEGOTIATION SCREEN MODAL */}
      <AnimatePresence>
        {isPreviewOpen && activeQuotation && (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 34, 28, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                background: '#FFFFFF',
                borderRadius: '20px',
                width: '100%',
                maxWidth: '850px',
                maxHeight: '92vh',
                overflowY: 'auto',
                padding: '36px',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
                position: 'relative'
              }}
            >
              <button 
                onClick={() => setIsPreviewOpen(false)}
                style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-60)' }}
              >
                <X size={22} />
              </button>

              {/* B8 Header */}
              <div style={{ borderBottom: '2px solid var(--burnham)', paddingBottom: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--viridian)', fontWeight: 700 }}>
                    B8 Customer Portal Negotiation Screen
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 900, fontFamily: 'var(--serif)', color: 'var(--burnham)' }}>
                    {activeQuotation.title}
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--ink-60)' }}>
                    Customer Account: <strong>{activeQuotation.companyName}</strong>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--burnham)', fontFamily: 'monospace' }}>
                    {activeQuotation.id}
                  </div>
                  {/* Status Indicator: Sent, Under Negotiation, Confirmed */}
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    marginTop: '4px',
                    background: 
                      activeQuotation.status === 'Confirmed' ? '#EDF7F5' :
                      activeQuotation.status === 'Under Negotiation' ? '#FEF3C7' : '#E0F2FE',
                    color:
                      activeQuotation.status === 'Confirmed' ? '#00221C' :
                      activeQuotation.status === 'Under Negotiation' ? '#D97706' : '#0284C7'
                  }}>
                    Status: {activeQuotation.status || 'Sent'}
                  </span>
                </div>
              </div>

              {/* Negotiation Notification Banner */}
              {negotiationNotice && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: negotiationNotice.includes('Approval') ? '#FEF3C7' : '#EDF7F5',
                  color: negotiationNotice.includes('Approval') ? '#D97706' : '#00221C',
                  border: '1px solid rgba(0,0,0,0.1)',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  marginBottom: '20px'
                }}>
                  {negotiationNotice}
                </div>
              )}

              {/* B8 Line Level Comment & Change Request Tool */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '14px', color: 'var(--burnham)', margin: '0 0 10px 0', fontWeight: 700 }}>
                  Itemized Line Items & Change Request Tool
                </h4>
                
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--line)', background: '#F1F6F5', color: 'var(--burnham)', fontWeight: 700 }}>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Line Item</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>Qty</th>
                      <th style={{ padding: '10px', textAlign: 'right' }}>Price</th>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Line Comment / Change Request</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeQuotation.lineItems.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={{ padding: '10px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{item.name}</div>
                          {item.description && <div style={{ fontSize: '11.5px', color: 'var(--ink-60)' }}>{item.description}</div>}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center', fontWeight: 600 }}>{item.quantity}</td>
                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600 }}>${item.unitPrice.toFixed(2)}</td>
                        <td style={{ padding: '10px' }}>
                          <input
                            type="text"
                            placeholder="Add comment or request qty change..."
                            value={lineComments[idx] || ''}
                            onChange={(e) => handleLineCommentChange(idx, e.target.value)}
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              border: '1px solid var(--line)',
                              fontSize: '12px'
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* B8 Counter Discount Proposal Field */}
              <div style={{ background: 'var(--paper-2)', padding: '18px 20px', borderRadius: '12px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--burnham)' }}>
                    Counter Discount Proposal Field
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--ink-60)', marginTop: '2px' }}>
                    Enter your requested target discount % (Threshold: ≤10% auto-applies; &gt;10% routes to approval).
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--burnham)' }}>
                    Requested Discount:
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={counterDiscount}
                    onChange={(e) => setCounterDiscount(e.target.value)}
                    style={{
                      width: '80px',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      fontWeight: 700,
                      fontSize: '14px'
                    }}
                  />
                  <span style={{ fontWeight: 700 }}>%</span>
                </div>
              </div>

              {/* B8 Buttons: Submit Request & Confirm Quotation */}
              <div style={{ borderTop: '2px solid var(--line)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  style={{ background: 'none', border: '1px solid var(--line)', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                >
                  Close Screen
                </button>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={handleSubmitCounterRequest}
                    style={{
                      background: '#EAF0EE',
                      color: 'var(--burnham)',
                      border: '1px solid var(--viridian)',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '13.5px'
                    }}
                  >
                    Submit Request (Counter Proposal)
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmQuotation}
                    style={{
                      background: 'var(--burnham)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '10px 22px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '13.5px',
                      boxShadow: '0 4px 12px rgba(0,34,28,0.2)'
                    }}
                  >
                    Confirm Quotation
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE / EDIT MODAL */}
      <AnimatePresence>
        {isFormOpen && (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 34, 28, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                background: '#FFFFFF',
                borderRadius: '20px',
                width: '100%',
                maxWidth: '850px',
                maxHeight: '90vh',
                overflowY: 'auto',
                padding: '32px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--line)', paddingBottom: '16px' }}>
                <div>
                  <h3 style={{ fontFamily: 'var(--serif)', margin: '0 0 4px 0', fontSize: '22px', color: 'var(--burnham)' }}>
                    {formData.id ? `Edit Draft ${formData.id}` : 'Create New Quotation Request'}
                  </h3>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--ink-60)' }}>
                    Add line items and pricing for proposal generation.
                  </p>
                </div>
                <button 
                  onClick={() => setIsFormOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-60)' }}
                >
                  <X size={22} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--burnham)', marginBottom: '6px' }}>
                    Company Name *
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. Acme Corporation"
                    value={formData.companyName} 
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '13.5px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--burnham)', marginBottom: '6px' }}>
                    Proposal Title *
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. Enterprise Hardware Bundle"
                    value={formData.title} 
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '13.5px', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button 
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid var(--line)', background: '#FFFFFF', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={handleSaveDraft}
                  style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #438A7E', background: '#EDF7F5', color: '#00221C', cursor: 'pointer', fontWeight: 600 }}
                >
                  Save as Draft
                </button>
                <button 
                  type="button"
                  onClick={handleSubmitForReview}
                  style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'var(--burnham)', color: '#FFFFFF', cursor: 'pointer', fontWeight: 600 }}
                >
                  Submit for Approval
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
