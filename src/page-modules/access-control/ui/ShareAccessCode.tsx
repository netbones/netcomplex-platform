'use client';

import { Copy, Share2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { AccessCodePublic, VisitorListItem } from '@entities/access-control';
import { buildShareMessage } from '@entities/access-control';

interface Props {
  visitor: VisitorListItem;
  accessCode: AccessCodePublic;
  propertyLabel: string;
  onClose: () => void;
  onDelete: () => Promise<void>;
}

export function ShareAccessCode({ visitor, accessCode, propertyLabel, onClose, onDelete }: Props) {
  const message = buildShareMessage({
    visitorName: visitor.fullName,
    propertyLabel,
    code: accessCode.code,
    shareUrl: accessCode.shareUrl,
  });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(accessCode.code);
      toast.success('Code copied');
    } catch {
      toast.error('Could not copy');
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Access code', text: message, url: accessCode.shareUrl });
        return;
      } catch {
        // fall through
      }
    }
    try {
      await navigator.clipboard.writeText(message);
      toast.success('Share message copied');
    } catch {
      toast.error('Could not share');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-lg p-5">
        <h2 className="text-base font-semibold m-0 mb-1">Share access</h2>
        <p className="text-sm text-gray-500 m-0 mb-4">Send this code to {visitor.fullName}</p>

        <div className="text-center py-6 bg-gray-50 rounded-lg mb-4">
          <p className="text-3xl font-semibold tracking-widest m-0">{accessCode.code}</p>
          <p className="text-xs text-gray-500 mt-2 m-0 break-all">{accessCode.shareUrl}</p>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => void copy()}
            className="flex-1 border border-gray-300 rounded-md py-2.5 text-sm font-medium flex items-center justify-center gap-1.5"
          >
            <Copy className="w-4 h-4" /> Copy
          </button>
          <button
            type="button"
            onClick={() => void share()}
            className="flex-1 bg-indigo-600 text-white rounded-md py-2.5 text-sm font-medium flex items-center justify-center gap-1.5"
          >
            <Share2 className="w-4 h-4" /> Share
          </button>
        </div>

        <pre className="text-xs bg-gray-50 border border-gray-200 rounded-md p-3 whitespace-pre-wrap mb-4">
          {message}
        </pre>

        <button
          type="button"
          onClick={() => void onDelete()}
          className="w-full text-red-600 text-sm font-medium py-2 flex items-center justify-center gap-1.5"
        >
          <Trash2 className="w-4 h-4" /> Delete visit
        </button>
        <a href="/messages" className="block text-center text-sm text-indigo-600 mt-2">
          No access received? Report the issue here
        </a>
        <button
          type="button"
          onClick={onClose}
          className="w-full mt-3 border border-gray-300 rounded-md py-2 text-sm"
        >
          Done
        </button>
      </div>
    </div>
  );
}
