import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';

import { TasksService, Task } from '../../services/tasks.service';
import { setupLeafletDefaultIcon } from '../../utils/leaflet-icon';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './task-list.html',
  styleUrls: ['./task-list.scss']
})
export class TaskList implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('map') mapElement?: ElementRef<HTMLDivElement>;
  tasks: Task[] = [];
  map?: L.Map;
  markersLayer?: L.LayerGroup;
  routeLayer?: L.Polyline;
  userMarker?: L.Marker;
  showOnlyUndone = false;
  statusMessage = '';
  optimizedOrderIds: number[] = [];
  useOptimizedOrder = false;
  isExecuting: Record<number, boolean> = {};

  constructor(private tasksService: TasksService) {}

  ngOnInit(): void {
    this.tasksService.getTasks().subscribe({
      next: (data) => {
        this.tasks = data;
        this.updateMarkers();
      },
      error: (err) => console.error('Błąd pobierania tasks:', err)
    });
  }

  ngAfterViewInit(): void {
    if (!this.mapElement) {
      return;
    }

    setupLeafletDefaultIcon();
    this.map = L.map(this.mapElement.nativeElement).setView([52.2297, 21.0122], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    this.markersLayer = L.layerGroup().addTo(this.map);
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  get visibleTasks(): Task[] {
    const filtered = this.showOnlyUndone ? this.tasks.filter((task) => !task.done) : [...this.tasks];
    if (!this.useOptimizedOrder || this.optimizedOrderIds.length === 0) {
      return filtered;
    }

    const withLocation = filtered.filter((task) => this.hasLocation(task));
    const withoutLocation = filtered.filter((task) => !this.hasLocation(task));
    const ordered = this.optimizedOrderIds
      .map((id) => withLocation.find((task) => task.id === id))
      .filter((task): task is Task => Boolean(task));
    const remaining = withLocation.filter((task) => !this.optimizedOrderIds.includes(task.id));

    return [...ordered, ...remaining, ...withoutLocation];
  }

  toggleFilter(): void {
    this.updateMarkers();
  }

  hasLocation(task: Task): boolean {
    return typeof task.lat === 'number' && typeof task.lng === 'number';
  }

  updateMarkers(): void {
    if (!this.map || !this.markersLayer) {
      return;
    }

    this.markersLayer.clearLayers();
    const markerBounds: L.LatLngExpression[] = [];

    this.visibleTasks.forEach((task) => {
      if (!this.hasLocation(task)) {
        return;
      }

      const marker = L.marker([task.lat as number, task.lng as number]);
      marker.bindPopup(
        `<strong>${task.title}</strong><br/>${task.address ?? 'Brak adresu'}`
      );
      marker.addTo(this.markersLayer as L.LayerGroup);
      markerBounds.push([task.lat as number, task.lng as number]);
    });

    if (markerBounds.length > 0) {
      const bounds = L.latLngBounds(markerBounds);
      this.map.fitBounds(bounds, { padding: [40, 40] });
    }
  }

  clearRoute(): void {
    if (this.routeLayer) {
      this.routeLayer.remove();
    }
    this.routeLayer = undefined;
    if (this.userMarker) {
      this.userMarker.remove();
    }
    this.userMarker = undefined;
  }

  showRoute(task: Task): void {
    if (!this.hasLocation(task)) {
      this.statusMessage = 'To zadanie nie ma przypisanej lokalizacji.';
      return;
    }

    this.statusMessage = 'Pobieram lokalizację użytkownika...';
    this.clearRoute();
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const start: L.LatLngExpression = [
          position.coords.latitude,
          position.coords.longitude
        ];
        const end: L.LatLngExpression = [task.lat as number, task.lng as number];

        if (this.map) {
          this.userMarker = L.marker(start).addTo(this.map);
          this.routeLayer = L.polyline([start, end], { color: '#0d6efd' }).addTo(this.map);
          this.map.fitBounds(L.latLngBounds([start, end]), { padding: [40, 40] });
        }

        this.statusMessage = `Wyświetlam trasę do: ${task.title}`;
      },
      () => {
        this.statusMessage = 'Nie udało się pobrać lokalizacji użytkownika.';
      }
    );
  }

  executeTask(task: Task): void {
    if (task.done || this.isExecuting[task.id]) {
      return;
    }

    this.isExecuting[task.id] = true;
    this.tasksService.executeTask(task.id).subscribe({
      next: () => {
        task.done = true;
        this.statusMessage = `Zadanie "${task.title}" zostało wykonane.`;
        this.updateMarkers();
      },
      error: () => {
        this.statusMessage = `Nie udało się wykonać zadania: ${task.title}.`;
      },
      complete: () => {
        this.isExecuting[task.id] = false;
      }
    });
  }

  async optimizeOrder(): Promise<void> {
    this.statusMessage = 'Wyznaczam optymalną kolejność...';
    this.clearRoute();
    this.useOptimizedOrder = true;

    const availableTasks = this.visibleTasks.filter((task) => this.hasLocation(task));
    if (availableTasks.length === 0) {
      this.statusMessage = 'Brak zadań z lokalizacją do optymalizacji.';
      this.optimizedOrderIds = [];
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const start = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        const remaining = [...availableTasks];
        const ordered: Task[] = [];
        let current = start;

        while (remaining.length > 0) {
          let closestIndex = 0;
          let closestDistance = this.distance(current, {
            lat: remaining[0].lat as number,
            lng: remaining[0].lng as number
          });

          remaining.forEach((task, index) => {
            const dist = this.distance(current, {
              lat: task.lat as number,
              lng: task.lng as number
            });
            if (dist < closestDistance) {
              closestDistance = dist;
              closestIndex = index;
            }
          });

          const nextTask = remaining.splice(closestIndex, 1)[0];
          ordered.push(nextTask);
          current = { lat: nextTask.lat as number, lng: nextTask.lng as number };
        }

        this.optimizedOrderIds = ordered.map((task) => task.id);
        this.drawOptimizedRoute(start, ordered);
        this.statusMessage = 'Zaktualizowano kolejność na mapie.';
        this.updateMarkers();
      },
      () => {
        this.statusMessage = 'Nie udało się pobrać lokalizacji użytkownika.';
        this.optimizedOrderIds = [];
      }
    );
  }

  resetOrder(): void {
    this.useOptimizedOrder = false;
    this.optimizedOrderIds = [];
    this.clearRoute();
    this.updateMarkers();
  }

  drawOptimizedRoute(start: { lat: number; lng: number }, ordered: Task[]): void {
    if (!this.map) {
      return;
    }

    const points: L.LatLngTuple[] = [
      [start.lat, start.lng],
      ...ordered.map((task) => [task.lat as number, task.lng as number] as L.LatLngTuple)
    ];

    this.userMarker = L.marker([start.lat, start.lng]).addTo(this.map);
    this.routeLayer = L.polyline(points, { color: '#198754' }).addTo(this.map);
    this.map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
  }

  distance(
    from: { lat: number; lng: number },
    to: { lat: number; lng: number }
  ): number {
    const toRadians = (value: number) => (value * Math.PI) / 180;
    const earthRadius = 6371;
    const deltaLat = toRadians(to.lat - from.lat);
    const deltaLng = toRadians(to.lng - from.lng);
    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(toRadians(from.lat)) *
        Math.cos(toRadians(to.lat)) *
        Math.sin(deltaLng / 2) *
        Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadius * c;
  }
}
