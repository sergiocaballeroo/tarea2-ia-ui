import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Como Validators.required, pero también rechaza cadenas con solo espacios. */
export function requeridoSinEspacios(c: AbstractControl): ValidationErrors | null {
  const v = c.value;
  if (v === null || v === undefined || v === '') return { required: true };
  if (typeof v === 'string' && v.trim() === '') return { required: true };
  return null;
}

/** Acepta solo números enteros (los campos type="number" permiten decimales). */
export function entero(c: AbstractControl): ValidationErrors | null {
  const v = c.value;
  if (v === null || v === undefined || v === '') return null;
  return Number.isInteger(Number(v)) ? null : { entero: true };
}

/** Para fechas ISO (YYYY-MM-DD): no puede ser posterior a hoy. */
export function fechaNoFutura(c: AbstractControl): ValidationErrors | null {
  const v = c.value;
  if (!v || typeof v !== 'string') return null;
  const d = new Date();
  const hoy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return v > hoy ? { futura: true } : null;
}
