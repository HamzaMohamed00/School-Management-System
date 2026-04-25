import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ParentService } from '../../../core/services/parent.service';

@Component({
  selector: 'app-fees',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './fees.component.html',
  styleUrls: ['./fees.component.css']
})
export class FeesComponent implements OnInit {
  fees: any[] = [];
  totalDue: number = 0;
  isProcessing: boolean = false;
  paymentSuccess: boolean = false;
  selectedFees = new Set<number>();
  showPaymentModal: boolean = false;

  constructor(private parentService: ParentService) {}

  async ngOnInit() {
    await this.loadFees();
  }

  async loadFees() {
    this.fees = await this.parentService.getFeeSummary();
    this.calculateTotal();
  }

  toggleFee(id: number) {
    if (this.selectedFees.has(id)) {
      this.selectedFees.delete(id);
    } else {
      this.selectedFees.add(id);
    }
    this.calculateTotal();
  }

  calculateTotal() {
    const selectedList = this.fees.filter(f => this.selectedFees.has(f.id));
    this.totalDue = selectedList.reduce((acc, curr) => acc + curr.amount, 0);
    
    // If none selected, show total of all pending
    if (this.selectedFees.size === 0) {
      this.totalDue = this.fees.reduce((acc, curr) => acc + curr.amount, 0);
    }
  }

  async payNow() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    const success = await this.parentService.processPayment(Array.from(this.selectedFees));
    
    if (success) {
      this.paymentSuccess = true;
      this.isProcessing = false;
      this.showPaymentModal = false;
      // Refresh list to move to history (simulated)
      this.fees = this.fees.map(f => ({ ...f, status: 'paid' }));
      this.selectedFees.clear();
      this.totalDue = 0;
    }
  }

  getPendingFees() {
    return this.fees.filter(f => f.status === 'pending');
  }

  getPaidHistory() {
    return this.fees.filter(f => f.status === 'paid');
  }
}
