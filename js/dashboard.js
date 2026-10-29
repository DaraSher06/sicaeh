document.addEventListener('DOMContentLoaded', () => {
    fetch('/SICAEH/agencia_backend/index.php?accion=sesion', {
        method: 'get',
        credentials: 'include'
    })
        .then(res => res.json())
        .then(data => {
            console.log("Respuesta de sesión en dashboard:", data); // <-- Esto imprimirá qué responde exactamente el servidor

            if (data.exito) {
                const el_iniciales = document.getElementById('user-iniciales');
                const el_nombre = document.getElementById('user-nombre');
                const el_ubicacion = document.getElementById('user-ubicacion');

                if (el_iniciales) el_iniciales.textContent = data.iniciales;
                if (el_nombre) el_nombre.textContent = data.nombre;
                if (el_ubicacion) el_ubicacion.textContent = data.ubicacion;

                if (data.cargo) {
                    localStorage.setItem('rol_usuario', data.cargo);
                }

                aplicar_permisos();
                if (typeof configurar_ambito_por_rol === 'function') {
                    configurar_ambito_por_rol();
                }
            } else {
                // ANULAMOS TEMPORALMENTE EL REDIRECT AUTOMÁTICO PARA VER QUÉ PASA
                console.warn("El servidor dice que no hay sesión, pero NO redirigiremos para probar.");
                // window.location.href = 'login.html'; 
            }
        })
        .catch(err => {
            console.error('Error al obtener la sesión:', err);
        });

    cargar_y_configurar_notificaciones();
});

function cargar_y_configurar_notificaciones(){
    fetch("/SICAEH/agencia_backend/obtener_notificaciones.php", {
        credentials: 'include' // <-- Agregado aquí
    })
        .then(response => response.json())
        .then(data => {
            // ... resto del código ...
            const notif_btn = document.getElementById('notif-btn');
            if (!notif_btn) return;

            let badge = notif_btn.querySelector('.notif-badge');
            if (data.success && data.notificaciones && data.notificaciones.length > 0) {
                if (badge) {
                    badge.innerText = data.notificaciones.length;
                    badge.style.display = "inline-block";
                }
            } else {
                if (badge) badge.style.display = "none";
            }

            notif_btn.onclick = (e) => {
                e.stopPropagation();
                alternar_panel_notificaciones(data);
            };
        })
        .catch(error => console.error("error al cargar notificaciones:", error));

    document.addEventListener('click', (e) => {
        let panel = document.getElementById('panel-notificaciones-flotante');
        let notif_btn = document.getElementById('notif-btn');
        if (panel && !panel.contains(e.target) && !notif_btn.contains(e.target)) {
            panel.remove();
        }
    });
}

