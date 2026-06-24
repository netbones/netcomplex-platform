'use client';

import { useState, useCallback } from 'react';
import { ImageUpload } from '@shared/ui';
import { Plus, Trash2, GripVertical, User } from 'lucide-react';

interface SocialAccount {
  platform: string;
  url: string;
}

interface ExperienceItem {
  id: string;
  title: string;
  organization: string;
  description: string;
  startDate: string;
  endDate?: string;
}

export interface ProfileData {
  intro?: string;
  socialAccounts?: SocialAccount[];
  experience?: ExperienceItem[];
  headerImage?: string;
  featuredContentPromoDismissed?: boolean;
}

interface TabbedProfileProps {
  name: string;
  email: string;
  avatar: string | undefined;
  phone: string;
  profileData: ProfileData;
  onSave: (data: {
    name: string;
    email: string;
    phone: string;
    avatar: string;
    profileData: ProfileData;
  }) => Promise<void>;
}

const TABS = [
  { id: 'basic', label: 'Basic Information' },
  { id: 'intro', label: 'Personal Introduction' },
  { id: 'social', label: 'Social Accounts' },
  { id: 'experience', label: 'Experience' },
] as const;

const SOCIAL_PLATFORMS = [
  'GitHub',
  'LinkedIn',
  'Twitter',
  'Instagram',
  'Facebook',
  'YouTube',
  'TikTok',
  'Discord',
  'Medium',
  'Dev.to',
  'Stack Overflow',
  'Dribbble',
  'Behance',
];

