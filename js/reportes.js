let vista_actual = "v_grafica_solicitudes_ingresadas";
let fecha_inicio_personalizada = "";
let fecha_fin_personalizada = "";
let ambito_actual = "general";
let zona_cfe_actual = "todas";
let chart_zonas_cfe_instance = null;

document.addEventListener("DOMContentLoaded", () => {
    configurar_ambito_por_rol();
    inicializar_pestanas_reportes();
    inicializar_filtro_calendario();
    inicializar_dropdown_ambito();
    inicializar_eventos_zona_cfe();
    inicializar_toggle_vista_cfe();
    cargar_datos_reporte(vista_actual);
    inicializar_boton_limpiar_filtro();
    inicializar_boton_descarga();
    inicializar_eventos_filtros_sp();
});

function normalizar_cargo_reporte(cargo) {
    cargo = (cargo || "consulta").toLowerCase().trim();
    if (cargo === "admin") return "administrador";
    if (cargo === "captura") return "capturista";
    return cargo;
}

function configurar_ambito_por_rol() {
    const rol = normalizar_cargo_reporte(localStorage.getItem("rol_usuario"));
    const es_consulta = rol === "consulta" || !["administrador", "supervisor", "capturista"].includes(rol);
    const contenedor = document.getElementById("contenedor-ambito-reporte");

    if (es_consulta) {
        ambito_actual = "individual";
        if (contenedor) {
            contenedor.classList.add("oculto-por-rol");
        }
        actualizar_etiqueta_ambito();
        return;
    }

    if (contenedor) {
        contenedor.classList.remove("oculto-por-rol");
    }
    actualizar_etiqueta_ambito();
}

function actualizar_etiqueta_ambito() {
    const etiqueta = document.getElementById("etiqueta-ambito");
    if (!etiqueta) return;
    etiqueta.textContent = ambito_actual === "individual" ? "Mi reporte individual" : "Reporte general";
}

function inicializar_dropdown_ambito() {
    const opciones = document.querySelectorAll(".opcion-ambito");
    if (!opciones.length) return;

    opciones.forEach(opcion => {
        opcion.addEventListener("click", (e) => {
            e.preventDefault();

            const rol = normalizar_cargo_reporte(localStorage.getItem("rol_usuario"));
            if (rol === "consulta") {
                ambito_actual = "individual";
                actualizar_etiqueta_ambito();
                return;
            }

            opciones.forEach(o => o.classList.remove("active", "fw-bold"));
            opcion.classList.add("active", "fw-bold");

            ambito_actual = opcion.getAttribute("data-value") || "general";
            actualizar_etiqueta_ambito();
            cargar_datos_reporte(vista_actual);
        });
    });
}

function formatear_fecha_texto(fecha_str) {
    if (!fecha_str) return "";
    const partes = fecha_str.split("-");
    if (partes.length !== 3) return fecha_str;
    
    const meses = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
    ];
    
    const anio = partes[0];
    const mes = meses[parseInt(partes[1], 10) - 1];
    const dia = parseInt(partes[2], 10);
    
    return `${dia} de ${mes} de ${anio}`;
}

function inicializar_eventos_filtros_sp() {
    const btn_buscar = document.getElementById("btn-buscar-sp-filtros");
    const btn_limpiar = document.getElementById("btn-limpiar-sp-filtros");

    if (btn_buscar) {
        btn_buscar.addEventListener("click", () => {
            cargar_datos_reporte("sp_reporte_avanzado_filtros");
        });
    }

    if (btn_limpiar) {
        btn_limpiar.addEventListener("click", () => {
            const form = document.getElementById("form-filtros-otros");
            if (form) form.reset();
            cargar_datos_reporte("sp_reporte_avanzado_filtros");
        });
    }
}

function inicializar_toggle_vista_cfe() {
    const btn_tarjetas = document.getElementById("btn-vista-tarjetas");
    const btn_grafica = document.getElementById("btn-vista-grafica");
    const contenedor_tarjetas = document.getElementById("tabla-oficios-cfe-body");
    const contenedor_grafica = document.getElementById("contenedor-grafica-cfe");

    if (!btn_tarjetas || !btn_grafica || !contenedor_tarjetas || !contenedor_grafica) return;

    btn_tarjetas.addEventListener("click", () => {
        btn_tarjetas.classList.add("active", "btn-dark");
        btn_tarjetas.classList.remove("btn-outline-dark");
        btn_grafica.classList.remove("active", "btn-dark");
        btn_grafica.classList.add("btn-outline-dark");

        contenedor_tarjetas.style.display = "flex";
        contenedor_grafica.style.display = "none";
    });

    btn_grafica.addEventListener("click", () => {
        btn_grafica.classList.add("active", "btn-dark");
        btn_grafica.classList.remove("btn-outline-dark");
        btn_tarjetas.classList.remove("active", "btn-dark");
        btn_tarjetas.classList.add("btn-outline-dark");

        contenedor_tarjetas.style.display = "none";
        contenedor_grafica.style.display = "flex";

        if (chart_zonas_cfe_instance) {
            chart_zonas_cfe_instance.resize();
        }
    });
}

