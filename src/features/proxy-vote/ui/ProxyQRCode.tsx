'use client';

import { QRCodeSVG } from 'qrcode.react';
import { Copy } from 'lucide-react';

interface ProxyQRCodeProps {
  referenceCode: string;
  size?: number;
}

const MIN_QR_SIZE = 44;

export function ProxyQRCode({ referenceCode, size = 132 }: ProxyQRCodeProps) {
  const effective = Math.max(size, MIN_QR_SIZE);

  function handleCopy() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(referenceCode);
    }
  }

  return (
    <div className="inline-flex flex-col gap-2 rounded-lg border border-soralia-primary/20 bg-soralia-primary/5 p-3">
      <span className="text-sm text-gray-500">QR Reference</span>
      <QRCodeSVG
        value={referenceCode}
        size={effective}
        bgColor="#FFFFFF"
        fgColor="#000000"
        level="H"
        includeMargin={false}
      />
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex min-h-[44px] items-center justify-center gap-1 self-end rounded px-2 text-xs text-gray-500 hover:bg-gray-100"
      >
        <Copy className="h-3 w-3" aria-hidden />
        <span>Copy</span>
        <span className="sr-only">Copy reference code</span>
      </button>
      <span className="text-sm font-medium text-gray-900">{referenceCode}</span>
    </div>
  );
}
