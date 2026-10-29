document.addEventListener('DOMContentLoaded', function() {
    function atitulo(str) {
        return (str || '')
            .toLowerCase()
            .split(' ')
            .map(w => w.length > 0 ? w[0].toUpperCase() + w.slice(1) : '')
            .join(' ');
    }

    const urlparams = new URLSearchParams(window.location.search);
    const idregistro = urlparams.get('id_registro') || urlparams.get('id') || '';

    const inputid = document.getElementById('id_registro');
    if (inputid) {
        inputid.value = idregistro;
    }

    let urlfetch = '/SICAEH/agencia_backend/obtener_registro.php';
    if (idregistro) {
        urlfetch += '?id_registro=' + idregistro;
    }

    fetch(urlfetch)
    .then(response => response.json())
    .then(resdata => {
        if (resdata.success) {
            const reg = resdata.data;

            if (inputid && reg.id_registro) {
                inputid.value = reg.id_registro;
            }

            const inputconsecutivo = document.getElementById('num_consecutivo');
            if (inputconsecutivo) {
                inputconsecutivo.value = (reg.num_consecutivo || '').toUpperCase();
            }

            const inputfecha = document.getElementById('fecha_captura');
            if (inputfecha) {
                inputfecha.value = reg.fecha_captura || '';
            }

            const selecttipo = document.getElementById('tipo_solicitud');
            if (selecttipo && reg.tipos_solicitud) {
                selecttipo.innerHTML = '<option value="" disabled>Seleccione Una Opcion...</option>';
                reg.tipos_solicitud.forEach(tipo => {
                    const option = document.createElement('option');
                    option.value = tipo.id_tipo_sol;
                    option.textContent = atitulo(tipo.nombre_tipo);
                    if (tipo.id_tipo_sol == reg.id_tipo_sol) {
                        option.selected = true;
                    }
                    selecttipo.appendChild(option);
                });
            }

            // Opción 1: Chips interactivos + buscador filtrable
            const contenedorusuarios = document.getElementById('contenedor_usuarios');
            if (contenedorusuarios && reg.usuarios) {
                const listausuarios = reg.usuarios;
                const seleccionados = new Set();

                contenedorusuarios.innerHTML = `
                    <div id="chips_seleccionados" class="d-flex flex-wrap gap-1 mb-2"></div>
                    <input type="text" id="buscador_usuarios_input" class="form-control form-control-sm mb-1 bg-white" placeholder="Escribe para buscar usuario...">
                    <div id="dropdown_lista_usuarios" class="border rounded bg-white p-1" style="max-height: 110px; overflow-y: auto;"></div>
                    <div id="hidden_inputs_usuarios"></div>
                `;

                const chipscontainer = document.getElementById('chips_seleccionados');
                const dropdowncontainer = document.getElementById('dropdown_lista_usuarios');
                const hiddencontainer = document.getElementById('hidden_inputs_usuarios');
                const buscadorinput = document.getElementById('buscador_usuarios_input');

                function renderizarui() {
                    chipscontainer.innerHTML = '';
                    seleccionados.forEach(iduser => {
                        const usr = listausuarios.find(u => String(u.id_usuario) === String(iduser));
                        if (usr) {
                            const chip = document.createElement('span');
                            chip.className = 'badge bg-light text-dark border d-flex align-items-center gap-1 py-1 px-2 small';
                            const nombrecompleto = atitulo(`${usr.nombre} ${usr.apellidos || ''}`);
                            chip.innerHTML = `${nombrecompleto} <span style="cursor:pointer; font-weight:bold;" data-id="${usr.id_usuario}" class="btn-quitar-chip">&times;</span>`;
                            chipscontainer.appendChild(chip);
                        }
                    });

                    hiddencontainer.innerHTML = '';
                    seleccionados.forEach(iduser => {
                        const hid = document.createElement('input');
                        hid.type = 'hidden';
                        hid.name = 'id_usuario[]';
                        hid.value = iduser;
                        hiddencontainer.appendChild(hid);
                    });

                    const filtro = (buscadorinput.value || '').toLowerCase();
                    dropdowncontainer.innerHTML = '';
                    listausuarios.forEach(usr => {
                        const nombrecompleto = atitulo(`${usr.nombre} ${usr.apellidos || ''}`);
                        if (nombrecompleto.toLowerCase().includes(filtro)) {
                            const item = document.createElement('div');
                            item.className = 'form-check mb-1 px-1';
                            const ischecked = seleccionados.has(String(usr.id_usuario));
                            item.innerHTML = `
                                <input class="form-check-input item-chk-usr" type="checkbox" value="${usr.id_usuario}" id="chk_opt_${usr.id_usuario}" ${ischecked ? 'checked' : ''}>
                                <label class="form-check-label small text-dark d-inline-block w-100" style="cursor:pointer;" for="chk_opt_${usr.id_usuario}">${nombrecompleto}</label>
                            `;
                            dropdowncontainer.appendChild(item);
                        }
                    });

                    chipscontainer.querySelectorAll('.btn-quitar-chip').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            const uid = e.target.getAttribute('data-id');
                            seleccionados.delete(String(uid));
                            renderizarui();
                        });
                    });

                    dropdowncontainer.querySelectorAll('.item-chk-usr').forEach(chk => {
                        chk.addEventListener('change', (e) => {
                            const uid = e.target.value;
                            if (e.target.checked) {
                                seleccionados.add(String(uid));
                            } else {
                                seleccionados.delete(String(uid));
                            }
                            renderizarui();
                        });
                    });
                }

                if (buscadorinput) {
                    buscadorinput.addEventListener('input', () => {
                        renderizarui();
                    });
                }

                renderizarui();
            }

            const inputarchivo = document.getElementById('nombre_archivo');
            if (inputarchivo) {
                inputarchivo.value = reg.nombre_archivo || 'Sin archivo adjunto';
            }

            const btnverdoc = document.getElementById('btn-ver-documento');
            if (btnverdoc) {
                if (reg.documento_adjunto && reg.id_registro) {
                    btnverdoc.style.display = 'inline-block';
                    btnverdoc.onclick = function() {
                        let nombre_original = reg.nombre_archivo || reg.nombre_original || 'documento';
                        verdocumento(reg.id_registro, nombre_original);
                    };
                } else {
                    btnverdoc.style.display = 'none';
                }
            }
        } else {
            console.error('error en los datos:', resdata.error);
        }
    })
    .catch(error => {
        console.error('error de red en el fetch:', error);
    });

    const formturnar = document.getElementById('form-turnar-usuario');
    if (formturnar) {
        formturnar.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formdata = new FormData(this);

            try {
                const response = await fetch('/SICAEH/agencia_backend/guardar_turno.php', {
                    method: 'POST',
                    body: formdata
                });
                const textorespuesta = await response.text();
                const resdata = JSON.parse(textorespuesta);

                if (resdata.success) {
                    await mostrar_alerta_personalizada(resdata.mensaje);
                    window.location.href = 'dashboard.html';
                } else {
                    await mostrar_alerta_personalizada('error al turnar: ' + resdata.error);
                }
            } catch (error) {
                console.error('error de red o json:', error);
                await mostrar_alerta_personalizada('revisa la consola (f12): el archivo guardar_turno.php tiene un error de php.');
            }
        });
    }

    const radiosprioridad = document.querySelectorAll('input[name="tipo"]');
    radiosprioridad.forEach(radio => {
        radio.addEventListener('change', (e) => {
            document.querySelectorAll('.pill-radio').forEach(pill => {
                pill.classList.remove('active-priority');
            });
            const pillpadre = e.target.closest('.pill-radio');
            if (pillpadre) {
                pillpadre.classList.add('active-priority');
            }
        });
    });
});