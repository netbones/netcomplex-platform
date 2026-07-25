/**
 * jsdom-safe mock for react-signature-canvas (Wave 0 — Phase 125 proxy-vote).
 *
 * The real module requires a CanvasRenderingContext2D which jsdom does not
 * fully implement. Tests that exercise SignatureCanvas should import via
 * `vi.mock('react-signature-canvas', () => import('./__mocks__/signature-canvas'))`.
 */

import type { ComponentType, ForwardedRef } from 'react';

interface MockedSignaturePadProps {
  ref?: ForwardedRef<unknown>;
  onEnd?: () => void;
  canvasProps?: { className?: string };
  penColor?: string;
}

function MockedSignaturePad(props: MockedSignaturePadProps) {
  const instance = {
    isEmpty: () => false,
    clear: () => undefined,
    toDataURL: (_type?: string) => 'data:image/png;base64,mock-signature-pad-data',
    on: () => undefined,
    off: () => undefined,
  };
  if (typeof props.ref === 'function') {
    props.ref(instance as unknown as Record<string, unknown>);
  } else if (props.ref && typeof props.ref === 'object' && 'current' in props.ref) {
    (props.ref as { current: unknown }).current = instance;
  }
  return {
    type: 'div',
    props: {
      className: props.canvasProps?.className ?? 'mock-signature-pad',
      'data-testid': 'signature-pad',
    },
  } as unknown as { type: string; props: Record<string, unknown> };
}

const SignaturePadComponent: ComponentType<MockedSignaturePadProps> =
  MockedSignaturePad as unknown as ComponentType<MockedSignaturePadProps>;

export default SignaturePadComponent;
export { MockedSignaturePad, MockedSignaturePad as SignaturePad };
