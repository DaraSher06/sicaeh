document.addEventListener("DOMContentLoaded", function() {
    let fecha_actual = new Date();
    let mes_actual = fecha_actual.getMonth() + 1;
    let anio_actual = fecha_actual.getFullYear();

    cargar_calendario(mes_actual, anio_actual);

    document.getElementById("btn-mes-anterior").addEventListener("click", function() {
        mes_actual--;
        if (mes_actual < 1) {
            mes_actual = 12;
            anio_actual--;
        }
        cargar_calendario(mes_actual, anio_actual);
    });

    document.getElementById("btn-mes-siguiente").addEventListener("click", function() {
        mes_actual++;
        if (mes_actual > 12) {
            mes_actual = 1;
            anio_actual++;
        }
        cargar_calendario(mes_actual, anio_actual);
    });

    document.getElementById("input-buscar-evento").addEventListener("input", function() {
        let filtro = this.value.toLowerCase();
        let celdas = document.querySelectorAll(".dia-calendario");
        celdas.forEach(celda => {
            let texto = celda.innerText.toLowerCase();
            if (texto.includes(filtro) || filtro === "") {
                celda.style.display = "";
            } else {
                celda.style.display = "none";
            }
        });
    });

    // Inicialización de la fecha de hoy con formato largo
    let fecha_hoy = new Date();
    let opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    let fecha_formateada = fecha_hoy.toLocaleDateString('es-ES', opciones);
    fecha_formateada = fecha_formateada.charAt(0).toUpperCase() + fecha_formateada.slice(1);

    let label_hoy = document.getElementById("label-hoy-fecha");
    if (label_hoy) {
        label_hoy.textContent = "Hoy: " + fecha_formateada;
    }
});

