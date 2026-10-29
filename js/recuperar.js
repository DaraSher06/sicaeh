document.getElementById('form-recuperar').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const correo = document.getElementById('correo-recuperar').value.trim();
    const alertamensaje = document.getElementById('mensaje-recuperar');
    const boton = this.querySelector('button[type="submit"]');

    alertamensaje.classList.add('d-none');
    boton.disabled = true;
    boton.textContent = 'Enviando...';

    try {
        const respuesta = await fetch('/SICAEH/agencia_backend/recuperar.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo: correo })
        });

        const resultado = await respuesta.json();
        
        alertamensaje.classList.remove('d-none');
        if (resultado.estado === 'exito') {
            alertamensaje.classList.remove('alert-danger');
            alertamensaje.classList.add('alert-success');
            document.getElementById('correo-recuperar').value = '';
        } else {
            alertamensaje.classList.remove('alert-success');
            alertamensaje.classList.add('alert-danger');
        }
        alertamensaje.textContent = resultado.mensaje;
    } catch (error) {
        alertamensaje.classList.remove('d-none', 'alert-success');
        alertamensaje.classList.add('alert-danger');
        alertamensaje.textContent = 'Ocurrió un error de conexión con el servidor.';
    } finally {
        boton.disabled = false;
        boton.textContent = 'Enviar Enlace';
    }
});