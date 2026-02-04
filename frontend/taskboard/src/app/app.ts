import { Component } from '@angular/core';

import { Layout } from './core/layout/layout';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [Layout],
  templateUrl: './app.html'
})
export class App {}