export function TabbedProfile({
  name,
  email,
  avatar,
  phone,
  profileData,
  onSave,
}: TabbedProfileProps) {
  const [activeTab, setActiveTab] = useState<string>('basic');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editName, setEditName] = useState(name);
  const [editEmail, setEditEmail] = useState(email);
  const [editPhone, setEditPhone] = useState(phone);
  const [editAvatar, setEditAvatar] = useState(avatar ?? '');
  const [editIntro, setEditIntro] = useState(profileData.intro ?? '');
  const [editSocialAccounts, setEditSocialAccounts] = useState<SocialAccount[]>(
    profileData.socialAccounts ?? []
  );
  const [editExperience, setEditExperience] = useState<ExperienceItem[]>(
    profileData.experience ?? []
  );

  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: editName,
        email: editEmail,
        phone: editPhone,
        avatar: editAvatar,
        profileData: {
          intro: editIntro,
          socialAccounts: editSocialAccounts,
          experience: editExperience,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = useCallback((url: string) => {
    setEditAvatar(url);
  }, []);

  // ── Social Accounts ──────────────────────────────────────────
  const addSocialAccount = () => {
    setEditSocialAccounts([...editSocialAccounts, { platform: '', url: '' }]);
  };

  const updateSocialAccount = (idx: number, field: keyof SocialAccount, value: string) => {
    setEditSocialAccounts(prev => prev.map((a, i) => (i === idx ? { ...a, [field]: value } : a)));
  };

  const removeSocialAccount = (idx: number) => {
    setEditSocialAccounts(prev => prev.filter((_, i) => i !== idx));
  };

  // ── Experience ───────────────────────────────────────────────
  const addExperience = () => {
    setEditExperience([
      ...editExperience,
      { id: crypto.randomUUID(), title: '', organization: '', description: '', startDate: '' },
    ]);
  };

  const updateExperience = (idx: number, field: keyof ExperienceItem, value: string) => {
    setEditExperience(prev => prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)));
  };

  const removeExperience = (idx: number) => {
    setEditExperience(prev => prev.filter((_, i) => i !== idx));
  };

  const handleDragStart = (idx: number) => setDragIndex(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === idx) return;
    setEditExperience(prev => {
      const next = [...prev];
      const [item] = next.splice(dragIndex, 1);
      next.splice(idx, 0, item);
      return next;
    });
    setDragIndex(idx);
  };
  const handleDragEnd = () => setDragIndex(null);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      {/* Tab Header */}
      <div className="border-b border-gray-100">
        <div className="flex items-center px-6 py-4 border-b border-gray-100">
          <User className="w-5 h-5 text-indigo-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">My Profile</h2>
        </div>
        <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <nav className="flex px-2 min-w-max" role="tablist">
            {TABS.map(tab => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6 space-y-4">
        {/* Basic Information */}
        {activeTab === 'basic' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Name</label>
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                Email
              </label>
              <input
                type="email"
                value={editEmail}
                onChange={e => setEditEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={editPhone}
                onChange={e => setEditPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Personal Introduction */}
        {activeTab === 'intro' && (
          <div className="space-y-4">
            <ImageUpload value={editAvatar} onChange={handleAvatarChange} label="Avatar" />
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                Introduction
              </label>
              <textarea
                value={editIntro}
                onChange={e => setEditIntro(e.target.value)}
                placeholder="Please fill in some details about yourself"
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500 resize-y"
              />
            </div>
          </div>
        )}

        {/* Social Accounts */}
        {activeTab === 'social' && (
          <div className="space-y-4">
            {editSocialAccounts.length === 0 && (
              <p className="text-sm text-gray-500">No social accounts added yet.</p>
            )}
            {editSocialAccounts.map((account, idx) => (
              <div key={idx} className="flex gap-3 items-start">
                <div className="w-44 shrink-0">
                  <input
                    type="text"
                    value={account.platform}
                    onChange={e => updateSocialAccount(idx, 'platform', e.target.value)}
                    placeholder="Platform"
                    list={`social-platforms-${idx}`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <datalist id={`social-platforms-${idx}`}>
                    {SOCIAL_PLATFORMS.map(p => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={account.url}
                    onChange={e => updateSocialAccount(idx, 'url', e.target.value)}
                    placeholder="/yourhandle or @username"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <button
                  onClick={() => removeSocialAccount(idx)}
                  className="mt-5 p-2 text-gray-400 hover:text-red-500 transition"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              onClick={addSocialAccount}
              className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 transition"
            >
              <Plus className="w-4 h-4" />
              Add Social Account
            </button>
          </div>
        )}

        {/* Experience */}
        {activeTab === 'experience' && (
          <div className="space-y-4">
            {editExperience.length === 0 && (
              <p className="text-sm text-gray-500">
                No experience added yet. You can maintain your career or educational experience
                here.
              </p>
            )}
            {editExperience.map((exp, idx) => (
              <div
                key={exp.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={e => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                className="flex gap-3 items-start border border-gray-200 rounded-lg p-4 bg-gray-50 cursor-grab active:cursor-grabbing"
              >
                <div className="mt-1 text-gray-400">
                  <GripVertical className="w-4 h-4" />
                </div>
                <div className="flex-1 space-y-3">
                  <input
                    type="text"
                    value={exp.title}
                    onChange={e => updateExperience(idx, 'title', e.target.value)}
                    placeholder="Title (e.g., Software Engineer)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    value={exp.organization}
                    onChange={e => updateExperience(idx, 'organization', e.target.value)}
                    placeholder="Organization (e.g., Acme Corp)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <textarea
                    value={exp.description}
                    onChange={e => updateExperience(idx, 'description', e.target.value)}
                    placeholder="Description"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500 resize-y"
                  />
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={exp.startDate}
                        onChange={e => updateExperience(idx, 'startDate', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">End Date</label>
                      <input
                        type="date"
                        value={exp.endDate ?? ''}
                        onChange={e => updateExperience(idx, 'endDate', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removeExperience(idx)}
                  className="mt-1 p-2 text-gray-400 hover:text-red-500 transition"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              onClick={addExperience}
              className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 transition"
            >
              <Plus className="w-4 h-4" />
              Add an Experience
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-gray-100">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
