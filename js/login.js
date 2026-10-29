document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('#form-login');
    const passwordinput = document.querySelector('#password');
    const togglebtn = document.querySelector('#toggle-password');

    if (togglebtn && passwordinput) {
        togglebtn.addEventListener('click', () => {
            const ishidden = passwordinput.type === 'password';
            passwordinput.type = ishidden ? 'text' : 'password';
            togglebtn.classList.toggle('is-visible', ishidden);
            togglebtn.setAttribute('aria-label', ishidden ? 'ocultar contraseña' : 'mostrar contraseña');
        });
    }

    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();

            const usuario = document.querySelector('#usuario').value;
            const password = document.querySelector('#password').value;
            const errordiv = document.querySelector('#error-msg');
            const submitbtn = form.querySelector('button[type="submit"]');

            errordiv.textContent = '';
            submitbtn.disabled = true;
            submitbtn.classList.add('is-loading');

            fetch('/SICAEH/agencia_backend/index.php?accion=login', {
                method: 'post',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ usuario: usuario, password: password }),
                credentials: 'include'
            })
                .then(async res => {
                    const text = await res.text();
                    console.log('respuesta cruda del servidor:', text);
                    try {
                        return JSON.parse(text);
                    } catch (err) {
                        throw new Error(`html/no-json: ${text.slice(0, 150)}`);
                    }
                })
                .then(data => {
                    if (data.exito) {
                        // guardamos el cargo en el localstorage para los permisos del menú
                        localStorage.setItem('rol_usuario', data.cargo);

                        // buscamos si hay un destino pendiente en la barra de direcciones
                        const urlparams = new URLSearchParams(window.location.search);
                        const redirecturl = urlparams.get('redirect');

                        if (redirecturl) {
                            // si venía del correo, nos lleva directo al trámite
                            window.location.href = decodeURIComponent(redirecturl);
                        } else {
                            // si entró de forma normal, al dashboard
                            window.location.href = 'dashboard.html';
                        }
                    } else {
                        errordiv.textContent = data.error || 'credenciales incorrectas';
                    }
                })
                .catch(err => {
                    console.error('detalle error:', err.message);
                    errordiv.textContent = err.message.startsWith('html/no-json:') 
                        ? 'el servidor devolvió un error php/html (revisa la consola)' 
                        : 'error de conexión con el servidor';
                })
                .finally(() => {
                    submitbtn.disabled = false;
                    submitbtn.classList.remove('is-loading');
                });
        });
    }
});