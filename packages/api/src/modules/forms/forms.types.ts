/**
 * Form field types — canonical definition.
 * Keep in sync with packages/blocks/src/form-types.ts
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

export interface FormSchemaConfig {
  steps?: { id: string; name: string }[];
  buttonText?: string;
  buttonStyle?: 'primary' | 'outline' | 'secondary';
}
