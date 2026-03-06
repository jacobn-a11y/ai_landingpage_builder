/**
 * Form schema and field types for native forms and mappings.
 * This is the canonical source for form types used by both API and web packages.
 */

export const FORM_FIELD_TYPES = [
  'text',
  'email',
  'phone',
  'textarea',
  'date',
  'file',
  'dropdown',
  'checkbox',
  'radio',
  'hidden',
] as const;

export type FormFieldType = (typeof FORM_FIELD_TYPES)[number];

export interface FormFieldSchema {
  id: string;
  name?: string;
  type: FormFieldType;
  label?: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  stepIndex?: number;
  accept?: string;
}

export interface FormSchemaJson {
  fields: FormFieldSchema[];
  version: number;
}

export interface FormSchemaConfig {
  steps?: { id: string; name: string }[];
  buttonText?: string;
  buttonStyle?: 'primary' | 'outline' | 'secondary';
}

export type PageFormBindingType = 'native' | 'hooked';

export interface FieldMapping {
  formFieldId: string;
  sourceSelector: string;
  sourceAttribute?: string;
}
