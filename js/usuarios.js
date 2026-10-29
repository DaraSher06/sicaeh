document.addEventListener("DOMContentLoaded", function() {
    cargar_usuarios();

    const form_editar = document.getElementById("form-editar-usuario");
    if (form_editar) {
        form_editar.addEventListener("submit", async function(e) {
            e.preventDefault();
            const datos = new FormData(form_editar);

            try {
                const response = await fetch("/SICAEH/agencia_backend/lista_usuarios.php?accion=actualizar", {
                    method: "post",
                    body: datos
                });
                const data = await response.json();

                if (data.success) {
                    await mostrar_alerta_personalizada(data.mensaje || "Usuario actualizado correctamente");
                    const modal_element = document.getElementById("modal-editar-usuario");
                    if (modal_element.contains(document.activeElement)) {
                        document.activeElement.blur();
                    }
                    const modal_instance = bootstrap.Modal.getInstance(modal_element);
                    if (modal_instance) {
                        modal_instance.hide();
                    }
                    cargar_usuarios();
                } else {
                    await mostrar_alerta_personalizada(data.error || "No se pudo actualizar el usuario");
                }
            } catch (error) {
                console.error("error al actualizar:", error);
                await mostrar_alerta_personalizada("Error de conexión con el servidor.");
            }
        });
    }
});

function cargar_usuarios() {
    fetch("/SICAEH/agencia_backend/lista_usuarios.php?accion=listar")
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const tbody = document.querySelector("table tbody");
                tbody.innerHTML = "";

                data.data.forEach(usuario => {
                    const fila = document.createElement("tr");
                    fila.innerHTML = `
                        <td class="py-3">
                            <div class="input-group">
                                <input type="text" class="form-control bg-light text-dark" value="${usuario.nombre_usuario}" disabled style="border-radius: 8px; font-size: 14px;">
                                <span class="input-group-text bg-light text-muted border-start-0" style="border-radius: 0 8px 8px 0;">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                </span>
                            </div>
                        </td>
                        <td>
                            <div class="input-group">
                                <input type="text" class="form-control bg-light text-dark" value="${usuario.correo}" disabled style="border-radius: 8px; font-size: 14px;">
                                <span class="input-group-text bg-light text-muted border-start-0" style="border-radius: 0 8px 8px 0;">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                </span>
                            </div>
                        </td>
                        <td>
                            <div class="input-group">
                                <input type="text" class="form-control bg-light text-dark" value="${usuario.cargo}" disabled style="border-radius: 8px; font-size: 14px;">
                                <span class="input-group-text bg-light text-muted border-start-0" style="border-radius: 0 8px 8px 0;">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                </span>
                            </div>
                        </td>
                        <td>
                            <input type="text" class="form-control bg-light text-muted text-center mx-auto" value="${usuario.ultima_actividad ?? 'sin actividad'}" disabled style="border-radius: 8px; font-size: 14px; width: 190px;">
                        </td>
                        <td class="text-center">
                            <div class="d-flex justify-content-center gap-1">
                                <button type="button" class="btn btn-outline-secondary btn-sm p-2" title="editar" style="border-radius: 8px;" onclick="editar_usuario(${usuario.id_usuario})">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                </button>
                                <button type="button" class="btn btn-outline-success btn-sm p-2" title="generar pdf" style="border-radius: 8px;" onclick="generar_pdf_por_id(${usuario.id_usuario})">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                </button>
                                <button type="button" class="btn btn-outline-danger btn-sm p-2" title="eliminar" style="border-radius: 8px;" onclick="eliminar_usuario(${usuario.id_usuario})">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                            </div>
                        </td>
                    `;
                    tbody.appendChild(fila);
                });
            } else {
                console.error(data.error);
            }
        })
        .catch(error => console.error("error en la petición fetch:", error));
}