function inicializar_pestanas_reportes() {
    const botones_tabs = document.querySelectorAll(".reportes-tab-btn");
    const paneles = document.querySelectorAll(".reporte-panel");

    botones_tabs.forEach(boton => {
        boton.addEventListener("click", () => {
            botones_tabs.forEach(b => {
                b.classList.remove("active", "fw-bold");
                b.classList.add("text-muted", "fw-semibold");
                const span_linea = b.querySelector("span");
                if (span_linea) span_linea.remove();
            });

            paneles.forEach(panel => {
                panel.style.display = "none";
                panel.classList.remove("active");
            });

            boton.classList.add("active", "fw-bold");
            boton.classList.remove("text-muted", "fw-semibold");
            
            if (!boton.querySelector("span")) {
                const linea = document.createElement("span");
                linea.className = "position-absolute bottom-0 start-0 w-100 bg-danger";
                linea.style.cssText = "height: 3px; background-color: #691b31 !important; border-radius: 2px 2px 0 0;";
                boton.appendChild(linea);
            }

            const target_id = boton.getAttribute("data-target");
            
            let panel_activo = document.getElementById(target_id);
            if (!panel_activo && target_id === "seccion-otros") {
                panel_activo = document.getElementById("seccion-reporte-avanzado");
            }

            if (panel_activo) {
                panel_activo.style.display = "block";
                panel_activo.classList.add("active");
                
                if (target_id === "seccion-solicitudes-ingresadas") {
                    vista_actual = "v_grafica_solicitudes_ingresadas";
                } else if (target_id === "seccion-solicitudes-clasificacion") {
                    vista_actual = "v_grafica_clasificacion";
                } else if (target_id === "seccion-atencion-pueblo") {
                    vista_actual = "v_grafica_origen_solicitud";
                } else if (target_id === "seccion-cobertura-municipal") {
                    vista_actual = "v_cobertura_municipal";
                } else if (target_id === "seccion-comportamiento-mensual") {
                    vista_actual = "v_comportamiento_mensual";
                } else if (target_id === "seccion-solicitantes-directos") {
                    vista_actual = "v_benificiarios_directos_mensuales";
                } else if (target_id === "seccion-beneficiarios-indirectos") {
                    vista_actual = "v_beneficiarios_indirectos_mensual";
                } else if (target_id === "seccion-oficios-cfe") {
                    vista_actual = "v_oficios_cfe";
                } else if (target_id === "seccion-otros" || target_id === "seccion-reporte-avanzado") {
                    vista_actual = "sp_reporte_avanzado_filtros";
                }
                
                cargar_datos_reporte(vista_actual);
            }
        });
    });
}

function inicializar_filtro_calendario() {
    const btn_filtrar = document.getElementById("btn-filtrar-fechas");
    if (!btn_filtrar) return;

    btn_filtrar.addEventListener("click", () => {
        const input_inicio = document.getElementById("fecha-inicio").value;
        const input_fin = document.getElementById("fecha-fin").value;

        if (!input_inicio || !input_fin) {
            alert("por favor seleccione la fecha de inicio y la fecha de fin.");
            return;
        }

        fecha_inicio_personalizada = input_inicio;
        fecha_fin_personalizada = input_fin;

        cargar_datos_reporte(vista_actual);
    });
}

function inicializar_boton_limpiar_filtro() {
    const btn_limpiar = document.getElementById("btn-limpiar-filtro");
    if (!btn_limpiar) return;

    btn_limpiar.addEventListener("click", () => {
        const input_inicio = document.getElementById("fecha-inicio");
        const input_fin = document.getElementById("fecha-fin");
        
        if (input_inicio) input_inicio.value = "";
        if (input_fin) input_fin.value = "";

        fecha_inicio_personalizada = "";
        fecha_fin_personalizada = "";

        cargar_datos_reporte(vista_actual);
    });
}

function cargar_datos_reporte(nombre_vista) {
    if (nombre_vista === "sp_reporte_avanzado_filtros") {
        let form_data = new FormData();
        form_data.append("vista", nombre_vista);
        form_data.append("ambito", ambito_actual);

        form_data.append("anio", document.getElementById("filtro-sp-anio")?.value || "");
        form_data.append("mes", document.getElementById("filtro-sp-mes")?.value || "");
        form_data.append("prioridad", document.getElementById("filtro-sp-prioridad")?.value || "");
        form_data.append("sexo", document.getElementById("filtro-sp-sexo")?.value || "");
        form_data.append("num_turno", document.getElementById("filtro-sp-num-turno")?.value || "");
        form_data.append("num_expediente_fisico", document.getElementById("filtro-sp-expediente")?.value || "");
        form_data.append("oficio_enviado", document.getElementById("filtro-sp-oficio-enviado")?.value || "");
        form_data.append("gestion_atencion_pueblo", document.getElementById("filtro-sp-atencion-pueblo")?.value || "");

        let url_sp = "/SICAEH/agencia_backend/obtener_reporte.php?vista=" + nombre_vista + "&ambito=" + ambito_actual;
        if (fecha_inicio_personalizada && fecha_fin_personalizada) {
            url_sp += `&fecha_inicio=${fecha_inicio_personalizada}&fecha_fin=${fecha_fin_personalizada}`;
        }

        fetch(url_sp, {
            method: "POST",
            body: form_data
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`error http ${response.status}: no se encontró la ruta del archivo php`);
            }
            return response.text();
        })
        .then(texto => {
            const inicio = texto.indexOf('{');
            const fin = texto.lastIndexOf('}');
            if (inicio !== -1 && fin !== -1) {
                return JSON.parse(texto.substring(inicio, fin + 1));
            }
            throw new Error("respuesta del servidor no válida: " + texto);
        })
        .then(data => {
            if (data.success) {
                if (data.tabla_municipios) {
                    renderizar_seccion_otros_municipios(data);
                }
                if (data.desglose_sexo) {
                    renderizar_seccion_sexo(data.desglose_sexo);
                } else if (Array.isArray(data.data)) {
                    renderizar_seccion_reporte_avanzado(data.data);
                }
            } else {
                console.error("error al consultar datos:", data.error);
            }
        })
        .catch(error => console.error("error en la petición fetch:", error));
        return;
    }

    let url = `/SICAEH/agencia_backend/obtener_reporte.php?vista=${nombre_vista}&ambito=${ambito_actual}`;
    
    if (nombre_vista === "v_oficios_cfe") {
        url += `&zona=${zona_cfe_actual}`;
    }

    if (fecha_inicio_personalizada && fecha_fin_personalizada) {
        url += `&fecha_inicio=${fecha_inicio_personalizada}&fecha_fin=${fecha_fin_personalizada}`;
    }

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`error http ${response.status}: no se encontró el archivo php en la ruta especificada`);
            }
            return response.text();
        })
        .then(texto => {
            const inicio = texto.indexOf('{');
            const fin = texto.lastIndexOf('}');
            if (inicio !== -1 && fin !== -1) {
                return JSON.parse(texto.substring(inicio, fin + 1));
            }
            throw new Error("respuesta no es un json válido");
        })
        .then(data => {
            if (nombre_vista === "v_grafica_solicitudes_ingresadas" && data.success) {
                renderizar_seccion_ingresadas(data);
            } else if (nombre_vista === "v_grafica_clasificacion" && data.success) {
                renderizar_seccion_clasificacion(data.data);
            } else if (nombre_vista === "v_grafica_origen_solicitud" && data.success) {
                renderizar_seccion_origen(data.data);
            } else if (nombre_vista === "v_cobertura_municipal" && data.success) {
                renderizar_seccion_cobertura(data.data[0]);
            } else if (nombre_vista === "v_comportamiento_mensual" && data.success) {
                renderizar_seccion_comportamiento(data.data);
            } else if ((nombre_vista === "v_benificiarios_directos_mensuales" || nombre_vista === "v_beneficiarios_directos_mensual") && data.success) {
                renderizar_seccion_solicitantes_directos(data.data);
            } else if (nombre_vista === "v_beneficiarios_indirectos_mensual" && data.success) {
                renderizar_seccion_beneficiarios_indirectos(data.data);
            } else if (nombre_vista === "v_grafica_sexo" && data.success) {
                renderizar_seccion_sexo(data.data);
            } else if (nombre_vista === "v_oficios_cfe" && data.success) {
                renderizar_seccion_oficios_cfe(data.data);
            }
        })
        .catch(error => {
            console.error("error al consultar datos:", error);
        });
}

