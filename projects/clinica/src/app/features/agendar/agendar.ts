import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CitasService } from '../../core/citas.service';
import { NotificacionesService } from '../../core/notificaciones.service';
import { CLINICA, ESPECIALIDADES, MEDICOS, Medico, diasTexto, especialidadDe, medicoDe } from '../../core/datos-clinica';
import { Cita, aISO, fechaLarga, sumarDias, hoyISO, deISO } from '../../core/models';

@Component({
  selector: 'app-agendar',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatStepperModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <section class="seccion estrecha">
      @if (citaCreada(); as c) {
        <mat-card appearance="outlined" class="confirmacion">
          <mat-card-content>
            <div class="exito"><mat-icon>check_circle</mat-icon></div>
            <h1>¡Cita agendada!</h1>
            <p>Guarda tu folio. Lo necesitarás para consultar o cancelar la cita.</p>
            <div class="folio">{{ c.folio }}</div>
            <dl>
              <dt>Especialidad</dt><dd>{{ especialidadDe(c.especialidadId)?.nombre }}</dd>
              <dt>Médico</dt><dd>{{ medicoDe(c.medicoId)?.nombre }}</dd>
              <dt>Fecha</dt><dd>{{ fechaLarga(c.fecha) }}</dd>
              <dt>Hora</dt><dd>{{ c.hora }} h</dd>
              <dt>Paciente</dt><dd>{{ c.pacienteNombre }}</dd>
              <dt>Lugar</dt><dd>{{ clinica.direccion }}</dd>
            </dl>
            <p class="indicaciones">Llega 10 minutos antes con identificación oficial. Si no puedes asistir, cancela desde "Mis citas" para liberar el horario.</p>
            <div class="acciones no-imprimir">
              <button matButton="filled" (click)="servicio.descargarICS(c)"><mat-icon>calendar_add_on</mat-icon> Agregar al calendario</button>
              <button matButton="outlined" (click)="imprimir()"><mat-icon>print</mat-icon> Imprimir comprobante</button>
              <a matButton routerLink="/mis-citas">Ir a mis citas</a>
              <button matButton (click)="reiniciar()">Agendar otra cita</button>
            </div>
          </mat-card-content>
        </mat-card>
      } @else {
        <h1 class="seccion-titulo">Agendar cita</h1>
        <p class="seccion-sub">Cuatro pasos y listo. Sin registro ni contraseñas.</p>

        <mat-stepper linear #stepper [orientation]="'vertical'" class="pasos">
          <!-- Paso 1: especialidad -->
          <mat-step [completed]="!!especialidadId()" label="Especialidad">
            <div class="opciones">
              @for (e of especialidades; track e.id) {
                <button type="button" class="opcion" [class.seleccionada]="especialidadId() === e.id" (click)="elegirEspecialidad(e.id)">
                  <mat-icon>{{ e.icono }}</mat-icon>
                  <div>
                    <strong>{{ e.nombre }}</strong>
                    <small>{{ e.duracionMinutos }} min</small>
                  </div>
                </button>
              }
            </div>
            <div class="acciones">
              <button matButton="filled" matStepperNext [disabled]="!especialidadId()">Continuar</button>
            </div>
          </mat-step>

          <!-- Paso 2: médico -->
          <mat-step [completed]="!!medicoId()" label="Médico">
            <div class="opciones">
              @for (m of medicosDisponibles(); track m.id) {
                <button type="button" class="opcion medico" [class.seleccionada]="medicoId() === m.id" (click)="elegirMedico(m.id)">
                  <div class="avatar" [style.background]="m.color">{{ m.iniciales }}</div>
                  <div>
                    <strong>{{ m.nombre }}</strong>
                    <small>{{ diasTexto(m.dias) }} · {{ m.horaInicio }} a {{ m.horaFin }}</small>
                  </div>
                </button>
              }
            </div>
            <div class="acciones">
              <button matButton matStepperPrevious>Atrás</button>
              <button matButton="filled" matStepperNext [disabled]="!medicoId()">Continuar</button>
            </div>
          </mat-step>

          <!-- Paso 3: fecha y hora -->
          <mat-step [completed]="!!fecha() && !!hora()" label="Fecha y hora">
            <div class="fecha-hora">
              <mat-form-field appearance="outline">
                <mat-label>Fecha</mat-label>
                <input matInput [matDatepicker]="picker" [min]="minFecha" [max]="maxFecha" [matDatepickerFilter]="filtroDias" [value]="fecha()" (dateChange)="elegirFecha($event.value)" readonly />
                <mat-datepicker-toggle matIconSuffix [for]="picker" />
                <mat-datepicker #picker />
                <mat-hint>Solo días en que atiende el médico.</mat-hint>
              </mat-form-field>

              @if (fecha()) {
                <div class="horarios">
                  <div class="horarios-titulo">Horarios disponibles para {{ fechaLarga(fechaISO()) }}</div>
                  @if (cargando()) {
                    <mat-spinner diameter="28" />
                  } @else if (horariosLibres().length === 0) {
                    <p class="texto-error">No hay horarios libres ese día. Prueba con otra fecha.</p>
                  } @else {
                    <div class="grid-horas">
                      @for (h of horarios(); track h) {
                        <button type="button" class="hora" [class.ocupada]="ocupados().has(h)" [class.seleccionada]="hora() === h" [disabled]="ocupados().has(h)" (click)="hora.set(h)">{{ h }}</button>
                      }
                    </div>
                  }
                </div>
              }
            </div>
            <div class="acciones">
              <button matButton matStepperPrevious>Atrás</button>
              <button matButton="filled" matStepperNext [disabled]="!fecha() || !hora()">Continuar</button>
            </div>
          </mat-step>

          <!-- Paso 4: datos del paciente -->
          <mat-step [stepControl]="form" label="Tus datos">
            <form [formGroup]="form" class="formulario">
              <mat-form-field appearance="outline" class="ancho-completo">
                <mat-label>Nombre completo del paciente</mat-label>
                <input matInput formControlName="pacienteNombre" maxlength="120" />
                @if (form.controls.pacienteNombre.hasError('required')) { <mat-error>Escribe el nombre.</mat-error> }
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Teléfono (10 dígitos)</mat-label>
                <input matInput type="tel" formControlName="pacienteTelefono" />
                @if (form.controls.pacienteTelefono.invalid) { <mat-error>Necesitamos 10 dígitos para confirmar tu cita.</mat-error> }
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Correo electrónico</mat-label>
                <input matInput type="email" formControlName="pacienteEmail" />
                @if (form.controls.pacienteEmail.invalid) { <mat-error>Correo no válido.</mat-error> }
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Fecha de nacimiento (opcional)</mat-label>
                <input matInput type="date" formControlName="pacienteNacimiento" [max]="hoyISO" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="ancho-completo">
                <mat-label>Motivo de la consulta</mat-label>
                <textarea matInput formControlName="motivo" rows="2" maxlength="300"></textarea>
                @if (form.controls.motivo.hasError('required')) { <mat-error>Cuéntanos brevemente el motivo.</mat-error> }
              </mat-form-field>
              <mat-checkbox formControlName="primeraVez" class="ancho-completo">Es mi primera visita a la clínica</mat-checkbox>
            </form>

            <mat-card appearance="outlined" class="resumen">
              <mat-card-content>
                <strong>Resumen</strong>
                <div>{{ especialidadDe(especialidadId())?.nombre }} con {{ medicoDe(medicoId())?.nombre }}</div>
                <div>{{ fecha() ? fechaLarga(fechaISO()) : '' }} a las {{ hora() }} h</div>
              </mat-card-content>
            </mat-card>

            <div class="acciones">
              <button matButton matStepperPrevious>Atrás</button>
              <button matButton="filled" (click)="confirmar()" [disabled]="form.invalid || guardando()">
                @if (guardando()) { <mat-spinner diameter="18" /> } @else { <mat-icon>event_available</mat-icon> }
                Confirmar cita
              </button>
            </div>
          </mat-step>
        </mat-stepper>
      }
    </section>
  `,
  styles: `
    .estrecha { max-width: 860px; }
    .pasos { background: transparent; }
    .opciones { display: grid; gap: 10px; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); margin-bottom: 12px; }
    .opcion { display: flex; gap: 12px; align-items: center; text-align: left; padding: 12px; border-radius: 10px; border: 1px solid #e3e3e3; background: #fff; cursor: pointer; font: inherit; color: inherit; }
    .opcion:hover { border-color: var(--mat-sys-primary); }
    .opcion.seleccionada { border-color: var(--mat-sys-primary); background: #e8f4f6; }
    .opcion mat-icon { color: var(--mat-sys-primary); }
    .opcion small { display: block; opacity: .7; }
    .opcion .avatar { width: 44px; height: 44px; font-size: 15px; }
    .fecha-hora { display: grid; gap: 16px; margin-bottom: 8px; padding-top: 8px; }
    .horarios-titulo { font-weight: 500; margin-bottom: 8px; }
    .grid-horas { display: grid; gap: 8px; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); }
    .hora { padding: 10px 0; border-radius: 8px; border: 1px solid #e3e3e3; background: #fff; cursor: pointer; font: inherit; color: inherit; }
    .hora.seleccionada { background: var(--mat-sys-primary); color: var(--mat-sys-on-primary); border-color: var(--mat-sys-primary); }
    .hora.ocupada { opacity: .4; text-decoration: line-through; cursor: not-allowed; }
    .resumen { margin: 12px 0; }
    .resumen mat-card-content { display: grid; gap: 4px; }
    .acciones { margin-top: 8px; }
    .confirmacion { text-align: center; padding: 16px; }
    .exito mat-icon { font-size: 64px; width: 64px; height: 64px; color: var(--mat-sys-tertiary); }
    .confirmacion h1 { margin: 8px 0 4px; font: var(--mat-sys-headline-medium); }
    .folio { font-size: 32px; font-weight: 700; letter-spacing: 2px; color: var(--mat-sys-primary); margin: 12px 0 20px; }
    .confirmacion dl { display: grid; grid-template-columns: max-content 1fr; gap: 8px 16px; text-align: left; max-width: 520px; margin: 0 auto 16px; }
    dt { opacity: .7; } dd { margin: 0; }
    .indicaciones { opacity: .8; max-width: 560px; margin: 0 auto 16px; }
    .confirmacion .acciones { justify-content: center; }
  `,
})
export class Agendar {
  protected readonly servicio = inject(CitasService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly fb = inject(FormBuilder);
  private readonly ruta = inject(ActivatedRoute);

  protected readonly clinica = CLINICA;
  protected readonly especialidades = ESPECIALIDADES;
  protected readonly especialidadDe = especialidadDe;
  protected readonly medicoDe = medicoDe;
  protected readonly diasTexto = diasTexto;
  protected readonly fechaLarga = fechaLarga;
  protected readonly hoyISO = hoyISO();

  protected readonly especialidadId = signal('');
  protected readonly medicoId = signal('');
  protected readonly fecha = signal<Date | null>(null);
  protected readonly hora = signal('');
  protected readonly ocupados = signal(new Set<string>());
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly citaCreada = signal<Cita | null>(null);

  protected readonly minFecha = deISO(sumarDias(hoyISO(), 1));
  protected readonly maxFecha = deISO(sumarDias(hoyISO(), this.servicio.diasMaximos));

  protected readonly medicosDisponibles = computed<Medico[]>(() =>
    MEDICOS.filter((m) => m.especialidadId === this.especialidadId()),
  );
  protected readonly fechaISO = computed(() => (this.fecha() ? aISO(this.fecha()!) : ''));
  protected readonly horarios = computed(() => this.servicio.horariosDelDia(this.medicoId()));
  protected readonly horariosLibres = computed(() => this.horarios().filter((h) => !this.ocupados().has(h)));

  protected readonly filtroDias = (d: Date | null): boolean => {
    const medico = medicoDe(this.medicoId());
    return !!d && !!medico && medico.dias.includes(d.getDay());
  };

  protected readonly form = this.fb.nonNullable.group({
    pacienteNombre: ['', Validators.required],
    pacienteTelefono: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    pacienteEmail: ['', [Validators.required, Validators.email]],
    pacienteNacimiento: [''],
    motivo: ['', Validators.required],
    primeraVez: [false],
  });

  constructor() {
    // Preselección desde enlaces tipo /agendar?especialidad=general&medico=m1.
    // Se suscribe (no snapshot) porque Angular reutiliza el componente si solo cambian los parámetros.
    this.ruta.queryParamMap.pipe(takeUntilDestroyed()).subscribe((q) => {
      const esp = q.get('especialidad');
      const med = q.get('medico');
      if (esp && especialidadDe(esp)) this.elegirEspecialidad(esp);
      if (med && medicoDe(med)?.especialidadId === this.especialidadId()) this.elegirMedico(med);
    });

    // Cada vez que cambian médico o fecha, consulta los horarios ocupados en IndexedDB.
    effect(async () => {
      const medicoId = this.medicoId();
      const fecha = this.fechaISO();
      // Al cambiar de médico o fecha, cualquier cita nueva en la base también refresca esta lista.
      this.servicio.citas();
      if (!medicoId || !fecha) {
        this.ocupados.set(new Set());
        return;
      }
      this.cargando.set(true);
      const ocupados = await this.servicio.horariosOcupados(medicoId, fecha);
      this.ocupados.set(ocupados);
      if (ocupados.has(this.hora())) this.hora.set('');
      this.cargando.set(false);
    });
  }

  protected elegirEspecialidad(id: string): void {
    if (this.especialidadId() !== id) {
      this.medicoId.set('');
      this.fecha.set(null);
      this.hora.set('');
    }
    this.especialidadId.set(id);
  }

  protected elegirMedico(id: string): void {
    if (this.medicoId() !== id) {
      this.fecha.set(null);
      this.hora.set('');
    }
    this.medicoId.set(id);
  }

  protected elegirFecha(fecha: Date | null): void {
    this.fecha.set(fecha);
    this.hora.set('');
  }

  protected async confirmar(): Promise<void> {
    if (this.form.invalid || !this.fecha() || !this.hora()) return;
    this.guardando.set(true);
    const cita = await this.notificaciones.ejecutar(() =>
      this.servicio.agendar({
        especialidadId: this.especialidadId(),
        medicoId: this.medicoId(),
        fecha: this.fechaISO(),
        hora: this.hora(),
        ...this.form.getRawValue(),
      }),
    );
    this.guardando.set(false);
    if (cita) {
      this.citaCreada.set(cita);
      window.scrollTo({ top: 0 });
    }
  }

  protected imprimir(): void {
    window.print();
  }

  protected reiniciar(): void {
    this.citaCreada.set(null);
    this.especialidadId.set('');
    this.medicoId.set('');
    this.fecha.set(null);
    this.hora.set('');
    this.form.reset();
  }
}
