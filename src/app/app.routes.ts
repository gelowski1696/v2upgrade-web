import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'privacy',
    loadComponent: () =>
      import('./features/legal/privacy-policy.component').then(
        (module) => module.PrivacyPolicyComponent,
      ),
  },
  {
    path: '',
    loadComponent: () =>
      import('./features/dashboard/owner-dashboard.component').then(
        (module) => module.OwnerDashboardComponent,
      ),
  },
  { path: '**', redirectTo: '' },
];
