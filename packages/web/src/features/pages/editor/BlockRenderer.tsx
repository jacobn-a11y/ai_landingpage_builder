/**
 * Maps block type to component. Renders blocks in edit or preview mode.
 */

import type { BlockType } from '@replica-pages/blocks';
import { useEditor } from './EditorContext';
import { getUniversalStyleObject, hasUniversalProps } from './universal-props';
import { ImportSafeWrapper } from './ImportSafeWrapper';
import { TierCTokenEditor, type TokenDef } from './TierCTokenEditor';
import {
  BlockText,
  BlockHeadline,
  BlockParagraph,
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
  BlockAccordion,
  BlockCarousel,
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
  const { content, previewMode, page, breakpoint, updateBlock } = useEditor();
  const block = content.blocks[blockId];
  if (!block) return null;

  const editMode = !previewMode;
  const baseProps = (block.props ?? {}) as Record<string, unknown>;
  const overrides = baseProps.overrides as Record<string, Record<string, unknown>> | undefined;
  const override = overrides?.[breakpoint];
  const props = override ? { ...baseProps, ...override } : baseProps;
  const hidden = block.meta?.hidden || (props.hidden as boolean);
  const locked = !!block.meta?.locked;
  // In preview mode, hidden blocks are not rendered at all
  if (hidden && !editMode) return null;
  // In edit mode, hidden blocks render with reduced opacity so designers can see them
  const children = block.children ?? [];
  const universalStyle = hasUniversalProps(props) ? getUniversalStyleObject(props) : null;
  const editWrapperStyle: React.CSSProperties = {
    ...(universalStyle ?? {}),
    ...(hidden && editMode ? { opacity: 0.3 } : {}),
    ...(locked && editMode ? { pointerEvents: 'none' as const } : {}),
  };
  const needsWrapper = universalStyle || (editMode && (hidden || locked));
  const Wrapper = needsWrapper
    ? ({ children: c }: { children: React.ReactNode }) => (
        <div style={editWrapperStyle} title={locked ? 'Locked' : undefined}>{c}</div>
      )
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
          headingLevel={props.headingLevel as string | undefined}
          fontFamily={props.fontFamily as string | undefined}
          fontSize={props.fontSize as number | undefined}
          fontWeight={props.fontWeight as string | undefined}
          lineHeight={props.lineHeight as number | undefined}
          letterSpacing={props.letterSpacing as number | undefined}
          textColor={props.textColor as string | undefined}
          textAlign={props.textAlign as string | undefined}
          textTransform={props.textTransform as string | undefined}
          linkColor={props.linkColor as string | undefined}
        />
      );
    case 'headline':
      return (
        <BlockHeadline
          {...common}
          content={(props.content as string) ?? ''}
          contentHtml={props.contentHtml as string | undefined}
          headingLevel={(props.headingLevel as string) ?? 'h2'}
          fontFamily={props.fontFamily as string | undefined}
          fontSize={props.fontSize as number | undefined}
          fontWeight={(props.fontWeight as string) ?? '700'}
          lineHeight={props.lineHeight as number | undefined}
          letterSpacing={props.letterSpacing as number | undefined}
          textColor={props.textColor as string | undefined}
          textAlign={props.textAlign as string | undefined}
          textTransform={props.textTransform as string | undefined}
          linkColor={props.linkColor as string | undefined}
        />
      );
    case 'paragraph':
      return (
        <BlockParagraph
          {...common}
          content={(props.content as string) ?? ''}
          contentHtml={props.contentHtml as string | undefined}
          fontFamily={props.fontFamily as string | undefined}
          fontSize={(props.fontSize as number) ?? 16}
          fontWeight={props.fontWeight as string | undefined}
          lineHeight={props.lineHeight as number | undefined}
          letterSpacing={props.letterSpacing as number | undefined}
          textColor={props.textColor as string | undefined}
          textAlign={props.textAlign as string | undefined}
          textTransform={props.textTransform as string | undefined}
          linkColor={props.linkColor as string | undefined}
        />
      );
    case 'image':
      return (
        <BlockImage
          {...common}
          src={(props.src as string) ?? ''}
          alt={(props.alt as string) ?? ''}
          linkHref={props.linkHref as string | undefined}
          linkNewTab={(props.linkNewTab as boolean) ?? false}
          objectFit={(props.objectFit as string) ?? 'contain'}
          lazyLoad={(props.lazyLoad as boolean) ?? true}
        />
      );
    case 'button':
      return (
        <BlockButton
          {...common}
          text={(props.text as string) ?? 'Button'}
          href={(props.href as string) ?? '#'}
          openNewTab={(props.openNewTab as boolean) ?? false}
          ariaLabel={props.ariaLabel as string | undefined}
          fontFamily={props.fontFamily as string | undefined}
          fontSize={props.fontSize as number | undefined}
          fontWeight={props.fontWeight as string | undefined}
          textColor={props.textColor as string | undefined}
          textAlign={props.textAlign as string | undefined}
          buttonBgColor={props.buttonBgColor as string | undefined}
          buttonHoverBgColor={props.buttonHoverBgColor as string | undefined}
          buttonTextColor={props.buttonTextColor as string | undefined}
          buttonHoverTextColor={props.buttonHoverTextColor as string | undefined}
        />
      );
    case 'divider':
      return (
        <BlockDivider
          {...common}
          orientation={(props.orientation as 'horizontal' | 'vertical') ?? 'horizontal'}
          lineColor={props.lineColor as string | undefined}
          lineThickness={(props.lineThickness as number) ?? 1}
          lineStyle={(props.lineStyle as string) ?? 'solid'}
          lineWidth={(props.lineWidth as string) ?? '100%'}
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
          fields={props.fields as Record<string, unknown>[] | undefined}
          submitText={(props.submitText as string) ?? 'Submit'}
          successMessage={props.successMessage as string | undefined}
          redirectUrl={props.redirectUrl as string | undefined}
        />
      );
    case 'customHtml': {
      const importMeta = props._importMeta as { tier?: string; scopeId?: string; scopedCss?: string; tokens?: TokenDef[] } | undefined;
      const tier = importMeta?.tier;

      // Tier C: token-based editing for isolated HTML
      if (tier === 'C' && importMeta?.tokens) {
        return (
          <ImportSafeWrapper scopeId={importMeta.scopeId || block.id} scopedCss={importMeta.scopedCss}>
            <TierCTokenEditor
              html={(props.html as string) ?? ''}
              tokens={importMeta.tokens}
              onTokenUpdate={(tokenId, newValue) => {
                if (!editMode) return;
                const updatedTokens = (importMeta.tokens || []).map((t) =>
                  t.id === tokenId ? { ...t, current: newValue } : t
                );
                updateBlock(block.id, { props: { ...baseProps, _importMeta: { ...importMeta, tokens: updatedTokens } } });
              }}
              previewMode={!editMode}
            />
          </ImportSafeWrapper>
        );
      }

      // Tier D: locked render, no editing
      if (tier === 'D') {
        return (
          <ImportSafeWrapper scopeId={importMeta?.scopeId || block.id} scopedCss={importMeta?.scopedCss}>
            <div
              dangerouslySetInnerHTML={{ __html: (props.html as string) ?? '' }}
              style={{ pointerEvents: editMode ? 'none' : undefined }}
            />
            {editMode && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/40 text-xs text-muted-foreground">
                Locked import — rebuild to edit
              </div>
            )}
          </ImportSafeWrapper>
        );
      }

      // Tier A/B with scoped CSS: wrap in ImportSafeWrapper
      if (importMeta?.scopeId) {
        return (
          <ImportSafeWrapper scopeId={importMeta.scopeId} scopedCss={importMeta.scopedCss}>
            <BlockCustomHtml
              {...common}
              html={(props.html as string) ?? ''}
            />
          </ImportSafeWrapper>
        );
      }

      // Non-imported customHtml: standard rendering
      return (
        <BlockCustomHtml
          {...common}
          html={(props.html as string) ?? ''}
        />
      );
    }
    case 'accordion':
      return (
        <BlockAccordion
          {...common}
          sections={props.sections as any[] | undefined}
          expandOneOnly={(props.expandOneOnly as boolean) ?? false}
          arrowColor={props.arrowColor as string | undefined}
          dividerColor={(props.dividerColor as string) ?? '#e5e7eb'}
          sectionSpacing={(props.sectionSpacing as number) ?? 0}
          titleFontFamily={props.titleFontFamily as string | undefined}
          titleFontSize={(props.titleFontSize as number) ?? 16}
          titleFontWeight={(props.titleFontWeight as string) ?? '600'}
          titleColor={props.titleColor as string | undefined}
          contentColor={props.contentColor as string | undefined}
        />
      );
    case 'carousel':
      return (
        <BlockCarousel
          {...common}
          slides={props.slides as any[] | undefined}
          autoPlay={(props.autoPlay as boolean) ?? false}
          autoPlayInterval={(props.autoPlayInterval as number) ?? 3000}
          showArrows={(props.showArrows as boolean) ?? true}
          arrowsColor={(props.arrowsColor as string) ?? '#333'}
          showDots={(props.showDots as boolean) ?? true}
          dotSelectedColor={(props.dotSelectedColor as string) ?? '#333'}
          dotUnselectedColor={(props.dotUnselectedColor as string) ?? '#ccc'}
          backgroundColor={props.backgroundColor as string | undefined}
          loop={(props.loop as boolean) ?? true}
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
