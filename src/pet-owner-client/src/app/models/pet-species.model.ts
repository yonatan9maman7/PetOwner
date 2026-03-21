export enum PetSpecies {
  Dog = 1,
  Cat = 2,
  Bird = 3,
  Rabbit = 4,
  Reptile = 5,
  Other = 6,
}

export const PET_SPECIES_OPTIONS: { value: PetSpecies; label: string }[] = [
  { value: PetSpecies.Dog, label: 'Dog' },
  { value: PetSpecies.Cat, label: 'Cat' },
  { value: PetSpecies.Bird, label: 'Bird' },
  { value: PetSpecies.Rabbit, label: 'Rabbit' },
  { value: PetSpecies.Reptile, label: 'Reptile' },
  { value: PetSpecies.Other, label: 'Other' },
];

export function normalizePetSpecies(species: PetSpecies | number | string | null | undefined): PetSpecies {
  if (species === null || species === undefined) return PetSpecies.Other;
  if (typeof species === 'number' && species >= 1 && species <= 6) return species as PetSpecies;
  if (typeof species === 'string') {
    const parsed = parseInt(species, 10);
    if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 6) return parsed as PetSpecies;
    const lower = species.trim().toLowerCase();
    if (lower === 'dog') return PetSpecies.Dog;
    if (lower === 'cat') return PetSpecies.Cat;
    if (lower.includes('bird')) return PetSpecies.Bird;
    if (lower.includes('rabbit')) return PetSpecies.Rabbit;
    if (lower.includes('reptile') || lower.includes('snake') || lower.includes('lizard')) return PetSpecies.Reptile;
  }
  return PetSpecies.Other;
}

export function petSpeciesLabel(species: PetSpecies | number | string | null | undefined): string {
  const n = normalizePetSpecies(species);
  return PET_SPECIES_OPTIONS.find((o) => o.value === n)?.label ?? 'Pet';
}

export function petSpeciesEmoji(species: PetSpecies | number | string | null | undefined): string {
  switch (normalizePetSpecies(species)) {
    case PetSpecies.Dog:
      return '🐶';
    case PetSpecies.Cat:
      return '🐱';
    case PetSpecies.Bird:
      return '🐦';
    case PetSpecies.Rabbit:
      return '🐰';
    case PetSpecies.Reptile:
      return '🦎';
    default:
      return '🐾';
  }
}

/** Tailwind background classes for species avatar circles */
export function petSpeciesIconBgClass(species: PetSpecies | number | string | null | undefined): string {
  switch (normalizePetSpecies(species)) {
    case PetSpecies.Dog:
      return 'bg-amber-100';
    case PetSpecies.Cat:
      return 'bg-violet-100';
    case PetSpecies.Bird:
      return 'bg-sky-100';
    case PetSpecies.Rabbit:
      return 'bg-rose-100';
    case PetSpecies.Reptile:
      return 'bg-lime-100';
    default:
      return 'bg-emerald-100';
  }
}
