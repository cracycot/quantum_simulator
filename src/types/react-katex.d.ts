declare module 'react-katex' {
  import { FC, ReactNode } from 'react';

  interface KaTeXProps {
    math: string;
    errorColor?: string;
    renderError?: (error: Error | TypeError) => ReactNode;
  }

  export const InlineMath: FC<KaTeXProps>;
  export const BlockMath: FC<KaTeXProps>;
}
