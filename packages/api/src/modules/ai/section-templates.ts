/**
 * Pre-built section templates for common landing page patterns.
 * Each template returns a root block and a flat map of all blocks (including descendants).
 */

import type { EditorBlock, SectionTemplate } from './ai.types.js';

let _counter = 0;
function uid(prefix: string): string {
  _counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${_counter}`;
}

/** Reset counter (useful in tests). */
export function resetTemplateCounter(): void {
  _counter = 0;
}

// -------------------------------------------------------------------------
// Helper to wrap content in section > container
// -------------------------------------------------------------------------

function wrapInSection(
  sectionProps: Record<string, unknown>,
  containerChildren: EditorBlock[],
): SectionTemplate {
  const allBlocks: Record<string, EditorBlock> = {};

  const containerId = uid('container');
  const sectionId = uid('section');

  const containerBlock: EditorBlock = {
    id: containerId,
    type: 'container',
    props: { maxWidth: '1200px', paddingX: '24px' },
    children: containerChildren.map((b) => b.id),
  };

  const sectionBlock: EditorBlock = {
    id: sectionId,
    type: 'section',
    props: { paddingTop: '80px', paddingBottom: '80px', ...sectionProps },
    children: [containerId],
  };

  allBlocks[sectionId] = sectionBlock;
  allBlocks[containerId] = containerBlock;

  // Register all children recursively
  const register = (blocks: EditorBlock[]) => {
    for (const b of blocks) {
      allBlocks[b.id] = b;
    }
  };
  register(containerChildren);

  return { rootBlock: sectionBlock, allBlocks };
}

// Helper to add nested blocks to allBlocks
function addNestedBlocks(template: SectionTemplate, extra: EditorBlock[]): void {
  for (const b of extra) {
    template.allBlocks[b.id] = b;
  }
}

// -------------------------------------------------------------------------
// Templates
// -------------------------------------------------------------------------

export function heroTemplate(): SectionTemplate {
  const headlineId = uid('hero-headline');
  const paragraphId = uid('hero-paragraph');
  const buttonId = uid('hero-button');

  const headline: EditorBlock = {
    id: headlineId,
    type: 'headline',
    props: {
      content: 'Build Something Remarkable',
      headingLevel: 'h1',
      fontSize: '48px',
      fontWeight: '700',
      textAlign: 'center',
      color: '#1a1a2e',
    },
  };

  const paragraph: EditorBlock = {
    id: paragraphId,
    type: 'paragraph',
    props: {
      content: 'Empower your team with tools that simplify complexity and accelerate growth. Start building better experiences today.',
      fontSize: '20px',
      textAlign: 'center',
      color: '#4a4a68',
      lineHeight: '1.6',
    },
  };

  const button: EditorBlock = {
    id: buttonId,
    type: 'button',
    props: {
      text: 'Get Started Free',
      href: '#',
      variant: 'filled',
      backgroundColor: '#4f46e5',
      textColor: '#ffffff',
      fontSize: '18px',
      borderRadius: '8px',
      paddingX: '32px',
      paddingY: '14px',
    },
  };

  return wrapInSection(
    { backgroundColor: '#f8f9fc' },
    [headline, paragraph, button],
  );
}

export function featuresTemplate(): SectionTemplate {
  const headlineId = uid('features-headline');
  const gridId = uid('features-grid');

  const headline: EditorBlock = {
    id: headlineId,
    type: 'headline',
    props: {
      content: 'Everything You Need to Succeed',
      headingLevel: 'h2',
      fontSize: '36px',
      fontWeight: '700',
      textAlign: 'center',
      color: '#1a1a2e',
    },
  };

  const cards: EditorBlock[] = [];
  const cardChildren: EditorBlock[] = [];

  const featureData = [
    { title: 'Lightning Fast', description: 'Optimized performance that keeps your users engaged and your metrics climbing.' },
    { title: 'Secure by Default', description: 'Enterprise-grade security built into every layer so you can focus on what matters.' },
    { title: 'Scale with Confidence', description: 'Infrastructure that grows with your business — from startup to enterprise.' },
  ];

  for (const feat of featureData) {
    const cardId = uid('feature-card');
    const titleId = uid('feature-title');
    const descId = uid('feature-desc');

    const titleBlock: EditorBlock = {
      id: titleId,
      type: 'headline',
      props: { content: feat.title, headingLevel: 'h3', fontSize: '22px', fontWeight: '600', color: '#1a1a2e' },
    };

    const descBlock: EditorBlock = {
      id: descId,
      type: 'paragraph',
      props: { content: feat.description, fontSize: '16px', color: '#4a4a68', lineHeight: '1.5' },
    };

    const card: EditorBlock = {
      id: cardId,
      type: 'stack',
      props: { gap: '12px', align: 'left' },
      children: [titleId, descId],
    };

    cards.push(card);
    cardChildren.push(card, titleBlock, descBlock);
  }

  const grid: EditorBlock = {
    id: gridId,
    type: 'grid',
    props: { columns: 3, gap: '32px', minChildWidth: '280px' },
    children: cards.map((c) => c.id),
  };

  const template = wrapInSection(
    { backgroundColor: '#ffffff' },
    [headline, grid],
  );
  addNestedBlocks(template, cardChildren);
  return template;
}

export function testimonialsTemplate(): SectionTemplate {
  const headlineId = uid('testimonials-headline');
  const gridId = uid('testimonials-grid');

  const headline: EditorBlock = {
    id: headlineId,
    type: 'headline',
    props: {
      content: 'Trusted by Teams Worldwide',
      headingLevel: 'h2',
      fontSize: '36px',
      fontWeight: '700',
      textAlign: 'center',
      color: '#1a1a2e',
    },
  };

  const testimonials = [
    { quote: 'This platform transformed how we approach our marketing. The results speak for themselves — 3x conversion rate in just two months.', author: 'Sarah Chen, VP of Marketing' },
    { quote: 'Finally a tool that our entire team actually enjoys using. Onboarding was seamless and support is world-class.', author: 'Marcus Williams, CTO' },
    { quote: 'We evaluated a dozen solutions before choosing this one. Best decision we made all year.', author: 'Priya Patel, Head of Product' },
  ];

  const cards: EditorBlock[] = [];
  const cardChildren: EditorBlock[] = [];

  for (const t of testimonials) {
    const cardId = uid('testimonial-card');
    const quoteId = uid('testimonial-quote');
    const authorId = uid('testimonial-author');

    const quoteBlock: EditorBlock = {
      id: quoteId,
      type: 'paragraph',
      props: { content: `"${t.quote}"`, fontSize: '16px', color: '#4a4a68', lineHeight: '1.6' },
    };

    const authorBlock: EditorBlock = {
      id: authorId,
      type: 'paragraph',
      props: { content: `— ${t.author}`, fontSize: '14px', color: '#6b7280', fontWeight: '600' },
    };

    const card: EditorBlock = {
      id: cardId,
      type: 'stack',
      props: { gap: '16px', align: 'left' },
      children: [quoteId, authorId],
    };

    cards.push(card);
    cardChildren.push(card, quoteBlock, authorBlock);
  }

  const grid: EditorBlock = {
    id: gridId,
    type: 'grid',
    props: { columns: 3, gap: '32px', minChildWidth: '280px' },
    children: cards.map((c) => c.id),
  };

  const template = wrapInSection(
    { backgroundColor: '#f8f9fc' },
    [headline, grid],
  );
  addNestedBlocks(template, cardChildren);
  return template;
}

export function ctaTemplate(): SectionTemplate {
  const headlineId = uid('cta-headline');
  const paragraphId = uid('cta-paragraph');
  const buttonId = uid('cta-button');

  const headline: EditorBlock = {
    id: headlineId,
    type: 'headline',
    props: {
      content: 'Ready to Get Started?',
      headingLevel: 'h2',
      fontSize: '36px',
      fontWeight: '700',
      textAlign: 'center',
      color: '#ffffff',
    },
  };

  const paragraph: EditorBlock = {
    id: paragraphId,
    type: 'paragraph',
    props: {
      content: 'Join thousands of teams already building better experiences. No credit card required.',
      fontSize: '18px',
      textAlign: 'center',
      color: '#e0e0ff',
      lineHeight: '1.6',
    },
  };

  const button: EditorBlock = {
    id: buttonId,
    type: 'button',
    props: {
      text: 'Start Your Free Trial',
      href: '#',
      variant: 'filled',
      backgroundColor: '#ffffff',
      textColor: '#4f46e5',
      fontSize: '18px',
      borderRadius: '8px',
      paddingX: '32px',
      paddingY: '14px',
    },
  };

  return wrapInSection(
    { backgroundColor: '#4f46e5' },
    [headline, paragraph, button],
  );
}

export function faqTemplate(): SectionTemplate {
  const headlineId = uid('faq-headline');
  const accordionId = uid('faq-accordion');

  const headline: EditorBlock = {
    id: headlineId,
    type: 'headline',
    props: {
      content: 'Frequently Asked Questions',
      headingLevel: 'h2',
      fontSize: '36px',
      fontWeight: '700',
      textAlign: 'center',
      color: '#1a1a2e',
    },
  };

  const accordion: EditorBlock = {
    id: accordionId,
    type: 'accordion',
    props: {
      items: [
        { title: 'How do I get started?', content: 'Sign up for a free account and follow our quick-start guide. Most teams are up and running in under 10 minutes.' },
        { title: 'Is there a free plan?', content: 'Yes! Our free tier includes all core features with generous usage limits. Upgrade anytime as your needs grow.' },
        { title: 'Can I cancel my subscription at any time?', content: 'Absolutely. There are no long-term contracts. You can upgrade, downgrade, or cancel at any time from your account settings.' },
        { title: 'Do you offer customer support?', content: 'We provide email support for all plans and priority live chat for Pro and Enterprise customers. Our average response time is under 2 hours.' },
        { title: 'Is my data secure?', content: 'Security is our top priority. We use AES-256 encryption at rest, TLS 1.3 in transit, and are SOC 2 Type II certified.' },
      ],
      allowMultiple: false,
    },
  };

  return wrapInSection(
    { backgroundColor: '#ffffff' },
    [headline, accordion],
  );
}

export function pricingTemplate(): SectionTemplate {
  const headlineId = uid('pricing-headline');
  const gridId = uid('pricing-grid');

  const headline: EditorBlock = {
    id: headlineId,
    type: 'headline',
    props: {
      content: 'Simple, Transparent Pricing',
      headingLevel: 'h2',
      fontSize: '36px',
      fontWeight: '700',
      textAlign: 'center',
      color: '#1a1a2e',
    },
  };

  const plans = [
    { name: 'Starter', price: '$0/mo', description: 'Perfect for side projects and experiments.', cta: 'Get Started' },
    { name: 'Pro', price: '$29/mo', description: 'For growing teams that need more power and flexibility.', cta: 'Start Free Trial' },
    { name: 'Enterprise', price: 'Custom', description: 'Dedicated infrastructure, SLA, and hands-on support.', cta: 'Contact Sales' },
  ];

  const cards: EditorBlock[] = [];
  const cardChildren: EditorBlock[] = [];

  for (const plan of plans) {
    const cardId = uid('pricing-card');
    const nameId = uid('pricing-name');
    const priceId = uid('pricing-price');
    const descId = uid('pricing-desc');
    const btnId = uid('pricing-btn');

    const nameBlock: EditorBlock = {
      id: nameId,
      type: 'headline',
      props: { content: plan.name, headingLevel: 'h3', fontSize: '20px', fontWeight: '600', color: '#1a1a2e', textAlign: 'center' },
    };

    const priceBlock: EditorBlock = {
      id: priceId,
      type: 'headline',
      props: { content: plan.price, headingLevel: 'h2', fontSize: '40px', fontWeight: '700', color: '#4f46e5', textAlign: 'center' },
    };

    const descBlock: EditorBlock = {
      id: descId,
      type: 'paragraph',
      props: { content: plan.description, fontSize: '16px', color: '#4a4a68', textAlign: 'center', lineHeight: '1.5' },
    };

    const btnBlock: EditorBlock = {
      id: btnId,
      type: 'button',
      props: {
        text: plan.cta,
        href: '#',
        variant: plan.name === 'Pro' ? 'filled' : 'outline',
        backgroundColor: plan.name === 'Pro' ? '#4f46e5' : 'transparent',
        textColor: plan.name === 'Pro' ? '#ffffff' : '#4f46e5',
        fontSize: '16px',
        borderRadius: '8px',
        paddingX: '24px',
        paddingY: '12px',
      },
    };

    const card: EditorBlock = {
      id: cardId,
      type: 'stack',
      props: { gap: '16px', align: 'center' },
      children: [nameId, priceId, descId, btnId],
    };

    cards.push(card);
    cardChildren.push(card, nameBlock, priceBlock, descBlock, btnBlock);
  }

  const grid: EditorBlock = {
    id: gridId,
    type: 'grid',
    props: { columns: 3, gap: '32px', minChildWidth: '280px' },
    children: cards.map((c) => c.id),
  };

  const template = wrapInSection(
    { backgroundColor: '#f8f9fc' },
    [headline, grid],
  );
  addNestedBlocks(template, cardChildren);
  return template;
}

// -------------------------------------------------------------------------
// Template registry
// -------------------------------------------------------------------------

export type SectionTemplateType = 'hero' | 'features' | 'testimonials' | 'cta' | 'faq' | 'pricing';

const TEMPLATE_FACTORIES: Record<SectionTemplateType, () => SectionTemplate> = {
  hero: heroTemplate,
  features: featuresTemplate,
  testimonials: testimonialsTemplate,
  cta: ctaTemplate,
  faq: faqTemplate,
  pricing: pricingTemplate,
};

export function getTemplate(type: SectionTemplateType): SectionTemplate {
  const factory = TEMPLATE_FACTORIES[type];
  if (!factory) {
    throw new Error(`Unknown section template type: ${type}`);
  }
  return factory();
}

export function listTemplateTypes(): SectionTemplateType[] {
  return Object.keys(TEMPLATE_FACTORIES) as SectionTemplateType[];
}
