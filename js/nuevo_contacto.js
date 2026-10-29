document.addEventListener("DOMContentLoaded", () => {
    const select_sector = document.getElementById("id_sector");
    const select_municipio = document.getElementById("id_municipio");
    const select_localidad = document.getElementById("localidad");
    const form_contacto = document.getElementById("form-nuevo-contacto");
    const seccion_municipio_localidad = document.getElementById("seccion-municipio-localidad");

    let lista_localidades_global = [];

    cargar_sectores();
    cargar_datos_ubicacion();

    if (select_sector) {
        select_sector.addEventListener("change", () => {
            verificar_sector();
        });
    }

    function verificar_sector() {
        if (!select_sector || !seccion_municipio_localidad) return;
        const texto_sector = select_sector.options[select_sector.selectedIndex].text.toLowerCase();
        
        if (texto_sector.includes("municipal") || texto_sector.includes("delegados")) {
            seccion_municipio_localidad.classList.remove("d-none");
        } else {
            seccion_municipio_localidad.classList.add("d-none");
            if (select_municipio) select_municipio.value = "";
            if (select_localidad) {
                select_localidad.innerHTML = `<option value="" selected disabled>Seleccione la localidad</option>`;
            }
        }
    }

    async function cargar_sectores() {
        try {
            const response = await fetch("/SICAEH/agencia_backend/directorio.php?accion=filtros");
            const data = await response.json();
            if (data.success && select_sector) {
                select_sector.innerHTML = `<option value="" selected disabled>Seleccione el sector</option>`;
                data.sectores.forEach(sec => {
                    const opt = document.createElement("option");
                    opt.value = sec.id_sector;
                    opt.textContent = sec.nombre_sector.toLowerCase().replace(/^\w/, c => c.toUpperCase());
                    select_sector.appendChild(opt);
                });
            }
        } catch (error) {
            console.error("error al cargar sectores:", error);
        }
    }

    async function cargar_datos_ubicacion() {
        try {
            const response = await fetch("/SICAEH/agencia_backend/directorio.php?accion=filtros");
            const data = await response.json();
            if (data.success) {
                if (select_municipio && data.municipios) {
                    select_municipio.innerHTML = `<option value="" selected disabled>Seleccione el municipio</option>`;
                    data.municipios.forEach(muni => {
                        const opt = document.createElement("option");
                        opt.value = muni.id_municipio;
                        opt.textContent = muni.nombre_municipio.toLowerCase().replace(/^\w/, c => c.toUpperCase());
                        select_municipio.appendChild(opt);
                    });
                }
                if (data.localidades) {
                    lista_localidades_global = data.localidades;
                }
            }
        } catch (error) {
            console.error("error al cargar ubicación:", error);
        }
    }

    // función global para filtrar las localidades según el municipio seleccionado
    window.cargar_localidades_por_municipio = function(id_municipio) {
        if (!select_localidad) return;
        select_localidad.innerHTML = `<option value="" selected disabled>Seleccione la localidad</option>`;
        
        const filtradas = lista_localidades_global.filter(loc => loc.id_municipio == id_municipio);
        
        filtradas.forEach(loc => {
            const opt = document.createElement("option");
            opt.value = loc.id_localidad; // o loc.nombre_localidad según tu diseño
            opt.textContent = loc.nombre_localidad.toLowerCase().replace(/^\w/, c => c.toUpperCase());
            select_localidad.appendChild(opt);
        });
    }

    if (form_contacto) {
        form_contacto.addEventListener("submit", async (e) => {
            e.preventDefault();

            const form_data = new FormData(form_contacto);
            const datos_json = Object.fromEntries(form_data.entries());

            try {
                const response = await fetch("/SICAEH/agencia_backend/guardar_contacto.php", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify(datos_json)
                });

                const resultado = await response.json();

                if (resultado.success) {
                    await mostrar_alerta_personalizada("Contacto guardado exitosamente");
                    window.location.href = "directorio.html";
                } else {
                    await mostrar_alerta_personalizada("Error: " + (resultado.error || "No se pudo guardar el contacto"));
                }
            } catch (error) {
                console.error("error en la petición:", error);
                await mostrar_alerta_personalizada("error de conexión con el servidor.");
            }
        });
    }
});
