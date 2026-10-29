async function cargarcatalogo(nombrecatalogo, selectid, idpadre = null) {
    let url = `/SICAEH/agencia_backend/obtener_catalogo.php?catalogo=${nombrecatalogo}`;
    if (idpadre) url += `&id_edo=${idpadre}`;

    try {
        const respuesta = await fetch(url);
        const resultado = await respuesta.json();
        
        if (resultado.success) {
            const select = document.getElementById(selectid);
            if (!select) return;
            select.innerHTML = '<option value="">seleccione una opcion...</option>';
            
            resultado.data.forEach(item => {
                const option = document.createElement('option');
                option.value = item.id;
                option.textContent = item.nombre;
                select.appendChild(option);
            });

            if (nombrecatalogo === 'edo') {
                for (let i = 0; i < select.options.length; i++) {
                    if (select.options[i].textContent.toLowerCase() === 'hidalgo') {
                        select.selectedIndex = i;
                        break;
                    }
                }
                const idhidalgo = select.value;
                if (idhidalgo) {
                    cargarcatalogo('municipio', 'municipio', idhidalgo);
                }
            }
        }
    } catch (error) {
        console.error('error al cargar catalogo:', error);
    }
}

function cambiar_estado() {
    const selectedo = document.getElementById('estado');
    if (!selectedo) return;
    const textoseleccionado = selectedo.options[selectedo.selectedIndex].textContent.toLowerCase();
    const cont_mun = document.getElementById('contenedor_municipio');
    const cont_loc = document.getElementById('contenedor_localidad');

    if (textoseleccionado === 'hidalgo') {
        cont_mun.innerHTML = '<select id="municipio" name="id_municipio" class="form-select" onchange="cambiar_municipio()" required style="border-radius: 8px; font-size: 14px;"><option value="">seleccione el municipio</option></select>';
        cont_loc.innerHTML = '<select id="localidad" name="id_localidad" class="form-select" required style="border-radius: 8px; font-size: 14px;"><option value="">seleccione la localidad</option></select>';
        cargarcatalogo('municipio', 'municipio', selectedo.value);
    } else {
        cont_mun.innerHTML = '<input type="text" id="municipio" name="municipio_texto" class="form-control" placeholder="escriba el municipio" required style="border-radius: 8px; font-size: 14px;">';
        cont_loc.innerHTML = '<input type="text" id="localidad" name="localidad_texto" class="form-control" placeholder="escriba la localidad" required style="border-radius: 8px; font-size: 14px;">';
    }
}

