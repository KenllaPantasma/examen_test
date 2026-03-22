let segundos = 0;
let cronometroInterval = null;

// Detectamos el ID del test desde el hash (#m2_t2, #EXAMEN_2025...)
const obtenerTestId = () => window.location.hash.substring(1) || 'EXAMEN_2025';

function cargarBancoDePreguntas() {
    const testId = obtenerTestId();
    
    // 1. Limpiar estado previo
    if (cronometroInterval) {
        clearInterval(cronometroInterval);
        cronometroInterval = null;
    }
    segundos = 0;
    document.getElementById('timer').textContent = "00:00:00";
    document.getElementById('btn-start-manual').style.display = 'inline-block';
    document.getElementById('quiz-container').innerHTML = '<p>Cargando preguntas...</p>';

    // 2. Cargar el script de forma limpia
    const viejoScript = document.getElementById('script-datos');
    if (viejoScript) viejoScript.remove();

    const script = document.createElement('script');
    script.id = 'script-datos';
    // El ?v= evita que el servidor te entregue una versión vieja (caché)
    script.src = `js/${testId}.js?v=${new Date().getTime()}`;

    script.onload = () => {
        // Como ahora usas window.bancoDePreguntas en los archivos, 
        // el navegador lo reconocerá inmediatamente al cargar el script.
        if (window.bancoDePreguntas) {
            actualizarCabecera(testId);
            renderizarPreguntas();
        }
    };

    script.onerror = () => {
        alert("Error: No se encontró el archivo js/" + testId + ".js");
    };

    document.head.appendChild(script);
}

function iniciarCronometro() {
    // Limpiamos cualquier intervalo previo por seguridad
    if (cronometroInterval) clearInterval(cronometroInterval);

    cronometroInterval = setInterval(() => {
        segundos++;
        const h = Math.floor(segundos / 3600).toString().padStart(2, '0');
        const m = Math.floor((segundos % 3600) / 60).toString().padStart(2, '0');
        const s = (segundos % 60).toString().padStart(2, '0');

        const timerElement = document.getElementById('timer');
        if (timerElement) {
            timerElement.textContent = `${h}:${m}:${s}`;
        }
    }, 1000);
}

function actualizarCabecera(testId) {
    const titulo = testId.replace('_', ' ').toUpperCase();
    document.querySelector('header h1').textContent = `Simulador: ${titulo}`;

    const alerta = document.querySelector('.info-alert');
    if (alerta) {
        alerta.style.display = (testId === 'EXAMEN_2025') ? 'block' : 'none';
    }
   
}

function renderizarPreguntas() {
    const container = document.getElementById('quiz-container');
    container.innerHTML = '';
    const testId = obtenerTestId();

    window.bancoDePreguntas.forEach(p => {
        // Regla de cabecera de reserva
        if (testId === 'EXAMEN_2025' && p.id === 101) {
            const hr = document.createElement('div');
            hr.style = "margin-top:40px; padding:20px; border-top:2px solid #eee; font-weight:bold; color:#2c3e50;";
            hr.innerHTML = "Preguntas de Reserva (Sustituyen a las anuladas)";
            container.appendChild(hr);
        }

        const card = document.createElement('div');
        const esAnulada = (testId === 'EXAMEN_2025' && p.id === 5);
        card.className = `pregunta-card ${esAnulada ? 'anulada' : ''}`;
        card.id = `card-${p.id}`;

        card.innerHTML = `
            <span class="flag-btn" onclick="toggleFlag(${p.id})">🚩</span>
            <p><strong>${p.enunciado}</strong> ${esAnulada ? '<b style="color:red">[ANULADA]</b>' : ''}</p>
            <div class="opciones">
                ${Object.entries(p.opciones).map(([key, val]) => `
                    <label class="opcion-label">
                        <input type="radio" name="p${p.id}" value="${key}" ${esAnulada ? 'disabled' : ''}>
                        ${key}) ${val}
                    </label>
                `).join('')}
            </div>
            <div class="actions-row" style="margin-top:10px">
                <button class="btn-clear" onclick="limpiarSeleccion(${p.id})">Borrar respuesta</button>
            </div>
        `;
        container.appendChild(card);
    });

    
}

function corregirExamen() {
    if (cronometroInterval) clearInterval(cronometroInterval);
    const testId = obtenerTestId();
    let aciertos = 0, fallos = 0, blancos = 0, validas = 0;

    window.bancoDePreguntas.forEach(p => {
        const input = document.querySelector(`input[name="p${p.id}"]:checked`);
        const card = document.getElementById(`card-${p.id}`);
        const labels = card.querySelectorAll('.opcion-label');

        labels.forEach(l => {
            const r = l.querySelector('input');
            if (r.value === p.correcta) l.classList.add('es-correcta');
            if (input && r.checked && r.value !== p.correcta) l.classList.add('es-incorrecta');
        });

        // Lógica de puntuación
        let cuenta = (testId === 'EXAMEN_2025') ? ((p.id <= 100 && p.id !== 5) || p.id === 101) : true;
        if (cuenta) {
            validas++;
            if (!input) blancos++;
            else if (input.value === p.correcta) aciertos++;
            else fallos++;
        }
    });

    const notaFinal = Math.max(0, (aciertos * 1) - (fallos * 0.25));

    document.getElementById('btn-submit').style.display = 'none';
    const panel = document.getElementById('resultado-panel');
    panel.style.display = 'block';
    panel.classList.remove('hidden');

    document.getElementById('nota-display').textContent = notaFinal.toFixed(2);
    document.querySelector('.total').textContent = `/ ${validas}`;
    document.getElementById('desglose-display').innerHTML = `Aciertos: ${aciertos} | Fallos: ${fallos} | Blancos: ${blancos}`;
    panel.scrollIntoView({ behavior: 'smooth' });
}

function toggleFlag(id) { document.getElementById(`card-${id}`).classList.toggle('marked'); }
function limpiarSeleccion(id) { document.getElementsByName(`p${id}`).forEach(r => r.checked = false); }

window.onbeforeunload = function () {
    return "¿Seguro que quieres salir? Se perderá el progreso del test actual.";
};

// IMPORTANTE: Escuchar el cambio de test
window.addEventListener('hashchange', cargarBancoDePreguntas);
window.onload = cargarBancoDePreguntas;