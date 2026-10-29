function abrir_modal_doc() {
    const idval = document.getElementById('id_registro')?.value || new URLSearchParams(window.location.search).get('id') || '';
    const inputmod = document.getElementById('id_registro_modal');
    if (inputmod) inputmod.value = idval;
    const modalel = document.getElementById('modal-adjuntar-doc');
    if (modalel && window.bootstrap) {
        new bootstrap.Modal(modalel).show();
    }
}

async function seleccionar_estatus(tipo) {
    if (tipo === 'atendida') {
        const radioatendido = document.querySelector('input[name="estatus_oficio"][value="atendido"], input[name="estatus_oficio"][value="Atendido"]');
        if (radioatendido) radioatendido.checked = true;
    } else if (tipo === 'cerrada') {
        const radiocerrado = document.querySelector('input[name="estatus_oficio"][value="cerrado"], input[name="estatus_oficio"][value="cerrada"]');
        if (radiocerrado) radiocerrado.checked = true;
    }

    const idreginput = document.getElementById('id_registro');
    if (idreginput && idreginput.value) {
        await cambiar_estatus_gestion(idreginput.value, tipo);
    }
}

async function cambiar_estatus_gestion(idreg, tipo) {
    const idetapa = tipo === 'atendida' ? 6 : 7;
    try {
        const payload = {
            id_registro: idreg,
            estatus_oficio: tipo,
            id_etapa: idetapa
        };
        const res = await fetch('/SICAEH/agencia_backend/guardar_detalle_seguimiento.php', {
            method: 'post',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            if (tipo === 'cerrada') {
                await mostrar_alerta_personalizada('Gestión cerrada y movida a expedientes.');
                window.location.replace('expedientes.html');
            } else {
                await mostrar_alerta_personalizada(`Gestión marcada como ${tipo} correctamente.`);
            }
        } else {
            await mostrar_alerta_personalizada('error: ' + (data.error || 'desconocido'));
        }
    } catch (err) {
        console.error('error al actualizar gestión:', err);
    }
}

function bloquear_si_cerrado(estatusdb, etapaid) {
    if ((estatusdb && (estatusdb.includes('cerrado') || estatusdb.includes('cerrada'))) || Number(etapaid) === 7) {
        const form = document.querySelector('form');
        if (form) {
            form.querySelectorAll('input, select, textarea, button').forEach(el => {
                if (!el.classList.contains('btn-outline-secondary') && el.getAttribute('href') !== 'seguimiento.html') {
                    el.disabled = true;
                }
            });
            const btnguardar = document.querySelector('button[type="submit"]');
            if (btnguardar) btnguardar.style.display = 'none';
        }
        const cont_esp = document.getElementById('contenedor_especificacion_entidad');
        if (cont_esp) cont_esp.style.display = 'block';
    }
}

function configurar_toggle_otros() {
    const radios = document.querySelectorAll('input[name="turnar_a_entidad"]');
    const cont = document.getElementById('contenedor_especificacion_entidad');
    const input_esp = document.getElementById('especificacion_entidad');

    function evaluar() {
        const sel = document.querySelector('input[name="turnar_a_entidad"]:checked');
        if (sel && sel.value.toLowerCase() === 'otros') {
            if (cont) cont.style.display = 'block';
        } else {
            if (cont) cont.style.display = 'none';
            if (input_esp) input_esp.value = '';
        }
    }

    radios.forEach(r => r.addEventListener('change', evaluar));
    evaluar();
}

document.addEventListener("DOMContentLoaded", async () => {
    configurar_toggle_otros();

    const params = new URLSearchParams(window.location.search);
    const idreg = params.get('id');

    if (!idreg) {
        await mostrar_alerta_personalizada('No se encontró el id del registro.');
        window.location.href = 'seguimiento.html';
        return;
    }

    const inputid = document.getElementById('id_registro');
    if (inputid) inputid.value = idreg;
    cargardetallesolicitud(idreg);

    const form = document.querySelector('form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await guardarseguimientocompleto(form);
        });
    }

    const fileinputmodal = document.getElementById('archivo_seguimiento_modal');
    const filebadgemodal = document.getElementById('nombre-archivo-seleccionado-modal');
    if (fileinputmodal && filebadgemodal) {
        fileinputmodal.addEventListener('change', () => {
            if (fileinputmodal.files.length > 0) {
                filebadgemodal.textContent = fileinputmodal.files[0].name;
                filebadgemodal.classList.remove('d-none');
            } else {
                filebadgemodal.classList.add('d-none');
            }
        });
    }

    const formmodal = document.getElementById('form-adjuntar-modal');
    if (formmodal) {
        formmodal.addEventListener('submit', async (e) => {
            e.preventDefault();
            const idval = document.getElementById('id_registro')?.value || idreg || '';
            const idmod = document.getElementById('id_registro_modal');
            if (idmod) idmod.value = idval;

            const formdata = new FormData(formmodal);
            try {
                const res = await fetch('/SICAEH/agencia_backend/subir_documento.php', {
                    method: 'post',
                    body: formdata
                });
                const data = await res.json();
                if (data.success) {
                    await mostrar_alerta_personalizada('Documento guardado correctamente.');
                    const badge = document.getElementById('badge-doc-cargado');
                    if (badge) badge.classList.add('d-none');
                    const modalel = document.getElementById('modal-adjuntar-doc');
                    const modalinstance = bootstrap.Modal.getInstance(modalel);
                    if (modalinstance) modalinstance.hide();
                    cargardetallesolicitud(idreg);
                } else {
                    await mostrar_alerta_personalizada('Error: ' + (data.error || 'desconocido'));
                }
            } catch (err) {
                console.error('error al subir:', err);
            }
        });
    }
});