function obtener_estilo_zona_cfe(nombre_zona) {
    const zona = (nombre_zona || "").toLowerCase().trim();

    if (zona.includes("tulancingo")) {
        return { bg: "#2196f3", color: "#ffffff", border: "#2196f3", bg_light: "#e3f2fd" }; 
    }
    if (zona.includes("pachuca")) {
        return { bg: "#ec407a", color: "#ffffff", border: "#ec407a", bg_light: "#fce4ec" }; 
    }
    if (zona.includes("tula")) {
        return { bg: "#ff6000", color: "#ffffff", border: "#ff6000", bg_light: "#fff3e0" }; 
    }
    if (zona.includes("ixmiquilpan")) {
        return { bg: "#ffbf00", color: "#212529", border: "#ffbf00", bg_light: "#fff8e1" }; 
    }
    if (zona.includes("huejutla")) {
        return { bg: "#448639", color: "#ffffff", border: "#448639", bg_light: "#e8f5e9" }; 
    }

    return { bg: "#691b31", color: "#ffffff", border: "#691b31", bg_light: "#f8edf0" }; 
}

function actualizar_estilo_boton_zona(boton) {
    const zona = boton.getAttribute("data-zona") || "";
    const estilo = obtener_estilo_zona_cfe(zona);
    const es_activo = boton.classList.contains("active");

    let texto_limpio = boton.textContent.replace("●", "").trim();

    boton.classList.remove("btn-outline-secondary", "btn-dark", "btn-secondary");

    if (es_activo) {
        boton.style.setProperty("background-color", estilo.bg, "important");
        boton.style.setProperty("color", estilo.color, "important");
        boton.style.setProperty("border", `1.5px solid ${estilo.border}`, "important");
        boton.style.setProperty("font-weight", "bold", "important");
    } else {
        boton.style.setProperty("background-color", estilo.bg_light, "important");
        boton.style.setProperty("color", estilo.bg === "#ffbf00" ? "#856404" : estilo.bg, "important");
        boton.style.setProperty("border", `1.5px solid ${estilo.border}`, "important");
        boton.style.setProperty("font-weight", "600", "important");
    }

    boton.textContent = texto_limpio;
}