function alternar_panel_notificaciones(data) {
    let panel = document.getElementById('panel-notificaciones-flotante');
    let ocultas = JSON.parse(localStorage.getItem('notificaciones_ocultas') || '[]');

    if (panel) {
        panel.remove();
        return;
    }
    
    panel = document.createElement('div');
    panel.id = 'panel-notificaciones-flotante';
    panel.style.cssText = 'position: absolute; top: 60px; right: 20px; width: 340px; max-height: 400px; overflow-y: auto; background: white; border: 1px solid #ddd; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border-radius: 8px; z-index: 1000; padding: 10px; font-size: 13px;';

    let contenido_html = `
        <div style="font-weight: bold; padding: 5px 10px; border-bottom: 1px solid #eee; margin-bottom: 5px; display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #333;">Notificaciones SIGEAH</span>
            <span style="cursor: pointer; color: #999; font-size: 16px;" onclick="document.getElementById('panel-notificaciones-flotante').remove()">×</span>
        </div>
        <ul style="list-style: none; padding: 0; margin: 0;" id="lista-notificaciones-ul">
    `;

    if (data.success && data.notificaciones && data.notificaciones.length > 0) {
        // ordenamos por fecha límite de forma ascendente para que aparezcan en orden cronológico
        let notificaciones_ordenadas = data.notificaciones.sort((a, b) => new Date(a.fecha_limite) - new Date(b.fecha_limite));

        notificaciones_ordenadas.forEach(notif => {
            let color_estilo = "#ff3b30";
            if (notif.estatus_sla === "a tiempo" || notif.estatus_sla === "vigente") {
                color_estilo = "#34c759";
            } else if (notif.estatus_sla === "por vencer" || notif.estatus_sla === "en riesgo") {
                color_estilo = "#ffcc00";
            }

            // convertimos el número consecutivo dentro de los corchetes a MAYÚSCULAS
            let mensaje_mayus = notif.mensaje.replace(/\[(.*?)\]/, (match, p1) => `[${p1.toUpperCase()}]`);

            contenido_html += `
                <li id="notif-item-${notif.id_registro}" style="border-bottom: 1px solid #f1f1f1; padding: 8px 5px; display: flex; justify-content: space-between; align-items: center;">
                    <div onclick="ir_a_registro(${notif.id_registro}, '${notif.estatus_sla}')" style="text-decoration: none; display: block; color: inherit; flex-grow: 1; cursor: pointer;">
                        <span style="font-weight: 600; font-size: 11px; text-transform: uppercase; color: ${color_estilo}; display: block; margin-bottom: 2px;">
                            ${notif.titulo} (${notif.estatus_sla})
                        </span>
                        <span style="font-size: 12px; color: #555; display: block; line-height: 1.3;">
                            ${mensaje_mayus}
                        </span>
                    </div>
                    <span style="cursor: pointer; color: #aaa; font-weight: bold; font-size: 14px; padding-left: 8px;" onclick="eliminar_notificacion(${notif.id_registro}, event)" title="eliminar notificación">×</span>
                </li>
            `;
        });
    } else {
        contenido_html += `<li style="padding: 10px; text-align: center; color: #777;">no hay notificaciones pendientes</li>`;
    }

    contenido_html += `</ul>`;
    panel.innerHTML = contenido_html;

    const notif_btn = document.getElementById('notif-btn');
    if (notif_btn && !notif_btn.style.position) {
        notif_btn.style.position = 'relative';
    }

    document.body.appendChild(panel);
    
    const rect = notif_btn.getBoundingClientRect();
    panel.style.top = (rect.bottom + window.scrollY + 8) + 'px';
    panel.style.right = (window.innerWidth - rect.right) + 'px';
}

function eliminar_notificacion(id_registro, event) {
    event.stopPropagation();
    
    let ocultas = JSON.parse(localStorage.getItem('notificaciones_ocultas') || '[]');
    if (!ocultas.includes(id_registro)) {
        ocultas.push(id_registro);
        localStorage.setItem('notificaciones_ocultas', JSON.stringify(ocultas));
    }

    let item = document.getElementById(`notif-item-${id_registro}`);
    if (item) {
        item.remove();
    }
}

function ir_a_registro(id_registro, estatus_sla) {
    localStorage.setItem('iluminar_registro', id_registro);
    localStorage.setItem('estatus_sla_iluminar', estatus_sla);
    let url = `seguimiento.html?id_registro=${id_registro}`;
    if (estatus_sla) {
        url += `&estatus_sla=${encodeURIComponent(estatus_sla)}`;
    }
    window.location.href = url;
}

document.addEventListener("DOMContentLoaded", function() {
    let id_a_iluminar = localStorage.getItem('iluminar_registro');
    let estatus_sla = localStorage.getItem('estatus_sla_iluminar');
    if (id_a_iluminar) {
        localStorage.removeItem('iluminar_registro');
        localStorage.removeItem('estatus_sla_iluminar');

        let color_iluminacion = "#ff3b3033";
        if (estatus_sla === "a tiempo" || estatus_sla === "vigente") {
            color_iluminacion = "#34c75933";
        } else if (estatus_sla === "por vencer" || estatus_sla === "en riesgo") {
            color_iluminacion = "#ffcc0033";
        }

        setTimeout(() => {
            let fila = document.querySelector(`tr[data-id="${id_a_iluminar}"], [data-id-registro="${id_a_iluminar}"]`);
            if (fila) {
                fila.style.transition = "background-color 0.5s ease";
                fila.style.backgroundColor = color_iluminacion;
                setTimeout(() => {
                    fila.style.backgroundColor = "";
                }, 3000);
            }
        }, 500);
    }
});

