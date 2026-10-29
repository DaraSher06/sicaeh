document.addEventListener("DOMContentLoaded", () => {
    const input_busqueda = document.getElementById("input-busqueda");
    const btn_limpiar = document.getElementById("btn-limpiar");
    const grid_contactos = document.getElementById("grid-contactos");
    const botones_sector_pills = document.querySelectorAll("#nav-sectores-pills .nav-link");

    let sector_actual = "";
    let rol_usuario_actual = "consulta";

    const elementos_por_pagina = 9;
    let pagina_actual = 1;
    let lista_contactos_global = [];

    cargar_contactos();

    function atitulo(str) {
        return (str || "")
            .toLowerCase()
            .split(" ")
            .map(w => w.length > 0 ? w[0].toUpperCase() + w.slice(1) : "")
            .join(" ");
    }

    if (input_busqueda) {
        input_busqueda.addEventListener("input", () => {
            cargar_contactos();
        });
    }

    if (btn_limpiar) {
        btn_limpiar.addEventListener("click", () => {
            if (input_busqueda) input_busqueda.value = "";
            
            botones_sector_pills.forEach(b => {
                b.classList.remove("active", "text-white");
                b.classList.add("text-secondary", "bg-white", "border");
                b.style.backgroundColor = "";
            });
            const btn_todos = document.querySelector('#nav-sectores-pills .nav-link[data-sector-id=""]');
            if (btn_todos) {
                btn_todos.classList.add("active", "text-white");
                btn_todos.classList.remove("text-secondary", "bg-white", "border");
                btn_todos.style.backgroundColor = "#691b31";
            }

            sector_actual = "";
            cargar_contactos();
        });
    }

    botones_sector_pills.forEach(boton => {
        boton.addEventListener("click", (e) => {
            e.preventDefault();

            botones_sector_pills.forEach(b => {
                b.classList.remove("active", "text-white");
                b.classList.add("text-secondary", "bg-white", "border");
                b.style.backgroundColor = "";
            });

            boton.classList.add("active", "text-white");
            boton.classList.remove("text-secondary", "bg-white", "border");
            boton.style.backgroundColor = "#691b31";

            sector_actual = boton.getAttribute("data-sector-id");
            cargar_contactos();
        });
    });

    async function cargar_contactos() {
        try {
            const busqueda = encodeURIComponent(input_busqueda ? input_busqueda.value.trim() : "");
            const id_sector = encodeURIComponent(sector_actual);

            const url = `/SICAEH/agencia_backend/directorio.php?accion=listar&busqueda=${busqueda}&id_sector=${id_sector}`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.success) {
                if (data.rol_actual) {
                    rol_usuario_actual = data.rol_actual.toLowerCase();
                }
                
                const btn_nuevo = document.getElementById("btn-nuevo-contacto");
                if (btn_nuevo) {
                    if (rol_usuario_actual === "consulta") {
                        btn_nuevo.style.setProperty("display", "none", "important");
                    } else {
                        btn_nuevo.style.display = "flex";
                    }
                }

                inicializar_directorio(data.datos);
            } else {
                if (grid_contactos) {
                    grid_contactos.innerHTML = `<div class="col-12 text-center py-5"><p class="text-muted">No se encontraron registros de contactos.</p></div>`;
                }
            }
        } catch (error) {
            console.error("error al cargar contactos:", error);
            if (grid_contactos) {
                grid_contactos.innerHTML = `<div class="col-12 text-center py-5"><p class="text-danger">error al conectar con el servidor.</p></div>`;
            }
        }
    }

    function inicializar_directorio(datos) {
        lista_contactos_global = datos || [];
        renderizar_pagina(1);
    }

    function renderizar_pagina(pagina) {
        pagina_actual = pagina;
        const inicio = (pagina_actual - 1) * elementos_por_pagina;
        const fin = inicio + elementos_por_pagina;
        const contactos_paginados = lista_contactos_global.slice(inicio, fin);

        renderizar_grid(contactos_paginados);
        renderizar_controles_paginacion();
    }

    function renderizar_controles_paginacion() {
        const total_paginas = Math.ceil(lista_contactos_global.length / elementos_por_pagina);
        let contenedor_paginacion = document.getElementById("contenedor-paginacion");

        if (!contenedor_paginacion) {
            contenedor_paginacion = document.createElement("div");
            contenedor_paginacion.id = "contenedor-paginacion";
            contenedor_paginacion.className = "d-flex justify-content-center align-items-center my-4";
            grid_contactos.after(contenedor_paginacion);
        }

        if (total_paginas <= 1) {
            contenedor_paginacion.innerHTML = "";
            return;
        }

        let html = '';
        html += `<button class="btn btn-outline-dark btn-sm me-3" ${pagina_actual === 1 ? 'disabled' : ''} onclick="cambiar_pagina(${pagina_actual - 1})">Anterior</button>`;
        html += `<span class="fw-bold text-muted">Página ${pagina_actual} de ${total_paginas}</span>`;
        html += `<button class="btn btn-outline-dark btn-sm ms-3" ${pagina_actual >= total_paginas ? 'disabled' : ''} onclick="cambiar_pagina(${pagina_actual + 1})">Siguiente</button>`;

        contenedor_paginacion.innerHTML = html;
    }

    window.cambiar_pagina = function(nueva_pagina) {
        const total_paginas = Math.ceil(lista_contactos_global.length / elementos_por_pagina);
        if (nueva_pagina >= 1 && nueva_pagina <= total_paginas) {
            renderizar_pagina(nueva_pagina);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    function renderizar_grid(datos) {
        if (!grid_contactos) return;
        grid_contactos.innerHTML = "";

        if (!datos || datos.length === 0) {
            grid_contactos.innerHTML = `<div class="col-12 text-center py-5"><p class="text-muted">No hay Contactos Disponibles con los filtros seleccionados.</p></div>`;
            return;
        }

        const es_rol_gestion = ["administrador", "supervisor", "capturista"].includes(rol_usuario_actual);

        datos.forEach(item => {
            const col = document.createElement("div");
            col.className = "col-md-4 d-flex align-items-start mb-4";

            const tel = item.telefono_oficina || item.telefono_celular || "--";
            
            function procesar_correos(texto_correo) {
                if (!texto_correo) return "No registrado";
                const correos = texto_correo.split(/\s+|,/).map(c => c.trim()).filter(c => c !== "");
                if (correos.length === 0) return "no registrado";

                return correos.map(correo => `
                    <a href="mailto:${correo}" class="text-decoration-none text-secondary d-block text-truncate" title="${correo}">
                        ${correo}
                    </a>
                `).join("");
            }

            const domicilio = item.domicilio || "Domicilio no especificado";
            const cargo_texto = item.cargo || item.nombre_unidad_administrativa || "---";

            col.innerHTML = `
                <div class="card border-0 shadow-sm overflow-hidden w-100 tarjeta-contacto-${item.id_contacto}" style="border-radius: 12px; background: #ffffff;">
                    <div class="p-4" style="background-color: rgba(219, 219, 221, 0.40); border-top-left-radius: 12px; border-top-right-radius: 12px; border-bottom: 1px solid #e8dfd8;">
                        <div class="d-flex justify-content-between align-items-start gap-2 mb-3">
                            <span class="badge px-3 py-1 flex-shrink-0" style="background-color: #DDC9A3; color: #000; font-weight: 600; font-size: 11px; border-radius: 20px;">${atitulo(item.nombre_sector)}</span>
                            <span class="text-muted small fw-semibold text-end" style="font-size: 11px; color: #000 !important;" title="${item.nombre_institucion}">${(item.nombre_institucion || "").toUpperCase()}</span>
                        </div>
                        <h3 class="h5 fw-bold mb-1" style="color: #222;">${(!item.nombre_completo || item.nombre_completo.trim() === '' || item.nombre_completo.toLowerCase() === 'sin nombre') ? '---' : atitulo(item.nombre_completo)}</h3>
                        <p class="small mb-0" style="color: #691B31; font-weight: 600;">${atitulo(cargo_texto)}</p>
                    </div>

                    <div class="p-4 d-flex flex-column justify-content-between flex-grow-1">
                        <ul class="list-unstyled small text-secondary mb-4">
                            <li class="mb-2 d-flex align-items-center gap-2">
                                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                                ${tel}
                            </li>
                            <li class="mb-2 d-flex align-items-start gap-2">
                                <svg width="14" height="14" class="mt-1 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                                <div class="w-100">
                                    ${procesar_correos(item.correo_institucional)}
                                </div>
                            </li>
                            <li class="d-flex align-items-center gap-2 text-truncate" title="${domicilio}">
                                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                ${domicilio}
                            </li>
                        </ul>
                        <div class="d-flex gap-2 mt-auto">
                            ${rol_usuario_actual !== 'consulta' ? `<a href="detalles_contacto.html?id=${item.id_contacto || ''}" class="btn btn-outline-secondary btn-sm w-50 fw-semibold" style="border-radius: 6px;">Ver Detalles</a>` : ''}
                            <button type="button" class="btn btn-outline-secondary btn-sm ${rol_usuario_actual === 'consulta' ? 'w-100' : 'w-50'} fw-semibold" style="border-radius: 6px;" onclick="descargar_ficha_imagen('${item.id_contacto}')">Descargar Ficha</button>
                        </div>
                        ${es_rol_gestion ? `<div class="mt-2"><button type="button" class="btn btn-outline-danger btn-sm w-100 fw-semibold" style="border-radius: 6px;" onclick="eliminar_contacto('${item.id_contacto}')">Eliminar Contacto</button></div>` : ''}
                    </div>
                </div>
            `;
            grid_contactos.appendChild(col);
        });
    }

    window.descargar_ficha_imagen = async function(id_contacto) {
        const libreria_jspdf = window.jspdf ? window.jspdf.jsPDF : null;
        
        if (!libreria_jspdf) {
            alert("la librería jsPDF no se encuentra cargada en la página.");
            return;
        }

        try {
            const response = await fetch(`../agencia_backend/directorio.php?accion=detalle&id=${id_contacto}`);
            const data = await response.json();

            if (!data.success || !data.contacto) {
                alert("no se pudo obtener la información para generar la ficha.");
                return;
            }

            const item = data.contacto;

            const cargar_imagen = (url) => {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.crossOrigin = "anonymous";
                    img.onload = () => resolve(img);
                    img.onerror = () => resolve(null);
                    img.src = url;
                });
            };

            const img_fondo = await cargar_imagen("img/Tarjeta.png"); 

            if (!img_fondo) {
                alert("no se pudo cargar la imagen de plantilla de fondo.");
                return;
            }

            const img_natural_width = img_fondo.naturalWidth;
            const img_natural_height = img_fondo.naturalHeight;

            const ancho_pdf = 279.4; 
            const alto_pdf = (img_natural_height * ancho_pdf) / img_natural_width;

            const doc = new libreria_jspdf({
                orientation: 'landscape',
                format: [ancho_pdf, alto_pdf],
                unit: 'mm'
            });

            const canvas = document.createElement("canvas");
            canvas.width = img_natural_width;
            canvas.height = img_natural_height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img_fondo, 0, 0);
            const img_fondo_base64 = canvas.toDataURL("image/png");

            doc.addImage(img_fondo_base64, "png", 0, 0, ancho_pdf, alto_pdf);

            const x_inicio = 110; 
            const ancho_max_texto = ancho_pdf - x_inicio - 25;

            // evaluamos la cantidad de correos para ajustar dinámicamente el espaciado
            const texto_correo_inst = item.correo_institucional || '-----';
            const arreglo_correos = texto_correo_inst.split(/\s+|,/).map(c => c.trim()).filter(c => c !== "");
            const muchos_correos = arreglo_correos.length > 2;

            // si hay muchos correos, iniciamos más arriba y con un interlineado compacto
            let y = muchos_correos ? 14 : 18;
            const espacio_linea = muchos_correos ? 5 : 6;

            doc.setFont("montserrat", "bold");
            doc.setFontSize(muchos_correos ? 17 : 18);
            doc.setTextColor(105, 27, 49);
            doc.text("FICHA DE CONTACTO INSTITUCIONAL", x_inicio, y);

            y += muchos_correos ? 6 : 7;
            doc.setFontSize(11);
            doc.setTextColor(188, 149, 91);
            doc.text(`Nivel: ${(item.nombre_sector || "").toUpperCase()}`, x_inicio, y);

            y += muchos_correos ? 6 : 8;
            doc.setLineWidth(0.4);
            doc.setDrawColor(210, 200, 190);
            doc.line(x_inicio, y, ancho_pdf - 25, y);

            y += muchos_correos ? 10 : 14;
            doc.setFont("montserrat", "bold");
            doc.setFontSize(muchos_correos ? 16 : 18);
            doc.setTextColor(30, 30, 30);
            const lineas_nombre = doc.splitTextToSize(item.nombre_completo || '-----', ancho_max_texto);
            doc.text(lineas_nombre, x_inicio, y);
            y += (lineas_nombre.length * (muchos_correos ? 6 : 7));

            doc.setFont("montserrat", "bold");
            doc.setFontSize(muchos_correos ? 12.5 : 13.5);
            doc.setTextColor(105, 27, 49);
            const lineas_cargo = doc.splitTextToSize(item.cargo || '-----', ancho_max_texto);
            doc.text(lineas_cargo, x_inicio, y);
            y += (lineas_cargo.length * espacio_linea);

            y += 2;
            doc.setFont("montserrat", "normal");
            doc.setFontSize(10.5);
            doc.setTextColor(90, 90, 90);
            const unidad_texto = `Unidad Administrativa: ${item.nombre_unidad_administrativa || '-----'}`;
            const lineas_unidad = doc.splitTextToSize(unidad_texto, ancho_max_texto);
            doc.text(lineas_unidad, x_inicio, y);
            y += (lineas_unidad.length * espacio_linea);

            const institucion_texto = `Institución / Dependencia: ${(item.nombre_institucion || '').toUpperCase()}`;
            const lineas_institucion = doc.splitTextToSize(institucion_texto, ancho_max_texto);
            doc.text(lineas_institucion, x_inicio, y);
            y += (lineas_institucion.length * espacio_linea) + (muchos_correos ? 2 : 4);

            doc.setFont("montserrat", "bold");
            doc.setFontSize(muchos_correos ? 11 : 12);
            doc.setTextColor(30, 30, 30);
            doc.text("Información de contacto institucional y ubicación:", x_inicio, y);

            y += muchos_correos ? 7 : 9;
            doc.setFont("montserrat", "normal");
            doc.setFontSize(10.5);

            const text_tel_oficina = `• Teléfono de oficina / extensión: ${item.telefono_oficina || '-----'}`;
            doc.text(text_tel_oficina, x_inicio + 5, y);
            y += muchos_correos ? 6 : 8;

            // unimos los correos en una sola cadena separados por coma
            let texto_correos_unidos = '-----';
            if (arreglo_correos.length > 0 && arreglo_correos[0] !== '-----') {
                texto_correos_unidos = arreglo_correos.join(", ");
            }

            // colocamos la etiqueta y los correos de corrido en la misma línea
            const linea_correo_completa = `• Correo Electrónico Institucional: ${texto_correos_unidos}`;
            const lineas_correo = doc.splitTextToSize(linea_correo_completa, ancho_max_texto - 5);
            doc.text(lineas_correo, x_inicio + 5, y);
            y += (lineas_correo.length * espacio_linea);

            let domicilio_completo = item.domicilio || '-----';
            if (item.nombre_municipio) {
                domicilio_completo += `, Municipio de ${item.nombre_municipio}`;
            }
            const text_domicilio = `• Domicilio: ${domicilio_completo}`;
            const lineas_domicilio = doc.splitTextToSize(text_domicilio, ancho_max_texto);

            doc.text(lineas_domicilio, x_inicio + 5, y);
            y += (lineas_domicilio.length * espacio_linea) + 3;

            const fecha_actual = new Date().toLocaleDateString('es-mx', { year: 'numeric', month: 'long', day: 'numeric' });
        
            doc.save(`contacto_${item.nombre_completo}_${fecha_actual}.pdf`);

        } catch (error) {
            console.error("error al generar la ficha:", error);
            alert("error al conectar con el servidor para descargar la ficha.");
        }
    }

    window.eliminar_contacto = async function(id_contacto) {
    let modal = document.getElementById('modal-confirmacion-eliminar');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-confirmacion-eliminar';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background-color:rgba(0,0,0,0.8);display:flex;justify-content:center;align-items:center;z-index:9999;font-family:montserrat,sans-serif;';
        modal.innerHTML = `
            <div style="background-color:#1e1e24;color:#ffffff;border:1px solid #5a1c24;border-radius:28px;padding:36px;width:420px;text-align:center;box-shadow:0 16px 40px rgba(0,0,0,0.6);position:relative;">
                <button id="btn-modal-cerrar-eliminar" style="position:absolute;top:20px;right:20px;background:none;border:none;font-size:1.2rem;cursor:pointer;color:#b0b0b0;">✕</button>
                <div style="margin-bottom:20px;display:flex;justify-content:center;">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#5a1c24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </div>
                <h3 style="margin:0 0 12px 0;font-size:1.3rem;font-weight:700;color:#ffffff;">¿Estás seguro de que deseas eliminar este contacto?</h3>
                <p style="margin:0 0 28px 0;font-size:0.9rem;color:#b0b0b0;line-height:1.4;">Esta acción no se puede deshacer.</p>
                <div style="display:flex;justify-content:center;gap:12px;">
                    <button id="btn-modal-cancelar-eliminar" style="background-color:transparent;color:#ffffff;border:1px solid #5a1c24;padding:10px 24px;border-radius:24px;cursor:pointer;font-weight:600;font-size:0.9rem;">Cancelar</button>
                    <button id="btn-modal-aceptar-eliminar" style="background-color:#5a1c24;color:#ffffff;border:none;padding:10px 24px;border-radius:24px;cursor:pointer;font-weight:600;font-size:0.9rem;">Eliminar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    } else {
        modal.style.display = 'flex';
    }

    const confirmar = await new Promise((resolver) => {
        document.getElementById('btn-modal-aceptar-eliminar').onclick = () => {
            modal.style.display = 'none';
            resolver(true);
        };
        document.getElementById('btn-modal-cancelar-eliminar').onclick = () => {
            modal.style.display = 'none';
            resolver(false);
        };
        document.getElementById('btn-modal-cerrar-eliminar').onclick = () => {
            modal.style.display = 'none';
            resolver(false);
        };
    });

    if (!confirmar) {
        return;
    }

    try {
        const response = await fetch(`../agencia_backend/eliminar_contacto.php?id=${id_contacto}`, {
            method: "DELETE"
        });
        const resultado = await response.json();

        if (resultado.success) {
            alert("contacto eliminado exitosamente.");
            cargar_contactos();
        } else {
            alert("error: " + (resultado.error || "no se pudo eliminar el contacto."));
        }
    } catch (error) {
        console.error("error en la petición:", error);
        alert("error de conexión con el servidor.");
    }
    };
});