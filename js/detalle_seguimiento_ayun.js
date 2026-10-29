function abrir_modal_doc() {
    const params = new URLSearchParams(window.location.search);
    const idval = document.getElementById('id_registro')?.value || params.get('id') || params.get('id_registro') || '';
    const inputmod = document.getElementById('id_registro_modal');
    if (inputmod) inputmod.value = idval;
    const modalel = document.getElementById('modal-adjuntar-doc');
    if (modalel && window.bootstrap) {
        new window.bootstrap.Modal(modalel).show();
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const idreg = params.get('id') || params.get('id_registro');

    if (!idreg) {
        await mostrar_alerta_personalizada('No se encontró el id del registro.');
        window.location.href = 'seguimiento.html';
        return;
    }

    const inputid = document.getElementById('id_registro');
    if (inputid) inputid.value = idreg;
    cargardetalleayuntamiento(idreg);

    const form = document.getElementById('form-seguimiento-ayuntamientos');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await guardarseguimientoayuntamiento(form);
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
                    const modalinstance = window.bootstrap.Modal.getInstance(modalel);
                    if (modalinstance) modalinstance.hide();
                    cargardetalleayuntamiento(idreg);
                } else {
                    await mostrar_alerta_personalizada('error: ' + (data.error || 'desconocido'));
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

async function cargardetalleayuntamiento(id) {
    try {
        const url = `/SICAEH/agencia_backend/obtener_detalle_seguimiento.php?id=${id}`;
        const res = await fetch(url);
        const text_raw = await res.text();
        if (!text_raw || text_raw.trim() === '') return;
        const data = JSON.parse(text_raw);
        if (data.success && data.detalle) {
            const d = data.detalle;
            
            const numconsecutivoinput = document.getElementById('num_consecutivo');
            if (numconsecutivoinput) numconsecutivoinput.value = (d.num_consecutivo || '').toUpperCase();
            
            const fechacapturainput = document.getElementById('fecha_captura');
            if (fechacapturainput) fechacapturainput.value = d.fecha_captura || '';
            
            const usuarioasignadoinput = document.getElementById('usuario_asignado');
            if (usuarioasignadoinput) {
                usuarioasignadoinput.value = d.usuario_asignado || '';
            }

            const maintitle = document.getElementById('main-title');
            if (maintitle) {
                const consecutivoval = d.num_consecutivo ? String(d.num_consecutivo).toUpperCase() : '';
                maintitle.textContent = `detalle de solicitud ${consecutivoval}`;
            }

            const tiposolinput = document.getElementById('tipo_solicitud');
            if (tiposolinput && data.tipos_solicitud) {
                const encontrado = data.tipos_solicitud.find(ts => Number(ts.id_tipo_sol) === Number(d.id_tipo_sol));
                tiposolinput.value = encontrado ? encontrado.nombre_tipo : '';
            }

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

                        item.innerHTML = `
                            <div class="d-flex align-items-center gap-2">
                                ${es_imagen ? `<img src="${final_url}" alt="${doc.nombre_documento}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 4px;">` : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`}
                                <span class="fw-medium text-dark">${doc.nombre_documento || 'documento'}</span>
                            </div>
                            <a href="${final_url}" target="_blank" class="btn btn-outline-secondary btn-sm px-3 py-1 text-dark fw-medium bg-white" style="border-radius: 6px; font-size: 13px;">Ver Documento</a>
                        `;
                        listadoc.appendChild(item);
                    });
                }
            }

            const estatusdb = (d.estatus_oficio || '').toLowerCase();
            document.querySelectorAll('input[name="estatus_oficio"]').forEach(r => {
                const val = r.value.toLowerCase();
                const label = r.closest('.form-check')?.querySelector('label');
                const match = (estatusdb === val) || (val === 'proceso' && estatusdb.includes('proceso'));
                r.checked = match;
                if (label) {
                    if (match) {
                        label.classList.remove('text-muted');
                        label.classList.add('text-dark', 'fw-bold');
                    } else {
                        label.classList.remove('text-dark', 'fw-bold');
                        label.classList.add('text-muted');
                    }
                }
            });

            const expfisicoinput = document.getElementById('num_expediente_fisico');
            if (expfisicoinput) expfisicoinput.value = (d.num_expediente_fisico || '').toUpperCase();

            const gestionsigainput = document.getElementById('num_gestion_siga');
            if (gestionsigainput) gestionsigainput.value = (d.num_gestion_siga || '').toUpperCase();

            const oficiorespinput = document.getElementById('num_oficio_respuesta');
            if (oficiorespinput) oficiorespinput.value = (d.num_oficio_respuesta || '').toUpperCase();

            const respdb = (d.entidad_dio_respuesta || '').toLowerCase().trim();
            const normalizar = (str) => (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            document.querySelectorAll('input[name="entidad_dio_respuesta"]').forEach(r => {
                const val = r.value.toLowerCase().trim();
                r.checked = (normalizar(val) === normalizar(respdb));
            });
            
            const oficioentinput = document.getElementById('oficio_respuesta_entidad');
            if (oficioentinput) oficioentinput.value = (d.oficio_respuesta_entidad || '').toUpperCase();

            const obsinput = document.getElementById('observaciones');
            if (obsinput) obsinput.value = d.observaciones_entidad || '';
        }
    } catch (err) {
        console.error('error al cargar detalle ayuntamiento:', err);
    }
}

async function guardarseguimientoayuntamiento(form) {
    const idreginput = document.getElementById('id_registro');
    const respchecked = document.querySelector('input[name="entidad_dio_respuesta"]:checked');
    const oficioent = document.getElementById('oficio_respuesta_entidad');
    const obs = document.getElementById('observaciones');

    const payload = {
        id_registro: idreginput ? idreginput.value : '',
        entidad_dio_respuesta: respchecked ? respchecked.value : null,
        oficio_respuesta_entidad: oficioent ? oficioent.value : null,
        observaciones_entidad: obs ? obs.value : null
    };

    try {
        const response = await fetch('/SICAEH/agencia_backend/guardar_detalle_seguimiento.php', {
            method: 'post',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const text_raw = await response.text();
        const data = JSON.parse(text_raw);
        if (data.success) {
            await mostrar_alerta_personalizada('Seguimiento guardado correctamente.');
            window.location.replace('seguimiento.html');
        } else {
            await mostrar_alerta_personalizada('error al guardar: ' + (data.error || 'desconocido'));
        }
    } catch (err) {
        console.error('error al enviar ayuntamiento:', err);
        await mostrar_alerta_personalizada('error de comunicación con el servidor.');
    }
}