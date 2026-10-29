document.addEventListener("DOMContentLoaded", async () => {
    const url_params = new URLSearchParams(window.location.search);
    const id_contacto = url_params.get("id");

    if (!id_contacto) {
        await mostrar_alerta_personalizada("No se especificó un contacto.");
        window.location.href = "directorio.html";
        return;
    }

    cargar_detalles_contacto(id_contacto);

    async function cargar_detalles_contacto(id) {
        try {
            const response = await fetch(`/SICAEH/agencia_backend/directorio.php?accion=detalle&id=${id}`);
            const data = await response.json();

            if (data.success && data.contacto) {
                const item = data.contacto;

                // removemos el .toUpperCase() y dejamos el texto tal cual viene de la base de datos
                document.getElementById("id_contacto").value = item.id_contacto;
                document.getElementById("detalle-sector").value = item.nombre_sector || "";
                document.getElementById("detalle-institucion").value = item.nombre_institucion || "";
                document.getElementById("detalle-cargo-unidad").value = item.nombre_unidad_administrativa || "";
                document.getElementById("detalle-domicilio").value = item.domicilio || "";

                const texto_sector = (item.nombre_sector || "").toLowerCase();
                const seccion_aux = document.getElementById("seccion-municipio-localidad");

                if (texto_sector.includes("municipal") || texto_sector.includes("delegados")) {
                    seccion_aux.classList.remove("d-none");
                    document.getElementById("detalle-municipio").value = item.nombre_municipio || "";
                    document.getElementById("detalle-localidad").value = item.localidad || "";
                }

                document.getElementById("detalle-nombre").value = item.nombre_completo || "";
                document.getElementById("detalle-puesto").value = item.cargo || "";
                document.getElementById("detalle-tel-oficina").value = item.telefono_oficina || "";
                document.getElementById("detalle-tel-celular").value = item.telefono_celular || "";
                document.getElementById("detalle-correo-inst").value = item.correo_institucional || "";
                document.getElementById("detalle-correo-pers").value = item.correo_personal || "";
            } else {
                await mostrar_alerta_personalizada("No se encontró información para este contacto.");
                window.location.href = "directorio.html";
            }
        } catch (error) {
            console.error("error al cargar los detalles:", error);
        }
    }
});

// función global para habilitar los campos al presionar editar
window.habilitar_edicion = function() {
    const inputs = document.querySelectorAll(".editable-input");
    inputs.forEach(input => {
        input.removeAttribute("readonly");
        input.removeAttribute("disabled");
        input.classList.remove("bg-light");
        input.classList.add("bg-white");
    });

    document.getElementById("btn-editar").classList.add("d-none");
    document.getElementById("btn-guardar").classList.remove("d-none");
}

// función global para enviar los cambios actualizados al servidor
window.guardar_edicion = async function() {
    const datos = {
        id_contacto: document.getElementById("id_contacto").value,
        nombre_completo: document.getElementById("detalle-nombre").value,
        puesto_cargo: document.getElementById("detalle-puesto").value,
        nombre_institucion: document.getElementById("detalle-institucion").value, // importante para corregir nombres de institución
        nombre_unidad_administrativa: document.getElementById("detalle-cargo-unidad").value,
        domicilio: document.getElementById("detalle-domicilio").value,
        telefono_oficina: document.getElementById("detalle-tel-oficina").value,
        telefono_celular: document.getElementById("detalle-tel-celular").value,
        correo_institucional: document.getElementById("detalle-correo-inst").value,
        correo_personal: document.getElementById("detalle-correo-pers").value
    };

    try {
        const response = await fetch("/SICAEH/agencia_backend/actualizar_contacto.php", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(datos)
        });

        const resultado = await response.json();

        if (resultado.success) {
            await mostrar_alerta_personalizada("Contacto actualizado exitosamente");
            window.location.reload();
        } else {
            await mostrar_alerta_personalizada("error: " + (resultado.error || "no se pudo actualizar"));
        }
    } catch (error) {
        console.error("error en la petición:", error);
        await mostrar_alerta_personalizada("error de conexión con el servidor.");
    }
}