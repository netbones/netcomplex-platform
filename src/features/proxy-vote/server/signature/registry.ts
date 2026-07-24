import type { SignatureProvider } from '../../model/types';
import { InternalSignatureAdapter } from './internal-adapter';
import type { SignatureProviderAdapter } from './provider-adapter';

export const signatureProviders: Map<SignatureProvider, SignatureProviderAdapter> = new Map();

// TODO: Phase-TBD — implement LIGHTNING adapter (LNbits message-signing extension)
export const LIGHTNING_PROVIDER = 'LIGHTNING' as const;
// TODO: Phase-TBD — implement NOSTR adapter (NIP-98 event signing)
export const NOSTR_PROVIDER = 'NOSTR' as const;
// TODO: Phase-TBD — implement DOCUSIGN adapter (recipient flow via API)
export const DOCUSIGN_PROVIDER = 'DOCUSIGN' as const;
// TODO: Phase-TBD — implement ADOBE_SIGN adapter (OAuth + agreement API)
export const ADOBE_SIGN_PROVIDER = 'ADOBE_SIGN' as const;
// TODO: Phase-TBD — implement PASSKEY adapter (WebAuthn assertion)
export const PASSKEY_PROVIDER = 'PASSKEY' as const;
// TODO: Phase-TBD — implement PGP adapter (server-side GPG verification)
export const PGP_PROVIDER = 'PGP' as const;
// TODO: Phase-TBD — implement GOV_EID adapter (national eID integration — TBD country)
export const GOV_EID_PROVIDER = 'GOV_EID' as const;

signatureProviders.set('INTERNAL', new InternalSignatureAdapter());

export function getSignatureAdapter(provider: SignatureProvider): SignatureProviderAdapter {
  const adapter = signatureProviders.get(provider);
  if (!adapter) {
    throw new Error(`Signature provider not available: ${provider}`);
  }
  return adapter;
}
