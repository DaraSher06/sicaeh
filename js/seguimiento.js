document.addEventListener("DOMContentLoaded", () => {
    let filtroactual = 'todos';
    let paginaactual = 1;
    let busquedatexto = '';

    const inputbusqueda = document.getElementById('input-busqueda');
    const tarjetasfiltro = document.querySelectorAll('.filtro-card');

    cargarsolicitudes(filtroactual, paginaactual, busquedatexto);

    if (inputbusqueda) {
        inputbusqueda.addEventListener('input', (e) => {
            busquedatexto = e.target.value.trim();
            paginaactual = 1;
            cargarsolicitudes(filtroactual, paginaactual, busquedatexto);
        });
    }

    tarjetasfiltro.forEach(card => {
        card.addEventListener('click', () => {
            tarjetasfiltro.forEach(c => {
                c.style.borderColor = '#dee2e6';
                c.classList.remove('shadow-sm');
                const radio = c.querySelector('input');
                if (radio) radio.checked = false;
            });

            card.style.borderColor = '#691b31';
            card.classList.add('shadow-sm');
            const radio = card.querySelector('input');
            if (radio) radio.checked = true;

            let valfiltro = (card.getAttribute('data-filtro') || 'todos').toLowerCase().trim();
            if (valfiltro.includes('proceso')) {
                valfiltro = 'en proceso';
            } else if (valfiltro.includes('atendido')) {
                valfiltro = 'atendido';
            } else if (valfiltro.includes('cerrado') || valfiltro.includes('vencido')) {
                valfiltro = 'cerrado';
            }

            filtroactual = valfiltro;
            paginaactual = 1;
            cargarsolicitudes(filtroactual, paginaactual, busquedatexto);
        });
    });

    document.getElementById('tabla-seguimiento-body')?.addEventListener('click', async (e) => {
        const btn = e.target.closest('.btn-recibido');
        if (btn) {
            const idregistro = btn.getAttribute('data-id');
            await marcarcomorecibido(idregistro);
        }
    });
});