function renderizar_seccion_oficios_cfe(lista_oficios) {
    const contenedor_tarjetas = document.getElementById("tabla-oficios-cfe-body");
    const stat_total = document.getElementById("stat-cfe-total");
    const stat_respondidos = document.getElementById("stat-cfe-respondidos");
    const stat_sin_respuesta = document.getElementById("stat-cfe-sin-respuesta");

    if (!contenedor_tarjetas) return;

    contenedor_tarjetas.innerHTML = "";

    const conteo_zonas = { pachuca: 0, tula: 0, tulancingo: 0, ixmiquilpan: 0, huejutla: 0 };

    if (!lista_oficios || lista_oficios.length === 0) {
        contenedor_tarjetas.innerHTML = `
            <div class="col-12 text-center text-muted py-5">
                No se encontraron oficios de cfe registrados para esta zona
            </div>`;
        if (stat_total) stat_total.textContent = "0";
        if (stat_respondidos) stat_respondidos.textContent = "0";
        if (stat_sin_respuesta) stat_sin_respuesta.textContent = "0";

        renderizar_grafica_zonas_cfe(conteo_zonas);
        return;
    }

    let total = lista_oficios.length;
    let respondidos = 0;
    let sin_respuesta = 0;

    lista_oficios.forEach(item => {
        const respuesta_lower = (item.oficio_respuesta || "").toLowerCase().trim();
        const tiene_respuesta = respuesta_lower !== "sin respuesta" && respuesta_lower !== "" && respuesta_lower !== "null";

        if (tiene_respuesta) {
            respondidos++;
        } else {
            sin_respuesta++;
        }

        let zona_limpia = (item.zona_cfe || "-").toUpperCase();
        if (zona_limpia.includes("CFE_ZONAS")) {
            zona_limpia = zona_limpia.replace("CFE_ZONAS - ", "").replace("CFE_ZONAS", "").trim();
        }

        const zona_key = zona_limpia.toLowerCase().replace("zona ", "").trim();
        if (conteo_zonas.hasOwnProperty(zona_key)) {
            conteo_zonas[zona_key]++;
        }

        const estilo_zona = obtener_estilo_zona_cfe(zona_limpia);

        const estilo_con_respuesta = "background-color: #d4edda; color: #155724; border: 1px solid #155724;";
        const estilo_sin_respuesta = "background-color: #f8d7da; color: #b30000; border: 1px solid #b30000;";

        const badge_estatus = tiene_respuesta
            ? `<span class="badge rounded-pill fw-bold px-3 py-1" style="${estilo_con_respuesta}">${item.oficio_respuesta.toUpperCase()}</span>`
            : `<span class="badge rounded-pill fw-semibold px-3 py-1" style="${estilo_sin_respuesta}">SIN RESPUESTA</span>`;

        const columna = document.createElement("div");
        columna.className = "col-md-6 col-lg-4";
        columna.innerHTML = `
            <div class="card h-100 border-0 shadow-sm rounded-4 p-3 position-relative" style="background-color: #fdfdfd; border: 1px solid #f0f0f0 !important;">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <div class="d-flex gap-1 flex-wrap">
                        <span class="badge bg-light text-dark border border-secondary-subtle fw-bold px-2 py-1">${(item.num_consecutivo || '-').toUpperCase()}</span>
                        <span class="badge text-uppercase fw-bold px-2 py-1" style="background-color: ${estilo_zona.bg}; color: ${estilo_zona.color};">${zona_limpia}</span>
                    </div>
                    ${badge_estatus}
                </div>
                
                <h6 class="fw-bold my-2" style="color: #691b31;">${(item.oficio_enviado || '-').toUpperCase()}</h6>
                
                <div class="my-2 p-2 rounded-3" style="background-color: #e2d1b3;">
                    <small class="text-muted d-block fw-semibold mb-1">Tipo de Solicitud:</small>
                    <span class="small text-dark text-capitalize">${(item.tipo_solicitud || '-').toLowerCase()}</span>
                </div>

                <div class="d-flex justify-content-between align-items-center mt-auto pt-2 border-top">
                    <small class="text-muted">Municipio:</small>
                    <small class="fw-bold text-dark text-capitalize">${(item.municipio || '-').toLowerCase()}</small>
                </div>
            </div>
        `;
        contenedor_tarjetas.appendChild(columna);
    });

    if (stat_total) stat_total.textContent = total;
    if (stat_respondidos) stat_respondidos.textContent = respondidos;
    if (stat_sin_respuesta) stat_sin_respuesta.textContent = sin_respuesta;

    renderizar_grafica_zonas_cfe(conteo_zonas);
}

function renderizar_grafica_zonas_cfe(conteo_zonas) {
    const ctx = document.getElementById("chart-oficios-zona-cfe");
    const contenedor_leyenda = document.getElementById("leyenda-zonas-cfe");
    if (!ctx) return;

    if (chart_zonas_cfe_instance) {
        chart_zonas_cfe_instance.destroy();
    }

    const zonas_ordenadas = ["pachuca", "tula", "tulancingo", "ixmiquilpan", "huejutla"];
    const etiquetas = [];
    const datos = [];
    const colores = [];

    zonas_ordenadas.forEach(zona_key => {
        const total = conteo_zonas[zona_key] || 0;
        const estilo = obtener_estilo_zona_cfe(zona_key);

        etiquetas.push("ZONA " + zona_key.toUpperCase());
        datos.push(total);

        // si la zona actual es 'todas' o coincide con la rebanada, conservamos su color original;
        // de lo contrario, le aplicamos un gris claro de atenuación
        if (zona_cfe_actual === "todas" || zona_cfe_actual === zona_key) {
            colores.push(estilo.bg);
        } else {
            colores.push("#e0e0e0"); // tono gris para opacar las inactivas
        }
    });

    chart_zonas_cfe_instance = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: etiquetas,
            datasets: [{
                data: datos,
                backgroundColor: colores,
                borderWidth: 2,
                borderColor: "#ffffff"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "65%",
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => ` ${context.label}: ${context.raw} oficio(s)`
                    }
                }
            }
        }
    });

    if (contenedor_leyenda) {
        contenedor_leyenda.innerHTML = "";
        etiquetas.forEach((label, idx) => {
            const zona_key = zonas_ordenadas[idx];
            const total = datos[idx];
            const color_original = obtener_estilo_zona_cfe(zona_key).bg;
            const es_seleccionada = zona_cfe_actual === "todas" || zona_cfe_actual === zona_key;

            const item = document.createElement("div");
            item.className = "d-flex align-items-center justify-content-between p-2 rounded-3";
            item.style.backgroundColor = es_seleccionada ? "#f8f9fa" : "#fafafa";
            item.style.opacity = es_seleccionada ? "1" : "0.45"; // atenuar la leyenda de zonas no seleccionadas

            item.innerHTML = `
                <div class="d-flex align-items-center gap-2">
                    <span style="width: 12px; height: 12px; background-color: ${es_seleccionada ? color_original : '#b0b0b0'}; border-radius: 50%; display: inline-block;"></span>
                    <span class="small fw-bold ${es_seleccionada ? 'text-dark' : 'text-muted'}">${label}</span>
                </div>
                <span class="badge ${es_seleccionada ? 'bg-light text-dark border' : 'bg-secondary-subtle text-muted'} fw-bold">${total}</span>
            `;
            contenedor_leyenda.appendChild(item);
        });
    }
}

