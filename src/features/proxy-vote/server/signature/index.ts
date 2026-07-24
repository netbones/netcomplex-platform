export {
  InternalSignatureAdapter,
  SignatureError,
  signWithInternal,
  verifyInternalSignature,
  getProvider,
} from './internal-adapter';

export type { SignatureProviderAdapter, SignInput } from './provider-adapter';

export {
  signatureProviders,
  getSignatureAdapter,
  LIGHTNING_PROVIDER,
  NOSTR_PROVIDER,
  DOCUSIGN_PROVIDER,
  ADOBE_SIGN_PROVIDER,
  PASSKEY_PROVIDER,
  PGP_PROVIDER,
  GOV_EID_PROVIDER,
} from './registry';
