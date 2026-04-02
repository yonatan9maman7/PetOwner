import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnInit,
  Output,
  signal,
  computed,
  SimpleChanges,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Pet, PetService } from '../../../services/pet.service';
import { PetSpecies } from '../../../models/pet-species.model';
import { BREED_I18N_MAP, BREED_OTHER_VALUE, getBreedOptionsForSpecies } from '../breed.constants';
import { ToastService } from '../../../services/toast.service';
import confetti from 'canvas-confetti';

@Component({
  selector: 'app-pet-form',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './pet-form.component.html',
  styleUrls: ['./pet-form.component.scss'],
  host: { id: 'add-pet-form', class: 'block scroll-mt-24' },
})
export class PetFormComponent implements OnInit, OnChanges {
  @Input() editingPet: Pet | null = null;
  @Output() petSaved = new EventEmitter<void>();
  @Output() editCancelled = new EventEmitter<void>();

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  private readonly petService = inject(PetService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly fb = inject(FormBuilder);

  isFormVisible = false;
  readonly submitting = signal(false);
  readonly showSuccess = signal(false);
  readonly avatarPreview = signal<string | null>(null);
  readonly nameValue = signal('');
  readonly shakingField = signal<string | null>(null);

  readonly speciesCards: { value: PetSpecies; emoji: string; labelKey: string }[] = [
    { value: PetSpecies.Dog, emoji: '🐶', labelKey: 'PETS.SPECIES_DOG' },
    { value: PetSpecies.Cat, emoji: '🐱', labelKey: 'PETS.SPECIES_CAT' },
    { value: PetSpecies.Rabbit, emoji: '🐰', labelKey: 'PETS.SPECIES_RABBIT' },
    { value: PetSpecies.Bird, emoji: '🐦', labelKey: 'PETS.SPECIES_BIRD' },
    { value: PetSpecies.Other, emoji: '🐾', labelKey: 'PETS.SPECIES_OTHER' },
  ];

  readonly currentBreedOptions = signal<readonly string[]>([]);
  readonly showSpecifyAnimal = signal(false);
  readonly showSpecifyBreed = signal(false);
  readonly breedSearchText = signal('');
  readonly breedDropdownOpen = signal(false);
  readonly specifyBreedPlaceholderKey = signal('');
  private hydrating = false;

  readonly filteredBreeds = computed(() => {
    const options = this.currentBreedOptions();
    const search = this.breedSearchText().trim().toLowerCase();
    if (!search) return [...options];
    const currentVal = this.petForm.get('breed')?.value;
    if (currentVal) {
      const selectedText = this.translate
        .instant(BREED_I18N_MAP[currentVal] ?? currentVal)
        .toLowerCase();
      if (search === selectedText) return [...options];
    }
    return options.filter((b) => {
      const key = BREED_I18N_MAP[b] ?? b;
      const translated = this.translate.instant(key).toLowerCase();
      return (
        translated.includes(search) ||
        b.toLowerCase().includes(search) ||
        b.includes(this.breedSearchText().trim())
      );
    });
  });

  readonly allergyMode = signal<'none' | 'other'>('none');
  readonly conditionMode = signal<'none' | 'other'>('none');
  readonly showMedicalSection = signal(false);

  readonly petForm = this.fb.group({
    name: ['', Validators.required],
    species: [null as PetSpecies | null, Validators.required],
    breed: [''],
    specifyAnimalType: [''],
    specifyBreed: [''],
    age: [null as number | null, [Validators.required, Validators.min(0), Validators.max(100)]],
    weight: [null as number | null, [Validators.required, Validators.min(0)]],
    isNeutered: [false],
    notes: [''],
    specifyAllergy: [''],
    medicalConditions: [''],
    medicalNotes: [''],
    feedingSchedule: [''],
    microchipNumber: [''],
    vetName: [''],
    vetPhone: [''],
  });

  ngOnInit(): void {
    this.petForm.get('name')!.valueChanges.subscribe((v) => this.nameValue.set(v?.trim() || ''));

    this.petForm.get('species')!.valueChanges.subscribe((species) => {
      const opts = getBreedOptionsForSpecies(species);
      this.currentBreedOptions.set(opts);
      this.showSpecifyAnimal.set(species === PetSpecies.Other);

      if (!this.hydrating) {
        this.petForm.get('specifyBreed')!.setValue('');
        this.petForm.get('specifyAnimalType')!.setValue('');
        this.breedSearchText.set('');
        this.breedDropdownOpen.set(false);
        if (opts.length === 0 && species != null) {
          this.petForm.get('breed')!.setValue(BREED_OTHER_VALUE);
        } else {
          this.petForm.get('breed')!.setValue('');
        }
      }

      const breedCtrl = this.petForm.get('breed')!;
      if (opts.length > 0) {
        breedCtrl.setValidators(Validators.required);
      } else {
        breedCtrl.clearValidators();
      }
      breedCtrl.updateValueAndValidity({ emitEvent: false });

      const specifyAnimalCtrl = this.petForm.get('specifyAnimalType')!;
      if (species === PetSpecies.Other) {
        specifyAnimalCtrl.setValidators(Validators.required);
      } else {
        specifyAnimalCtrl.clearValidators();
      }
      specifyAnimalCtrl.updateValueAndValidity({ emitEvent: false });

      if (species === PetSpecies.Bird) {
        this.specifyBreedPlaceholderKey.set('PETS.SPECIFY_BREED_BIRD_PH');
      } else if (species === PetSpecies.Rabbit) {
        this.specifyBreedPlaceholderKey.set('PETS.SPECIFY_BREED_RABBIT_PH');
      } else if (opts.length === 0 && species != null) {
        this.specifyBreedPlaceholderKey.set('PETS.SPECIFY_BREED_OTHER_PH');
      } else {
        this.specifyBreedPlaceholderKey.set('');
      }
    });

    this.petForm.get('breed')!.valueChanges.subscribe((breed) => {
      this.showSpecifyBreed.set(breed === BREED_OTHER_VALUE);
      const specifyBreedCtrl = this.petForm.get('specifyBreed')!;
      if (breed === BREED_OTHER_VALUE) {
        if (this.currentBreedOptions().length > 0) {
          specifyBreedCtrl.setValidators(Validators.required);
        } else {
          specifyBreedCtrl.clearValidators();
        }
      } else {
        specifyBreedCtrl.clearValidators();
        specifyBreedCtrl.setValue('');
      }
      specifyBreedCtrl.updateValueAndValidity({ emitEvent: false });
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['editingPet']) {
      const pet = changes['editingPet'].currentValue as Pet | null;
      if (pet) {
        this.isFormVisible = true;
        this.hydrateForm(pet);
      } else if (changes['editingPet'].previousValue != null) {
        this.resetForm();
      }
    }
  }

  // ── Visibility ──

  toggleForm(): void {
    this.isFormVisible = !this.isFormVisible;
    if (!this.isFormVisible) {
      this.resetForm();
    }
  }

  openForm(): void {
    this.isFormVisible = true;
  }

  // ── Species Selection ──

  selectSpecies(species: PetSpecies): void {
    this.petForm.get('species')!.setValue(species);
    this.petForm.get('species')!.markAsTouched();
  }

  // ── Breed Autocomplete ──

  onBreedInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.breedSearchText.set(value);
    this.breedDropdownOpen.set(true);
    if (!value.trim()) {
      this.petForm.get('breed')!.setValue('');
    }
  }

  selectBreed(breed: string): void {
    this.petForm.get('breed')!.setValue(breed);
    this.breedSearchText.set(this.translate.instant(this.breedI18nKey(breed)));
    this.breedDropdownOpen.set(false);
  }

  onBreedBlur(): void {
    setTimeout(() => {
      this.breedDropdownOpen.set(false);
      const currentBreed = this.petForm.get('breed')?.value;
      if (currentBreed) {
        this.breedSearchText.set(this.translate.instant(this.breedI18nKey(currentBreed)));
      } else if (this.breedSearchText().trim()) {
        this.breedSearchText.set('');
      }
    }, 200);
  }

  breedI18nKey(breed: string): string {
    return BREED_I18N_MAP[breed] ?? breed;
  }

  // ── Avatar Upload ──

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => this.avatarPreview.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  // ── Field Validation ──

  onFieldBlur(fieldName: string): void {
    const control = this.petForm.get(fieldName);
    if (control?.invalid && control?.touched) {
      this.shakingField.set(fieldName);
      setTimeout(() => this.shakingField.set(null), 500);
    }
  }

  // ── Allergy / Condition Modes ──

  setAllergyMode(mode: 'none' | 'other'): void {
    this.allergyMode.set(mode);
    const ctrl = this.petForm.get('specifyAllergy')!;
    if (mode === 'none') {
      ctrl.setValue('');
      ctrl.clearValidators();
    } else {
      ctrl.setValidators(Validators.required);
    }
    ctrl.updateValueAndValidity();
  }

  setConditionMode(mode: 'none' | 'other'): void {
    this.conditionMode.set(mode);
    const ctrl = this.petForm.get('medicalConditions')!;
    if (mode === 'none') {
      ctrl.setValue('');
      ctrl.clearValidators();
    } else {
      ctrl.setValidators(Validators.required);
    }
    ctrl.updateValueAndValidity();
  }

  modeChipClass(active: boolean): string {
    const base = 'rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 border cursor-pointer';
    return active
      ? `${base} border-indigo-500 bg-indigo-600 text-white shadow-sm`
      : `${base} border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/60`;
  }

  // ── Form Submission ──

  onSubmit(): void {
    if (this.submitting() || this.petForm.invalid) return;

    this.submitting.set(true);
    const v = this.petForm.getRawValue();
    const rawBreed = v.breed?.trim();
    const finalBreed =
      rawBreed === BREED_OTHER_VALUE ? v.specifyBreed?.trim() || undefined : rawBreed || undefined;

    const payload = {
      name: v.name!.trim(),
      species: v.species!,
      age: v.age!,
      notes: v.notes?.trim() || null,
      breed: finalBreed,
      weight: v.weight ?? undefined,
      allergies: this.allergiesValue(),
      medicalConditions:
        this.conditionMode() === 'other'
          ? v.medicalConditions?.trim() || undefined
          : undefined,
      isNeutered: !!v.isNeutered,
      medicalNotes: v.medicalNotes?.trim() || undefined,
      feedingSchedule: v.feedingSchedule?.trim() || undefined,
      microchipNumber: v.microchipNumber?.trim() || undefined,
      vetName: v.vetName?.trim() || undefined,
      vetPhone: v.vetPhone?.trim() || undefined,
    };

    const editId = this.editingPet?.id;
    const request$ = editId
      ? this.petService.update(editId, payload)
      : this.petService.create(payload);

    request$.subscribe({
      next: () => {
        this.submitting.set(false);
        if (editId) {
          this.toast.success('Pet updated!');
          this.petSaved.emit();
          this.editCancelled.emit();
        } else {
          this.celebrateSuccess();
          this.showSuccess.set(true);
          setTimeout(() => {
            this.showSuccess.set(false);
            this.isFormVisible = false;
            this.resetForm();
            this.petSaved.emit();
          }, 1500);
        }
      },
      error: () => {
        this.toast.error(editId ? 'Failed to update pet.' : 'Failed to add pet. Please try again.');
        this.submitting.set(false);
      },
    });
  }

  cancelEdit(): void {
    this.isFormVisible = false;
    this.resetForm();
    this.editCancelled.emit();
  }

  // ── Private Helpers ──

  private celebrateSuccess(): void {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#7c3aed', '#a78bfa', '#c4b5fd', '#22c55e', '#fbbf24'],
    });
  }

  private allergiesValue(): string | undefined {
    if (this.allergyMode() === 'none') return undefined;
    return this.petForm.get('specifyAllergy')?.value?.trim() || undefined;
  }

  private hydrateForm(pet: Pet): void {
    this.hydrating = true;
    this.hydrateAllergyMode(pet.allergies);
    this.hydrateConditionMode(pet.medicalConditions);

    this.petForm.patchValue({
      name: pet.name,
      species: pet.species,
      age: pet.age,
      weight: pet.weight ?? null,
      isNeutered: pet.isNeutered ?? false,
      notes: pet.notes ?? '',
      medicalConditions: pet.medicalConditions ?? '',
      medicalNotes: pet.medicalNotes ?? '',
      feedingSchedule: pet.feedingSchedule ?? '',
      microchipNumber: pet.microchipNumber ?? '',
      vetName: pet.vetName ?? '',
      vetPhone: pet.vetPhone ?? '',
    });

    const breedList = getBreedOptionsForSpecies(pet.species);
    if (pet.breed && (breedList as readonly string[]).includes(pet.breed)) {
      this.petForm.get('breed')!.setValue(pet.breed);
      this.breedSearchText.set(this.translate.instant(this.breedI18nKey(pet.breed)));
      this.petForm.get('specifyBreed')!.setValue('');
    } else if (pet.breed) {
      this.petForm.get('breed')!.setValue(BREED_OTHER_VALUE);
      this.breedSearchText.set(this.translate.instant(this.breedI18nKey(BREED_OTHER_VALUE)));
      this.petForm.get('specifyBreed')!.setValue(pet.breed);
    } else {
      this.petForm.get('breed')!.setValue('');
      this.breedSearchText.set('');
      this.petForm.get('specifyBreed')!.setValue('');
    }

    this.hydrating = false;
    this.nameValue.set(pet.name);

    if (pet.medicalNotes || pet.feedingSchedule || pet.microchipNumber || pet.vetName || pet.vetPhone) {
      this.showMedicalSection.set(true);
    }
  }

  private hydrateAllergyMode(s: string | null | undefined): void {
    if (s?.trim()) {
      this.allergyMode.set('other');
      this.petForm.get('specifyAllergy')?.setValue(s);
    } else {
      this.allergyMode.set('none');
      this.petForm.get('specifyAllergy')?.setValue('');
    }
  }

  private hydrateConditionMode(s: string | null | undefined): void {
    if (s?.trim()) {
      this.conditionMode.set('other');
    } else {
      this.conditionMode.set('none');
      this.petForm.get('medicalConditions')?.setValue('');
    }
  }

  private resetForm(): void {
    this.petForm.reset({
      name: '',
      species: null,
      breed: '',
      specifyAnimalType: '',
      specifyBreed: '',
      age: null,
      weight: null,
      isNeutered: false,
      notes: '',
      specifyAllergy: '',
      medicalConditions: '',
      medicalNotes: '',
      feedingSchedule: '',
      microchipNumber: '',
      vetName: '',
      vetPhone: '',
    });
    this.allergyMode.set('none');
    this.conditionMode.set('none');
    this.showMedicalSection.set(false);
    this.currentBreedOptions.set([]);
    this.showSpecifyAnimal.set(false);
    this.showSpecifyBreed.set(false);
    this.breedSearchText.set('');
    this.breedDropdownOpen.set(false);
    this.specifyBreedPlaceholderKey.set('');
    this.avatarPreview.set(null);
    this.nameValue.set('');
  }
}
