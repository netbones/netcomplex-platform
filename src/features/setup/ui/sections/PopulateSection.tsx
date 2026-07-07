'use client';

import { useState } from 'react';

interface PopulateSectionProps {
  tenantId: string;
}

interface PendingInvite {
  email: string;
  role: string;
}

interface CsvRow {
  name: string;
  email: string;
  role: string;
}

const ROLE_OPTIONS = [
  { value: 'BOARD', label: 'Board Member' },
  { value: 'RESIDENT', label: 'Resident' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'ADMIN', label: 'Admin' },
];

const SERVICE_ROLES = [
  { value: 'PROVIDER', label: 'Provider' },
  { value: 'AGENT', label: 'Agent' },
  { value: 'MANAGER', label: 'Manager' },
];

function MissionCard({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
        <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      </div>
      <div className="px-4 py-3" data-testid={`mission-${id}`}>
        {children}
      </div>
    </div>
  );
}

export default function PopulateSection({ tenantId }: PopulateSectionProps) {
  // ── 1. Invite Board Members ────────────────────────────────────
  const [boardEmail, setBoardEmail] = useState('');
  const [boardRole, setBoardRole] = useState('BOARD');
  const [boardInvites, setBoardInvites] = useState<PendingInvite[]>([]);
  const [boardSending, setBoardSending] = useState(false);
  const [boardSent, setBoardSent] = useState(false);

  // ── 2. Invite Residents ────────────────────────────────────────
  const [residentEmails, setResidentEmails] = useState('');
  const [residentSending, setResidentSending] = useState(false);
  const [residentSent, setResidentSent] = useState(false);

  // ── 3. Import Members (CSV) ────────────────────────────────────
  const [csvPreview, setCsvPreview] = useState<CsvRow[]>([]);
  const [csvError, setCsvError] = useState('');
  const [csvImporting, setCsvImporting] = useState(false);

  // ── 4. Service Accounts ────────────────────────────────────────
  const [svcEmail, setSvcEmail] = useState('');
  const [svcName, setSvcName] = useState('');
  const [svcRole, setSvcRole] = useState('PROVIDER');
  const [svcSending, setSvcSending] = useState(false);
  const [svcSent, setSvcSent] = useState(false);

  // ── Send invitation helper ─────────────────────────────────────
  async function sendInvitation(email: string, name: string, role: string): Promise<boolean> {
    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          role,
          residencyType: 'OWNER',
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // ── 1. Board Member: add to list ───────────────────────────────
  function addBoardInvite() {
    if (!boardEmail || !boardEmail.includes('@')) return;
    setBoardInvites(prev => [...prev, { email: boardEmail, role: boardRole }]);
    setBoardEmail('');
    setBoardRole('BOARD');
  }

  // ── 1. Board Member: remove from list ────────────────────────
  function removeBoardInvite(index: number) {
    setBoardInvites(prev => prev.filter((_, i) => i !== index));
  }

  // ── 1. Board Member: send all ─────────────────────────────────
  async function sendBoardInvites() {
    setBoardSending(true);
    for (const invite of boardInvites) {
      await sendInvitation(invite.email, invite.email.split('@')[0], invite.role);
    }
    setBoardSending(false);
    setBoardSent(true);
  }

  // ── 2. Resident: send batch ────────────────────────────────────
  async function sendResidentInvites() {
    const emails = residentEmails
      .split(/[,\n]/)
      .map(e => e.trim())
      .filter(e => e.includes('@'));
    if (emails.length === 0) return;

    setResidentSending(true);
    for (const email of emails) {
      await sendInvitation(email, email.split('@')[0], 'RESIDENT');
    }
    setResidentSending(false);
    setResidentSent(true);
  }

  // ── 3. CSV: parse file ─────────────────────────────────────────
  function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvError('');

    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const text = ev.target?.result as string;
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length < 2) {
          setCsvError('CSV must have a header row and at least one data row.');
          return;
        }

        const headers = lines[0]
          .toLowerCase()
          .split(',')
          .map(h => h.trim());
        const nameIdx = headers.findIndex(h => h === 'name');
        const emailIdx = headers.findIndex(h => h === 'email');
        const roleIdx = headers.findIndex(h => h === 'role');

        if (emailIdx === -1) {
          setCsvError('CSV must contain an "email" column.');
          return;
        }

        const rows: CsvRow[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim());
          const email = cols[emailIdx];
          if (!email || !email.includes('@')) continue;
          rows.push({
            name: nameIdx >= 0 ? cols[nameIdx] || email.split('@')[0] : email.split('@')[0],
            email,
            role: roleIdx >= 0 ? cols[roleIdx] || 'RESIDENT' : 'RESIDENT',
          });
        }

        setCsvPreview(rows);
      } catch {
        setCsvError('Failed to parse CSV file.');
      }
    };
    reader.readAsText(file);
  }

  // ── 3. CSV: bulk import ────────────────────────────────────────
  async function importCsvMembers() {
    setCsvImporting(true);
    for (const row of csvPreview) {
      await sendInvitation(row.email, row.name, row.role);
    }
    setCsvImporting(false);
  }

  // ── 4. Service Account: send ───────────────────────────────────
  async function sendServiceInvite() {
    if (!svcEmail || !svcEmail.includes('@')) return;
    setSvcSending(true);
    await sendInvitation(svcEmail, svcName || svcEmail.split('@')[0], svcRole);
    setSvcSending(false);
    setSvcSent(true);
    setSvcEmail('');
    setSvcName('');
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-gray-900">Populate Your Community</h3>
        <span className="text-xs text-gray-500">5 optional missions</span>
      </div>

      {/* 1. Invite Board Members */}
      <MissionCard
        id="populate-board"
        title="Invite Board Members"
        description="Send invitations to board members or committee members."
      >
        {boardSent ? (
          <p className="text-sm text-green-600">✓ Invitations sent!</p>
        ) : (
          <>
            <div className="flex gap-2">
              <input
                type="email"
                value={boardEmail}
                onChange={e => setBoardEmail(e.target.value)}
                placeholder="board@example.com"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-soralia-primary focus:border-soralia-primary"
                onKeyDown={e => e.key === 'Enter' && addBoardInvite()}
              />
              <select
                value={boardRole}
                onChange={e => setBoardRole(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {ROLE_OPTIONS.filter(r => r.value === 'BOARD' || r.value === 'ADMIN').map(r => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <button
                onClick={addBoardInvite}
                disabled={!boardEmail.includes('@')}
                className="px-4 py-2 text-sm font-medium text-white bg-soralia-primary rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>

            {boardInvites.length > 0 && (
              <div className="space-y-2">
                {boardInvites.map((inv, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-soralia-primary/10 flex items-center justify-center">
                        <span className="text-xs font-medium text-soralia-primary">
                          {inv.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{inv.email}</p>
                        <p className="text-xs text-gray-500">{inv.role}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeBoardInvite(i)}
                      className="text-gray-400 hover:text-red-500 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                <button
                  onClick={sendBoardInvites}
                  disabled={boardSending}
                  className="w-full py-2 text-sm font-medium text-white bg-soralia-primary rounded-lg hover:opacity-90 disabled:opacity-50"
                >
                  {boardSending ? 'Sending…' : `Send ${boardInvites.length} invitation(s)`}
                </button>
              </div>
            )}
          </>
        )}
      </MissionCard>

      {/* 2. Invite Residents */}
      <MissionCard
        id="populate-residents"
        title="Invite Residents"
        description="Paste or type resident emails, one per line or comma-separated."
      >
        {residentSent ? (
          <p className="text-sm text-green-600">✓ Invitations sent!</p>
        ) : (
          <>
            <textarea
              value={residentEmails}
              onChange={e => setResidentEmails(e.target.value)}
              placeholder="resident1@example.com&#10;resident2@example.com"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-soralia-primary focus:border-soralia-primary resize-y"
            />
            <button
              onClick={sendResidentInvites}
              disabled={residentSending || residentEmails.trim().length === 0}
              className="mt-2 w-full py-2 text-sm font-medium text-white bg-soralia-primary rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {residentSending ? 'Sending…' : 'Send Resident Invitations'}
            </button>
          </>
        )}
      </MissionCard>

      {/* 3. Import Members (CSV) */}
      <MissionCard
        id="populate-import"
        title="Import Members"
        description="Upload a CSV with name, email, and role columns to bulk-invite members."
      >
        <input
          type="file"
          accept=".csv"
          onChange={handleCsvUpload}
          className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
        />

        {csvError && <p className="text-sm text-red-600 mt-2">{csvError}</p>}

        {csvPreview.length > 0 && (
          <>
            <div className="mt-3 max-h-48 overflow-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Email</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {csvPreview.map((row, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-gray-900">{row.name}</td>
                      <td className="px-3 py-2 text-gray-600">{row.email}</td>
                      <td className="px-3 py-2 text-gray-600">{row.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={importCsvMembers}
              disabled={csvImporting}
              className="mt-2 w-full py-2 text-sm font-medium text-white bg-soralia-primary rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {csvImporting ? 'Importing…' : `Import ${csvPreview.length} Members`}
            </button>
          </>
        )}
      </MissionCard>

      {/* 4. Assign Roles */}
      <MissionCard
        id="populate-roles"
        title="Assign Roles"
        description="Manage user roles from the admin panel."
      >
        <p className="text-sm text-gray-500 mb-2">
          To assign roles to existing members, visit the{' '}
          <a href="/admin/users" className="text-soralia-primary underline">
            User Management
          </a>{' '}
          page.
        </p>
        <p className="text-xs text-gray-400">
          Roles: Admin, Manager, Board Member, Resident, Provider, Agent
        </p>
      </MissionCard>

      {/* 5. Create Service Accounts */}
      <MissionCard
        id="populate-service"
        title="Create Service Accounts"
        description="Set up accounts for vendors, agents, and staff."
      >
        {svcSent ? (
          <p className="text-sm text-green-600">✓ Service account invitation sent!</p>
        ) : (
          <>
            <div className="space-y-2">
              <input
                type="text"
                value={svcName}
                onChange={e => setSvcName(e.target.value)}
                placeholder="Full name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-soralia-primary focus:border-soralia-primary"
              />
              <input
                type="email"
                value={svcEmail}
                onChange={e => setSvcEmail(e.target.value)}
                placeholder="provider@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-soralia-primary focus:border-soralia-primary"
              />
              <select
                value={svcRole}
                onChange={e => setSvcRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {SERVICE_ROLES.map(r => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={sendServiceInvite}
              disabled={svcSending || !svcEmail.includes('@')}
              className="mt-2 w-full py-2 text-sm font-medium text-white bg-soralia-primary rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {svcSending ? 'Sending…' : 'Send Invitation'}
            </button>
          </>
        )}
      </MissionCard>
    </div>
  );
}
