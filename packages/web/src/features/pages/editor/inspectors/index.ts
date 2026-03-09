/**
 * Inspector registry: imports all per-block-type inspectors and registers them.
 * Import this module once (e.g. from PropertiesPanel) to populate the registry.
 */

import { registerInspector } from './inspector-registry';

import { HeadlineInspector } from './HeadlineInspector';
import { ParagraphInspector } from './ParagraphInspector';
import { ImageInspector } from './ImageInspector';
import { ButtonInspector } from './ButtonInspector';
import { VideoInspector } from './VideoInspector';
import { DividerInspector } from './DividerInspector';
import { SpacerInspector } from './SpacerInspector';
import { GridInspector } from './GridInspector';
import { SectionInspector } from './SectionInspector';
import { FormInspector } from './FormInspector';
import { AccordionInspector } from './AccordionInspector';
import { CarouselInspector } from './CarouselInspector';
import { TableInspector } from './TableInspector';
import { CountdownInspector } from './CountdownInspector';
import { ShapeInspector } from './ShapeInspector';
import { CustomHtmlInspector } from './CustomHtmlInspector';
import { PatternInspector } from './PatternInspector';

// Content blocks
registerInspector('headline', HeadlineInspector);
registerInspector('paragraph', ParagraphInspector);
registerInspector('text', ParagraphInspector); // legacy text uses paragraph inspector
registerInspector('image', ImageInspector);
registerInspector('button', ButtonInspector);
registerInspector('video', VideoInspector);
registerInspector('divider', DividerInspector);
registerInspector('spacer', SpacerInspector);
registerInspector('accordion', AccordionInspector);
registerInspector('carousel', CarouselInspector);
registerInspector('table', TableInspector);
registerInspector('countdown', CountdownInspector);
registerInspector('shapeRectangle', ShapeInspector);
registerInspector('shapeCircle', ShapeInspector);
registerInspector('customHtml', CustomHtmlInspector);

// Layout blocks
registerInspector('grid', GridInspector);
registerInspector('section', SectionInspector);

// Form
registerInspector('form', FormInspector);

// Pattern blocks (hero, features, testimonials, faq, logos)
registerInspector('hero', PatternInspector);
registerInspector('features', PatternInspector);
registerInspector('testimonials', PatternInspector);
registerInspector('faq', PatternInspector);
registerInspector('logos', PatternInspector);

export { getInspector, hasInspector } from './inspector-registry';
export type { InspectorProps } from './inspector-registry';
