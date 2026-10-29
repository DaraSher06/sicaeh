document.addEventListener("DOMContentLoaded", () => {
    let pagina_actual = 1;
    let filtro_estatus_actual = "todos";

    const input_busqueda = document.getElementById("input-busqueda");
    const filtro_tipo_solicitud = document.getElementById("filtro-tipo-solicitud");
    const filtro_enviado_a = document.getElementById("filtro-enviado-a");
    const filtro_fecha_limite = document.getElementById("filtro-fecha-limite");
    const filtro_turnado_a = document.getElementById("filtro-turnado-a");
    const btn_aplicar_filtros = document.getElementById("btn-aplicar-filtros");
    const tabla_body = document.getElementById("tabla-expedientes-body");
    const paginacion_container = document.getElementById("paginacion-container");
    const tarjetas_filtro = document.querySelectorAll(".filtro-card");

    cargar_opciones_filtros();
    cargar_expedientes();

    function atitulo(str) {
        return (str || "")
            .toLowerCase()
            .split(" ")
            .map(w => w.length > 0 ? w[0].toUpperCase() + w.slice(1) : "")
            .join(" ");
    }

    if (input_busqueda) {
        input_busqueda.addEventListener("input", () => {
            pagina_actual = 1;
            cargar_expedientes();
        });
    }

    if (btn_aplicar_filtros) {
        btn_aplicar_filtros.addEventListener("click", () => {
            pagina_actual = 1;
            cargar_expedientes();
        });
    }

    tarjetas_filtro.forEach(tarjeta => {
        tarjeta.addEventListener("click", () => {
            tarjetas_filtro.forEach(t => {
                t.style.borderColor = "#dee2e6";
                t.classList.remove("shadow-sm");
                const radio = t.querySelector("input[type='radio']");
                if (radio) radio.checked = false;
            });

            tarjeta.style.borderColor = "#691B31";
            tarjeta.classList.add("shadow-sm");
            const radio_activo = tarjeta.querySelector("input[type='radio']");
            if (radio_activo) radio_activo.checked = true;

            let valfiltro = (tarjeta.getAttribute("data-filtro") || "todos").toLowerCase().trim();
            if (valfiltro.includes("proceso")) {
                valfiltro = "en proceso";
            } else if (valfiltro.includes("atendido")) {
                valfiltro = "atendido";
            } else if (valfiltro.includes("cerrado")) {
                valfiltro = "cerrado";
            } else if (valfiltro.includes("turnado")) {
                valfiltro = "turnado";
            } else {
                valfiltro = "todos";
            }

            filtro_estatus_actual = valfiltro;
            pagina_actual = 1;
            cargar_expedientes();
        });
    });

    async function cargar_opciones_filtros() {
        try {
            const response = await fetch("/SICAEH/agencia_backend/expedientes.php?accion=filtros_selects");
            const data = await response.json();
            if (data.success) {
                if (filtro_tipo_solicitud) {
                    filtro_tipo_solicitud.innerHTML = `<option value="">Tipo de solicitud</option>`;
                    data.tipos_solicitud.forEach(tipo => {
                        const opt = document.createElement("option");
                        opt.value = tipo;
                        opt.textContent = atitulo(tipo);
                        filtro_tipo_solicitud.appendChild(opt);
                    });
                }

                if (filtro_enviado_a) {
                    filtro_enviado_a.innerHTML = `<option value="">Enviado a...</option>`;
                    data.enviado_a.forEach(env => {
                        const opt = document.createElement("option");
                        opt.value = env;
                        opt.textContent = atitulo(env);
                        filtro_enviado_a.appendChild(opt);
                    });
                }

                if (filtro_turnado_a) {
                    filtro_turnado_a.innerHTML = `<option value="">Turnado a...</option>`;
                    data.turnado_a.forEach(tur => {
                        const opt = document.createElement("option");
                        opt.value = tur;
                        opt.textContent = atitulo(tur);
                        filtro_turnado_a.appendChild(opt);
                    });
                }
            }
        } catch (error) {
            console.error("error al cargar opciones de filtros:", error);
        }
    }

    async function cargar_expedientes() {
        try {
            const busqueda = encodeURIComponent(input_busqueda ? input_busqueda.value.trim() : "");
            const tipo_solicitud = encodeURIComponent(filtro_tipo_solicitud ? filtro_tipo_solicitud.value : "");
            const enviado_a = encodeURIComponent(filtro_enviado_a ? filtro_enviado_a.value : "");
            const fecha_limite = encodeURIComponent(filtro_fecha_limite ? filtro_fecha_limite.value : "");
            const turnado_a = encodeURIComponent(filtro_turnado_a ? filtro_turnado_a.value : "");

            const url = `/SICAEH/agencia_backend/expedientes.php?accion=listar&pagina=${pagina_actual}&busqueda=${busqueda}&estatus=${encodeURIComponent(filtro_estatus_actual)}&tipo_solicitud=${tipo_solicitud}&enviado_a=${enviado_a}&fecha_limite=${fecha_limite}&turnado_a=${turnado_a}`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.success) {
                renderizar_tabla(data.datos);
                renderizar_paginacion(data.total_paginas, data.pagina_actual);
            } else {
                if (tabla_body) {
                    tabla_body.innerHTML = `<tr><td colspan="12" class="text-center text-muted py-4">no se encontraron registros.</td></tr>`;
                }
                if (paginacion_container) {
                    paginacion_container.innerHTML = "";
                }
            }
        } catch (error) {
            console.error("error al cargar expedientes:", error);
            if (tabla_body) {
                tabla_body.innerHTML = `<tr><td colspan="12" class="text-center text-danger py-4">error al conectar con el servidor.</td></tr>`;
            }
        }
    }

    function renderizar_tabla(datos) {
        if (!tabla_body) return;
        tabla_body.innerHTML = "";

        if (!datos || datos.length === 0) {
            tabla_body.innerHTML = `<tr><td colspan="12" class="text-center text-muted py-4">no hay registros disponibles.</td></tr>`;
            return;
        }

        datos.forEach(item => {
            const prioridadraw = (item.prioridad || "").toLowerCase();
            let priobadgestyle = "background-color: #691b31; color: #fff;";
            if (prioridadraw.includes("alta")) priobadgestyle = "background-color: #b72065; color: #fff;";
            else if (prioridadraw.includes("media")) priobadgestyle = "background-color: #691b31; color: #fff;";
            else if (prioridadraw.includes("baja")) priobadgestyle = "background-color: #c77cbf; color: #fff;";

            const estatusraw = (item.estatus_oficio || "").toLowerCase();
            let estatusbadgestyle = "background-color: #226c62; color: #fff;";
            if (estatusraw.includes("atendido")) estatusbadgestyle = "background-color: #34c759; color: #fff;";
            else if (estatusraw.includes("proceso")) estatusbadgestyle = "background-color: #ffcc00; color: #111111;";
            else if (estatusraw.includes("turnado")) estatusbadgestyle = "background-color: #226c62; color: #fff;";
            else if (estatusraw.includes("cerrado")) estatusbadgestyle = "background-color: #ff3b30; color: #fff;";

            const enviado = (item.enviado_a || "").toLowerCase();
            const textEnviado = (enviado === "otros" && item.especificacion ? item.especificacion : (item.enviado_a || ""));

            const tr = document.createElement("tr");
            tr.style.textAlign = "center";
            tr.style.verticalAlign = "middle";
            tr.innerHTML = `
                <td class="py-3 fw-semibold">${(item.numero_consecutivo || "").toUpperCase()}</td>
                <td class="py-3 text-muted">${(item.numero_oficio || "").toUpperCase()}</td>
                <td class="py-3">${item.numero_turno_aeeh || ""}</td>
                <td class="py-3 text-dark" style="white-space: normal; word-break: break-word; min-width: 250px; text-align: center;">${item.asunto || ""}</td>
                <td class="py-3">${atitulo(item.remitente || "")}</td>
                <td class="py-3">${(textEnviado || "").toUpperCase()}</td>
                <td class="py-3"><span class="badge px-2.5 py-1 rounded-pill" style="${priobadgestyle}">${atitulo(item.prioridad || "normal")}</span></td>
                <td class="py-3">${atitulo(item.turnado_a || "")}</td>
                <td class="py-3"><span class="badge px-2.5 py-1 rounded-pill" style="${estatusbadgestyle}">${atitulo(item.estatus_oficio || "sin estatus")}</span></td>
                <td class="py-3">${item.fecha_captura || ""}</td>
                <td class="py-3 fw-semibold text-danger">${item.fecha_limite || ""}</td>
                <td class="py-3">
                    <div class="d-flex justify-content-center gap-2">
                        <button type="button" class="btn btn-outline-secondary btn-sm p-1 d-flex align-items-center justify-content-center bg-white text-dark" style="border-radius: 6px; width: 32px; height: 32px; border-color: #d1c7c7;" title="Ver detalle" onclick="ver_detalle(${item.id_expediente || item.id_registro})">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                    </div>
                </td>
            `;
            tabla_body.appendChild(tr);
        });
    }

    function renderizar_paginacion(total_paginas, pagina_actual_num) {
        if (!paginacion_container) return;
        paginacion_container.innerHTML = "";

        if (total_paginas <= 1) return;

        paginacion_container.style.cssText = "display: inline-flex; align-items: center; gap: 4px; background-color: #5a1c24; padding: 6px 12px; border-radius: 12px;";

        const crear_btn = (text, target_page, disabled = false, is_arrow = false) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.innerHTML = text;
            btn.disabled = disabled;
            btn.className = "btn btn-sm border-0 d-flex align-items-center justify-content-center";
            
            let custom_style = `
                background-color: transparent; 
                color: ${disabled ? "rgba(255,255,255,0.3)" : "#fff"}; 
                border-radius: 8px; 
                min-width: 30px; 
                height: 30px; 
                font-size: ${is_arrow ? "18px" : "13px"}; 
                padding: 0;
                cursor: ${disabled ? "default" : "pointer"};
            `;
            if (target_page === pagina_actual_num && !is_arrow) {
                custom_style += " background-color: rgba(255,255,255,0.2); font-weight: bold;";
            }
            btn.style.cssText = custom_style;

            if (!disabled && target_page !== pagina_actual_num) {
                btn.addEventListener("click", () => {
                    pagina_actual = target_page;
                    cargar_expedientes();
                });
            }
            return btn;
        };

        paginacion_container.appendChild(crear_btn("‹", pagina_actual_num - 1, pagina_actual_num <= 1, true));

        const paginas_a_mostrar = [];
        if (total_paginas <= 6) {
            for (let i = 1; i <= total_paginas; i++) paginas_a_mostrar.push(i);
        } else {
            if (pagina_actual_num <= 3) {
                paginas_a_mostrar.push(1, 2, 3, 4, "...", total_paginas);
            } else if (pagina_actual_num >= total_paginas - 2) {
                paginas_a_mostrar.push(1, "...", total_paginas - 3, total_paginas - 2, total_paginas - 1, total_paginas);
            } else {
                paginas_a_mostrar.push(1, "...", pagina_actual_num - 1, pagina_actual_num, pagina_actual_num + 1, "...", total_paginas);
            }
        }

        paginas_a_mostrar.forEach(p => {
            if (p === "...") {
                const span = document.createElement("span");
                span.textContent = "...";
                span.style.cssText = "color: #fff; padding: 0 4px; font-size: 13px;";
                paginacion_container.appendChild(span);
            } else {
                paginacion_container.appendChild(crear_btn(p, p, false, false));
            }
        });

        paginacion_container.appendChild(crear_btn("›", pagina_actual_num + 1, pagina_actual_num >= total_paginas, true));
    }

    window.ver_detalle = function(id) {
        if (!id || id === 'undefined') {
            alert("error: ID de expediente no válido.");
            return;
        }
        window.location.href = `detalle_expedientes.html?id=${id}`;
    };

    window.editar_expediente = function(id) {
        window.location.href = `editar_-expediente.html?id=${id}`;
    };
});