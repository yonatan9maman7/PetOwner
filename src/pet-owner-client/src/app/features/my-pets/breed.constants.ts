import { PetSpecies } from '../../models/pet-species.model';

export const DOG_BREED_OPTIONS = [
  'Mixed / Mutt',
  'Golden Retriever',
  'Labrador',
  'German Shepherd',
  'Poodle',
  'Border Collie',
  'Malinois',
  'French Bulldog',
  'Shih Tzu',
  'Pomeranian',
  'Other',
] as const;

export const CAT_BREED_OPTIONS = [
  'Mixed',
  'Persian',
  'Siamese',
  'British Shorthair',
  'Sphynx',
  'Maine Coon',
  'Street Cat',
  'Tricolor / Calico',
  'Other',
] as const;

export function getBreedOptionsForSpecies(species: PetSpecies | null): readonly string[] {
  switch (species) {
    case PetSpecies.Dog: return DOG_BREED_OPTIONS;
    case PetSpecies.Cat: return CAT_BREED_OPTIONS;
    default: return [];
  }
}

export const BREED_I18N_MAP: Record<string, string> = {
  'Mixed / Mutt': 'PETS.BREED_MIXED_MUTT',
  'Golden Retriever': 'PETS.BREED_GOLDEN_RETRIEVER',
  'Labrador': 'PETS.BREED_LABRADOR',
  'Labrador Retriever': 'PETS.BREED_LABRADOR',
  'German Shepherd': 'PETS.BREED_GERMAN_SHEPHERD',
  'Poodle': 'PETS.BREED_POODLE',
  'Border Collie': 'PETS.BREED_BORDER_COLLIE',
  'Malinois': 'PETS.BREED_MALINOIS',
  'French Bulldog': 'PETS.BREED_FRENCH_BULLDOG',
  'Shih Tzu': 'PETS.BREED_SHIH_TZU',
  'Pomeranian': 'PETS.BREED_POMERANIAN',
  'Beagle': 'PETS.BREED_BEAGLE',
  'Bulldog': 'PETS.BREED_BULLDOG',
  'Canaan Dog': 'PETS.BREED_CANAAN_DOG',
  'Mixed': 'PETS.BREED_MIXED',
  'Persian': 'PETS.BREED_PERSIAN',
  'Siamese': 'PETS.BREED_SIAMESE',
  'British Shorthair': 'PETS.BREED_BRITISH_SHORTHAIR',
  'Maine Coon': 'PETS.BREED_MAINE_COON',
  'Sphynx': 'PETS.BREED_SPHYNX',
  'Street Cat': 'PETS.BREED_STREET_CAT',
  'Tricolor / Calico': 'PETS.BREED_TRICOLOR',
  'Ginger': 'PETS.BREED_GINGER',
  'Other': 'PETS.BREED_OTHER',
};
