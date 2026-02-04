import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import * as L from 'leaflet';

import { TasksService, TaskCreate } from '../../services/tasks.service';
import { setupLeafletDefaultIcon } from '../../utils/leaflet-icon';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './task-form.html',
  styleUrls: ['./task-form.scss']
})
export class TaskForm implements AfterViewInit, OnDestroy {
  @ViewChild('map') mapElement?: ElementRef<HTMLDivElement>;
  form: FormGroup;
  map?: L.Map;
  marker?: L.Marker;
  statusMessage = '';

  constructor(
    private fb: FormBuilder,
    private tasksService: TasksService,
    private router: Router
  ) {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      priority: ['medium', Validators.required],
      done: [false],
      address: [''],
      lat: [null],
      lng: [null]
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

    this.map.on('click', (event: L.LeafletMouseEvent) => {
      const { lat, lng } = event.latlng;
      this.form.patchValue({
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6))
      });
      this.updateMarker(lat, lng);
    });
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  updateMarker(lat: number, lng: number): void {
    if (!this.map) {
      return;
    }

    if (!this.marker) {
      this.marker = L.marker([lat, lng]).addTo(this.map);
    } else {
      this.marker.setLatLng([lat, lng]);
    }

    this.map.setView([lat, lng], 13);
  }

  async geocodeAddress(): Promise<void> {
    const address = String(this.form.get('address')?.value ?? '').trim();
    if (!address) {
      this.statusMessage = 'Podaj adres do geokodowania.';
      return;
    }

    this.statusMessage = 'Szukam lokalizacji...';
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          address
        )}`,
        {
          headers: {
            Accept: 'application/json'
          }
        }
      );

      if (!response.ok) {
        this.statusMessage = 'Nie udało się pobrać lokalizacji.';
        return;
      }

      const results: Array<{ lat: string; lon: string }> = await response.json();
      if (!results.length) {
        this.statusMessage = 'Brak wyników dla podanego adresu.';
        return;
      }

      const lat = Number(results[0].lat);
      const lng = Number(results[0].lon);
      this.form.patchValue({ lat, lng });
      this.updateMarker(lat, lng);
      this.statusMessage = 'Zaktualizowano współrzędne.';
    } catch (error) {
      console.error('Błąd geokodowania:', error);
      this.statusMessage = 'Wystąpił błąd geokodowania.';
    }
  }

  syncMarkerFromForm(): void {
    const lat = this.form.get('lat')?.value;
    const lng = this.form.get('lng')?.value;
    if (typeof lat === 'number' && typeof lng === 'number') {
      this.updateMarker(lat, lng);
    }
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }

    const data: TaskCreate = {
      ...this.form.value,
      address: this.form.value.address || null,
      lat: this.form.value.lat ?? null,
      lng: this.form.value.lng ?? null
    } as TaskCreate;

    this.tasksService.createTask(data).subscribe({
      next: () => this.router.navigate(['/tasks']),
      error: (err) => console.error('Błąd tworzenia task:', err)
    });
  }
}
