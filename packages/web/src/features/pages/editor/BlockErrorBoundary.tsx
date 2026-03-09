import { Component, type ErrorInfo, type ReactNode } from 'react';

interface BlockErrorBoundaryProps {
  blockId: string;
  blockType: string;
  children: ReactNode;
}

interface BlockErrorBoundaryState {
  hasError: boolean;
}

export class BlockErrorBoundary extends Component<BlockErrorBoundaryProps, BlockErrorBoundaryState> {
  state: BlockErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): BlockErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Keep one bad block from crashing the editor canvas.
    console.error('Block render failure', {
      blockId: this.props.blockId,
      blockType: this.props.blockType,
      error,
      info,
    });
  }

  componentDidUpdate(prevProps: BlockErrorBoundaryProps): void {
    if (this.state.hasError && prevProps.blockId !== this.props.blockId) {
      this.setState({ hasError: false });
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="rounded border border-rose-300 bg-rose-50 p-2 text-xs text-rose-700">
          Block failed to render. Select and edit this block to recover.
        </div>
      );
    }
    return this.props.children;
  }
}
