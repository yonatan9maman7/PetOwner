import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then(
        (m) => m.LoginComponent
      ),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent
      ),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent
      ),
  },
  {
    path: 'terms',
    loadComponent: () =>
      import('./features/terms/terms.component').then(
        (m) => m.TermsComponent
      ),
  },
  {
    path: '',
    loadComponent: () =>
      import('./features/map-dashboard/map-dashboard.component').then(
        (m) => m.MapDashboardComponent
      ),
  },
  {
    path: 'become-a-sitter',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/wizard/wizard.component').then(
        (m) => m.WizardComponent
      ),
  },
  {
    path: 'register-business',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/business-apply/business-apply.component').then(
        (m) => m.BusinessApplyComponent
      ),
  },
  {
    path: 'edit-profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/edit-profile/edit-profile.component').then(
        (m) => m.EditProfileComponent
      ),
  },
  {
    path: 'my-pets',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/my-pets/my-pets.component').then(
        (m) => m.MyPetsComponent
      ),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/user-profile/user-profile.component').then(
        (m) => m.UserProfileComponent
      ),
  },
  {
    path: 'requests',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/requests/requests.component').then(
        (m) => m.RequestsComponent
      ),
  },
  {
    path: 'earnings',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/earnings/earnings.component').then(
        (m) => m.EarningsComponent
      ),
  },
  {
    path: 'activity',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/pet-activity/pet-activity.component').then(
        (m) => m.PetActivityComponent
      ),
  },
  {
    path: 'fitness',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/fitness-dashboard/fitness-dashboard.component').then(
        (m) => m.FitnessDashboardComponent
      ),
  },
  {
    path: 'teletriage',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/teletriage/teletriage.component').then(
        (m) => m.TeletriageComponent
      ),
  },
  {
    path: 'community',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/social-feed/social-feed.component').then(
        (m) => m.SocialFeedComponent
      ),
  },
  {
    path: 'bookings',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/my-bookings/my-bookings.component').then(
        (m) => m.MyBookingsComponent
      ),
  },
  {
    path: 'favorites',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/favorites/favorites.component').then(
        (m) => m.FavoritesComponent
      ),
  },
  {
    path: 'provider-dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/provider-dashboard/provider-dashboard.component').then(
        (m) => m.ProviderDashboardComponent
      ),
  },
  {
    path: 'provider/:id',
    loadComponent: () =>
      import('./features/provider-profile/provider-profile.component').then(
        (m) => m.ProviderProfileComponent
      ),
  },
  {
    path: 'chat',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/chat-inbox/chat-inbox.component').then(
        (m) => m.ChatInboxComponent
      ),
  },
  {
    path: 'chat/:otherUserId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/chat-room/chat-room.component').then(
        (m) => m.ChatRoomComponent
      ),
  },
  {
    path: 'notifications',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/notifications-history/notifications-history.component').then(
        (m) => m.NotificationsHistoryComponent
      ),
  },
  {
    path: 'admin',
    canActivate: [roleGuard('Admin')],
    loadComponent: () =>
      import('./features/admin-dashboard/admin-dashboard.component').then(
        (m) => m.AdminDashboardComponent
      ),
  },
];
