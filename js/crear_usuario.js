document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-crear-usuario');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const pass = document.getElementById('password')?.value || '';
        const confirmpass = document.getElementById('confirmar_password')?.value || '';

        if (pass !== confirmpass) {
            await mostrar_alerta_personalizada('Las contraseñas no coinciden.');
            return;
        }

        const formdata = new FormData(form);
        const payload = Object.fromEntries(formdata.entries());
        // asegurar booleano o valor de switch
        payload.estado_cuenta = document.getElementById('estado_cuenta')?.checked ? 1 : 0;

        try {
            const response = await fetch('/SICAEH/agencia_backend/guardar_usuario.php', {
                method: 'post',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const text_raw = await response.text();
            let data;
            try {
                data = JSON.parse(text_raw);
            } catch (err) {
                console.error('respuesta no json:', text_raw);
                await mostrar_alerta_personalizada('Error en la respuesta del servidor.');
                return;
            }

            if (data.success) {
                await mostrar_alerta_personalizada('Usuario creado correctamente.');
                window.location.replace('usuarios.html');
            } else {
                await mostrar_alerta_personalizada('Error al crear usuario: ' + (data.error || 'desconocido'));
            }
        } catch (err) {
            console.error('error de comunicación:', err);
            await mostrar_alerta_personalizada('Error de comunicación con el servidor.');
        }
    });
});