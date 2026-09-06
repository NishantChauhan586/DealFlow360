export default function ConfirmDialog({
  isOpen,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  onConfirm,
  onClose,
}) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 34, 28, 0.45)',
        backdropFilter: 'blur(3px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: 'var(--paper)',
          borderRadius: '8px',
          width: '100%',
          maxWidth: '440px',
          boxShadow: '0 20px 45px rgba(0, 34, 28, 0.22)',
          border: '1px solid var(--line)',
          overflow: 'hidden',
          padding: '24px',
        }}
      >
        <h3
          style={{
            margin: '0 0 10px 0',
            fontFamily: 'var(--serif)',
            fontSize: '18px',
            color: isDestructive ? 'var(--rose)' : 'var(--burnham)',
          }}
        >
          {title}
        </h3>
        <p style={{ margin: '0 0 20px 0', fontSize: '13.5px', color: 'var(--ink-60)', lineHeight: 1.5 }}>
          {message}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {cancelText}
          </button>
          <button
            type="button"
            className="btn"
            style={{
              background: isDestructive ? 'var(--rose)' : 'var(--burnham)',
              color: '#fff',
            }}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
