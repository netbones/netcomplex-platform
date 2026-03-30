'use client';

interface HoneypotProps {
  name?: string;
}

export function Honeypot({ name = 'website' }: HoneypotProps) {
  return (
    <div className="absolute -left-[9999px]" aria-hidden="true">
      <input type="text" name={name} defaultValue="" tabIndex={-1} autoComplete="off" />
    </div>
  );
}

export function checkHoneypot(formData: FormData, fieldName = 'website'): boolean {
  const value = formData.get(fieldName);
  return Boolean(value && typeof value === 'string' && value.length > 0);
}
