'use client';

import { useState, useEffect } from 'react';
import type { PinData, EduSettings } from './types';
import { EMPTY_PIN } from './constants';

export function PinTab({
  settings,
  onSaveSettings,
}: {
  settings: EduSettings;
  onSaveSettings: (data: EduSettings) => void;
}) {
  const [pinForm, setPinForm] = useState<PinData>(EMPTY_PIN);

  useEffect(() => {
    setPinForm(settings.pin);
  }, [settings.pin]);

  const savePin = () => onSaveSettings({ ...settings, pin: pinForm });
  const clearPin = () => onSaveSettings({ ...settings, pin: EMPTY_PIN });

  return (
    <div>
      <div className="adm-pin-current">
        {settings.pin.title ? (
          <>
            <span className="adm-pin-label">Currently pinned</span>
            <div className="adm-pin-title">{settings.pin.title}</div>
            <div className="adm-pin-sub">{settings.pin.sub}</div>
          </>
        ) : (
          <>
            <span
              className="adm-pin-label"
              style={{ background: 'var(--surface-1)', color: 'var(--text-muted)' }}
            >
              No pin set
            </span>
            <div className="adm-pin-title" style={{ color: 'var(--text-muted)' }}>
              No pinned item is showing to residents
            </div>
          </>
        )}
      </div>
      <div className="adm-panel">
        <div className="adm-panel-label">Set pinned item</div>
        <div className="adm-field-row full">
          <div className="adm-field">
            <label>Headline</label>
            <input
              type="text"
              value={pinForm.title}
              onChange={e => setPinForm({ ...pinForm, title: e.target.value })}
              placeholder="e.g. NSFAS 2026 applications are open"
            />
          </div>
        </div>
        <div className="adm-field-row full">
          <div className="adm-field">
            <label>Subtext</label>
            <input
              type="text"
              value={pinForm.sub}
              onChange={e => setPinForm({ ...pinForm, sub: e.target.value })}
              placeholder="e.g. All SA citizens at public universities — closes 31 Jan 2026"
            />
          </div>
        </div>
        <div className="adm-field-row">
          <div className="adm-field">
            <label>Link URL</label>
            <input
              type="text"
              value={pinForm.link}
              onChange={e => setPinForm({ ...pinForm, link: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div className="adm-field">
            <label>Button label</label>
            <input
              type="text"
              value={pinForm.btn}
              onChange={e => setPinForm({ ...pinForm, btn: e.target.value })}
            />
          </div>
        </div>
        <div className="adm-panel-actions">
          <button
            className="adm-icon-btn"
            style={{ width: 'auto', padding: '0 12px' }}
            onClick={clearPin}
          >
            Clear pin
          </button>
          <button
            className="adm-icon-btn"
            style={{
              width: 'auto',
              padding: '0 12px',
              background: 'var(--bg-accent)',
              color: 'white',
            }}
            onClick={savePin}
          >
            Save pin
          </button>
        </div>
      </div>
    </div>
  );
}