async function cambiar_municipio() {
    const selectmun = document.getElementById('municipio');
    if (!selectmun || selectmun.tagName !== 'SELECT') return;
    const idmunicipio = selectmun.value;
    if (!idmunicipio) return;

    let url = `/SICAEH/agencia_backend/obtener_catalogo.php?catalogo=localidad&id_municipio=${idmunicipio}`;
    try {
        const respuesta = await fetch(url);
        const resultado = await respuesta.json();
        if (resultado.success) {
            const selectloc = document.getElementById('localidad');
            if (!selectloc || selectloc.tagName !== 'SELECT') return;
            selectloc.innerHTML = '<option value="">seleccione la localidad</option>';
            resultado.data.forEach(item => {
                const option = document.createElement('option');
                option.value = item.id;
                option.textContent = item.nombre;
                selectloc.appendChild(option);
            });
        }
    } catch (error) {
        console.error('error al cargar localidades:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    cargarcatalogo('tipo_solicitud', 'tipo_solicitud');
    cargarcatalogo('remitente', 'remitente');
    cargarcatalogo('edo', 'estado');

    const selectedo = document.getElementById('estado');
    if (selectedo) {
        selectedo.addEventListener('change', () => {
            cambiar_estado();
        });
    }

    const inputarchivo = document.getElementById('documento_adjunto');
    if (inputarchivo) {
        inputarchivo.addEventListener('change', async function(e) {
            if (this.files && this.files.length > 0) {
                const nombrearchivo = this.files[0].name;
                const dropzonetext = this.closest('.upload-dropzone')?.querySelector('p');
                if (dropzonetext) {
                    dropzonetext.textContent = `archivo seleccionado: ${nombrearchivo}`;
                    dropzonetext.style.color = '#691b31';
                    dropzonetext.style.fontWeight = 'bold';
                }
                const tamanoMB = this.files[0].size / (1024 * 1024);
                if (tamanoMB > 15) { // límite de 15 mb
                    await mostrar_alerta_personalizada('El archivo seleccionado es demasiado pesado (' + tamanoMB.toFixed(2) + ' mb). el límite máximo permitido es de 15 MB.');
                    this.value = ''; // limpia el input para que no se envíe el archivo pesado
                    if (dropzonetext) {
                        dropzonetext.textContent = 'arrastra tu archivo aquí o haz clic para buscar';
                        dropzonetext.style.color = '';
                        dropzonetext.style.fontWeight = '';
                    }
                    return; // detiene el proceso
                }
            }
        });
    }

    const inputadjunto = document.getElementById('documento_adjunto');
    const dropzonecontent = document.getElementById('dropzone-content');
    const filepreview = document.getElementById('file-preview');
    const previewname = document.getElementById('preview-name');
    const previewsize = document.getElementById('preview-size');
    const previewiconcontainer = document.getElementById('preview-icon-container');
    const removefilebtn = document.getElementById('remove-file-btn');

    if (inputadjunto) {
        inputadjunto.addEventListener('change', function(e) {
            if (this.files && this.files[0]) {
                const file = this.files[0];
                const filename = file.name;
                const filesizemb = (file.size / (1024 * 1024)).toFixed(2) + ' mb';
                const fileextension = filename.split('.').pop().toLowerCase();

                if (previewname) previewname.textContent = filename;
                if (previewsize) previewsize.textContent = filesizemb;

                if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileextension)) {
                    const reader = new FileReader();
                    reader.onload = function(evt) {
                        if (previewiconcontainer) {
                            previewiconcontainer.innerHTML = `<img src="${evt.target.result}" alt="preview" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">`;
                        }
                    };
                    reader.readAsDataURL(file);
                } else {
                    let badgecolor = '#691b31';
                    if (fileextension === 'pdf') badgecolor = '#dc3545';
                    else if (['doc', 'docx'].includes(fileextension)) badgecolor = '#0d6efd';
                    else if (['xls', 'xlsx'].includes(fileextension)) badgecolor = '#198754';

                    if (previewiconcontainer) {
                        previewiconcontainer.innerHTML = `<span class="badge text-white text-uppercase" style="background-color: ${badgecolor}; font-size: 10px; padding: 6px;">${fileextension}</span>`;
                    }
                }

                if (dropzonecontent && filepreview) {
                    dropzonecontent.classList.add('d-none');
                    filepreview.classList.remove('d-none');
                    filepreview.classList.add('d-flex');
                }
            }
        });

        if (removefilebtn) {
            removefilebtn.addEventListener('click', function(e) {
                e.stopPropagation();
                inputadjunto.value = '';
                if (filepreview && dropzonecontent) {
                    filepreview.classList.remove('d-flex');
                    filepreview.classList.add('d-none');
                    dropzonecontent.classList.remove('d-none');
                }
            });
        }
    }

    const formregistro = document.getElementById('form-nuevo-registro');
    if (formregistro) {
        formregistro.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formdata = new FormData(formregistro);

            try {
                const respuesta = await fetch('/SICAEH/agencia_backend/guardar_registro.php', {
                    method: 'post',
                    body: formdata
                });
                const resultado = await respuesta.json();

                if (resultado.success) {
                    await mostrar_alerta_personalizada(resultado.mensaje || 'registro guardado.');
                    // recargar la página por completo para asegurar un estado limpio en los selects y archivos
                    window.location.reload();
                } else {
                    await mostrar_alerta_personalizada('Error al guardar: ' + (resultado.error || 'desconocido'));
                }
            } catch (error) {
                console.error('error de red:', error);
                await mostrar_alerta_personalizada('error de red al intentar guardar el registro.');
            }
        });
    }

    
});