function editar_usuario(id_usuario) {
    fetch(`/SICAEH/agencia_backend/lista_usuarios.php?accion=obtener&id_usuario=${id_usuario}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const usuario = data.data;
                document.getElementById("edit-id-usuario").value = usuario.id_usuario;
                document.getElementById("edit-nombre").value = usuario.nombre;
                document.getElementById("edit-apellido-paterno").value = usuario.apellido_paterno;
                document.getElementById("edit-apellido-materno").value = usuario.apellido_materno ?? '';
                document.getElementById("edit-telefono").value = usuario.telefono ?? '';
                document.getElementById("edit-correo").value = usuario.correo;
                document.getElementById("edit-nombre-usuario").value = usuario.nombre_usuario;
                document.getElementById("edit-cargo").value = usuario.cargo;
                document.getElementById("edit-cargo-real").value = usuario.cargo_real ?? '';
                document.getElementById("edit-estado-cuenta").checked = usuario.activo == 1;

                const modal_element = document.getElementById("modal-editar-usuario");
                const modal = bootstrap.Modal.getOrCreateInstance(modal_element);
                modal.show();
            } else {
                alert(data.error);
            }
        })
        .catch(error => console.error("error al obtener usuario:", error));
}

async function eliminar_usuario(id_usuario) {
    let modal = document.getElementById('modal-confirmacion-usuario');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-confirmacion-usuario';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background-color:rgba(0,0,0,0.8);display:flex;justify-content:center;align-items:center;z-index:9999;font-family:montserrat,sans-serif;';
        modal.innerHTML = `
            <div style="background-color:#1e1e24;color:#ffffff;border:1px solid #5a1c24;border-radius:28px;padding:36px;width:420px;text-align:center;box-shadow:0 16px 40px rgba(0,0,0,0.6);position:relative;">
                <button id="btn-modal-cerrar-usuario" style="position:absolute;top:20px;right:20px;background:none;border:none;font-size:1.2rem;cursor:pointer;color:#b0b0b0;">✕</button>
                <div style="margin-bottom:20px;display:flex;justify-content:center;">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#5a1c24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                </div>
                <h3 style="margin:0 0 12px 0;font-size:1.3rem;font-weight:700;color:#ffffff;">¿Estás seguro de que deseas eliminar este usuario?</h3>
                <p style="margin:0 0 28px 0;font-size:0.9rem;color:#b0b0b0;line-height:1.4;">Esta acción no se puede deshacer.</p>
                <div style="display:flex;justify-content:center;gap:12px;">
                    <button id="btn-modal-cancelar-usuario" style="background-color:transparent;color:#ffffff;border:1px solid #5a1c24;padding:10px 24px;border-radius:24px;cursor:pointer;font-weight:600;font-size:0.9rem;">Cancelar</button>
                    <button id="btn-modal-aceptar-usuario" style="background-color:#5a1c24;color:#ffffff;border:none;padding:10px 24px;border-radius:24px;cursor:pointer;font-weight:600;font-size:0.9rem;">Eliminar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    } else {
        modal.style.display = 'flex';
    }

    const confirmar = await new Promise((resolver) => {
        document.getElementById('btn-modal-aceptar-usuario').onclick = () => {
            modal.style.display = 'none';
            resolver(true);
        };
        document.getElementById('btn-modal-cancelar-usuario').onclick = () => {
            modal.style.display = 'none';
            resolver(false);
        };
        document.getElementById('btn-modal-cerrar-usuario').onclick = () => {
            modal.style.display = 'none';
            resolver(false);
        };
    });

    if (!confirmar) {
        return;
    }

    const datos = new FormData();
    datos.append("id_usuario", id_usuario);

    fetch("/SICAEH/agencia_backend/lista_usuarios.php?accion=eliminar", {
        method: "post",
        body: datos
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(data.mensaje);
            cargar_usuarios();
        } else {
            alert(data.error);
        }   
    })
    .catch(error => console.error("error al eliminar:", error));
}

