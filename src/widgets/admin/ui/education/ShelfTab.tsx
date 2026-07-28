'use client';

import type { EduSettings } from './types';
import { STRIPE_POOL } from './constants';

export function ShelfTab({
  settings,
  onSaveSettings,
}: {
  settings: EduSettings;
  onSaveSettings: (data: EduSettings) => void;
}) {
  const addShelfItem = () => {
    const title = (document.getElementById('shelf-title') as HTMLInputElement)?.value?.trim();
    const author = (document.getElementById('shelf-author') as HTMLInputElement)?.value?.trim();
    const gutId = (document.getElementById('shelf-gutid') as HTMLInputElement)?.value?.trim();
    if (!title || !gutId) return;
    const newShelf = [
      ...settings.shelf,
      {
        title,
        author: author || 'Unknown',
        gutId,
        stripe: STRIPE_POOL[settings.shelf.length % STRIPE_POOL.length],
      },
    ];
    onSaveSettings({ ...settings, shelf: newShelf });
  };

  const removeShelfItem = (i: number) => {
    onSaveSettings({ ...settings, shelf: settings.shelf.filter((_, idx) => idx !== i) });
  };

  return (
    <div>
      <div className="adm-panel">
        <div className="adm-panel-label">Gutenberg shelf — up to 10 titles shown to residents</div>
        <div className="adm-shelf-manager">
          {settings.shelf.map((b, i) => (
            <div key={i} className="adm-shelf-item">
              <div className="adm-shelf-stripe" style={{ background: b.stripe }} />
              <div>
                <div className="adm-shelf-title">{b.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {b.author} · #{b.gutId}
                </div>
              </div>
              <span className="adm-shelf-remove" onClick={() => removeShelfItem(i)}>
                &times;
              </span>
            </div>
          ))}
          <div className="adm-shelf-add">
            <input
              id="shelf-title"
              type="text"
              placeholder="Title"
              style={{ width: 130, fontSize: 12, height: 30 }}
            />
            <input
              id="shelf-author"
              type="text"
              placeholder="Author"
              style={{ width: 100, fontSize: 12, height: 30 }}
            />
            <input
              id="shelf-gutid"
              type="text"
              placeholder="Gutenberg ID"
              style={{ width: 90, fontSize: 12, height: 30 }}
            />
            <button className="adm-icon-btn" onClick={addShelfItem}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