function cargar_calendario(mes, anio) {
    let meses_nombres = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    document.getElementById("mes-anio-titulo").innerText = meses_nombres[mes - 1] + " " + anio;

    fetch(`/SICAEH/agencia_backend/calendario.php?accion=calendario&mes=${mes}&anio=${anio}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                construir_matriz_calendario(mes, anio, data.eventos);
            } else {
                console.error("error del servidor:", data.error);
            }
        })
        .catch(error => console.error("error al cargar calendario:", error));
}

function construir_matriz_calendario(mes, anio, eventos) {
    let tbody = document.getElementById("calendario-body");
    tbody.innerHTML = "";

    let primer_dia = new Date(anio, mes - 1, 1).getDay();
    let total_dias = new Date(anio, mes, 0).getDate();

    let fecha_hoy_str = new Date().toISOString().split('T')[0];
    let dia_contador = 1;

    for (let i = 0; i < 6; i++) {
        let fila = "<tr>";
        for (let j = 0; j < 7; j++) {
            if (i === 0 && j < primer_dia) {
                let dia_prev = new Date(anio, mes - 1, 0).getDate() - (primer_dia - j - 1);
                fila += `<td class="text-muted bg-light p-2 align-top" style="height: 90px;"><span class="small">${dia_prev}</span></td>`;
            } else if (dia_contador > total_dias) {
                let dia_sig = dia_contador - total_dias;
                fila += `<td class="text-muted bg-light p-2 align-top" style="height: 90px;"><span class="small">${dia_sig}</span></td>`;
                dia_contador++;
            } else {
                let mes_str = mes < 10 ? '0' + mes : mes;
                let dia_str = dia_contador < 10 ? '0' + dia_contador : dia_contador;
                let fecha_completa = `${anio}-${mes_str}-${dia_str}`;

                
                // Filtramos estrictamente por la fecha real del evento
                let eventos_dia = eventos.filter(ev => ev.fecha_evento === fecha_completa);

                let es_hoy = (fecha_completa === fecha_hoy_str);
                let estilo_hoy = es_hoy ? 'border: 2px solid #691b31 !important; background-color: #fff8f9;' : '';

                let eventos_json = encodeURIComponent(JSON.stringify(eventos_dia));

                fila += `<td class="dia-calendario p-2 align-top position-relative" style="height: 100px; cursor: pointer; ${estilo_hoy}" onclick="mostrar_resumen_dia('${fecha_completa}', '${eventos_json}')">
                            <div class="fw-bold mb-1 small text-dark">${dia_contador}</div>
                            <div class="overflow-hidden" style="max-height: 65px;">`;

                eventos_dia.forEach(ev => {
                    // Colores exactos basados en la tabla de estatus del oficio
                    let estilo_badge = 'background-color: #226c62; color: #fff;'; // Predeterminado
                    let estatus_lower = (ev.estatus || '').toLowerCase();
                    
                    if (estatus_lower.includes('turnado')) {
                        estilo_badge = 'background-color: #226c62; color: #fff;';
                    } else if (estatus_lower.includes('en proceso')) {
                        estilo_badge = 'background-color: #ffcc00; color: #111111;'; // Texto oscuro para que contraste con el amarillo
                    } else if (estatus_lower.includes('atendido')) {
                        estilo_badge = 'background-color: #34c759; color: #fff;';
                    } else if (estatus_lower.includes('cerrado')) {
                        estilo_badge = 'background-color: #ff3b30; color: #fff;';
                    }

                    let etiqueta_turno = ev.numero_turno_aeeh ? `Turno_AEEH: ${ev.numero_turno_aeeh}` : 's/n turno';

                    fila += `<div class="badge text-truncate w-100 mb-1 text-start px-2 py-1" style="font-size: 10px; border-radius: 6px; ${estilo_badge}" title="Turno_AEEH: ${ev.numero_turno_aeeh} - ${ev.asunto}">
                                ${etiqueta_turno}; ${ev.estatus}
                             </div>`;
                });

                fila += `</div></td>`;
                dia_contador++;
            }
        }
        fila += "</tr>";
        tbody.innerHTML += fila;
        if (dia_contador > total_dias && i >= 4) break;
    }
}

function mostrar_resumen_dia(fecha, eventos_encoded) {
    let eventos = JSON.parse(decodeURIComponent(eventos_encoded));
    
    // Formatear la fecha seleccionada en formato largo
    let partes = fecha.split("-");
    let fechaObj = new Date(partes[0], partes[1] - 1, partes[2]);
    let opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    let fecha_formateada = fechaObj.toLocaleDateString('es-ES', opciones);
    fecha_formateada = fecha_formateada.charAt(0).toUpperCase() + fecha_formateada.slice(1);

    document.getElementById("label-hoy-fecha").innerText = fecha_formateada;
    let contenedor = document.getElementById("lista-resumen-dia");
    contenedor.innerHTML = "";

    if (eventos.length === 0) {
        contenedor.innerHTML = `<p class="text-muted small">No hay actividades registradas para este día.</p>`;
        return;
    }

    
    eventos.forEach(ev => {
        let turno_mostrar = ev.numero_turno_aeeh ? `Turno_AEEH: ${ev.numero_turno_aeeh}` : 'S/N Turno';
        let estatus_lower = (ev.estatus || '').toLowerCase();
        
        let color_franja = '#226c62';
        if (estatus_lower.includes('en proceso')) {
            color_franja = '#ffcc00';
        } else if (estatus_lower.includes('atendido')) {
            color_franja = '#34c759';
        } else if (estatus_lower.includes('cerrado')) {
            color_franja = '#ff3b30';
        }

        let url_seguimiento = `seguimiento.html?id_registro=${ev.id_registro}&estatus_sla=${encodeURIComponent(ev.estatus)}`;

        // Usar parámetros en minúsculas con el endpoint compatible de Google Calendar
        let tituloseg = encodeURIComponent(`${turno_mostrar} - ${ev.asunto || 'Trámite SICAEH'}`);
        let fechainicio_fmt = fecha.replace(/-/g, '') + 'T090000Z';
        let fechafin_fmt = fecha.replace(/-/g, '') + 'T100000Z';
        let descripcion_gcal = encodeURIComponent(`Estatus: ${ev.estatus}. Asunto: ${ev.asunto || 'Sin asunto'}. Seguimiento en la plataforma oficial.`);
        let lugar_gcal = encodeURIComponent("Agencia Estatal de Energía de Hidalgo");
        
        let url_google_calendar = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${tituloseg}&dates=${fechainicio_fmt}/${fechafin_fmt}&details=${descripcion_gcal}&location=${lugar_gcal}`;

        contenedor.innerHTML += `
            <div class="p-2 mb-2 bg-white rounded shadow-sm small" style="border-left: 5px solid ${color_franja} !important; border-top: 1px solid #dee2e6; border-right: 1px solid #dee2e6; border-bottom: 1px solid #dee2e6; animation: none !important;">
                <div style="cursor: pointer;" onclick="window.location.href='${url_seguimiento}'" title="Haz clic para ver el seguimiento">
                    <span class="fw-bold d-block text-dark">${turno_mostrar}</span>
                    <span class="text-muted d-block text-truncate" style="font-size: 11px;">${ev.asunto}</span>
                    <span class="badge bg-light text-dark border mt-1" style="font-size: 10px;">Estatus: ${ev.estatus}</span>
                </div>
                <div class="mt-2 text-end">
                    <a href="${url_google_calendar}" target="_blank" class="btn btn-sm text-white px-2 py-1" style="font-size: 10px; background-color: #691b31; border-radius: 6px; text-decoration: none;">Añadir a Google Calendar</a>
                </div>
            </div>
        `;
    });
}