function inicializar_eventos_zona_cfe() {
    const contenedor = document.getElementById("contenedor-zonas-cfe");
    if (!contenedor) return;

    const botones = contenedor.querySelectorAll(".zona-cfe-btn");
    botones.forEach(b => actualizar_estilo_boton_zona(b));

    contenedor.addEventListener("click", (e) => {
        const boton = e.target.closest(".zona-cfe-btn");
        if (!boton) return;

        e.preventDefault();

        botones.forEach(b => {
            b.classList.remove("active");
            actualizar_estilo_boton_zona(b);
        });

        boton.classList.add("active");
        actualizar_estilo_boton_zona(boton);

        zona_cfe_actual = boton.getAttribute("data-zona") || "todas";
        cargar_datos_reporte("v_oficios_cfe");
    });
}

function renderizar_seccion_ingresadas(datos) {
    const tarjeta_recibidas = document.querySelector(".card-recibidas .report-stat-number");
    const tarjeta_atendidas = document.querySelector(".card-atendidas .report-stat-number");
    const tarjeta_proceso = document.querySelector(".card-proceso .report-stat-number");
    const tarjeta_municipios = document.querySelector(".card-municipios .report-stat-number");

    if (tarjeta_recibidas) tarjeta_recibidas.textContent = datos.recibidas;
    if (tarjeta_atendidas) tarjeta_atendidas.textContent = datos.atendidas;
    if (tarjeta_proceso) tarjeta_proceso.textContent = datos.en_proceso;
    if (tarjeta_municipios) tarjeta_municipios.textContent = datos.municipios_atendidos;

    const ctx = document.getElementById("chart-solicitudes-ingresadas");
    if (!ctx) return;

    if (window.mi_chart_ingresadas) {
        window.mi_chart_ingresadas.destroy();
    }

    window.mi_chart_ingresadas = new Chart(ctx, {
        type: "pie",
        data: {
            labels: ["Solicitudes Atendidas", "Solicitudes en Proceso"],
            datasets: [{
                data: [datos.atendidas, datos.en_proceso],
                backgroundColor: ["#bc955b", "#98989a"],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "bottom"
                }
            }
        }
    });
}

