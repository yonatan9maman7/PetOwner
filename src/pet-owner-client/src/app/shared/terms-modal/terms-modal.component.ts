import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
  inject,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-terms-modal',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './terms-modal.component.html',
})
export class TermsModalComponent {
  readonly dialogTitleId = 'terms-modal-title';

  @Input() isOpen = false;
  @Output() readonly close = new EventEmitter<void>();

  readonly languageService = inject(LanguageService);

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen) {
      this.close.emit();
    }
  }

  onOverlayMouseDown(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }
}
