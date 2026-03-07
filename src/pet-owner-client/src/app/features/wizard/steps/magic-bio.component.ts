import { Component, inject, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { WizardStore } from '../wizard.store';

@Component({
  selector: 'app-step-magic-bio',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <h2 class="step-title">Magic Bio</h2>
    <p class="step-subtitle">Tell the AI about yourself and we'll craft a professional bio for you.</p>

    <form [formGroup]="form" class="step-form">
      <label class="field">
        <span class="field-label">Tell the AI about your experience</span>
        <textarea
          formControlName="userNotes"
          rows="3"
          placeholder="e.g. 10 years with dogs, energetic, love cats, certified pet first-aid"
        ></textarea>
      </label>

      <button
        type="button"
        class="btn btn-magic"
        [disabled]="!form.controls.userNotes.value.trim() || store.isGeneratingBio()"
        (click)="onGenerate()"
      >
        @if (store.isGeneratingBio()) {
          <span class="magic-spinner"></span> Generating...
        } @else {
          ✨ Magic AI Bio
        }
      </button>

      <label class="field">
        <span class="field-label">Your Bio</span>
        <textarea
          formControlName="generatedBio"
          rows="5"
          placeholder="Your AI-generated bio will appear here — feel free to edit it!"
        ></textarea>
      </label>
    </form>
  `,
  styles: `
    .btn-magic {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
      font-weight: 600;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      background: linear-gradient(135deg, #8b5cf6, #ec4899);
      color: #fff;
      transition: opacity 0.2s, transform 0.1s;
      min-height: 48px;
      align-self: flex-start;

      &:hover:not(:disabled) {
        opacity: 0.9;
      }

      &:active:not(:disabled) {
        transform: scale(0.97);
      }

      &:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
    }

    .magic-spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `,
})
export class MagicBioComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly store = inject(WizardStore);

  readonly form = this.fb.nonNullable.group({
    userNotes: [''],
    generatedBio: [''],
  });

  ngOnInit(): void {
    const saved = this.store.formSnapshot().bio;
    this.form.patchValue(saved);

    this.form.controls.userNotes.valueChanges.subscribe((userNotes) => {
      this.store.patchBio({ ...this.store.formSnapshot().bio, userNotes });
    });

    this.form.controls.generatedBio.valueChanges.subscribe((generatedBio) => {
      this.store.patchBio({ ...this.store.formSnapshot().bio, generatedBio });
    });
  }

  onGenerate(): void {
    const userNotes = this.form.controls.userNotes.value.trim();
    if (!userNotes) return;

    this.store.generateBio(userNotes);

    const check = setInterval(() => {
      const bio = this.store.formSnapshot().bio.generatedBio;
      if (bio && bio !== this.form.controls.generatedBio.value) {
        this.form.controls.generatedBio.setValue(bio);
      }
      if (!this.store.isGeneratingBio()) {
        clearInterval(check);
      }
    }, 200);
  }
}
