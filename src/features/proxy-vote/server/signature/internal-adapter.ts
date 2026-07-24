import type { SignatureEvidence, SignatureProvider } from '../../model/types';
import type { SignatureProviderAdapter, SignInput } from './provider-adapter';

export class SignatureError extends Error {
  override readonly name = 'SignatureError';
  constructor(message: string) {
    super(message);
  }
}

export class InternalSignatureAdapter implements SignatureProviderAdapter {
  async sign(mode: 'draw' | 'type', input: SignInput): Promise<SignatureEvidence> {
    if (mode === 'draw') {
      const dataUrl = input.signatureDataUrl;
      if (typeof dataUrl !== 'string' || dataUrl.length === 0) {
        throw new SignatureError('signatureDataUrl required for draw mode');
      }
      return {
        provider: 'INTERNAL',
        mode: 'draw',
        signatureDataUrl: dataUrl,
        timestamp: new Date().toISOString(),
      };
    }

    const name = input.typedName;
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new SignatureError('typedName required for type mode');
    }
    return {
      provider: 'INTERNAL',
      mode: 'type',
      typedName: name,
      timestamp: new Date().toISOString(),
    };
  }

  async verify(evidence: SignatureEvidence | null | undefined): Promise<boolean> {
    if (evidence === null || evidence === undefined) return false;
    if (evidence.provider !== 'INTERNAL') return false;

    if (evidence.mode === 'draw') {
      return typeof evidence.signatureDataUrl === 'string' && evidence.signatureDataUrl.length > 0;
    }
    if (evidence.mode === 'type') {
      return typeof evidence.typedName === 'string' && evidence.typedName.trim().length > 0;
    }
    return false;
  }

  getProvider(): SignatureProvider {
    return 'INTERNAL';
  }
}

export const signWithInternal = (
  mode: 'draw' | 'type',
  input: SignInput
): Promise<SignatureEvidence> => new InternalSignatureAdapter().sign(mode, input);

export const verifyInternalSignature = (
  evidence: SignatureEvidence | null | undefined
): Promise<boolean> => new InternalSignatureAdapter().verify(evidence);

export const getProvider = (): SignatureProvider => new InternalSignatureAdapter().getProvider();