async function cargarsolicitudes(filtro, pagina, busqueda) {
    const tbody = document.getElementById('tabla-seguimiento-body');
    
    try {
        const url = `/SICAEH/agencia_backend/obtener_seguimiento.php?filtro=${encodeURIComponent(filtro)}&pagina=${pagina}&busqueda=${encodeURIComponent(busqueda)}`;
        
        const response = await fetch(url, {
            method: 'get',
            credentials: 'include'
        });

        // Si el servidor responde con un error HTTP (como 401 Unauthorized o 404)
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} (${response.statusText})`);
        }

        const data = await response.json();

        if (data.success) {
            pintartabla(data.solicitudes);
            // si tienes función de paginación, ponla aquí
        } else {
            // Si el backend rechazó la sesión, lo mostramos en la tabla en vez de recargar de golpe
            tbody.innerHTML = `<tr><td colspan="13" class="text-center py-4 text-danger fw-bold">Error del servidor: ${data.error || 'Sesión no válida'}</td></tr>`;
            console.error('Error controlado:', data);
        }

    } catch (error) {
        console.error("Falla en la petición:", error);
        // Esto pintará el error exacto directamente en tu tabla para que lo leas sin consola
        tbody.innerHTML = `<tr><td colspan="13" class="text-center py-4 text-danger fw-bold">Falla de conexión o JS: ${error.message}</td></tr>`;
    }
}

function pintartabla(solicitudes) {
    const tbody = document.getElementById('tabla-seguimiento-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!solicitudes || solicitudes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="13" class="text-center py-4 text-muted">no se encontraron solicitudes registradas.</td></tr>`;
        return;
    }

    // ordenar de más reciente a más antiguo (id_registro descendente)
    solicitudes.sort((a, b) => {
        const idA = Number(a.id_registro || a.id || 0);
        const idB = Number(b.id_registro || b.id || 0);
        return idB - idA;
    });

    const urlparams = new URLSearchParams(window.location.search);
    const id_a_iluminar = urlparams.get('id_registro');
    const estatus_sla_url = urlparams.get('estatus_sla');

    function atitulo(str) {
        return (str || '')
            .toLowerCase()
            .split(' ')
            .map(w => w.length > 0 ? w[0].toUpperCase() + w.slice(1) : '')
            .join(' ');
    }

    solicitudes.forEach(row => {
        const idreg = String(row.id_registro || row.id || '');
        
        const prioridadraw = (row.prioridad || '').toLowerCase();
        let priobadgestyle = 'background-color: #691b31; color: #fff;';
        if (prioridadraw.includes('alta')) priobadgestyle = 'background-color: #b72065; color: #fff;';
        else if (prioridadraw.includes('media')) priobadgestyle = 'background-color: #691b31; color: #fff;';
        else if (prioridadraw.includes('baja')) priobadgestyle = 'background-color: #c77cbf; color: #fff;';

        const estatusraw = (row.estatus_oficio || '').toLowerCase();
        let estatusbadgestyle = 'background-color: #226c62; color: #fff;';
        if (estatusraw.includes('atendido')) estatusbadgestyle = 'background-color: #34c759; color: #fff;';
        else if (estatusraw.includes('proceso')) estatusbadgestyle = 'background-color: #ffcc00; color: #111111;';
        else if (estatusraw.includes('turnado')) estatusbadgestyle = 'background-color: #226c62; color: #fff;';
        else if (estatusraw.includes('cerrado')) estatusbadgestyle = 'background-color: #ff3b30; color: #fff;';

        const enviado = (row.enviado_a || '').toLowerCase();
        let boton_especial = '';
        if (enviado.includes('ayuntamiento')) {
            boton_especial = `
                <a href="detalle_seguimiento_ayun.html?id=${idreg}" class="btn btn-outline-secondary btn-sm p-1 d-flex align-items-center justify-content-center bg-white text-dark text-decoration-none" style="border-radius: 6px; width: 32px; height: 32px;" title="gestión ayuntamiento">
                    <img src="img/municipalidad.png" alt="ayuntamiento" style="width: 18px; height: 18px; object-fit: contain;">
                </a>
            `;
        } else if (enviado.includes('cfe')) {
            boton_especial = `
                <a href="detalle_seguimiento_cfe.html?id=${idreg}" class="btn btn-outline-secondary btn-sm p-1 d-flex align-items-center justify-content-center bg-white text-dark text-decoration-none" style="border-radius: 6px; width: 32px; height: 32px;" title="gestión cfe">
                    <img src="img/logo_cfe.png" alt="cfe" style="width: 20px; height: 20px; object-fit: contain;">
                </a>
            `;
        }

        const textEnviado = (enviado === 'otros' && row.especificacion ? row.especificacion : (row.enviado_a || '')).toUpperCase();

        const esrecibido = Number(row.recibido) === 1;
        const celdaRecibido = esrecibido 
            ? `<span class="badge bg-light text-secondary border px-2 py-1" style="font-size: 11px;">recibido</span>`
            : `<button type="button" class="btn btn-outline-secondary btn-sm px-2 py-1 text-dark fw-medium bg-white btn-recibido" data-id="${idreg}" style="border-radius: 6px; font-size: 11px; border-color: #d1c7c7;">marcar como recibido</button>`;

        let coincide = false;
        let clase_animacion = '';
        let estilo_color_td = '';

        if (id_a_iluminar && idreg.trim() === String(id_a_iluminar).trim()) {
            coincide = true;
            
            let indicador_estatus = '';
            if (estatus_sla_url) {
                indicador_estatus = estatus_sla_url.toLowerCase();
            } else {
                let fecha_limite = new Date(row.fecha_limite);
                let hoy = new Date();
                
                if (row.estatus_oficio && row.estatus_oficio.toLowerCase().includes('cerrado')) {
                    indicador_estatus = 'vencido';
                } else if (fecha_limite < hoy) {
                    indicador_estatus = 'vencido';
                } else {
                    indicador_estatus = 'a tiempo';
                }
            }
            
            if (indicador_estatus.includes("vencido") || indicador_estatus.includes("cerrado") || indicador_estatus.includes("atrasado")) {
                clase_animacion = 'celda-parpadeante-roja';
                estilo_color_td = 'background-color: rgba(255, 59, 48, 0.3) !important;';
            } else if (indicador_estatus.includes("por vencer") || indicador_estatus.includes("riesgo")) {
                clase_animacion = 'celda-parpadeante-amarillo';
                estilo_color_td = 'background-color: rgba(255, 204, 0, 0.3) !important;';
            } else {
                clase_animacion = 'celda-parpadeante-verde';
                estilo_color_td = 'background-color: rgba(52, 199, 89, 0.3) !important;';
            }
        }

        const tr = document.createElement('tr');
        tr.setAttribute('data-id-registro', idreg);
        tr.style.cssText = 'text-align: center; vertical-align: middle;';

        tr.innerHTML = `
            <td class="py-3 ${coincide ? clase_animacion : ''}" style="${estilo_color_td}">${celdaRecibido}</td>
            <td class="py-3 fw-semibold ${coincide ? clase_animacion : ''}" style="${estilo_color_td}">${(row.num_consecutivo || '').toUpperCase()}</td>
            <td class="py-3 fw-semibold ${coincide ? clase_animacion : ''}" style="${estilo_color_td}">${(row.num_oficio || '').toUpperCase()}</td>
            <td class="py-3 ${coincide ? clase_animacion : ''}" style="${estilo_color_td}">${row.numero_turno_aeeh || ''}</td>
            <td class="py-3 text-dark ${coincide ? clase_animacion : ''}" style="white-space: normal; word-break: break-word; min-width: 280px; text-align: center; ${estilo_color_td}">${row.asunto || ''}</td>
            <td class="py-3 ${coincide ? clase_animacion : ''}" style="${estilo_color_td}">${atitulo(row.nombre_remitente || '')}</td>
            <td class="py-3 ${coincide ? clase_animacion : ''}" style="${estilo_color_td}">${textEnviado}</td>
            <td class="py-3 ${coincide ? clase_animacion : ''}" style="${estilo_color_td}"><span class="badge px-2.5 py-1 rounded-pill" style="${priobadgestyle}">${atitulo(row.prioridad || 'normal')}</span></td>
            <td class="py-3 ${coincide ? clase_animacion : ''}" style="${estilo_color_td}">${atitulo(row.turnado_a || '')}</td>
            <td class="py-3 ${coincide ? clase_animacion : ''}" style="${estilo_color_td}"><span class="badge px-2.5 py-1 rounded-pill" style="${estatusbadgestyle}">${atitulo(row.estatus_oficio || 'sin estatus')}</span></td>
            <td class="py-3 ${coincide ? clase_animacion : ''}" style="${estilo_color_td}">${row.fecha_captura || ''}</td>
            <td class="py-3 fw-semibold text-danger ${coincide ? clase_animacion : ''}" style="${estilo_color_td}">${row.fecha_limite || ''}</td>
            <td class="py-3 ${coincide ? clase_animacion : ''}" style="${estilo_color_td}">
                <div class="d-flex justify-content-center gap-2">
                    <a href="detalle_seguimiento.html?id=${idreg}" class="btn btn-outline-secondary btn-sm p-2 d-flex align-items-center justify-content-center bg-white text-dark text-decoration-none" style="border-radius: 6px; width: 32px; height: 32px;" title="ver detalle general">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </a>
                    ${boton_especial}
                </div>
            </td>
        `;
        tbody.appendChild(tr);

        if (coincide) {
            setTimeout(() => {
                let fila_pintada = document.querySelector(`tr[data-id-registro="${idreg}"]`);
                if (fila_pintada) {
                    fila_pintada.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    setTimeout(() => {
                        const celdas = fila_pintada.querySelectorAll('td');
                        celdas.forEach(td => {
                            td.classList.remove('celda-parpadeante-roja', 'celda-parpadeante-amarillo', 'celda-parpadeante-verde');
                            td.style.backgroundColor = '';
                        });
                    }, 4000);
                }
            }, 300);

            if (window.history && window.history.replaceState) {
                const urlLimpiada = window.location.protocol + "//" + window.location.host + window.location.pathname;
                window.history.replaceState({path: urlLimpiada}, '', urlLimpiada);
            }
        }
    });
}

