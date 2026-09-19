# Resultado de pruebas funcionales (2026-09-19 03:57)

82 de 82 pruebas pasaron.

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
| B32 Préstamo con fecha pasada: vence hoy no cuenta como vencido y permite renovar | OK |  |
| B33 Préstamo con fecha 15 días atrás nace vencido con 1 día y multa de 10 | OK |  |
| B34 Fecha de préstamo escrita a mano en formato local (d/M/aaaa) se interpreta bien | OK |  |
| B35 Fecha de préstamo futura no se acepta | OK |  |
| B36 Socio o libro escritos sin elegir de la lista no permiten registrar | OK |  |
| B37 Cambiar ISBN de un libro a uno existente se rechaza | OK |  |
| B38 ISBN igual con y sin guiones se detecta como duplicado | OK |  |
| B39 Ejemplares totales y año no aceptan decimales | OK |  |
| B40 Título o nombre con solo espacios no se aceptan | OK |  |
| B41 Editar socio conserva código, fecha de alta y estado | OK |  |
| B42 Reducir ejemplares al número prestado deja el libro agotado y fuera del préstamo | OK |  |
| B43 Reactivar un socio inactivo vuelve a permitirle préstamos | OK |  |
| B44 Búsqueda de préstamos por código de socio y filtro Todos | OK |  |
| B45 Ajustes: valores inválidos deshabilitan Guardar y el botón queda inactivo sin cambios | OK |  |
| B46 Eliminar socio con historial devuelto elimina también su historial | OK |  |
| B47 Dos pestañas: el segundo préstamo del último ejemplar se rechaza | OK |  |
| B48 Los datos de una pestaña aparecen en la otra sin recargar (liveQuery) | OK |  |
| B49 Enter en el diálogo registra y Escape lo cierra sin guardar | OK |  |
| B50 PWA: cerrar la pestaña y volver sin conexión abre la biblioteca con sus datos | OK |  |
| C20 Cambiar de especialidad reinicia médico, fecha y hora | OK |  |
| C21 Enlaces de Servicios y Equipo preseleccionan especialidad y médico | OK |  |
| C22 Nombre o motivo con solo espacios no se aceptan | OK |  |
| C23 Fecha de nacimiento futura no se acepta | OK |  |
| C24 Dos pestañas eligen el mismo horario: la segunda recibe "acaba de ocuparse" | OK |  |
| C24b Si el horario se ocupa mientras se llenan los datos, avisa y regresa a elegir hora | OK |  |
| C25 Doble clic en Confirmar cita crea una sola cita | OK |  |
| C26 Día con todos los horarios ocupados muestra aviso y no permite continuar | OK |  |
| C27 Cita cancelada en recepción: el paciente la ve cancelada con el motivo y no puede volver a cancelar | OK |  |
| C28 Cargar la demo dos veces no duplica horarios ocupados | OK |  |
| C29 Recepción: búsqueda por teléfono y por folio, y fecha sin citas | OK |  |
| C30 Agendar otra cita reinicia el flujo y el formulario | OK |  |
| C31 ICS de odontología dura 45 minutos | OK |  |
