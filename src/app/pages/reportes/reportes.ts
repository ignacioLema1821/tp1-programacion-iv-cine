import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { CatalogoService } from '../../services/catalogo.service';
import { Reporte } from '../../models/catalogo';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './reportes.html',
  styleUrl: './reportes.css',
})
export class Reportes implements OnInit {
  private catalogo = inject(CatalogoService);

  // Guardamos los datos que muestra la pantalla.
  reporte = signal<Reporte>({
    diario: [],
    peliculas: [],
    candy: [],
  });

  actividad = signal<
    {
      id: number;
      usuario_id: string | null;
      accion: string;
      detalle: string;
      fecha: string;
    }[]
  >([]);

  error = signal('');
  cargando = signal(false);
  exportando = signal(false);

  desde = this.fechaLocal(new Date());
  hasta = this.desde;

  fechaLocal(fecha: Date): string {
    return fecha.toLocaleDateString('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires',
    });
  }

  // Cuando se abre la pantalla, consultamos los reportes.
  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  async cargar(formulario?: NgForm): Promise<void> {
    if (this.cargando() || formulario?.invalid) {
      return;
    }

    this.cargando.set(true);
    this.error.set('');

    try {
      this.reporte.set(
        await this.catalogo.reporte(this.desde, this.hasta),
      );

      this.actividad.set(await this.catalogo.actividad());
    } catch (error) {
      this.error.set(
        error instanceof Error
          ? error.message
          : 'No pudimos consultar el reporte.',
      );
    } finally {
      this.cargando.set(false);
    }
  }

  // Permite consultar rápidamente los últimos 7 o 30 días.
  async periodo(dias: number): Promise<void> {
    const hoy = new Date();

    this.hasta = this.fechaLocal(hoy);
    hoy.setDate(hoy.getDate() - dias + 1);
    this.desde = this.fechaLocal(hoy);

    await this.cargar();
  }

  // Calculamos el ancho de cada barra respecto del mayor resultado.
  ancho(vistas: number): number {
    const mayor = Math.max(
      1,
      ...this.reporte().peliculas.map((pelicula) => pelicula.vistas),
    );

    return (vistas / mayor) * 100;
  }

  totalFacturado(): number {
    let total = 0;

    for (const dia of this.reporte().diario) {
      total += dia.facturacion;
    }

    return total;
  }

  async excel(): Promise<void> {
    if (this.exportando()) {
      return;
    }

    this.exportando.set(true);
    this.error.set('');

    try {
      // Cargamos ExcelJS cuando se solicita la descarga.
      const { Workbook } = await import('exceljs');
      const libro = new Workbook();

      const diario = libro.addWorksheet('Facturacion');

      diario.addRow([
        'Dia',
        'Facturacion',
        'Entradas',
        'Pago simulado',
        'Credito utilizado',
      ]);

      for (const dia of this.reporte().diario) {
        diario.addRow([
          dia.dia,
          dia.facturacion,
          dia.entradas,
          dia.pago_simulado,
          dia.credito,
        ]);
      }

      const peliculas = libro.addWorksheet('Peliculas');

      peliculas.addRow([
        'Pelicula',
        'Entradas vendidas',
        'Entradas validadas',
      ]);

      for (const pelicula of this.reporte().peliculas) {
        peliculas.addRow([
          pelicula.pelicula,
          pelicula.entradas,
          pelicula.vistas,
        ]);
      }

      const candy = libro.addWorksheet('Candy');
      candy.addRow(['Producto', 'Cantidad']);

      for (const producto of this.reporte().candy) {
        candy.addRow([producto.nombre, producto.cantidad]);
      }

      // Damos formato a los encabezados y ancho a las columnas.
      for (const hoja of libro.worksheets) {
        hoja.getRow(1).font = { bold: true };

        hoja.columns.forEach((columna) => {
          columna.width = 25;
        });
      }

      // ExcelJS genera los datos y Blob los prepara para descargarlos.
      const datos = await libro.xlsx.writeBuffer();

      const archivo = new Blob([datos], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const url = URL.createObjectURL(archivo);
      const enlace = document.createElement('a');

      enlace.href = url;
      enlace.download = 'reporte-cine.xlsx';
      enlace.click();

      // Liberamos la dirección temporal después de iniciar la descarga.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      this.error.set('No pudimos exportar a Excel.');
    } finally {
      this.exportando.set(false);
    }
  }

  async pdf(): Promise<void> {
    if (this.exportando()) {
      return;
    }

    this.exportando.set(true);
    this.error.set('');

    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF();

      let y = 20;

      // Escribimos el texto y agregamos páginas cuando falta espacio.
      const linea = (texto: string) => {
        const lineas = pdf.splitTextToSize(texto, 170) as string[];

        for (const textoLinea of lineas) {
          if (y > 275) {
            pdf.addPage();
            y = 20;
          }

          pdf.text(textoLinea, 20, y);
          y += 8;
        }
      };

      pdf.setFontSize(12);

      linea('CineApp - Reporte ' + this.desde + ' a ' + this.hasta);

      linea(
        'Facturacion neta de compras vigentes: ARS ' +
          this.totalFacturado().toFixed(2),
      );

      for (const dia of this.reporte().diario) {
        linea(
          dia.dia +
            ' | ARS ' +
            dia.facturacion.toFixed(2) +
            ' | Entradas: ' +
            dia.entradas,
        );
      }

      linea('Peliculas');

      for (const pelicula of this.reporte().peliculas) {
        linea(
          pelicula.pelicula +
            ' | Vendidas: ' +
            pelicula.entradas +
            ' | Validadas: ' +
            pelicula.vistas,
        );
      }

      linea('Candy');

      for (const producto of this.reporte().candy) {
        linea(producto.nombre + ' | Cantidad: ' + producto.cantidad);
      }

      pdf.save('reporte-cine.pdf');
    } catch {
      this.error.set('No pudimos exportar a PDF.');
    } finally {
      this.exportando.set(false);
    }
  }
}