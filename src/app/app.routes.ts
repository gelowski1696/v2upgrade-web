import { Routes } from '@angular/router';
import { OwnerDashboardComponent } from './features/dashboard/owner-dashboard.component';

export const routes: Routes = [
  {
    path: 'privacy',
    loadComponent: () =>
      import('./features/legal/privacy-policy.component').then(
        (module) => module.PrivacyPolicyComponent,
      ),
  },
  { path: '', component: OwnerDashboardComponent },
  { path: '**', redirectTo: '' },
];
