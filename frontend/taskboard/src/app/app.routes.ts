import { Routes } from '@angular/router';

import { Login } from './auth/pages/login/login';
import { TaskList } from './tasks/pages/task-list/task-list';
import { TaskForm } from './tasks/pages/task-form/task-form';
import { AuthGuard } from './auth/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'tasks', component: TaskList, canActivate: [AuthGuard] },
  { path: 'tasks/new', component: TaskForm, canActivate: [AuthGuard] },
  { path: 'tasks/:id/edit', component: TaskForm, canActivate: [AuthGuard] },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' }
];