function normalizar_ruta(ruta) {
    if (!ruta) return '#';
    if (ruta.startsWith('http://') || ruta.startsWith('https://')) return ruta;
    if (ruta.startsWith('/SICAEH/')) return ruta;
    if (ruta.startsWith('/')) return '/SICAEH' + ruta;
    return '/SICAEH/' + ruta;
}

async function cargardetallesolicitud(id) {
    try {
        const url = `/SICAEH/agencia_backend/obtener_detalle_seguimiento.php?id=${id}`;
        const res = await fetch(url);
        console.log('estatus http:', res.status);
        const text_raw = await res.text();
        console.log('respuesta cruda detalle php:', text_raw);

        if (!text_raw || text_raw.trim() === '') {
            console.error('respuesta vacía del servidor en ruta:', url);
            return;
        }

        const data = JSON.parse(text_raw);
        if (data.success && data.detalle) {
            const d = data.detalle;
            
            const numconsecutivoinput = document.getElementById('num_consecutivo');
            if (numconsecutivoinput) numconsecutivoinput.value = d.num_consecutivo || '';
            
            const fechacapturainput = document.getElementById('fecha_captura');
            if (fechacapturainput) fechacapturainput.value = d.fecha_captura || '';
            
            const usuarioasignadoinput = document.getElementById('usuario_asignado');
            if (usuarioasignadoinput) usuarioasignadoinput.value = d.usuario_asignado || '';

            const maintitle = document.getElementById('main-title');
            if (maintitle) {
                const consecutivoval = d.num_consecutivo ? String(d.num_consecutivo).toUpperCase() : '';
                maintitle.textContent = `detalle de solicitud ${consecutivoval}`;
            }

            const selestipol = document.getElementById('id_tipo_sol');
            if (selestipol && data.tipos_solicitud) {
                selestipol.innerHTML = '<option value="">seleccione...</option>';
                data.tipos_solicitud.forEach(ts => {
                    const opt = document.createElement('option');
                    opt.value = ts.id_tipo_sol;
                    opt.textContent = ts.nombre_tipo || '';
                    if (Number(ts.id_tipo_sol) === Number(d.id_tipo_sol)) opt.selected = true;
                    selestipol.appendChild(opt);
                });
            }

            const correoinput = document.getElementById('correo_electronico');
            if (correoinput) correoinput.value = d.correo_remitente || '';

            const dirinput = document.getElementById('beneficiarios_directos');
            if (dirinput) dirinput.value = d.beneficiarios_directos || '';

            const indirinput = document.getElementById('beneficiarios_indirectos');
            if (indirinput) indirinput.value = d.beneficiarios_indirectos || '';

            const listadoc = document.getElementById('lista_documentos');
            if (listadoc) {
                listadoc.innerHTML = '';
                const docs = Array.isArray(d.documentos) ? d.documentos : [];
                if (docs.length === 0) {
                    listadoc.innerHTML = '<div class="p-3 border rounded bg-light text-muted small">sin documentos adjuntos</div>';
                } else {
                    docs.forEach(doc => {
                        const item = document.createElement('div');
                        item.className = 'p-3 border rounded bg-light d-flex align-items-center justify-content-between flex-wrap gap-2';
                        const ext = (doc.tipo_documento || doc.nombre_documento || '').split('.').pop().toLowerCase();
                        const es_imagen = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
                        const final_url = normalizar_ruta(doc.ruta_documento);

                        const id_doc = doc.id_documento || doc.id_registro || d.id_registro;
                        const nombre_doc = doc.nombre_documento || 'documento';

                        item.innerHTML = `
                            <div class="d-flex align-items-center gap-2">
                                ${es_imagen ? `<img src="${final_url}" alt="${nombre_doc}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 4px;">` : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`}
                                <span class="fw-medium text-dark">${nombre_doc}</span>
                            </div>
                            <button type="button" class="btn btn-outline-secondary btn-sm px-3 py-1 text-dark fw-medium bg-white btn-ver-doc-item" style="border-radius: 6px; font-size: 13px;">ver documento</button>
                        `;

                        const btnver = item.querySelector('.btn-ver-doc-item');
                        if (btnver) {
                            btnver.onclick = function() {
                                verdocumento(id_doc, nombre_doc);
                            };
                        }

                        listadoc.appendChild(item);
                    });
                }
            }

            const estatusdb = (d.estatus_oficio || '').toLowerCase();
            const etapaid = d.id_etapa || null;

            document.querySelectorAll('input[name="estatus_oficio"]').forEach(r => {
                const val = r.value.toLowerCase();
                r.checked = (val === estatusdb) ||
                            (estatusdb.includes('proceso') && val === 'proceso') ||
                            (estatusdb.includes('turnado') && val === 'turnado') ||
                            (estatusdb.includes('atendido') && val === 'atendido') ||
                            (estatusdb.includes('vencido') && val === 'vencido') ||
                            (estatusdb.includes('cerrado') && val === 'cerrado');
            });

            bloquear_si_cerrado(estatusdb, etapaid);

            const enviasigaselect = document.getElementById('se_envia_siga');
            if (enviasigaselect && d.se_envia_siga !== null && d.se_envia_siga !== undefined) {
                enviasigaselect.value = String(d.se_envia_siga);
            }

            const expfisicoinput = document.getElementById('num_expediente_fisico');
            if (expfisicoinput) expfisicoinput.value = d.num_expediente_fisico || '';

            const gestionsigainput = document.getElementById('num_gestion_siga');
            if (gestionsigainput) gestionsigainput.value = d.num_gestion_siga || '';

            const oficiorespinput = document.getElementById('num_oficio_respuesta');
            if (oficiorespinput) oficiorespinput.value = d.num_oficio_respuesta || '';

            const turnarval = (d.turnar_a_entidad || '').toLowerCase();
            document.querySelectorAll('input[name="turnar_a_entidad"]').forEach(r => {
                const val = r.value.toLowerCase();
                r.checked = (val === turnarval) || 
                            (turnarval.includes('cfe') && val.includes('cfe')) ||
                            (turnarval === 'otros' && val === 'otros');
            });

            const espinput = document.getElementById('especificacion_entidad');
            if (espinput) espinput.value = d.especificacion || '';

            const cont = document.getElementById('contenedor_especificacion_entidad');
            if (cont) {
                cont.style.display = (turnarval === 'otros' || (d.especificacion && String(d.especificacion).trim() !== '')) ? 'block' : 'none';
            }

            const obsinput = document.getElementById('observaciones');
            if (obsinput) obsinput.value = d.observaciones || '';
        } else {
            console.error('error en respuesta de detalle:', data.error || 'desconocido');
        }
    } catch (err) {
        console.error('error al cargar detalle:', err);
    }
}

async function guardarseguimientocompleto(form) {
    const idreginput = document.getElementById('id_registro');
    const idtiposol = document.getElementById('id_tipo_sol');
    const correoelem = document.getElementById('correo_electronico');
    const bendir = document.getElementById('beneficiarios_directos');
    const benindir = document.getElementById('beneficiarios_indirectos');
    const estatuschecked = document.querySelector('input[name="estatus_oficio"]:checked');
    const enviasiga = document.getElementById('se_envia_siga');
    const expfisico = document.getElementById('num_expediente_fisico');
    const gestionsiga = document.getElementById('num_gestion_siga');
    const oficioresp = document.getElementById('num_oficio_respuesta');
    const turnarchecked = document.querySelector('input[name="turnar_a_entidad"]:checked');
    const esp_elem = document.getElementById('especificacion_entidad');
    const obs = document.getElementById('observaciones');
    
    // 1. Capturar los elementos de respuesta de la entidad que faltaban
    const respchecked = document.querySelector('input[name="entidad_dio_respuesta"]:checked');
    const oficioent = document.getElementById('oficio_respuesta_entidad');

    const payload = {
        id_registro: idreginput ? idreginput.value : '',
        id_tipo_sol: idtiposol ? idtiposol.value : '',
        correo_remitente: correoelem ? correoelem.value : '',
        beneficiarios_directos: bendir ? bendir.value : '',
        beneficiarios_indirectos: benindir ? benindir.value : '',
        estatus_oficio: estatuschecked ? estatuschecked.value : 'turnado',
        se_envia_siga: enviasiga ? enviasiga.value : '0',
        num_expediente_fisico: expfisico ? expfisico.value : '',
        num_gestion_siga: gestionsiga ? gestionsiga.value : '',
        num_oficio_respuesta: oficioresp ? oficioresp.value : '',
        turnar_a_entidad: turnarchecked ? turnarchecked.value : '',
        especificacion_entidad: esp_elem ? esp_elem.value : '',
        observaciones: obs ? obs.value : '',
        // 2. Incluirlos dentro del payload para que el backend PHP los reciba y guarde
        entidad_dio_respuesta: respchecked ? respchecked.value : null,
        oficio_respuesta_entidad: oficioent ? oficioent.value : null
    };

    try {
        const response = await fetch('/SICAEH/agencia_backend/guardar_detalle_seguimiento.php', {
            method: 'post',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const text_raw = await response.text();
        console.log('respuesta cruda php:', text_raw);

        const data = JSON.parse(text_raw);
        if (data.success) {
            await mostrar_alerta_personalizada('Seguimiento guardado correctamente.');
            window.location.replace('seguimiento.html');
        } else {
            await mostrar_alerta_personalizada('Error al guardar: ' + (data.error || 'desconocido'));
        }
    } catch (err) {
        console.error('Error al enviar:', err);
        await mostrar_alerta_personalizada('Error de comunicación con el servidor.');
    }
}

async function marcarcomorecibido(id) {
    try {
        const response = await fetch(`/SICAEH/agencia_backend/marcar_recibido.php`, {
            method: 'post',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: `id_registro=${id}`
        });
        const resultado = await response.json();
        if (resultado.success || resultado.ok) {
            await mostrar_alerta_personalizada('Solicitud marcada como recibida correctamente.');
            location.reload();
        } else {
            await mostrar_alerta_personalizada('error: ' + (resultado.error || resultado.mensaje));
        }
    } catch (error) {
        console.error('error al actualizar estatus:', error);
    }
}