function renderizar_seccion_clasificacion(lista_datos) {
    const ctx = document.getElementById("chart-solicitudes-clasificacion");
    if (!ctx) return;

    const etiquetas = lista_datos.map(item => (item.clasificacion || "").toUpperCase());
    const valores = lista_datos.map(item => parseInt(item.total_solicitudes));

    if (window.mi_chart_clasificacion) {
        window.mi_chart_clasificacion.destroy();
    }

    window.mi_chart_clasificacion = new Chart(ctx, {
        type: "bar",
        data: {
            labels: etiquetas,
            datasets: [{
                label: "Total de solicitudes",
                data: valores,
                backgroundColor: "#691b31",
                borderWidth: 0,
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function renderizar_seccion_origen(lista_datos) {
    const ctx = document.getElementById("chart-origen-solicitud");
    if (!ctx) return;

    const etiquetas = lista_datos.map(item => (item.origen_solicitud || "").toUpperCase());
    const valores = lista_datos.map(item => parseInt(item.total_solicitudes || 0));

    if (window.mi_chart_origen) {
        window.mi_chart_origen.destroy();
    }

    window.mi_chart_origen = new Chart(ctx, {
        type: "bar",
        data: {
            labels: etiquetas,
            datasets: [{
                label: "Total de Solicitudes",
                data: valores,
                backgroundColor:["#bc955b","#691b31"],
                borderWidth: 0,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function renderizar_seccion_cobertura(datos) {
    const ctx = document.getElementById("chart-cobertura-municipal");
    if (!ctx) return;

    if (window.mi_chart_cobertura) {
        window.mi_chart_cobertura.destroy();
    }

    window.mi_chart_cobertura = new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["Con Solicitud", "Sin Solicitud"],
            datasets: [{
                label: "Municipios",
                data: [datos.municipios_con_solicitud, datos.municipios_sin_solicitud],
                backgroundColor: ["#691b31", "#98989a"],
                borderWidth: 0,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function renderizar_seccion_comportamiento(lista_datos) {
    const ctx = document.getElementById("chart-comportamiento-mensual");
    if (!ctx) return;

    const nombres_meses = {
        "01": "ENERO", "02": "FEBRERO", "03": "MARZO", "04": "ABRIL",
        "05": "MAYO", "06": "JUNIO", "07": "JULIO", "08": "AGOSTO",
        "09": "SEPTIEMBRE", "10": "OCTUBRE", "11": "NOVIEMBRE", "12": "DICIEMBRE"
    };

    const etiquetas = lista_datos.map(item => {
        let mes_str = item.mes;
        if (mes_str && mes_str.includes("-")) {
            let partes = mes_str.split("-");
            let numero_mes = partes[1];
            return nombres_meses[numero_mes] || mes_str;
        }
        return (mes_str || "").toUpperCase();
    });

    const valores = lista_datos.map(item => parseInt(item.total_solicitudes || 0));

    if (window.mi_chart_comportamiento) {
        window.mi_chart_comportamiento.destroy();
    }

    window.mi_chart_comportamiento = new Chart(ctx, {
        type: "line",
        data: {
            labels: etiquetas,
            datasets: [{
                label: "Total de Solicitudes",
                data: valores,
                borderColor: "#bc955b",
                backgroundColor: "rgba(188, 149, 91, 0.2)",
                borderWidth: 3,
                pointBackgroundColor: "#691b31",
                pointBorderColor: "#ffffff",
                pointBorderWidth: 2,
                pointRadius: 5,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    },
                    grid: {
                        color: "rgba(0, 0, 0, 0.05)"
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function renderizar_seccion_solicitantes_directos(lista_datos) {
    const ctx = document.getElementById("chart-solicitantes-directos");
    if (!ctx) return;

    const nombres_meses = {
        "01": "ENERO", "02": "FEBRERO", "03": "MARZO", "04": "ABRIL",
        "05": "MAYO", "06": "JUNIO", "07": "JULIO", "08": "AGOSTO",
        "09": "SEPTIEMBRE", "10": "OCTUBRE", "11": "NOVIEMBRE", "12": "DICIEMBRE"
    };

    const etiquetas = lista_datos.map(item => {
        let mes_str = String(item.mes || "").trim();
        if (mes_str.includes("-")) {
            let partes = mes_str.split("-");
            mes_str = partes[1];
        }
        if (mes_str.length === 1) {
            mes_str = "0" + mes_str;
        }
        return nombres_meses[mes_str] || mes_str.toUpperCase();
    });

    const valores = lista_datos.map(item => parseInt(item.total_beneficiarios_directos || 0));

    if (window.mi_chart_solicitantes_directos) {
        window.mi_chart_solicitantes_directos.destroy();
    }

    window.mi_chart_solicitantes_directos = new Chart(ctx, {
        type: "bar",
        data: {
            labels: etiquetas,
            datasets: [{
                label: "Total de Beneficiarios Directos",
                data: valores,
                backgroundColor: "#98989a",
                borderWidth: 0,
                borderRadius: 6,
                barThickness: 'flex',
                maxBarThickness: 45
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    },
                    grid: {
                        color: "rgba(0, 0, 0, 0.05)"
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function renderizar_seccion_beneficiarios_indirectos(lista_datos) {
    const ctx = document.getElementById("chart-beneficiarios-indirectos");
    if (!ctx) return;

    const nombres_meses = {
        "01": "ENERO", "02": "FEBRERO", "03": "MARZO", "04": "ABRIL",
        "05": "MAYO", "06": "JUNIO", "07": "JULIO", "08": "AGOSTO",
        "09": "SEPTIEMBRE", "10": "OCTUBRE", "11": "NOVIEMBRE", "12": "DICIEMBRE"
    };

    const etiquetas = lista_datos.map(item => {
        let mes_str = String(item.mes || "").trim();
        if (mes_str.includes("-")) {
            let partes = mes_str.split("-");
            mes_str = partes[1];
        }
        if (mes_str.length === 1) {
            mes_str = "0" + mes_str;
        }
        return nombres_meses[mes_str] || mes_str.toUpperCase();
    });

    const valores = lista_datos.map(item => parseInt(item.total_beneficiarios_indirectos || 0));

    if (window.mi_chart_beneficiarios_indirectos) {
        window.mi_chart_beneficiarios_indirectos.destroy();
    }

    window.mi_chart_beneficiarios_indirectos = new Chart(ctx, {
        type: "bar",
        data: {
            labels: etiquetas,
            datasets: [{
                label: "total de beneficiarios indirectos",
                data: valores,
                backgroundColor: "#691b31",
                borderWidth: 0,
                borderRadius: 6,
                barThickness: 'flex',
                maxBarThickness: 45
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    },
                    grid: {
                        color: "rgba(0, 0, 0, 0.05)"
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function renderizar_seccion_reporte_avanzado(lista_registros) {
    const contenedor_tabla = document.getElementById("tabla-otros-body");
    if (!contenedor_tabla) return;

    contenedor_tabla.innerHTML = "";

    if (!lista_registros || lista_registros.length === 0) {
        contenedor_tabla.innerHTML = `<tr><td colspan="10" class="text-center text-muted py-4">no se encontraron registros acumulados</td></tr>`;
        return;
    }

    lista_registros.forEach(item => {
        const fila = document.createElement("tr");
        fila.innerHTML = `
            <td>${item.num_consecutivo || '-'}</td>
            <td>${item.num_turno || '-'}</td>
            <td>${item.fecha_captura || '-'}</td>
            <td>${item.remitente || '-'}</td>
            <td>${item.tipo_solicitud || '-'}</td>
            <td>${item.municipio || '-'}</td>
            <td><span class="badge bg-secondary">${item.prioridad || '-'}</span></td>
            <td><span class="badge bg-info text-dark">${item.estatus || '-'}</span></td>
            <td>${item.turnado_a || '-'}</td>
            <td>${item.beneficiarios_directos || 0} / ${item.beneficiarios_indirectos || 0}</td>
        `;
        contenedor_tabla.appendChild(fila);
    });
}

function renderizar_seccion_otros_municipios(data) {
    const contenedor_top = document.getElementById("tabla-desglose-top-body");
    const contenedor_muni = document.getElementById("tabla-municipios-body");
    const badge_top = document.getElementById("badge-municipio-top");

    if (badge_top) {
        if (data.municipio_top && data.municipio_top.nombre_municipio) {
            badge_top.textContent = `${data.municipio_top.nombre_municipio} (${data.municipio_top.total})`;
        } else {
            badge_top.textContent = "sin registros";
        }
    }

    if (contenedor_top) {
        contenedor_top.innerHTML = "";
        if (data.desglose_top && data.desglose_top.length > 0) {
            data.desglose_top.forEach((item, index) => {
                const fila = document.createElement("tr");
                fila.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${item.clasificacion}</td>
                    <td class="text-center fw-bold">${item.total_solicitudes}</td>
                `;
                contenedor_top.appendChild(fila);
            });
        } else {
            contenedor_top.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-3">sin solicitudes registradas</td></tr>`;
        }
    }

    if (contenedor_muni && data.tabla_municipios) {
        contenedor_muni.innerHTML = "";
        let suma_total = 0;

        data.tabla_municipios.forEach((muni, index) => {
            const val = parseInt(muni.total_solicitudes || 0);
            suma_total += val;

            const fila = document.createElement("tr");
            fila.innerHTML = `
                <td>${index + 1}</td>
                <td>${muni.nombre_municipio}</td>
                <td class="text-center fw-semibold ${val > 0 ? 'text-dark' : 'text-muted'}">${val}</td>
            `;
            contenedor_muni.appendChild(fila);
        });

        const fila_total = document.createElement("tr");
        fila_total.className = "table-secondary fw-bold";
        fila_total.innerHTML = `
            <td colspan="2" class="text-end">TOTAL ACUMULADO:</td>
            <td class="text-center" style="color: #691b31;">${suma_total}</td>
        `;
        contenedor_muni.appendChild(fila_total);
    }
}

function renderizar_seccion_sexo(lista_datos) {
    const ctx = document.getElementById("chart-desglose-sexo");
    if (!ctx) return;

    let femenino = 0;
    let masculino = 0;

    if (Array.isArray(lista_datos)) {
        lista_datos.forEach(item => {
            const s = (item.sexo || "").toLowerCase();
            const total = parseInt(item.total_solicitudes || 0);
            if (s.includes("fem") || s === "f") femenino += total;
            else if (s.includes("masc") || s === "m") masculino += total;
        });
    }

    const total_general = femenino + masculino;

    if (window.mi_chart_sexo) {
        window.mi_chart_sexo.destroy();
    }

    window.mi_chart_sexo = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: ["Femenino", "Masculino"],
            datasets: [{
                data: [femenino, masculino],
                backgroundColor: ["#691b31", "#bc955b"],
                borderWidth: 2,
                borderColor: "#ffffff",
                borderAlign: "inner"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "60%",
            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        usePointStyle: true,
                        pointStyle: "circle",
                        padding: 20,
                        font: { size: 12, weight: "bold" }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const val = context.raw || 0;
                            const pct = total_general > 0 ? ((val / total_general) * 100).toFixed(1) : 0;
                            return ` ${context.label}: ${val} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

function inicializar_boton_descarga() {
    const btn_descargar = document.getElementById("btn-descargar-reporte");
    if (!btn_descargar) return;

    btn_descargar.addEventListener("click", () => {
        generar_pdf_reporte_institucional();
    });
}

async function generar_pdf_reporte_institucional() {
    const libreria_jspdf = window.jspdf ? window.jspdf.jsPDF : null;
    
    if (!libreria_jspdf) {
        alert("la librería jsPDF no se encuentra cargada en la página.");
        return;
    }

    let canvas_chart = null;
    let titulo_reporte = "";

    if (vista_actual === "v_grafica_solicitudes_ingresadas") {
        canvas_chart = document.getElementById("chart-solicitudes-ingresadas");
        titulo_reporte = "Reporte de Solicitudes Ingresadas";
    } else if (vista_actual === "v_grafica_clasificacion") {
        titulo_reporte = "Reporte de Tipos de Solicitud";
    } else if (vista_actual === "v_grafica_origen_solicitud") {
        canvas_chart = document.getElementById("chart-origen-solicitud");
        titulo_reporte = "Reporte de Solicitudes de Atención al Pueblo";
    } else if (vista_actual === "v_cobertura_municipal") {
        canvas_chart = document.getElementById("chart-cobertura-municipal");
        titulo_reporte = "Reporte de Cobertura Municipal en el Estado";
    } else if (vista_actual === "v_comportamiento_mensual") {
        canvas_chart = document.getElementById("chart-comportamiento-mensual");
        titulo_reporte = "Reporte de Comportamiento Mensual de Solicitudes";
    } else if (vista_actual === "v_benificiarios_directos_mensuales") {
        canvas_chart = document.getElementById("chart-solicitantes-directos");
        titulo_reporte = "Reporte de Beneficiarios Directos";
    } else if (vista_actual === "v_beneficiarios_indirectos_mensual") {
        canvas_chart = document.getElementById("chart-beneficiarios-indirectos");
        titulo_reporte = "Reporte de Beneficiarios Indirectos";
    } else if (vista_actual === "v_oficios_cfe") {
        titulo_reporte = "Reporte de Oficios Enviados a CFE";
        canvas_chart = document.getElementById("chart-oficios-zona-cfe");
    } else if (vista_actual === "sp_reporte_avanzado_filtros") {
        titulo_reporte = "Reporte de Solicitudes por Municipio";
    }

    let chart_img_base64 = null;

    if (canvas_chart) {
        const instancia_chart = Chart.getChart(canvas_chart);
        if (instancia_chart) {
            instancia_chart.render();
            chart_img_base64 = canvas_chart.toDataURL("image/png", 1.0);
        }
    }

    const cargar_imagen = (url) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = url;
        });
    };

    const cargar_fuente_base64 = async (url) => {
        try {
            const res = await fetch(url);
            if (!res.ok) return null;
            const blob = await res.blob();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result.split(',')[1]);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            return null;
        }
    };

    const convertir_img_a_jpeg_limpio = (img_obj, calidad = 0.85) => {
        if (!img_obj) return null;
        const canvas_limpio = document.createElement("canvas");
        canvas_limpio.width = img_obj.naturalWidth;
        canvas_limpio.height = img_obj.naturalHeight;
        const ctx_l = canvas_limpio.getContext("2d");
        ctx_l.fillStyle = "#FFFFFF";
        ctx_l.fillRect(0, 0, canvas_limpio.width, canvas_limpio.height);
        ctx_l.drawImage(img_obj, 0, 0);
        return canvas_limpio.toDataURL("image/jpeg", calidad);
    };

    const img_fondo = await cargar_imagen("img/fondo.jpg"); 
    const img_logo_dpie = await cargar_imagen("img/dpie.png"); 
    const img_logo_hidalgo = await cargar_imagen("img/hidalgo_aeeh.png"); 

    if (!img_fondo) {
        alert("no se pudo cargar la imagen de plantilla de fondo.");
        return;
    }

    const img_natural_width = img_fondo.naturalWidth;
    const img_natural_height = img_fondo.naturalHeight;

    const ancho_pdf = 279.4;
    const alto_pdf = (img_natural_height * ancho_pdf) / img_natural_width;
    const centro_x = ancho_pdf / 2;

    const doc = new libreria_jspdf({
        orientation: 'landscape',
        format: [ancho_pdf, alto_pdf],
        unit: 'mm',
        compress: true
    });

    const base64_montserrat_regular = await cargar_fuente_base64("../fonts/Montserrat-Regular.ttf");
    const base64_montserrat_bold = await cargar_fuente_base64("../fonts/Montserrat-Bold.ttf");

    let nombre_fuente_pdf = "helvetica";

    if (base64_montserrat_regular && base64_montserrat_bold) {
        doc.addFileToVFS("Montserrat-Regular.ttf", base64_montserrat_regular);
        doc.addFont("Montserrat-Regular.ttf", "montserrat", "normal");

        doc.addFileToVFS("Montserrat-Bold.ttf", base64_montserrat_bold);
        doc.addFont("Montserrat-Bold.ttf", "montserrat", "bold");

        nombre_fuente_pdf = "montserrat";
    }

    const img_fondo_base64_jpeg = convertir_img_a_jpeg_limpio(img_fondo, 0.75);
    const img_dpie_limpia_jpeg = convertir_img_a_jpeg_limpio(img_logo_dpie, 0.90);
    const img_hidalgo_limpia_jpeg = convertir_img_a_jpeg_limpio(img_logo_hidalgo, 0.90);

    const aplicar_plantilla_hoja = (subtitulo_opcional = "") => {
        doc.addImage(img_fondo_base64_jpeg, "JPEG", 0, 0, ancho_pdf, alto_pdf);

        if (img_dpie_limpia_jpeg) {
            const alto_logo_dpie = 10;
            const ancho_logo_dpie = (img_logo_dpie.naturalWidth * alto_logo_dpie) / img_logo_dpie.naturalHeight;
            doc.addImage(img_dpie_limpia_jpeg, "JPEG", 15, 10, ancho_logo_dpie, alto_logo_dpie);
        }

        doc.setFont(nombre_fuente_pdf, "bold");
        doc.setFontSize(14);
        doc.setTextColor(105, 27, 49);
        doc.text((subtitulo_opcional || titulo_reporte).toUpperCase(), centro_x, 18, { align: 'center' });

        doc.setFont(nombre_fuente_pdf, "normal");
        doc.setFontSize(8);
        doc.setTextColor(90, 90, 90);
        
        let texto_periodo_str = "Período General Acumulado";
        if (fecha_inicio_personalizada && fecha_fin_personalizada) {
            const inicio_formateado = typeof formatear_fecha_texto === "function" ? formatear_fecha_texto(fecha_inicio_personalizada) : fecha_inicio_personalizada;
            const fin_formateado = typeof formatear_fecha_texto === "function" ? formatear_fecha_texto(fecha_fin_personalizada) : fecha_fin_personalizada;
            texto_periodo_str = `Período del ${inicio_formateado} al ${fin_formateado}`;
        }
        doc.text(texto_periodo_str, centro_x, 23, { align: 'center' });

        if (img_hidalgo_limpia_jpeg) {
            const alto_logo_hidalgo = 10;
            const ancho_logo_hidalgo = (img_logo_hidalgo.naturalWidth * alto_logo_hidalgo) / img_logo_hidalgo.naturalHeight;
            const posicion_x_derecha = ancho_pdf - 15 - ancho_logo_hidalgo;
            doc.addImage(img_hidalgo_limpia_jpeg, "JPEG", posicion_x_derecha, 10, ancho_logo_hidalgo, alto_logo_hidalgo);
        }
    };

    aplicar_plantilla_hoja();

    if (chart_img_base64) {
        let ancho_img = 160;
        let alto_img = 100;
        let pos_x = centro_x - (ancho_img / 2);
        let pos_y = 35;

        doc.addImage(chart_img_base64, "PNG", pos_x, pos_y, ancho_img, alto_img);
    }

    const hoy = new Date();
    const dia = String(hoy.getDate()).padStart(2, '0');
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const anio = hoy.getFullYear();

    const fecha_str = `${dia}_${mes}_${anio}`;
    const nombre_limpio = titulo_reporte.toLowerCase().replace(/ /g, "_");

    doc.save(`${nombre_limpio}_${fecha_str}.pdf`);
}