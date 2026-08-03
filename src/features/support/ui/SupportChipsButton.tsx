'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BadgeCent, Loader2, Send, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@shared/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@shared/ui';
import { apiGet, apiPost } from '@/shared/api/http-client';
import type { SupportTarget } from '../model/schema';

const QUICK_AMOUNTS = [5, 10, 25, 50, 100];

interface SupportChipsButtonProps {
  targetType: SupportTarget;
  targetId: string;
  recipientUserId: string;
  className?: string;
}

interface SupportAggregate {
  totalChips: number;
  supporterCount: number;
  hasSupported: boolean;
  yourChips: number;
}

export function SupportChipsButton({
  targetType,
  targetId,
  recipientUserId,
  className,
}: SupportChipsButtonProps) {
  const [open, setOpen] = useState(false);
  const [aggregate, setAggregate] = useState<SupportAggregate | null>(null);
  const [amount, setAmount] = useState(10);
  const [customAmount, setCustomAmount] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchAggregate = useCallback(async () => {
    try {
      const params = new URLSearchParams({ targetType, targetId });
      const { data } = await apiGet<SupportAggregate>(`/api/support?${params}`);
      setAggregate(data);
    } catch {}
  }, [targetType, targetId]);

  useEffect(() => {
    fetchAggregate();
  }, [fetchAggregate]);

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) {
      setAmount(10);
      setCustomAmount('');
      setIsCustom(false);
      setMessage('');
      setIsAnonymous(false);
    }
  }, []);

  const handleAmountSelect = useCallback((value: number) => {
    setAmount(value);
    setIsCustom(false);
    setCustomAmount('');
  }, []);

  const handleCustomFocus = useCallback(() => {
    setIsCustom(true);
  }, []);

  const handleCustomChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setCustomAmount(val);
    if (val) {
      const parsed = parseInt(val, 10);
      if (parsed > 0) setAmount(parsed);
    }
  }, []);

  const handleSend = useCallback(async () => {
    if (amount <= 0 || isSending) return;

    setIsSending(true);
    try {
      await apiPost('/api/support', {
        targetType,
        targetId,
        recipientUserId,
        chips: amount,
        message: message || undefined,
        isAnonymous,
      });

      setAggregate(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          totalChips: prev.totalChips + amount,
          hasSupported: true,
          yourChips: prev.yourChips + amount,
        };
      });

      toast.success(`Sent ${amount} chips!`);
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send chips');
    } finally {
      setIsSending(false);
    }
  }, [amount, targetType, targetId, recipientUserId, message, isAnonymous, isSending]);

  const displayAmount = isCustom && customAmount ? parseInt(customAmount, 10) : amount;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Support with chips"
          className={cn(
            'flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium transition-colors',
            'hover:bg-amber-50',
            aggregate?.hasSupported ? 'text-amber-500' : 'text-gray-500',
            className
          )}
        >
          <BadgeCent className="h-4 w-4" aria-hidden="true" />
          <span>{aggregate ? aggregate.totalChips : '—'}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" side="top" sideOffset={8} className="w-72 p-0">
        <div className="p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <BadgeCent className="h-4 w-4 text-amber-500" />
            Support with Chips
          </h3>

          {aggregate && aggregate.supporterCount > 0 && (
            <p className="text-xs text-gray-500 mb-3">
              {aggregate.supporterCount} supporter{aggregate.supporterCount !== 1 ? 's' : ''} ·{' '}
              {aggregate.totalChips} total chips
              {aggregate.yourChips > 0 && ` · You sent ${aggregate.yourChips}`}
            </p>
          )}

          <div className="flex gap-1.5 mb-3">
            {QUICK_AMOUNTS.map(n => (
              <button
                key={n}
                type="button"
                onClick={() => handleAmountSelect(n)}
                className={cn(
                  'flex-1 rounded-md py-1.5 text-xs font-medium transition-colors',
                  !isCustom && amount === n
                    ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-300'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                )}
              >
                {n}
              </button>
            ))}
          </div>

          <div className="relative mb-3">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
              <BadgeCent className="h-3.5 w-3.5" />
            </span>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              placeholder="Custom amount"
              value={isCustom ? customAmount : ''}
              onFocus={handleCustomFocus}
              onChange={handleCustomChange}
              className={cn(
                'w-full rounded-md border py-2 pl-8 pr-3 text-sm outline-none transition-colors',
                isCustom
                  ? 'border-amber-300 ring-1 ring-amber-200'
                  : 'border-gray-200 focus:border-amber-300'
              )}
            />
          </div>

          <input
            type="text"
            placeholder="Add a message (optional)"
            value={message}
            onChange={e => setMessage(e.target.value)}
            maxLength={280}
            className="w-full rounded-md border border-gray-200 py-2 px-3 text-sm outline-none transition-colors focus:border-amber-300 mb-3"
          />

          <label className="flex items-center gap-2 cursor-pointer mb-4">
            <button
              type="button"
              role="checkbox"
              aria-checked={isAnonymous}
              onClick={() => setIsAnonymous(prev => !prev)}
              className={cn(
                'flex h-4 w-4 items-center justify-center rounded border transition-colors',
                isAnonymous
                  ? 'border-amber-400 bg-amber-400 text-white'
                  : 'border-gray-300 bg-white'
              )}
            >
              {isAnonymous && <Check className="h-3 w-3" />}
            </button>
            <span className="text-xs text-gray-500">Send anonymously</span>
          </label>

          <button
            type="button"
            onClick={handleSend}
            disabled={displayAmount <= 0 || isSending}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors',
              'bg-amber-500 text-white hover:bg-amber-600',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {isSending ? 'Sending...' : `Send ${displayAmount} chips`}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
