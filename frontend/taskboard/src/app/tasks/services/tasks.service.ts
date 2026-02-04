import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';

import { APP_SETTINGS, AppSettings } from '../../app.settings';

export type Task = {
  id: number;
  title: string;
  done: boolean;
  priority: string;
  lat: number | null;
  lng: number | null;
  address: string | null;
};

export type TaskCreate = {
  title: string;
  done: boolean;
  priority: string;
  lat: number | null;
  lng: number | null;
  address: string | null;
};

export type TaskExecuteResponse = {
  id: number;
  done: boolean;
};

@Injectable({
  providedIn: 'root'
})
export class TasksService {
  constructor(
    private http: HttpClient,
    @Inject(APP_SETTINGS) private settings: AppSettings
  ) {}

  getTasks() {
    return this.http.get<Task[]>(`${this.settings.apiBaseUrl}/tasks`);
  }

  createTask(data: TaskCreate) {
    return this.http.post<Task>(`${this.settings.apiBaseUrl}/tasks`, data);
  }

  executeTask(taskId: number) {
    return this.http.post<TaskExecuteResponse>(
      `${this.settings.apiBaseUrl}/tasks/${taskId}/execute`,
      {}
    );
  }
}