function aplicar_permisos() {
    let rol_actual = (localStorage.getItem('rol_usuario') || 'consulta').toLowerCase().trim();
    if (rol_actual === 'admin') rol_actual = 'administrador';
    if (rol_actual === 'captura') rol_actual = 'capturista';

    const elementos = document.querySelectorAll('[data-roles]');
    elementos.forEach(elemento => {
        const roles_permitidos = elemento.getAttribute('data-roles').toLowerCase().split(',').map(r => {
            r = r.trim();
            if (r === 'admin') return 'administrador';
            if (r === 'captura') return 'capturista';
            return r;
        });

        if (roles_permitidos.includes(rol_actual)) {
            elemento.classList.remove('oculto-por-rol');
            if (elemento.style.display === 'none') {
                elemento.style.display = '';
            }
        } else {
            elemento.classList.add('oculto-por-rol');
        }
    });
}

function cerrar_sesion() {
    let modal = document.getElementById('modal-confirmacion-dinamico');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-confirmacion-dinamico';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background-color:rgba(0,0,0,0.8);display:flex;justify-content:center;align-items:center;z-index:9999;font-family:montserrat,sans-serif;';
        modal.innerHTML = `
            <div style="background-color:#1e1e24;color:#ffffff;border:1px solid #5a1c24;border-radius:28px;padding:36px;width:420px;text-align:center;box-shadow:0 16px 40px rgba(0,0,0,0.6);position:relative;">
                <button id="btn-modal-cerrar" style="position:absolute;top:20px;right:20px;background:none;border:none;font-size:1.2rem;cursor:pointer;color:#b0b0b0;">✕</button>
                <div style="margin-bottom:20px;display:flex;justify-content:center;">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#5a1c24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                </div>
                <h3 style="margin:0 0 12px 0;font-size:1.3rem;font-weight:700;color:#ffffff;">¿Estás seguro de que deseas Cerrar Sesión?</h3>
                <p style="margin:0 0 28px 0;font-size:0.9rem;color:#b0b0b0;line-height:1.4;">Puedes volver a iniciar sesión en cualquier momento.</p>
                <div style="display:flex;justify-content:center;gap:12px;">
                    <button id="btn-modal-cancelar" style="background-color:transparent;color:#ffffff;border:1px solid #5a1c24;padding:10px 24px;border-radius:24px;cursor:pointer;font-weight:600;font-size:0.9rem;">Cancelar</button>
                    <button id="btn-modal-aceptar" style="background-color:#5a1c24;color:#ffffff;border:none;padding:10px 24px;border-radius:24px;cursor:pointer;font-weight:600;font-size:0.9rem;">Cerrar Sesión</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    } else {
        modal.style.display = 'flex';
    }

    document.getElementById('btn-modal-aceptar').onclick = () => {
        modal.style.display = 'none';
        fetch("/SICAEH/agencia_backend/logout.php")
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    sessionStorage.removeItem('sicaeh_popup_mostrado');
                    window.location.href = "login.html";
                } else {
                    alert("no se pudo cerrar la sesión");
                }
            })
            .catch(error => console.error("error al cerrar sesión:", error));
    };

    document.getElementById('btn-modal-cancelar').onclick = () => {
        modal.style.display = 'none';
    };

    document.getElementById('btn-modal-cerrar').onclick = () => {
        modal.style.display = 'none';
    };
}

function verdocumento(id_registro, nombre_original) {
    if (!nombre_original) {
        alert('no hay un nombre de documento válido.');
        return;
    }

    let ext = nombre_original.split('.').pop().toLowerCase();
    let es_imagen = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
    let es_office = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext);

    let nombre_url = encodeURIComponent(nombre_original);
    
    // URL directa de tu archivo en el backend
    let url_backend = window.location.origin + `/SICAEH/agencia_backend/ver_archivo.php?nombre=${nombre_url}&vista=1`;

    if (es_office) {
        // Usamos el visor público de Microsoft Office Online para previsualización segura de solo lectura
        let url_visor = `https://view.officeapps.live.com/op/view.aspx?src=` + encodeURIComponent(url_backend);
        window.open(url_visor, '_blank');
    } else {
        // Comportamiento normal para PDFs e imágenes
        window.open(url_backend, '_blank');
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // al cargar la plataforma, verificamos si hay notificaciones urgentes pendientes de mostrar en modal
    verificaralertasurgentes();
});

async function verificaralertasurgentes() {
    if (sessionStorage.getItem('sicaeh_popup_mostrado') === 'true') {
        return;
    }

    try {
        const response = await fetch('/SICAEH/agencia_backend/obtener_notificaciones.php', {
            credentials: 'include' // <-- Agregado aquí
        });
        const data = await response.json();
        

        if (data.success && data.alertas_urgentes && data.alertas_urgentes.length > 0) {
            sessionStorage.setItem('sicaeh_popup_mostrado', 'true');
            mostrarpiladealertas(data.alertas_urgentes);
        }
    } catch (error) {
        console.error("error al verificar alertas urgentes:", error);
    }
}

