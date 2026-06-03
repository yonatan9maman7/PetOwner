import { PetSpecies } from "../types/api";
import { normalizePetSpecies } from "../screens/pets/addPetHelpers";

describe("normalizePetSpecies", () => {
  it("returns null for null/undefined", () => {
    expect(normalizePetSpecies(null)).toBeNull();
    expect(normalizePetSpecies(undefined)).toBeNull();
  });

  it("accepts numeric enum values", () => {
    expect(normalizePetSpecies(PetSpecies.Dog)).toBe(PetSpecies.Dog);
    expect(normalizePetSpecies(2)).toBe(PetSpecies.Cat);
  });

  it("parses API string enum names", () => {
    expect(normalizePetSpecies("Dog")).toBe(PetSpecies.Dog);
    expect(normalizePetSpecies("cat")).toBe(PetSpecies.Cat);
    expect(normalizePetSpecies("Bird")).toBe(PetSpecies.Bird);
  });

  it("parses numeric strings", () => {
    expect(normalizePetSpecies("1")).toBe(PetSpecies.Dog);
    expect(normalizePetSpecies("6")).toBe(PetSpecies.Other);
  });
});