document.addEventListener("DOMContentLoaded", function() {
    let select_tipo = document.getElementById("id_tipo_sol") || document.querySelector("select[name*='tipo']") || document.querySelector("select[id*='tipo']");
    let contenedor_evento = document.getElementById("contenedor-fecha-evento");
    let select_prog = document.getElementById("tipo_programacion_fecha");
    
    let sec_unica = document.getElementById("seccion-fecha-unica");
    let sec_rango = document.getElementById("seccion-fecha-rango");
    let sec_diferentes = document.getElementById("seccion-fechas-diferentes");
    let btn_generar = document.getElementById("btn_generar_fechas");
    let contenedor_dinamico = document.getElementById("contenedor_inputs_dinamicos");

    if (select_tipo && contenedor_evento) {
        function verificar_tipo_solicitud() {
            let opcion_seleccionada = select_tipo.options[select_tipo.selectedIndex];
            let texto_seleccionado = opcion_seleccionada ? opcion_seleccionada.text.toLowerCase() : "";
            let valor_seleccionado = select_tipo.value.toLowerCase();
            
            let palabras_clave = ['expo', 'taller', 'congreso', 'ponencia', 'reunion', 'reunión', 'feria', 'foro', 'capacitacion', 'capacitación', 'invitacion', 'invitación'];
            
            let es_invitacion = palabras_clave.some(palabra => 
                texto_seleccionado.includes(palabra) || valor_seleccionado.includes(palabra)
            );

            if (es_invitacion) {
                contenedor_evento.style.display = "block";
            } else {
                contenedor_evento.style.display = "none";
                limpiarCampos();
            }
        }

        select_tipo.addEventListener("change", verificar_tipo_solicitud);
        select_tipo.addEventListener("input", verificar_tipo_solicitud);
        verificar_tipo_solicitud();
    }

    // Alternar entre las opciones de programación
    if (select_prog) {
        select_prog.addEventListener("change", function() {
            sec_unica.style.display = "none";
            sec_rango.style.display = "none";
            sec_diferentes.style.display = "none";

            if (this.value === "rango") {
                sec_rango.style.display = "flex";
            } else if (this.value === "diferentes") {
                sec_diferentes.style.display = "block";
                generarInputsDinamicos(1); // Generar por defecto 1 campo
            } else {
                sec_unica.style.display = "block";
            }
        });
    }

    // Botón para generar los inputs dinámicos según el número ingresado
    if (btn_generar) {
        btn_generar.addEventListener("click", function() {
            let cantidad = parseInt(document.getElementById("num_fechas_dif").value) || 1;
            if (cantidad > 20) cantidad = 20; // Límite de seguridad
            if (cantidad < 1) cantidad = 1;
            generarInputsDinamicos(cantidad);
        });
    }

    function generarInputsDinamicos(cantidad) {
        contenedor_dinamico.innerHTML = "";
        for (let i = 1; i <= cantidad; i++) {
            let div = document.createElement("div");
            div.className = "mb-2";
            div.innerHTML = `
                <label class="form-label text-muted small" style="font-size: 0.8rem;">Fecha ${i}</label>
                <input type="date" class="form-control form-control-sm" name="fechas_evento[]" required>
            `;
            contenedor_dinamico.appendChild(div);
        }
    }

    function limpiarCampos() {
        let inputSimple = document.getElementById("fecha_evento_simple");
        let inputInicio = document.getElementById("fecha_inicio");
        let inputFin = document.getElementById("fecha_fin");
        if (inputSimple) inputSimple.value = "";
        if (inputInicio) inputInicio.value = "";
        if (inputFin) inputFin.value = "";
        if (contenedor_dinamico) contenedor_dinamico.innerHTML = "";
    }
});