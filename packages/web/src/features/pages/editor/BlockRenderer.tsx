/**
 * Maps block type to component. Renders blocks in edit or preview mode.
 */

import type { BlockType } from '@replica-pages/blocks';
import { useEditor } from './EditorContext';
import { getUniversalStyleObject, hasUniversalProps } from './universal-props';
import {
  BlockText,
  BlockImage,
  BlockButton,
  BlockDivider,
  BlockSpacer,
  BlockVideo,
  BlockShapeRectangle,
  BlockShapeCircle,
  BlockCountdown,
  BlockTable,
  BlockForm,
  BlockCustomHtml,
  BlockSection,
  BlockContainer,
  BlockGrid,
  BlockColumns,
  BlockStack,
  BlockHero,
  BlockFeatures,
  BlockTestimonials,
  BlockFaq,
  BlockLogos,
} from './blocks';

interface BlockRendererProps {
  blockId: string;
  isDropTarget?: boolean;
}

export function BlockRenderer({ blockId, isDropTarget }: BlockRendererProps) {
  const { content, previewMode, page, breakpoint } = useEditor();
  const block = content.blocks[blockId];
  if (!block) return null;

  const editMode = !previewMode;
  const baseProps = (block.props ?? {}) as Record<string, unknown>;
  const overrides = baseProps.overrides as Record<string, Record<string, unknown>> | undefined;
  const override = overrides?.[breakpoint];
  const props = override ? { ...baseProps, ...override } : baseProps;
  const hidden = block.meta?.hidden || (props.hidden as boolean);
  if (hidden && editMode) return null;
  if (hidden && !editMode) return null;
  const children = block.children ?? [];
  const universalStyle = hasUniversalProps(props) ? getUniversalStyleObject(props) : null;
  const Wrapper = universalStyle
    ? ({ children: c }: { children: React.ReactNode }) => <div style={universalStyle}>{c}</div>
    : ({ children: c }: { children: React.ReactNode }) => <>{c}</>;

  const common = { id: block.id, editMode, isDropTarget };

  const renderContent = () => {
    switch (block.type as BlockType) {
    case 'text':
      return (
        <BlockText
          {...common}
          content={(props.content as string) ?? ''}
          contentHtml={props.contentHtml as string | undefined}
        />
      );
    case 'image':
      return (
        <BlockImage
          {...common}
          src={(props.src as string) ?? ''}
          alt={(props.alt as string) ?? ''}
        />
      );
    case 'button':
      return (
        <BlockButton
          {...common}
          text={(props.text as string) ?? 'Button'}
          href={(props.href as string) ?? '#'}
        />
      );
    case 'divider':
      return (
        <BlockDivider
          {...common}
          orientation={(props.orientation as 'horizontal' | 'vertical') ?? 'horizontal'}
        />
      );
    case 'spacer':
      return (
        <BlockSpacer
          {...common}
          height={(props.height as number) ?? 24}
        />
      );
    case 'video':
      return (
        <BlockVideo
          {...common}
          provider={(props.provider as 'youtube' | 'vimeo' | 'wistia' | 'custom') ?? 'youtube'}
          url={(props.url as string) ?? ''}
          autoplay={(props.autoplay as boolean) ?? false}
          loop={(props.loop as boolean) ?? false}
          mute={(props.mute as boolean) ?? false}
          aspectRatio={(props.aspectRatio as string) ?? '16/9'}
        />
      );
    case 'shapeRectangle':
      return (
        <BlockShapeRectangle
          {...common}
          width={(props.width as number) ?? 200}
          height={(props.height as number) ?? 100}
          fillColor={(props.fillColor as string) ?? '#e5e7eb'}
          borderColor={(props.borderColor as string) ?? 'transparent'}
          borderWidth={(props.borderWidth as number) ?? 0}
          borderRadius={(props.borderRadius as number) ?? 0}
          opacity={(props.opacity as number) ?? 1}
        />
      );
    case 'shapeCircle':
      return (
        <BlockShapeCircle
          {...common}
          size={(props.size as number) ?? 100}
          fillColor={(props.fillColor as string) ?? '#e5e7eb'}
          borderColor={(props.borderColor as string) ?? 'transparent'}
          borderWidth={(props.borderWidth as number) ?? 0}
          opacity={(props.opacity as number) ?? 1}
        />
      );
    case 'countdown':
      return (
        <BlockCountdown
          {...common}
          targetDate={(props.targetDate as string) ?? ''}
          daysLabel={(props.daysLabel as string) ?? 'Days'}
          hoursLabel={(props.hoursLabel as string) ?? 'Hours'}
          minutesLabel={(props.minutesLabel as string) ?? 'Mins'}
          secondsLabel={(props.secondsLabel as string) ?? 'Secs'}
        />
      );
    case 'table':
      return (
        <BlockTable
          {...common}
          rows={(props.rows as string[][]) ?? [['H1', 'H2'], ['C1', 'C2']]}
          hasHeader={(props.hasHeader as boolean) ?? true}
        />
      );
    case 'form':
      return (
        <BlockForm
          {...common}
          formId={(props.formId as string) ?? ''}
          formBindings={page?.formBindings ?? []}
        />
      );
    case 'customHtml':
      return (
        <BlockCustomHtml
          {...common}
          html={(props.html as string) ?? ''}
        />
      );
    case 'section':
      return (
        <BlockSection
          {...common}
          children={children}
          props={block.props}
        />
      );
    case 'container':
      return (
        <BlockContainer
          {...common}
          children={children}
          props={block.props}
        />
      );
    case 'grid':
      return (
        <BlockGrid
          {...common}
          children={children}
          props={block.props}
        />
      );
    case 'columns':
      return (
        <BlockColumns
          {...common}
          children={children}
          props={block.props}
        />
      );
    case 'stack':
      return (
        <BlockStack
          {...common}
          children={children}
          props={block.props}
        />
      );
    case 'hero':
      return (
        <BlockHero
          {...common}
          children={children}
          props={block.props}
        />
      );
    case 'features':
      return (
        <BlockFeatures
          {...common}
          children={children}
        />
      );
    case 'testimonials':
      return (
        <BlockTestimonials
          {...common}
          children={children}
        />
      );
    case 'faq':
      return (
        <BlockFaq
          {...common}
          children={children}
        />
      );
    case 'logos':
      return (
        <BlockLogos
          {...common}
          children={children}
        />
      );
    default:
      return null;
    }
  };

  return <Wrapper>{renderContent()}</Wrapper>;
}
