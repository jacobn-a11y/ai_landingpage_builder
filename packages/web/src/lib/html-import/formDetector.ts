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
  /** Auto-suggested canonical field name (e.g. 'email', 'first_name') */
  suggestedMapping?: string;
}

export interface DetectedForm {
  selector: string;
  fields: DetectedFormField[];
}

function parseHtml(html: string): Document {
  const parser = new DOMParser();
  return parser.parseFromString(html, 'text/html');
}

/** Canonical field name mappings keyed by normalized name/id/placeholder tokens. */
const CANONICAL_FIELD_MAP: Record<string, string> = {
  firstname: 'first_name',
  first_name: 'first_name',
  fname: 'first_name',
  givenname: 'first_name',
  lastname: 'last_name',
  last_name: 'last_name',
  lname: 'last_name',
  familyname: 'last_name',
  surname: 'last_name',
  fullname: 'full_name',
  name: 'full_name',
  email: 'email',
  emailaddress: 'email',
  mail: 'email',
  phone: 'phone',
  phonenumber: 'phone',
  tel: 'phone',
  telephone: 'phone',
  mobile: 'phone',
  company: 'company',
  companyname: 'company',
  organization: 'company',
  organisation: 'company',
  title: 'title',
  jobtitle: 'title',
  message: 'message',
  comment: 'message',
  comments: 'message',
  msg: 'message',
  address: 'address',
  streetaddress: 'address',
  street: 'address',
  city: 'city',
  state: 'state',
  province: 'state',
  zip: 'zip',
  zipcode: 'zip',
  postalcode: 'zip',
  postcode: 'zip',
  country: 'country',
  website: 'website',
  url: 'website',
  password: 'password',
  pass: 'password',
};

/**
 * Suggest a canonical field name based on name/id/type/placeholder heuristics.
 * Returns undefined if no match is found.
 */
export function suggestCanonicalField(field: DetectedFormField): string | undefined {
  const normalize = (s: string) => s.toLowerCase().replace(/[-_\s.]/g, '');

  // Check name, id, placeholder in order of reliability
  for (const raw of [field.name, field.id, field.placeholder ?? '', field.label ?? '']) {
    const key = normalize(raw);
    if (key && CANONICAL_FIELD_MAP[key]) return CANONICAL_FIELD_MAP[key];
  }

  // Fallback: check if input type itself suggests a mapping
  if (field.type === 'email') return 'email';
  if (field.type === 'tel') return 'phone';
  if (field.type === 'url') return 'website';
  if (field.type === 'password') return 'password';

  // Partial matching: check if any canonical key is a substring of any source
  for (const raw of [field.name, field.id, field.placeholder ?? '', field.label ?? '']) {
    const normalized = normalize(raw);
    if (!normalized) continue;
    for (const [pattern, canonical] of Object.entries(CANONICAL_FIELD_MAP)) {
      if (normalized.includes(pattern)) return canonical;
    }
  }

  return undefined;
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

    const fieldData: DetectedFormField = { name, id, type, label, placeholder };
    const suggested = suggestCanonicalField(fieldData);
    if (suggested) fieldData.suggestedMapping = suggested;
    fields.push(fieldData);
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