function generar_pdf_por_id(id_usuario) {
    fetch(`/SICAEH/agencia_backend/lista_usuarios.php?accion=obtener&id_usuario=${id_usuario}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                generar_pdf_usuario(data.data);
            } else {
                alert(data.error);
            }
        })
        .catch(error => console.error("error al obtener datos para el pdf:", error));
}

function capitalizar_primera_letra(texto) {
    if (!texto) return '';
    return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
}

async function cargar_fuente_vfs_base64(doc, url, archivo, fuente, estilo) {
    const respuesta = await fetch(url);
    const blob = await respuesta.blob();
    return new Promise((resolve, reject) => {
        const lector = new FileReader();
        lector.onloadend = () => {
            const base64_completo = lector.result;
            const base64_limpio = base64_completo.split(',')[1];
            doc.addFileToVFS(archivo, base64_limpio);
            doc.addFont(archivo, fuente, estilo);
            resolve();
        };
        lector.onerror = reject;
        lector.readAsDataURL(blob);
    });
}

async function generar_pdf_usuario(usuario) {
    const { jspdf } = window;
    const doc = new jspdf.jsPDF({
        format: 'letter',
        unit: 'mm'
    });

    try {
        await cargar_fuente_vfs_base64(doc, 'fonts/montserrat/montserrat-medium.ttf', 'montserrat-meduim.ttf', 'montserrat', 'normal');
        await cargar_fuente_vfs_base64(doc, 'fonts/montserrat/montserrat-bold.ttf', 'montserrat-bold.ttf', 'montserrat', 'bold');
    } catch (error) {
        console.error("error al cargar las fuentes personalizadas:", error);
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = function() {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const img_base64 = canvas.toDataURL("image/png");

        const x = 130;
        const y_img = 15;
        const ancho = 60; 
        const alto = (img.naturalHeight * ancho) / img.naturalWidth;

        doc.addImage(img_base64, "png", x, y_img, ancho, alto);

        let y = y_img + alto + 15;

        // dirección general alineada a la izquierda, abajo de la imagen
        doc.setFont("montserrat", "bold");
        doc.setFontSize(11);
        doc.setTextColor(105, 27, 49);
        doc.text("Dirección General", 20, y, { align: 'left' });

        // bajamos más el espacio antes de la fecha para separar todo el contenido de la imagen
        y += 8;

        const opciones_fecha = { year: 'numeric', month: 'long', day: 'numeric' };
        const fecha_formateada = new Date().toLocaleDateString('es-ES', opciones_fecha);
        const nivel_acceso_formateado = capitalizar_primera_letra(usuario.cargo || 'consulta');
        
        doc.setFont("montserrat", "normal");
        doc.setFontSize(10);
        doc.setTextColor(30, 30, 30);
        doc.text(`Pachuca de Soto, Hgo., a ${fecha_formateada}`, 190, y, { align: 'right' });

        y += 12;

        doc.setFont("montserrat", "bold");
        doc.setFontSize(12);
        doc.setTextColor(30, 30, 30);
        doc.text(`${usuario.nombre || ''} ${usuario.apellido_paterno || ''} ${usuario.apellido_materno || ''}`, 20, y);
        
        y += 6;
        doc.setFont("montserrat", "normal");
        doc.setFontSize(10);
        const cargo_real_formateado = capitalizar_primera_letra(usuario.cargo_real || 'sin cargo asignado');
        doc.text(cargo_real_formateado, 20, y);
        
        y += 5;
        doc.text("Agencia Estatal de Energía de Hidalgo", 20, y);
        
        y += 7;
        doc.text("Presente", 20, y);

        y += 10;
        doc.setFontSize(10);
        const texto_oficio = `Por medio del presente, y en el marco de las actividades de operación y control del SICAEH, me permito hacer de su conocimiento los datos de acceso y validación correspondientes a su perfil institucional con el cargo de "${nivel_acceso_formateado}".\n\nLe recordamos que la información proporcionada es estrictamente confidencial y de uso exclusivo para las funciones asignadas en la plataforma.`;
        
        const lineas = doc.splitTextToSize(texto_oficio, 170);
        doc.text(lineas, 20, y, { maxWidth: 170, align: 'left' });

        y += (lineas.length * 4) + 3;
        doc.setFont("montserrat", "bold");
        doc.text("Datos de acceso asignados:", 20, y);
        y += 5;
        doc.setFont("montserrat", "normal");
        doc.text(`• Correo electrónico: ${usuario.correo || 'n/a'}`, 25, y);
        y += 5;
        doc.text(`• Nombre de usuario: ${usuario.nombre_usuario || 'n/a'}`, 25, y);

        y += 15;
        const texto_seguridad = "Por motivos de seguridad, la contraseña generada previamente no se incluye en el presente; asimismo, se le recuerda que el resguardo y la conservación de la misma son responsabilidad exclusiva del usuario.";
        const lineas_seguridad = doc.splitTextToSize(texto_seguridad, 170);
        doc.text(lineas_seguridad, 20, y, { maxWidth: 170, align: 'left' });

        y += 32;
        doc.setFont("montserrat", "bold");
        doc.text("Firma de conformidad:", 20, y);
        
        y += 25;
        doc.setLineWidth(0.5);
        doc.setDrawColor(30, 30, 30);
        doc.line(20, y, 90, y);

        y += 5;
        doc.setFont("montserrat", "normal");
        doc.setFontSize(9);
        doc.text("Nombre y Firma", 55, y, { align: 'center' });

        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text("Camino Real de la Plata No. 222, Primer Piso Local 2.", 190, 250, { align: 'right' });
        doc.text("Zona Plateada, Pachuca de Soto, Hgo., C.P. 42084", 190, 255, { align: 'right' });
        doc.text("Ofic. 771 688 6189", 190, 260, { align: 'right' });
        doc.text("https://energia.hidalgo.gob.mx", 190, 265, { align: 'right' });

        doc.save(`oficio_${usuario.nombre_usuario}.pdf`);
    };

    img.onerror = function() {
        doc.save(`oficio_${usuario.nombre_usuario}.pdf`);
    };

    img.src = "img/AEEH.png";
}