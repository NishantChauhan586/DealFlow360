import { useState, useRef } from 'react';
import { IconUpload, IconImage, IconTrash, IconCheck } from '../Icons';

const PRESET_IMAGES = [
  {
    name: 'Enterprise Laptop 14"',
    url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&auto=format&fit=crop&q=80',
    category: 'Hardware',
  },
  {
    name: 'Thunderbolt 4 Dock',
    url: 'https://images.unsplash.com/photo-1544652478-6653e09f18a2?w=400&auto=format&fit=crop&q=80',
    category: 'Hardware',
  },
  {
    name: 'Mechanical Keyboard',
    url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&auto=format&fit=crop&q=80',
    category: 'Accessories',
  },
  {
    name: '4K Ultra-Wide Monitor',
    url: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&auto=format&fit=crop&q=80',
    category: 'Hardware',
  },
  {
    name: 'Rackmount Server Node',
    url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&auto=format&fit=crop&q=80',
    category: 'Infrastructure',
  },
  {
    name: 'Enterprise Cloud Platform',
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&auto=format&fit=crop&q=80',
    category: 'Software',
  },
  {
    name: 'Cybersecurity Shield Suite',
    url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=400&auto=format&fit=crop&q=80',
    category: 'Software',
  },
  {
    name: 'Ergonomic Workspace Chair',
    url: 'https://images.unsplash.com/photo-1580481077190-7361346d1808?w=400&auto=format&fit=crop&q=80',
    category: 'Furniture',
  },
];

export default function ProductImageUploader({ value, onChange }) {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'url' | 'presets'
  const [urlInput, setUrlInput] = useState(value && !value.startsWith('data:') ? value : '');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please choose a valid image file (JPEG, PNG, WebP, SVG).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      onChange(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleApplyUrl = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
    }
  };

  const handleRemove = () => {
    onChange('');
    setUrlInput('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Current Image Preview Banner if an image is set */}
      {value ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: 'var(--paper-2)',
            border: '1px solid var(--line)',
            borderRadius: '6px',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', overflow: 'hidden' }}>
            <img
              src={value}
              alt="Product Preview"
              style={{
                width: '64px',
                height: '64px',
                objectFit: 'cover',
                borderRadius: '6px',
                border: '1px solid var(--line)',
                background: '#fff',
                flexShrink: 0,
              }}
              onError={(e) => {
                e.target.style.opacity = '0.4';
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', overflow: 'hidden' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--burnham)' }}>
                Product Image Attached
              </span>
              <span
                style={{
                  fontSize: '11.5px',
                  color: 'var(--ink-60)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '320px',
                }}
              >
                {value.startsWith('data:')
                  ? 'Local image (Base64 data format)'
                  : value}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--viridian-600)', fontWeight: 600 }}>
                ✓ Ready for display in catalog & quotes
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRemove}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: '#fff',
              border: '1px solid var(--line)',
              color: 'var(--rose)',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              flexShrink: 0,
            }}
            title="Remove this image"
          >
            <IconTrash style={{ width: 14, height: 14 }} />
            Remove
          </button>
        </div>
      ) : null}

      {/* Mode Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          background: 'var(--paper-2)',
          padding: '4px',
          borderRadius: '6px',
          border: '1px solid var(--line)',
          width: 'fit-content',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          style={{
            background: activeTab === 'upload' ? '#fff' : 'transparent',
            color: activeTab === 'upload' ? 'var(--burnham)' : 'var(--ink-60)',
            border: activeTab === 'upload' ? '1px solid var(--line)' : '1px solid transparent',
            boxShadow: activeTab === 'upload' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            borderRadius: '4px',
            padding: '5px 12px',
            fontSize: '12px',
            fontWeight: activeTab === 'upload' ? 600 : 500,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <IconUpload style={{ width: 13, height: 13 }} />
          Upload File
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('url')}
          style={{
            background: activeTab === 'url' ? '#fff' : 'transparent',
            color: activeTab === 'url' ? 'var(--burnham)' : 'var(--ink-60)',
            border: activeTab === 'url' ? '1px solid var(--line)' : '1px solid transparent',
            boxShadow: activeTab === 'url' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            borderRadius: '4px',
            padding: '5px 12px',
            fontSize: '12px',
            fontWeight: activeTab === 'url' ? 600 : 500,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <IconImage style={{ width: 13, height: 13 }} />
          Image URL
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('presets')}
          style={{
            background: activeTab === 'presets' ? '#fff' : 'transparent',
            color: activeTab === 'presets' ? 'var(--burnham)' : 'var(--ink-60)',
            border: activeTab === 'presets' ? '1px solid var(--line)' : '1px solid transparent',
            boxShadow: activeTab === 'presets' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            borderRadius: '4px',
            padding: '5px 12px',
            fontSize: '12px',
            fontWeight: activeTab === 'presets' ? 600 : 500,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <IconCheck style={{ width: 13, height: 13 }} />
          Quick Presets
        </button>
      </div>

      {/* Tab 1: Upload File */}
      {activeTab === 'upload' && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? 'var(--viridian)' : 'var(--line)'}`,
              borderRadius: '6px',
              padding: '24px 20px',
              textAlign: 'center',
              background: dragOver ? 'var(--viridian-100)' : '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'var(--paper-2)',
                color: 'var(--burnham)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '10px',
              }}
            >
              <IconUpload style={{ width: 20, height: 20 }} />
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--burnham)' }}>
              Click to upload or drag & drop image
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--ink-40)', marginTop: '4px' }}>
              PNG, JPG, WebP, or SVG up to 5MB
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Image URL */}
      {activeTab === 'url' && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="url"
            placeholder="https://images.unsplash.com/... or your CDN URL"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleApplyUrl();
              }
            }}
            style={{
              flex: 1,
              padding: '9px 12px',
              border: '1px solid var(--line)',
              borderRadius: '4px',
              fontSize: '13px',
              outline: 'none',
              background: '#fff',
            }}
          />
          <button
            type="button"
            onClick={handleApplyUrl}
            style={{
              background: 'var(--burnham)',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              padding: '0 16px',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Apply
          </button>
        </div>
      )}

      {/* Tab 3: Quick Presets */}
      {activeTab === 'presets' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
            gap: '8px',
            maxHeight: '180px',
            overflowY: 'auto',
            padding: '4px',
          }}
        >
          {PRESET_IMAGES.map((preset) => {
            const isSelected = value === preset.url;
            return (
              <div
                key={preset.url}
                onClick={() => onChange(preset.url)}
                style={{
                  border: isSelected ? '2px solid var(--viridian)' : '1px solid var(--line)',
                  borderRadius: '6px',
                  padding: '6px',
                  background: isSelected ? 'var(--viridian-100)' : '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                }}
              >
                <img
                  src={preset.url}
                  alt={preset.name}
                  style={{
                    width: '100%',
                    height: '60px',
                    objectFit: 'cover',
                    borderRadius: '4px',
                  }}
                />
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: isSelected ? 'var(--viridian-600)' : 'var(--ink)',
                    textAlign: 'center',
                    lineHeight: 1.2,
                  }}
                >
                  {preset.name}
                </span>
                {isSelected && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      background: 'var(--viridian)',
                      color: '#fff',
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <IconCheck style={{ width: 11, height: 11 }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