function mostrarpiladealertas(alertas) {
    let container = document.getElementById('toast-container-personalizado');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container-personalizado';
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        container.style.zIndex = '1080';
        document.body.appendChild(container);
    } else {
        container.innerHTML = '';
    }

    let ocultas_local = JSON.parse(localStorage.getItem('sigeah_alertas_vistas_local') || '[]');
    let alertas_filtradas = alertas.filter(a => !ocultas_local.includes(String(a.id_registro)));

    if (alertas_filtradas.length === 0) return;

    // ordenamos las alertas de forma ascendente por fecha límite para que guarden orden estricto
    alertas_filtradas.sort((a, b) => new Date(a.fecha_limite) - new Date(b.fecha_limite));

    alertas_filtradas.forEach((alerta, index) => {
        const toastid = `toast-alerta-urgente-${alerta.id_registro}`;
        if (document.getElementById(toastid)) return;

        const zindex = alertas_filtradas.length - index;
        const margin_style = index > 0 ? 'margin-top: -150px; transform: scale(0.97); opacity: 0.95;' : '';

        // pasamos el consecutivo dentro de los corchetes a mayúsculas
        let mensaje_formateado = alerta.mensaje.replace(/\[(.*?)\]/, (match, p1) => `[${p1.toUpperCase()}]`);

        const toasthtml = `
            <div id="${toastid}" class="toast show border-0 shadow-lg" role="alert" aria-live="assertive" aria-atomic="true" style="border-radius: 14px; overflow: hidden; width: 350px; max-width: 100%; position: relative; z-index: ${zindex}; ${margin_style} transition: all 0.4s ease;">
                <div class="toast-header text-white py-2 px-3" style="background-color: #691b31;">
                    <strong class="me-auto text-uppercase" style="font-size: 12px; letter-spacing: 0.5px;">${alerta.titulo}</strong>
                    <button type="button" class="btn-close btn-close-white btn-cerrar-custom" aria-label="close"></button>
                </div>
                <div class="toast-body bg-white p-3">
                    <p class="text-dark mb-1 small fw-semibold">${mensaje_formateado}</p>
                    <p class="text-muted mb-3" style="font-size: 11px;">este trámite requiere tu atención inmediata para mantener el control del sla.</p>
                    <div class="d-flex justify-content-end gap-2">
                        <a href="seguimiento.html?id_registro=${alerta.id_registro}&estatus_sla=${alerta.estatus_sla}" class="btn btn-sm text-white px-2.5 py-1" style="background-color: #691b31; font-size: 11px; border-radius: 6px;">ver trámite</a>
                        <button type="button" class="btn btn-sm btn-outline-secondary px-2.5 py-1 btn-no-mostrar-local" data-id="${alerta.id_registro}" style="font-size: 11px; border-radius: 6px;">entendido, no volver a mostrar</button>
                    </div>
                </div>
            </div>
        `;

        const divtemporal = document.createElement('div');
        divtemporal.style.transition = 'all 0.5s ease';
        divtemporal.innerHTML = toasthtml;
        container.appendChild(divtemporal);

        const toastel = document.getElementById(toastid);

        const deslizar_derecha_y_remover = () => {
            divtemporal.style.transform = 'translateX(120%)';
            divtemporal.style.opacity = '0';
            setTimeout(() => {
                divtemporal.remove();
            }, 500);
        };

        toastel.querySelector('.btn-no-mostrar-local').addEventListener('click', () => {
            let actualizadas = JSON.parse(localStorage.getItem('sigeah_alertas_vistas_local') || '[]');
            if (!actualizadas.includes(String(alerta.id_registro))) {
                actualizadas.push(String(alerta.id_registro));
                localStorage.setItem('sigeah_alertas_vistas_local', JSON.stringify(actualizadas));
            }
            deslizar_derecha_y_remover();
        });

        toastel.querySelector('.btn-cerrar-custom').addEventListener('click', () => {
            deslizar_derecha_y_remover();
        });

        const tiempo_vida = 6000 + (index * 2500); 

        setTimeout(() => {
            if (document.body.contains(divtemporal)) {
                deslizar_derecha_y_remover();
            }
        }, tiempo_vida);
    });
}