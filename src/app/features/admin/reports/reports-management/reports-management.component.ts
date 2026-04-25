import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportsService, AdminReportsStats, ReportFilter } from '../../../../core/services/reports.service';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';

@Component({
  selector: 'app-reports-management',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './reports-management.component.html',
  styleUrl: './reports-management.component.css'
})
export class ReportsManagementComponent implements OnInit {
  filter: ReportFilter = {
    gradeName: ''
  };

  stats: AdminReportsStats = {
    completedSessions: 0,
    absenceDays: 0,
    averageAttendance: 0,
    absenceByGrade: [],
    weeklyAttendance: []
  };

  loading = true;

  // Chart setup
  public pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' }
    }
  };
  public pieChartData: ChartData<'doughnut', number[], string | string[]> = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
      borderWidth: 0
    }]
  };
  public pieChartType: ChartType = 'doughnut';

  public barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { beginAtZero: true }
    },
    plugins: {
      legend: { position: 'top' }
    }
  };
  public barChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [
      { data: [], label: 'حضور', backgroundColor: '#3b82f6', borderRadius: 4 },
      { data: [], label: 'غياب', backgroundColor: '#ef4444', borderRadius: 4 }
    ]
  };
  public barChartType: ChartType = 'bar';

  constructor(private reportsService: ReportsService) { }

  ngOnInit() {
    this.loadStats();
  }

  async loadStats() {
    this.loading = true;
    try {
      this.stats = await this.reportsService.getAdminStats(this.filter);
      this.updateCharts();
    } catch (err: any) {
      console.error('Failed to load reports', err);
    } finally {
      this.loading = false;
    }
  }

  updateCharts() {
    // Update Donut Chart
    this.pieChartData.labels = this.stats.absenceByGrade.map(a => a.gradeName);
    this.pieChartData.datasets[0].data = this.stats.absenceByGrade.map(a => a.count);

    // Update Bar Chart
    this.barChartData.labels = this.stats.weeklyAttendance.map(w => w.day);
    this.barChartData.datasets[0].data = this.stats.weeklyAttendance.map(w => w.present);
    this.barChartData.datasets[1].data = this.stats.weeklyAttendance.map(w => w.absent);

    // Reassigning objects to trigger Angular change detection on ng2-charts
    this.pieChartData = { ...this.pieChartData };
    this.barChartData = { ...this.barChartData };
  }

  exportExcel() {
    // Generate simple CSV
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += "Type,Value\\n";
    csvContent += "Completed Sessions," + this.stats.completedSessions + "\\n";
    csvContent += "Absence Days," + this.stats.absenceDays + "\\n";
    csvContent += "Average Attendance," + this.stats.averageAttendance + "%\\n";
    csvContent += "\\nGrade,Absence Count\\n";
    
    this.stats.absenceByGrade.forEach(grade => {
      csvContent += grade.gradeName + "," + grade.count + "\\n";
    });

    csvContent += "\\nDay,Present,Absent\\n";
    this.stats.weeklyAttendance.forEach(day => {
      csvContent += day.day + "," + day.present + "," + day.absent + "\\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const dateStr = new Date().toISOString().slice(0,10);
    link.setAttribute("download", "school_report_" + dateStr + ".csv");
    document.body.appendChild(link); // Required for FF
    link.click();
    document.body.removeChild(link);
  }

  exportPdf() {
    window.print();
  }
}

