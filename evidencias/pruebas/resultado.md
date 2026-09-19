# Resultado de pruebas funcionales (2026-09-19 02:57)

50 de 50 pruebas pasaron.

| Prueba | Resultado | Detalle |
|---|---|---|
| B01 Inicio vacío muestra bienvenida y contadores en cero | OK |  |
| B02 Datos demo: contadores del inicio y badge de vencidos | OK |  |
| B03 Datos demo persisten tras recargar la página | OK |  |
| B04 Cargar demo dos veces se rechaza | OK |  |
| B05 Registrar libro nuevo aparece en catálogo con ejemplares completos | OK |  |
| B06 ISBN duplicado se rechaza | OK |  |
| B07 Formulario de libro valida campos obligatorios e ISBN | OK |  |
| B08 Editar libro: no permite menos ejemplares que los prestados | OK |  |
| B09 Filtros del catálogo: búsqueda, categoría y disponibilidad | OK |  |
| B10 Registrar socio asigna código, fecha de alta y estado activo | OK |  |
| B11 Códigos de socio siguen siendo únicos tras eliminar uno intermedio | OK |  |
| B12 Préstamo válido: descuenta ejemplar y calcula vencimiento a 14 días | OK |  |
| B13 Regla: límite de préstamos simultáneos por socio | OK |  |
| B14 Regla: socio con préstamo vencido no puede tomar otro | OK |  |
| B15 Regla: libro sin ejemplares no aparece para prestar | OK |  |
| B16 Regla: socio inactivo no aparece para prestar | OK |  |
| B17 Desactivar socio con préstamos activos se rechaza y el interruptor no cambia | OK |  |
| B18 Eliminar socio o libro con préstamos activos se rechaza | OK |  |
| B19 Devolver préstamo vencido cobra multa y libera el ejemplar | OK |  |
| B20 Devolver préstamo al corriente no cobra multa | OK |  |
| B21 Renovar extiende 14 días; renovar vencido está deshabilitado | OK |  |
| B22 Estados visuales: vence en 1 d, vencido (6 d), al corriente | OK |  |
| B23 Ajustes: reglas nuevas se aplican a préstamos y multas | OK |  |
| B24 Ajustes: reglas guardadas sobreviven a cargar la demostración | OK |  |
| B25 Botón Nuevo préstamo del inicio abre el diálogo en Préstamos | OK |  |
| B26 Exportar CSV del catálogo descarga archivo con encabezados y filas | OK |  |
| B27 Respaldo JSON: exportar, borrar todo e importar restaura los datos | OK |  |
| B28 Importar archivo inválido muestra error y conserva los datos | OK |  |
| B29 Ruta desconocida redirige al inicio | OK |  |
| B30 Móvil: menú lateral oculto, se abre con el botón y navega | OK |  |
| B31 Accesibilidad: los botones de icono tienen nombre accesible | OK |  |
| C01 Inicio, servicios y equipo muestran el contenido esperado | OK |  |
| C02 Agendar cita completa genera folio y comprobante | OK |  |
| C03 Horarios se generan según el horario del médico y la duración | OK |  |
| C04 Calendario solo habilita días en que atiende el médico y no antes de mañana | OK |  |
| C05 Horario ocupado queda deshabilitado para otro paciente | OK |  |
| C06 Mismo teléfono, mismo médico y día en otra hora se rechaza | OK |  |
| C07 Formulario del paciente valida teléfono, correo y campos obligatorios | OK |  |
| C08 Preselección por URL (?especialidad=&medico=) llega al paso de fecha | OK |  |
| C09 Mis citas: consulta con folio y teléfono; teléfono incorrecto se rechaza | OK |  |
| C10 Cancelar cita libera el horario y ya no se puede volver a cancelar | OK |  |
| C11 Cita persiste tras recargar y se puede descargar el .ics | OK |  |
| C12 Recepción: demo carga citas y el panel muestra las de hoy con resumen | OK |  |
| C13 Recepción: navegar de día y filtrar por médico y estado | OK |  |
| C14 Recepción: confirmar, marcar atendida, agregar nota y cancelar con motivo | OK |  |
| C15 Recepción: exportar CSV del día y borrar todas las citas | OK |  |
| C16 Cita agendada por paciente aparece en recepción ese día | OK |  |
| C17 Móvil: menú hamburguesa navega a Agendar | OK |  |
| C18 Accesibilidad: botones de icono de recepción tienen nombre accesible | OK |  |
| C19 Ruta desconocida redirige al inicio | OK |  |
