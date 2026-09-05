import React, { useState, useEffect } from 'react';
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
  Shield,
  Building2,
  Calendar,
  DollarSign
} from 'lucide-react';

import { 
  getQuotationsForUser, 
  saveQuotation, 
  submitQuotation, 
  deleteQuotation, 
  calculateQuotationTotals 
} from '../utils/quotationStore';

export default function Portal({ user }) {
  // Current User Session
  const currentUser = user || JSON.parse(localStorage.getItem('dealflow_user') || '{"email":"customer@dealflow360.com","name":"Acme Client","role":"customer"}');

  // State
  const [quotations, setQuotations] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [activeQuotation, setActiveQuotation] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    id: null,
    companyName: '',
    title: '',
    description: '',
    currency: 'USD ($)',
    validUntil: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    discountPercent: 0,
    lineItems: [
      { id: '1', name: '', description: '', quantity: 1, unitPrice: 0 }
    ]
  });

  // Load Quotations on Mount
  useEffect(() => {
    loadQuotations();
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
      currency: 'USD ($)',
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
      currency: quote.currency || 'USD ($)',
      validUntil: quote.validUntil,
      discountPercent: quote.discountPercent || 0,
      lineItems: quote.lineItems.map(item => ({ ...item }))
    });
    setIsFormOpen(true);
  };

  // Open Preview Modal
  const handleOpenPreview = (quote) => {
    setActiveQuotation(quote);
    setIsPreviewOpen(true);
  };

  // Dynamic Line Item Handlers
  const handleAddLineItem = () => {
    setFormData(prev => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        { id: `item_${Date.now()}`, name: '', description: '', quantity: 1, unitPrice: 0 }
      ]
    }));
  };

  const handleRemoveLineItem = (index) => {
    if (formData.lineItems.length <= 1) {
      showToast('A quotation must have at least one line item.');
      return;
    }
    setFormData(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index)
    }));
  };

  const handleLineItemChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.lineItems];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, lineItems: updated };
    });
  };

  // Form Submission Handlers
  const handleSaveDraft = (e) => {
    if (e) e.preventDefault();
    try {
      const saved = saveQuotation({ ...formData, status: 'Draft' }, currentUser);
      loadQuotations();
      setIsFormOpen(false);
      showToast(`Draft quotation ${saved.id} saved successfully.`);
    } catch (err) {
      showToast(err.message || 'Failed to save draft.');
    }
  };

  const handleSubmitForReview = (e) => {
    if (e) e.preventDefault();
    try {
      const saved = saveQuotation({ ...formData, status: 'Pending Review' }, currentUser);
      loadQuotations();
      setIsFormOpen(false);
      showToast(`Quotation ${saved.id} submitted for Admin review!`);
    } catch (err) {
      showToast(err.message || 'Failed to submit quotation.');
    }
  };

  const handleSubmitExistingDraft = (quoteId) => {
    try {
      submitQuotation(quoteId, currentUser);
      loadQuotations();
      showToast(`Quotation ${quoteId} submitted for review!`);
    } catch (err) {
      showToast(err.message || 'Failed to submit quotation.');
    }
  };

  const handleDeleteDraft = (quoteId) => {
    if (window.confirm(`Are you sure you want to delete draft ${quoteId}?`)) {
      try {
        deleteQuotation(quoteId, currentUser);
        loadQuotations();
        showToast(`Draft ${quoteId} deleted.`);
      } catch (err) {
        showToast(err.message || 'Failed to delete draft.');
      }
    }
  };

  // Live Totals calculation for Form Modal
  const currentTotals = calculateQuotationTotals(formData.lineItems, formData.discountPercent);

  // Filtered Quotations List
  const filteredQuotations = quotations.filter(q => 
    q.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.companyName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="portal-container" style={{ padding: '24px 32px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Toast Alert */}
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
              zIndex: 9999,
              background: '#00221C',
              color: '#86B3A9',
              border: '1px solid #438A7E',
              padding: '12px 20px',
              borderRadius: '8px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontWeight: 600,
              fontSize: '13.5px'
            }}
          >
            <Sparkles size={16} />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#FFFFFF',
        padding: '24px 28px',
        borderRadius: '16px',
        border: '1px solid var(--line)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
        marginBottom: '28px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="tag tag-viridian" style={{ background: '#EAEFEF', color: '#438A7E', fontWeight: 700 }}>
              Client Self-Service Portal
            </span>
          </div>
          <h2 style={{ fontFamily: 'var(--serif)', margin: '4px 0', fontSize: '24px', color: 'var(--burnham)' }}>
            My Quotations
          </h2>
          <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--ink-60)' }}>
            Create custom pricing proposals, save drafts, and submit for instant Admin review.
          </p>
        </div>

        <button 
          className="btn btn-primary"
          onClick={handleOpenCreate}
          style={{
            background: 'linear-gradient(135deg, #00221C 0%, #06342B 100%)',
            color: '#FFFFFF',
            padding: '12px 22px',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(0, 34, 28, 0.25)',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          <Plus size={18} />
          <span>Create New Quotation</span>
        </button>
      </div>

      {/* Empty State View */}
      {quotations.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            background: '#FFFFFF',
            border: '2px dashed var(--line)',
            borderRadius: '16px',
            padding: '64px 32px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#EAEFEF',
            color: '#438A7E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <FilePlus size={32} />
          </div>

          <div>
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: '20px', color: 'var(--burnham)', margin: '0 0 6px 0' }}>
              No quotations found.
            </h3>
            <p style={{ margin: 0, color: 'var(--ink-60)', fontSize: '14px', maxWidth: '420px' }}>
              You haven't created any custom quotations yet. Click below to start building your first quotation.
            </p>
          </div>

          <button 
            className="btn btn-primary"
            onClick={handleOpenCreate}
            style={{
              background: '#438A7E',
              color: '#FFFFFF',
              padding: '12px 24px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '14px',
              border: 'none',
              cursor: 'pointer',
              marginTop: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Plus size={18} />
            <span>Create Your First Quotation</span>
          </button>
        </motion.div>
      ) : (
        /* Quotations List Table View */
        <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid var(--line)', overflow: 'hidden' }}>
          
          {/* Table Toolbar */}
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--burnham)' }}>
              All Proposals ({quotations.length})
            </div>
            <input 
              type="text" 
              placeholder="Search by quote # or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid var(--line)',
                fontSize: '13px',
                width: '260px',
                outline: 'none'
              }}
            />
          </div>

          {/* Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
            <thead>
              <tr style={{ background: '#F8FAF9', borderBottom: '1px solid var(--line)', color: 'var(--ink-60)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '14px 20px' }}>Quotation #</th>
                <th style={{ padding: '14px 20px' }}>Title & Company</th>
                <th style={{ padding: '14px 20px' }}>Created Date</th>
                <th style={{ padding: '14px 20px' }}>Valid Until</th>
                <th style={{ padding: '14px 20px' }}>Total Amount</th>
                <th style={{ padding: '14px 20px' }}>Status</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotations.map((q) => (
                <tr key={q.id} style={{ borderBottom: '1px solid var(--line)', transition: 'background 0.15s ease' }}>
                  <td style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--burnham)', fontFamily: 'monospace' }}>
                    {q.id}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{q.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--ink-60)' }}>{q.companyName}</div>
                  </td>
                  <td style={{ padding: '14px 20px', color: 'var(--ink-60)' }}>
                    {q.dateCreated}
                  </td>
                  <td style={{ padding: '14px 20px', color: 'var(--ink-60)' }}>
                    {q.validUntil}
                  </td>
                  <td style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--burnham)', fontSize: '14px' }}>
                    ${q.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
                        q.status === 'Approved' ? '#EDF7F5' :
                        q.status === 'Pending Review' ? '#FEF3C7' :
                        q.status === 'Draft' ? '#F1F5F9' : '#FEE2E2',
                      color:
                        q.status === 'Approved' ? '#00221C' :
                        q.status === 'Pending Review' ? '#D97706' :
                        q.status === 'Draft' ? '#475569' : '#DC2626'
                    }}>
                      {q.status === 'Pending Review' && <Clock size={12} />}
                      {q.status === 'Approved' && <CheckCircle2 size={12} />}
                      {q.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                      <button 
                        onClick={() => handleOpenPreview(q)}
                        title="Preview Quotation Document"
                        style={{ background: '#F1F5F9', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', color: '#475569' }}
                      >
                        <Eye size={15} />
                      </button>

                      {q.status === 'Draft' && (
                        <>
                          <button 
                            onClick={() => handleOpenEdit(q)}
                            title="Edit Draft"
                            style={{ background: '#E0F2FE', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', color: '#0284C7' }}
                          >
                            <Edit3 size={15} />
                          </button>
                          <button 
                            onClick={() => handleSubmitExistingDraft(q.id)}
                            title="Submit for Approval"
                            style={{ background: '#DCFCE7', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', color: '#15803D' }}
                          >
                            <Send size={15} />
                          </button>
                          <button 
                            onClick={() => handleDeleteDraft(q.id)}
                            title="Delete Draft"
                            style={{ background: '#FEE2E2', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', color: '#DC2626' }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE / EDIT QUOTATION MODAL */}
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
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              style={{
                background: '#FFFFFF',
                borderRadius: '20px',
                width: '100%',
                maxWidth: '850px',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
                padding: '32px'
              }}
            >
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--line)', paddingBottom: '16px' }}>
                <div>
                  <h3 style={{ fontFamily: 'var(--serif)', margin: '0 0 4px 0', fontSize: '22px', color: 'var(--burnham)' }}>
                    {formData.id ? `Edit Draft ${formData.id}` : 'Create New Quotation'}
                  </h3>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--ink-60)' }}>
                    Add line items, quantities, and pricing to generate a proposal.
                  </p>
                </div>
                <button 
                  onClick={() => setIsFormOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-60)' }}
                >
                  <X size={22} />
                </button>
              </div>

              {/* Form Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--burnham)', marginBottom: '6px' }}>
                    Customer Name
                  </label>
                  <input 
                    type="text" 
                    value={currentUser?.name || 'Client User'} 
                    disabled 
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--line)', background: '#F8FAF9', fontSize: '13.5px', color: 'var(--ink-60)' }}
                  />
                </div>

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
                    Quotation Title *
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. Q4 Cloud Hardware Upgrade"
                    value={formData.title} 
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '13.5px', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--burnham)', marginBottom: '6px' }}>
                    Valid Until Date
                  </label>
                  <input 
                    type="date" 
                    value={formData.validUntil} 
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '13.5px', outline: 'none' }}
                  />
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--burnham)', marginBottom: '6px' }}>
                  Proposal Description / Scope
                </label>
                <textarea 
                  rows={2}
                  placeholder="Provide scope details or specific client requirements..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '13.5px', outline: 'none', resize: 'vertical' }}
                />
              </div>

              {/* LINE ITEMS SECTION */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--burnham)', fontWeight: 700 }}>
                    Product / Service Line Items
                  </h4>
                  <button 
                    type="button"
                    onClick={handleAddLineItem}
                    style={{ background: '#EDF7F5', border: '1px solid #438A7E', color: '#00221C', padding: '6px 14px', borderRadius: '6px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Plus size={14} />
                    <span>Add Line Item</span>
                  </button>
                </div>

                {formData.lineItems.map((item, index) => (
                  <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1.2fr 1.2fr 40px', gap: '10px', alignItems: 'center', background: '#F8FAF9', padding: '12px', borderRadius: '8px', marginBottom: '8px', border: '1px solid var(--line)' }}>
                    <div>
                      <input 
                        type="text" 
                        placeholder="Item Name *"
                        value={item.name}
                        onChange={(e) => handleLineItemChange(index, 'name', e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--line)', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <input 
                        type="text" 
                        placeholder="Description (optional)"
                        value={item.description}
                        onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--line)', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <input 
                        type="number" 
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--line)', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <input 
                        type="number" 
                        min="0"
                        placeholder="Price ($)"
                        value={item.unitPrice}
                        onChange={(e) => handleLineItemChange(index, 'unitPrice', e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--line)', fontSize: '13px' }}
                      />
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--burnham)', fontSize: '13.5px', textAlign: 'right' }}>
                      ${((item.quantity || 1) * (item.unitPrice || 0)).toFixed(2)}
                    </div>
                    <div>
                      <button 
                        type="button"
                        onClick={() => handleRemoveLineItem(index)}
                        style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', padding: '4px' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* FINANCIAL TOTALS SUMMARY */}
              <div style={{ background: '#F1F6F5', padding: '16px 20px', borderRadius: '12px', border: '1px solid #DCEAE6', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--ink-60)', display: 'block' }}>Discount (%)</label>
                    <input 
                      type="number" 
                      min="0"
                      max="100"
                      value={formData.discountPercent}
                      onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value })}
                      style={{ width: '80px', padding: '6px', borderRadius: '6px', border: '1px solid var(--line)', fontSize: '13px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '24px', textAlign: 'right' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--ink-60)' }}>Subtotal</div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--burnham)' }}>${currentTotals.subtotal.toFixed(2)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--ink-60)' }}>Tax (10%)</div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--burnham)' }}>${currentTotals.tax.toFixed(2)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--ink-60)' }}>Grand Total</div>
                    <div style={{ fontWeight: 900, fontSize: '18px', color: '#438A7E', fontFamily: 'var(--serif)' }}>${currentTotals.grandTotal.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button 
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid var(--line)', background: '#FFFFFF', color: 'var(--ink-60)', cursor: 'pointer', fontWeight: 600, fontSize: '13.5px' }}
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={handleSaveDraft}
                  style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #438A7E', background: '#EDF7F5', color: '#00221C', cursor: 'pointer', fontWeight: 600, fontSize: '13.5px' }}
                >
                  Save as Draft
                </button>
                <button 
                  type="button"
                  onClick={handleSubmitForReview}
                  style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #00221C 0%, #06342B 100%)', color: '#FFFFFF', cursor: 'pointer', fontWeight: 600, fontSize: '13.5px', boxShadow: '0 4px 12px rgba(0,34,28,0.2)' }}
                >
                  Submit for Approval
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DOCUMENT PREVIEW MODAL */}
      <AnimatePresence>
        {isPreviewOpen && activeQuotation && (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 34, 28, 0.6)',
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
                maxWidth: '750px',
                maxHeight: '90vh',
                overflowY: 'auto',
                padding: '40px',
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

              {/* Preview Header */}
              <div style={{ borderBottom: '2px solid var(--burnham)', paddingBottom: '20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'var(--serif)', color: 'var(--burnham)' }}>
                    DealFlow360
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--viridian)', fontWeight: 600 }}>
                    Official Proposal Document
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--burnham)', fontFamily: 'monospace' }}>
                    {activeQuotation.id}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--ink-60)' }}>
                    Date: {activeQuotation.dateCreated}
                  </div>
                </div>
              </div>

              {/* Client Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px', background: '#F8FAF9', padding: '16px', borderRadius: '10px' }}>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-60)', fontWeight: 700 }}>Prepared For</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--burnham)' }}>{activeQuotation.companyName}</div>
                  <div style={{ fontSize: '13px', color: 'var(--ink)' }}>{activeQuotation.customerName}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-60)', fontWeight: 700 }}>Proposal Details</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--burnham)' }}>{activeQuotation.title}</div>
                  <div style={{ fontSize: '12.5px', color: 'var(--ink-60)' }}>Valid Until: {activeQuotation.validUntil}</div>
                </div>
              </div>

              {/* Itemized Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--line)', background: '#F1F6F5', color: 'var(--burnham)', fontWeight: 700 }}>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Item & Description</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Unit Price</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {activeQuotation.lineItems.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '12px 10px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{item.name}</div>
                        {item.description && <div style={{ fontSize: '12px', color: 'var(--ink-60)' }}>{item.description}</div>}
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ padding: '12px 10px', textAlign: 'right' }}>${item.unitPrice.toFixed(2)}</td>
                      <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 700 }}>${item.lineTotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div style={{ width: '280px', marginLeft: 'auto', borderTop: '2px solid var(--burnham)', paddingTop: '12px', fontSize: '13.5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span>Subtotal:</span>
                  <span>${activeQuotation.subtotal.toFixed(2)}</span>
                </div>
                {activeQuotation.discountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: '#D97706' }}>
                    <span>Discount ({activeQuotation.discountPercent}%):</span>
                    <span>-${activeQuotation.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span>Tax (10%):</span>
                  <span>${activeQuotation.tax.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--line)', fontWeight: 900, fontSize: '16px', color: 'var(--burnham)' }}>
                  <span>Grand Total:</span>
                  <span>${activeQuotation.grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Footer */}
              <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--ink-60)' }}>
                  Status: <strong>{activeQuotation.status}</strong>
                </span>
                <button 
                  onClick={() => setIsPreviewOpen(false)}
                  style={{ background: 'var(--burnham)', color: '#FFFFFF', border: 'none', padding: '8px 20px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Close Preview
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
