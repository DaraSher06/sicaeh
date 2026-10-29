document.addEventListener("DOMContentLoaded", () => {
    const urlparams = new URLSearchParams(window.location.search);
    const idexpediente = urlparams.get("id");

    if (!idexpediente) {
        alert("no se proporcionó un ID de expediente.");
        window.location.href = "expedientes.html";
        return;
    }

    cargardetalleexpediente(idexpediente);

    async function cargardetalleexpediente(id) {
        try {
            const response = await fetch(`/SICAEH/agencia_backend/obtener_detalle_expedientes.php?id=${id}`);
            const data = await response.json();

            if (data.success) {
                const item = data.expediente;
                const consecutivo = (item.numero_consecutivo || item.num_consecutivo || "").toUpperCase();
                
                document.getElementById("titulo-expediente").textContent = `Documentos del Expediente ${consecutivo}`;
                document.getElementById("meta-folio").textContent = consecutivo || "-";
                document.getElementById("meta-asunto").textContent = item.asunto || "-";
                document.getElementById("meta-remitente").textContent = item.remitente || "-";
                document.getElementById("meta-total-docs").textContent = `${data.documentos.length} archivos`;

                renderizartabladocumentos(data.documentos, item);
            } else {
                alert("error: " + (data.mensaje || "no se pudo cargar la información"));
            }
        } catch (error) {
            console.error("error de conexión:", error);
        }
    }

    function atitulo(str) {
        return (str || "")
            .toLowerCase()
            .split(" ")
            .map(w => w.length > 0 ? w[0].toUpperCase() + w.slice(1) : "")
            .join(" ");
    }

    function renderizartabladocumentos(documentos, expediente) {
    const tbody = document.getElementById("tabla-documentos-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!documentos || documentos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">no hay documentos asociados a este expediente.</td></tr>`;
        return;
    }

    documentos.forEach(doc => {
        const fechacarga = doc.fecha_subida ? doc.fecha_subida.split(" ")[0] : "-";
        const subidopor = atitulo(doc.subido_por || "sistema");
        const numexpedientefisico = (expediente.no_expediente_fisico || "s/n").toUpperCase();

        const id_doc = doc.id_documento || doc.id_registro || (expediente ? expediente.id_registro : null);
        const nombrereal = doc.nombre_documento || doc.nombre_original || "documento";

        const tr = document.createElement("tr");
        tr.style.verticalAlign = "middle";
        tr.innerHTML = `
            <td class="py-3 text-start text-dark fw-medium ps-4">
                <div class="d-flex align-items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5a1c24" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                    <span class="text-truncate" style="max-width: 300px; display: inline-block;">${nombrereal}</span>
                </div>
            </td>
            <td class="py-3 text-center text-muted">${numexpedientefisico}</td>
            <td class="py-3 text-center text-muted">${fechacarga}</td>
            <td class="py-3 text-center text-muted">${subidopor}</td>
            <td class="py-3 text-center">
                <div class="d-flex justify-content-center gap-2">
                    <button type="button" class="btn btn-outline-secondary btn-sm p-1 d-flex align-items-center justify-content-center bg-white text-dark btn-ver-doc-item" style="border-radius: 6px; width: 32px; height: 32px; border-color: #d1c7c7;" title="ver documento">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                </div>
            </td>
        `;

        const btnver = tr.querySelector('.btn-ver-doc-item');
        if (btnver) {
            btnver.onclick = function() {
                verdocumento(id_doc, nombrereal);
            };
        }

        tbody.appendChild(tr);
    });
    }
});