function pintarpaginacion(totalpaginas, paginaactual, filtro, busqueda) {
    const contenedor = document.getElementById('paginacion-container');
    if (!contenedor) return;
    contenedor.innerHTML = '';

    if (totalpaginas <= 1) return;

    contenedor.style.cssText = 'display: inline-flex; align-items: center; gap: 4px; background-color: #5a1c24; padding: 6px 12px; border-radius: 12px;';

    const crearBtn = (text, targetPage, disabled = false, isArrow = false) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.innerHTML = text;
        btn.disabled = disabled;
        btn.className = 'btn btn-sm border-0 d-flex align-items-center justify-content-center';
        
        let customStyle = `
            background-color: transparent; 
            color: ${disabled ? 'rgba(255,255,255,0.3)' : '#fff'}; 
            border-radius: 8px; 
            min-width: 30px; 
            height: 30px; 
            font-size: ${isArrow ? '18px' : '13px'}; 
            padding: 0;
            cursor: ${disabled ? 'default' : 'pointer'};
        `;
        if (targetPage === paginaactual && !isArrow) {
            customStyle += ' background-color: rgba(255,255,255,0.2); font-weight: bold;';
        }
        btn.style.cssText = customStyle;

        if (!disabled && targetPage !== paginaactual) {
            btn.addEventListener('click', () => {
                cargarsolicitudes(filtro, targetPage, busqueda);
            });
        }
        return btn;
    };

    contenedor.appendChild(crearBtn('‹', paginaactual - 1, paginaactual <= 1, true));

    const paginasAMostrar = [];
    if (totalpaginas <= 6) {
        for (let i = 1; i <= totalpaginas; i++) paginasAMostrar.push(i);
    } else {
        if (paginaactual <= 3) {
            paginasAMostrar.push(1, 2, 3, 4, '...', totalpaginas);
        } else if (paginaactual >= totalpaginas - 2) {
            paginasAMostrar.push(1, '...', totalpaginas - 3, totalpaginas - 2, totalpaginas - 1, totalpaginas);
        } else {
            paginasAMostrar.push(1, '...', paginaactual - 1, paginaactual, paginaactual + 1, '...', totalpaginas);
        }
    }

    paginasAMostrar.forEach(p => {
        if (p === '...') {
            const span = document.createElement('span');
            span.textContent = '...';
            span.style.cssText = 'color: #fff; padding: 0 4px; font-size: 13px;';
            contenedor.appendChild(span);
        } else {
            contenedor.appendChild(crearBtn(p, p, false, false));
        }
    });

    contenedor.appendChild(crearBtn('›', paginaactual + 1, paginaactual >= totalpaginas, true));
}

async function marcarcomorecibido(id) {
    try {
        const response = await fetch('/SICAEH/agencia_backend/marcar_recibido.php', {
            method: 'post',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: `id_registro=${id}`,
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('error en la respuesta del servidor');
        }

        const resultado = await response.json();
        
        if (resultado.success || resultado.ok) {
            await mostrar_alerta_personalizada('solicitud marcada como recibida correctamente.');
            location.reload();
        } else {
            await mostrar_alerta_personalizada('error: ' + (resultado.error || resultado.mensaje));
        }
    } catch (error) {
        console.error('error al actualizar estatus:', error);
        await mostrar_alerta_personalizada('no se pudo conectar con el servidor.');
    }
}


fetch('/SICAEH/agencia_backend/verificar_sesion.php')
    .then(respuesta => respuesta.json())
    .then(datos => {
        if (!datos.exito) {
            // Capturamos la URL completa actual (con su id_registro y parámetros)
            const url_actual = encodeURIComponent(window.location.href);
            // Mandamos al login adjuntando el parámetro redirect
            window.location.href = 'login.html?redirect=' + url_actual;
        }
    });