let segundos = 0;
let cronometroInterval = null;

// Detectamos el ID del test desde el hash (#m2_t2, #EXAMEN_2025...)
const obtenerTestId = () => window.location.hash.substring(1) || 'EXAMEN_2025';

async function cargarBancoDePreguntas() {
    const testId = obtenerTestId();

    // 1. Limpieza total y parada de cronómetro previo
    if (cronometroInterval) {
        clearInterval(cronometroInterval);
        cronometroInterval = null;
    }
    segundos = 0;

    const timerDisplay = document.getElementById('timer');
    if (timerDisplay) timerDisplay.textContent = "00:00:00";

    document.getElementById('quiz-container').innerHTML = '<div class="loader">Cargando preguntas de ' + testId + '...</div>';

    try {
        // 2. LEER EL ARCHIVO JS COMO TEXTO
        // Usamos fetch para obtener el contenido crudo del archivo m2_t2.js
        const response = await fetch(`js/${testId}.js?v=${new Date().getTime()}`);
        if (!response.ok) throw new Error("Archivo no encontrado");
        let textoOriginal = await response.text();

        // Importamos dinámicamente el archivo
        // Nota: Para que esto funcione, bancoDePreguntas DEBE ser global o 
        // simplemente dejamos que el eval lo maneje si reemplazamos const por var
        const codigoLimpio = textoOriginal.replace('const bancoDePreguntas', 'window.bancoDePreguntas');

        // Ejecutamos el código modificado para que bancoDePreguntas sea accesible
        const scriptActual = document.getElementById('script-datos');
        if (scriptActual) scriptActual.remove();

        const scriptElement = document.createElement('script');
        scriptElement.id = 'script-datos';
        scriptElement.text = codigoLimpio;
        document.head.appendChild(scriptElement);

        // 4. Inicializar interfaz
        setTimeout(() => {
            if (window.bancoDePreguntas) {
                actualizarCabecera(testId);
                renderizarPreguntas();
                iniciarCronometro();
            }
        }, 150);

    } catch (error) {
        console.error("Error cargando el test:", error);
        document.getElementById('quiz-container').innerHTML =
            `<p style="color:red">Error al cargar el test "${testId}". Asegúrate de que el archivo js/${testId}.js existe.</p>`;
    }
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