/**
 * Form schema and field types for native forms and mappings.
 */

export type FormFieldType =
  | 'text'
  | 'email'
  | 'phone'
  | 'textarea'
  | 'dropdown'
  | 'checkbox'
  | 'radio'
  | 'hidden';

export interface FormFieldSchema {
  id: string;
  name: string;
  type: FormFieldType;
  label?: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
}

export interface FormSchemaJson {
  fields: FormFieldSchema[];
  version: number;
}

export type PageFormBindingType = 'native' | 'hooked';

export interface FieldMapping {
  formFieldId: string;
  sourceSelector: string;
  sourceAttribute?: string;
}
