import {
  Component,
  OnInit,
  signal,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import {
  ProviderService,
  EarningsSummary,
  EarningsTransaction,
  GrowConnectStatus,
} from '../../services/provider.service';

@Component({
  selector: 'app-earnings',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './earnings.component.html',
})
export class EarningsComponent implements OnInit {
  private readonly providerService = inject(ProviderService);

  loading = signal(true);
  summary = signal<EarningsSummary | null>(null);
  transactions = signal<EarningsTransaction[]>([]);
  connectStatus = signal<GrowConnectStatus | null>(null);

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.loading.set(true);

    this.providerService.getEarnings().subscribe({
      next: (s) => this.summary.set(s),
      error: () => this.loading.set(false),
    });

    this.providerService.getTransactions().subscribe({
      next: (txs) => this.transactions.set(txs),
    });

    this.providerService.getGrowConnectStatus().subscribe({
      next: (status) => {
        this.connectStatus.set(status);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
