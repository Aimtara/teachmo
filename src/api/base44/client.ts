import { base44 as base44Client } from '../base44Client';

export type Base44Client = typeof base44Client;

export const base44: Base44Client = base44Client as Base44Client;

export default base44;
