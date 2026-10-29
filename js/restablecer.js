document.addEventListener('DOMContentLoaded', function() {
    const urlparams = new URLSearchParams(window.location.search);
    const token = urlparams.get('token');
    
    const contenedorlogin = document.getElementById('contenedor-login');
    const contenedorrestablecer = document.getElementById('contenedor-restablecer');
    const campotoken = document.getElementById('token-recuperacion');
    const mensaje = document.getElementById('mensaje-restablecer');
    const formulario = document.getElementById('form-restablecer');

    if (token) {
        if (contenedorlogin) contenedorlogin.classList.add('d-none');
        if (contenedorrestablecer) contenedorrestablecer.classList.remove('d-none');

        setupTogglePassword('nueva_contrasena', 'toggle-nueva');
        setupTogglePassword('confirmar_contrasena', 'toggle-confirmar');

        if (campotoken) {
            campotoken.value = token;
        }

        if (mensaje) {
            mensaje.classList.add('d-none');
        }
        if (formulario) {
            formulario.classList.remove('d-none');
        }
    }
});

function setupTogglePassword(inputid, btnid) {
    const passwordinput = document.getElementById(inputid);
    const togglebtn = document.getElementById(btnid);

    if (togglebtn && passwordinput) {
        togglebtn.addEventListener('click', () => {
            const ishidden = passwordinput.type === 'password';
            passwordinput.type = ishidden ? 'text' : 'password';
            togglebtn.classList.toggle('is-visible', ishidden);
            togglebtn.setAttribute('aria-label', ishidden ? 'ocultar contraseña' : 'mostrar contraseña');
        });
    }
}

const formrestablecer = document.getElementById('form-restablecer');
if (formrestablecer) {
    formrestablecer.addEventListener('submit', async function(e) {
        e.preventDefault();
        const campotoken = document.getElementById('token-recuperacion');
        const token = campotoken ? campotoken.value : '';
        
        const inputpass = document.getElementById('nueva_contrasena');
        const inputconfirm = document.getElementById('confirmar_contrasena');
        const nuevapassword = inputpass ? inputpass.value : '';
        const confirmarpassword = inputconfirm ? inputconfirm.value : '';
        
        const mensaje = document.getElementById('mensaje-restablecer');
        const boton = this.querySelector('button[type="submit"]');

        if (nuevapassword !== confirmarpassword) {
            if (mensaje) {
                mensaje.classList.remove('d-none', 'alert-info', 'alert-success');
                mensaje.classList.add('alert-danger');
                mensaje.textContent = 'Las contraseñas no coinciden.';
            }
            return;
        }

        if (mensaje) {
            mensaje.classList.add('d-none');
        }
        if (boton) {
            boton.disabled = true;
            boton.textContent = 'Actualizando...';
        }

        try {
            const respuesta = await fetch('/SICAEH/agencia_backend/restablecer.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: token, nueva_password: nuevapassword })
            });

            const resultado = await respuesta.json();
            if (mensaje) {
                mensaje.classList.remove('d-none', 'alert-info');
                if (resultado.estado === 'exito') {
                    mensaje.classList.remove('alert-danger');
                    mensaje.classList.add('alert-success');
                    formrestablecer.reset();
                    mensaje.textContent = 'Contraseña actualizada con éxito. Redirigiendo al inicio de sesión...';
                    
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 3000);
                } else {
                    mensaje.classList.remove('alert-success');
                    mensaje.classList.add('alert-danger');
                    mensaje.textContent = resultado.mensaje;
                }
            }
        } catch (error) {
            if (mensaje) {
                mensaje.classList.remove('d-none', 'alert-info', 'alert-success');
                mensaje.classList.add('alert-danger');
                mensaje.textContent = 'Ocurrió un error de conexión con el servidor.';
            }
        } finally {
            if (boton) {
                boton.disabled = false;
                boton.textContent = 'Actualizar contraseña';
            }
        }
    });
}