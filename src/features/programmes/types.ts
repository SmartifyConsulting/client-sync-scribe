/** Vula reward matrix for advisor weigh-ins. */
export const VULA_MATRIX = {
  /** Per kilogram of weight lost at a advisor weigh-in. */
  perKilogramLost: 50,
} as const;

export const KG_PER_STONE = 6.35029318;

export const kgToStones = (kg: number) => kg / KG_PER_STONE;

export interface WeighIn {
  id: string;
  patient_id: string;
  weight_kg: number;
  previous_weight_kg: number | null;
  kg_lost: number;
  vulas_awarded: number;
  recorded_at: string;
}
