/**
 * Extract form metadata from HTML string.
 * Uses DOM parsing for reliable form/input detection.
 */

export interface DetectedFormField {
  name: string;
  id: string;
  type: string;
  label?: string;
  placeholder?: string;
}

export interface DetectedForm {
  selector: string;
  fields: DetectedFormField[];
}

function parseHtml(html: string): Document {
  const parser = new DOMParser();
  return parser.parseFromString(html, 'text/html');
}

function findLabelForInput(doc: Document, id: string): string | undefined {
  if (!id) return undefined;
  const escaped = CSS.escape(id);
  const label = doc.querySelector(`label[for="${escaped}"]`);
  return label ? (label.textContent ?? '').trim() : undefined;
}

/**
 * Extract form fields from a form element.
 */
function extractFields(form: HTMLFormElement, doc: Document): DetectedFormField[] {
  const fields: DetectedFormField[] = [];
  const seen = new Set<string>();

  const inputs = form.querySelectorAll('input, textarea, select');
  for (const el of inputs) {
    const tag = el.tagName.toLowerCase();
    let name = '';
    let id = '';
    let type = 'text';
    let label: string | undefined;
    let placeholder: string | undefined;

    if (tag === 'input') {
      const input = el as HTMLInputElement;
      const inputType = input.type?.toLowerCase() ?? 'text';
      if (inputType === 'submit' || inputType === 'button' || inputType === 'image') continue;
      name = input.name || input.id || '';
      id = input.id || input.name || name;
      type = inputType;
      placeholder = input.placeholder ?? undefined;
    } else if (tag === 'textarea') {
      const textarea = el as HTMLTextAreaElement;
      name = textarea.name || textarea.id || '';
      id = textarea.id || textarea.name || name;
      type = 'textarea';
      placeholder = textarea.placeholder ?? undefined;
    } else if (tag === 'select') {
      const select = el as HTMLSelectElement;
      name = select.name || select.id || '';
      id = select.id || select.name || name;
      type = 'select';
    }

    if (!name || seen.has(name)) continue;
    seen.add(name);

    label = findLabelForInput(doc, id) || placeholder;

    fields.push({ name, id, type, label, placeholder });
  }

  return fields;
}

/**
 * Build a selector for a form (id, name, or nth-of-type).
 */
function getFormSelector(form: HTMLFormElement, index: number, total: number): string {
  const id = form.id?.trim();
  if (id) return `#${id}`;
  const name = form.getAttribute('name')?.trim();
  if (name) return `form[name="${name}"]`;
  if (total === 1) return 'form';
  return `form:nth-of-type(${index + 1})`;
}

/**
 * Detect all forms in HTML string.
 */
export function detectFormsFromHtml(html: string): DetectedForm[] {
  const doc = parseHtml(html);
  const forms = doc.querySelectorAll('form');
  const result: DetectedForm[] = [];

  forms.forEach((form, index) => {
    const fields = extractFields(form as HTMLFormElement, doc);
    const selector = getFormSelector(form as HTMLFormElement, index, forms.length);
    result.push({ selector, fields });
  });

  return result;
}
