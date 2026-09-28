import { Component } from '@angular/core';
import { OwnerDashboardComponent } from './features/dashboard/owner-dashboard.component';

@Component({
  selector: 'app-root',
  imports: [OwnerDashboardComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
