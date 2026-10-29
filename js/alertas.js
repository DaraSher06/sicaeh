function mostrar_alerta_personalizada(mensaje) {
    let modal = document.getElementById('modal-alerta-dinamico');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-alerta-dinamico';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background-color:rgba(0,0,0,0.8);display:flex;justify-content:center;align-items:center;z-index:9999;font-family:montserrat,sans-serif;';
        modal.innerHTML = `
            <div style="background-color:#1e1e24;color:#ffffff;border:1px solid #5a1c24;border-radius:28px;padding:36px;width:420px;text-align:center;box-shadow:0 16px 40px rgba(0,0,0,0.6);position:relative;">
                <button id="btn-modal-cerrar-alerta" style="position:absolute;top:20px;right:20px;background:none;border:none;font-size:1.2rem;cursor:pointer;color:#b0b0b0;">✕</button>
                <div style="margin-bottom:20px;display:flex;justify-content:center;">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#5a1c24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                </div>
                <h3 id="modal-alerta-texto" style="margin:0 0 28px 0;font-size:1.2rem;font-weight:600;color:#ffffff;line-height:1.4;"></h3>
                <button id="btn-modal-ok-alerta" style="background-color:#5a1c24;color:#ffffff;border:none;padding:10px 32px;border-radius:24px;cursor:pointer;font-weight:600;font-size:0.9rem;">Aceptar</button>
            </div>
        `;
        document.body.appendChild(modal);
    } else {
        modal.style.display = 'flex';
    }

    document.getElementById('modal-alerta-texto').innerText = mensaje;

    return new Promise((resolver) => {
        const cerrar = () => {
            modal.style.display = 'none';
            resolver();
        };
        document.getElementById('btn-modal-ok-alerta').onclick = cerrar;
        document.getElementById('btn-modal-cerrar-alerta').onclick = cerrar;
    });
}