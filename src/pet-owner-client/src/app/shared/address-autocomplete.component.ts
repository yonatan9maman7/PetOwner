import {
  Component,
  ElementRef,
  forwardRef,
  HostListener,
  inject,
  output,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GeocodingService, AddressSuggestion } from '../services/geocoding.service';

@Component({
  selector: 'app-address-autocomplete',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AddressAutocompleteComponent),
      multi: true,
    },
  ],
  template: `
    <div class="autocomplete-wrapper">
      <input
        type="text"
        dir="auto"
        class="addr-ac-input w-full text-start placeholder:text-start"
        [placeholder]="'e.g. 123 Main St, Tel Aviv'"
        [value]="displayValue()"
        (input)="onInput($event)"
        (focus)="onFocus()"
        autocomplete="off"
      />
      @if (showDropdown() && suggestions().length > 0) {
        <ul class="autocomplete-dropdown" role="listbox">
          @for (s of suggestions(); track s.displayName) {
            <li
              role="option"
              class="autocomplete-option"
              (mousedown)="selectSuggestion(s)"
            >
              {{ s.displayName }}
            </li>
          }
        </ul>
      }
      @if (loading()) {
        <div class="autocomplete-loading">Searching...</div>
      }
    </div>
  `,
  styles: [`
    .autocomplete-wrapper {
      position: relative;
    }

    .addr-ac-input {
      width: 100%;
      padding: 0.85rem 1rem;
      font-size: 1rem;
      border: 1.5px solid #cbd5e1;
      border-radius: 12px;
      background: #fff;
      color: #0f172a;
      text-align: start;
      unicode-bidi: plaintext;
      transition: border-color 0.2s, box-shadow 0.2s;
      outline: none;

      &:focus {
        border-color: #6366f1;
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
      }

      &::placeholder {
        color: #94a3b8;
        text-align: start;
        unicode-bidi: plaintext;
      }
    }

    .autocomplete-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      z-index: 600;
      margin: 4px 0 0;
      padding: 0;
      list-style: none;
      background: #fff;
      border: 1.5px solid #cbd5e1;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
      max-height: 220px;
      overflow-y: auto;
    }

    .autocomplete-option {
      padding: 0.75rem 1rem;
      font-size: 0.9rem;
      color: #334155;
      cursor: pointer;
      transition: background 0.15s;
      border-bottom: 1px solid #f1f5f9;

      &:last-child {
        border-bottom: none;
      }

      &:hover {
        background: #eef2ff;
        color: #4f46e5;
      }
    }

    .autocomplete-loading {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      padding: 0.6rem 1rem;
      font-size: 0.85rem;
      color: #64748b;
      background: #fff;
      border: 1.5px solid #cbd5e1;
      border-radius: 12px;
      margin-top: 4px;
    }
  `],
})
export class AddressAutocompleteComponent implements ControlValueAccessor {
  private readonly geocoding = inject(GeocodingService);
  private readonly elRef = inject(ElementRef);

  readonly suggestions = signal<AddressSuggestion[]>([]);
  readonly showDropdown = signal(false);
  readonly loading = signal(false);
  readonly displayValue = signal('');

  readonly suggestionSelected = output<AddressSuggestion>();

  private readonly searchSubject = new Subject<string>();
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    this.searchSubject
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((query) => {
          if (query.trim().length < 3) {
            this.loading.set(false);
            return [];
          }
          this.loading.set(true);
          return this.geocoding.search(query);
        }),
        takeUntilDestroyed(),
      )
      .subscribe((results) => {
        this.suggestions.set(Array.isArray(results) ? results : []);
        this.showDropdown.set(Array.isArray(results) && results.length > 0);
        this.loading.set(false);
      });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.showDropdown.set(false);
    }
  }

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.displayValue.set(value);
    this.onChange(value);
    this.searchSubject.next(value);
  }

  onFocus(): void {
    this.onTouched();
    if (this.suggestions().length > 0) {
      this.showDropdown.set(true);
    }
  }

  selectSuggestion(suggestion: AddressSuggestion): void {
    this.displayValue.set(suggestion.displayName);
    this.onChange(suggestion.displayName);
    this.showDropdown.set(false);
    this.suggestions.set([]);
    this.suggestionSelected.emit(suggestion);
  }

  writeValue(value: string): void {
    this.displayValue.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
}
