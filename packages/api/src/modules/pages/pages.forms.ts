/**
 * Form detection from contentJson and Custom HTML blocks.
 * Parses HTML to find <form> elements and their inputs.
 */

export interface DetectedFormField {
  name: string;
  id: string;
  type: string;
  label?: string;
}

export interface DetectedForm {
  selector: string;
  fields: DetectedFormField[];
}

interface PageContentJson {
  root?: string;
  blocks?: Record<string, { id: string; type?: string; children?: string[]; props?: { html?: string } }>;
}

function extractHtmlFromContent(contentJson: unknown): Array<{ blockId: string; html: string }> {
  const result: Array<{ blockId: string; html: string }> = [];
  const content = contentJson as PageContentJson;

  if (!content || typeof content !== 'object') return result;

  const blocks = content.blocks ?? {};
  const root = content.root;

  function visit(id: string) {
    const block = blocks[id];
    if (!block || typeof block !== 'object') return;
    if (block.type === 'customHtml' && block.props?.html) {
      result.push({ blockId: block.id, html: String(block.props.html) });
    }
    for (const childId of block.children ?? []) {
      visit(childId);
    }
  }

  if (root) visit(root);
  else {
    for (const block of Object.values(blocks)) {
      if (block?.type === 'customHtml' && block.props?.html) {
        result.push({ blockId: block.id, html: String(block.props.html) });
      }
    }
  }

  return result;
}

/**
 * Parse HTML string for form elements.
 * Returns forms with their fields (name, id, type, label).
 */
function parseFormsFromHtml(html: string): DetectedForm[] {
  const forms: DetectedForm[] = [];
  const formRegex = /<form[^>]*>([\s\S]*?)<\/form>/gi;
  let formIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = formRegex.exec(html)) !== null) {
    const formHtml = match[1];
    const fields = parseFormFields(formHtml);
    if (fields.length > 0 || formHtml.includes('<input') || formHtml.includes('<textarea')) {
      const selector = `form:nth-of-type(${formIndex + 1})`;
      forms.push({ selector, fields });
      formIndex++;
    }
  }

  return forms;
}

function parseFormFields(formHtml: string): DetectedFormField[] {
  const fields: DetectedFormField[] = [];
  const seen = new Set<string>();

  const inputRegex = /<input[^>]*>/gi;
  const textareaRegex = /<textarea[^>]*>([\s\S]*?)<\/textarea>/gi;
  const selectRegex = /<select[^>]*>([\s\S]*?)<\/select>/gi;

  const extractAttr = (tag: string, attr: string): string | undefined => {
    const re = new RegExp(`${attr}\\s*=\\s*["']([^"']*)["']`, 'i');
    const m = tag.match(re);
    return m ? m[1].trim() : undefined;
  };

  let m: RegExpExecArray | null;
  while ((m = inputRegex.exec(formHtml)) !== null) {
    const tag = m[0];
    const type = extractAttr(tag, 'type') || 'text';
    if (type === 'submit' || type === 'button' || type === 'image') continue;

    const name = extractAttr(tag, 'name') || extractAttr(tag, 'id');
    if (!name || seen.has(name)) continue;
    seen.add(name);

    const id = extractAttr(tag, 'id') || name;
    const placeholder = extractAttr(tag, 'placeholder');
    const label = findLabelForInput(formHtml, id) || placeholder;

    fields.push({ name, id, type, label });
  }

  while ((m = textareaRegex.exec(formHtml)) !== null) {
    const tag = m[0];
    const name = extractAttr(tag, 'name') || extractAttr(tag, 'id');
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const id = extractAttr(tag, 'id') || name;
    const label = findLabelForInput(formHtml, id) || extractAttr(tag, 'placeholder');
    fields.push({ name, id, type: 'textarea', label });
  }

  while ((m = selectRegex.exec(formHtml)) !== null) {
    const tag = m[0];
    const name = extractAttr(tag, 'name') || extractAttr(tag, 'id');
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const id = extractAttr(tag, 'id') || name;
    const label = findLabelForInput(formHtml, id);
    fields.push({ name, id, type: 'select', label });
  }

  return fields;
}

function findLabelForInput(html: string, id: string): string | undefined {
  const labelRegex = new RegExp(
    `<label[^>]*for\\s*=\\s*["']${escapeRegex(id)}["'][^>]*>([^<]*)</label>`,
    'i'
  );
  const m = html.match(labelRegex);
  return m ? m[1].trim() : undefined;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Suggest canonical field from form field name/id/label.
 */
export function suggestCanonicalField(field: DetectedFormField): string | null {
  const c = (s: string) => s.toLowerCase().replace(/[-_\s]/g, '');
  const v = c(field.name) || c(field.id) || c(field.label || '');

  const mapping: Record<string, string> = {
    firstname: 'first_name',
    first_name: 'first_name',
    fname: 'first_name',
    lastname: 'last_name',
    last_name: 'last_name',
    lname: 'last_name',
    email: 'email',
    mail: 'email',
    phone: 'phone',
    tel: 'phone',
    telephone: 'phone',
    company: 'company',
    organization: 'company',
    title: 'title',
    jobtitle: 'title',
  };

  return mapping[v] || null;
}

/**
 * Detect all forms in page content.
 */
export function detectForms(contentJson: unknown): DetectedForm[] {
  const htmlBlocks = extractHtmlFromContent(contentJson);
  const allForms: DetectedForm[] = [];
  let formGlobalIndex = 0;

  for (const { blockId, html } of htmlBlocks) {
    const forms = parseFormsFromHtml(html);
    for (let fi = 0; fi < forms.length; fi++) {
      formGlobalIndex++;
      const form = forms[fi];
      const base = htmlBlocks.length > 1 ? `[data-rp-block-id="${blockId}"]` : '';
      const selector =
        forms.length === 1 && !base
          ? 'form'
          : base
            ? `${base} form${forms.length > 1 ? `:nth-of-type(${fi + 1})` : ''}`
            : `form:nth-of-type(${formGlobalIndex})`;
      allForms.push({
        selector: selector || 'form',
        fields: form.fields,
      });
    }
  }

  if (allForms.length === 0) {
    const forms = parseFormsFromHtml(JSON.stringify(contentJson));
    for (let i = 0; i < forms.length; i++) {
      allForms.push({
        selector: forms.length === 1 ? 'form' : `form:nth-of-type(${i + 1})`,
        fields: forms[i].fields,
      });
    }
  }

  return allForms;
}
