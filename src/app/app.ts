import { Component, signal } from '@angular/core';
import { Cartelera } from './pages/cartelera/cartelera';

@Component({
  imports: [Cartelera],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('cine-app');
}
