// Reportes: consulta estadísticas por fecha, dibuja barras y exporta los resultados a Excel o PDF.
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { CatalogoService } from '../../services/catalogo.service';
import { Reporte } from '../../models/catalogo';

// @Component relaciona la clase con su HTML y CSS. selector es su etiqueta; standalone permite declarar aquí las dependencias del template.
@Component({
  selector: 'app-reportes',
  standalone: true,
  // FormsModule habilita ngModel y NgForm. imports declara componentes, directivas y pipes usados en el HTML de esta pantalla.
  imports: [FormsModule, DatePipe],
  templateUrl: './reportes.html',
  styleUrl: './reportes.css',
})
export class Reportes implements OnInit {
  // inject pide a Angular una dependencia disponible. private la reserva para esta clase; this accede a sus propiedades y métodos.
  private catalogo = inject(CatalogoService);

  // signal guarda estado reactivo: nombre() lee el valor y nombre.set(...) lo cambia; Angular actualiza sus usos en la pantalla.
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

  // Devuelve una fecha AAAA-MM-DD usando la zona horaria de Argentina.
  fechaLocal(fecha: Date): string {
    return fecha.toLocaleDateString('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires',
    });
  }

  // Angular llama a ngOnInit una vez, después de establecer los inputs iniciales. implements OnInit comprueba el contrato; no llama al método por sí mismo.
  // async devuelve una Promise; await espera la respuesta sin bloquear la página. Promise<void> indica que no devuelve un dato al terminar.
  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  // formulario? es opcional: sirve al abrir la pantalla o al enviar el filtro. Consulta reporte y últimas actividades.
  async cargar(formulario?: NgForm): Promise<void> {
    if (this.cargando() || formulario?.invalid) {
      return;
    }

    this.cargando.set(true);
    this.error.set('');

    // try intenta la operación; catch permite mostrar un error. Si hay finally, se ejecuta tanto con éxito como con error.
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

  // Calcula desde y hasta para incluir los últimos 7 o 30 días, contando el día de hoy.
  async periodo(dias: number): Promise<void> {
    const hoy = new Date();

    this.hasta = this.fechaLocal(hoy);
    hoy.setDate(hoy.getDate() - dias + 1);
    this.desde = this.fechaLocal(hoy);

    await this.cargar();
  }

  // Calcula un porcentaje respecto del máximo para dibujar la barra. map extrae vistas y ... pasa esos valores a Math.max.
  ancho(vistas: number): number {
    const mayor = Math.max(
      1,
      ...this.reporte().peliculas.map((pelicula) => pelicula.vistas),
    );

    return (vistas / mayor) * 100;
  }

  // Suma la facturación de todos los días del reporte ya cargado.
  totalFacturado(): number {
    let total = 0;

    for (const dia of this.reporte().diario) {
      total += dia.facturacion;
    }

    return total;
  }

  // Crea tres hojas con ExcelJS. Blob representa el archivo en memoria y un enlace temporal inicia su descarga.
  async excel(): Promise<void> {
    if (this.exportando()) {
      return;
    }

    this.exportando.set(true);
    this.error.set('');

    try {
      // default contiene la biblioteca; Workbook es su clase para crear un archivo Excel.
      const { default: ExcelJS } = await import('exceljs');
      const libro = new ExcelJS.Workbook();

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

      for (const hoja of libro.worksheets) {
        hoja.getRow(1).font = { bold: true };

        hoja.columns.forEach((columna) => {
          columna.width = 25;
        });
      }

      const datos = await libro.xlsx.writeBuffer();

      const archivo = new Blob([datos], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      // Crea una URL temporal del archivo en memoria; revokeObjectURL la libera después de iniciar la descarga.
      const url = URL.createObjectURL(archivo);
      const enlace = document.createElement('a');

      enlace.href = url;
      enlace.download = 'reporte-cine.xlsx';
      enlace.click();

      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      this.error.set('No pudimos exportar a Excel.');
    } finally {
      this.exportando.set(false);
    }
  }

  // Crea un documento con jsPDF; la función local linea escribe texto y agrega páginas cuando se llena el espacio.
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