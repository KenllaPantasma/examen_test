let segundos = 0;
let cronometroInterval = null;

// Detectamos el ID del test desde el hash (#m2_t2, #EXAMEN_2025...)
const obtenerTestId = () => window.location.hash.substring(1) || 'EXAMEN_2025';

function cargarBancoDePreguntas() {
    const testId = obtenerTestId();

    // 1. Limpiamos por completo la variable antes de cargar el nuevo test
    window.bancoDePreguntas = null;
    
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
        // Como ahora usas window.bancoDePreguntas en los archivos, el navegador lo reconocerá inmediatamente al cargar el script.
        // TRUCO PARA MÓVILES: Reintentar hasta que la variable exista
        let intentos = 0;
        const verificarCarga = setInterval(() => {
            intentos++;
            if (window.bancoDePreguntas && window.bancoDePreguntas.length > 0) {
                clearInterval(verificarCarga);
                console.log("Test cargado con éxito en móvil");
                actualizarCabecera(testId);
                renderizarPreguntas();
            } else if (intentos > 50) { // Si tras 5 segundos no hay nada, avisar
                clearInterval(verificarCarga);
                document.getElementById('quiz-container').innerHTML = 
                    "<p style='color:red; text-align:center;'>Error de carga: El test no respondió. Por favor, refresca la página.</p>";
            }
        }, 100);
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

    // 1. Insertar la información del Temario arriba si existe
    if (window.informacionTest && window.informacionTest.temario) {
        const info = window.informacionTest.temario;
        const headerInfo = document.createElement('div');
        headerInfo.style = "background:#f4f7f6; padding:15px; border-radius:10px; margin-bottom:20px; border-left:5px solid #2d6a4f;";
        
        let contenidoTemario = `<h4 style="margin-top:0; color:#1b4332;">${window.informacionTest.titulo}</h4>`;
        
        if (info.general) {
            contenidoTemario += `<p style="margin:5px 0;"><strong>🔹 Temario General:</strong><br> ${info.general.join('<br> ')}</p>`;
        }
        if (info.especifico) {
            contenidoTemario += `<p style="margin:5px 0;"><strong>🔸 Temario Específico:</strong><br> ${info.especifico.join('<br> ')}</p>`;
        }
        
        headerInfo.innerHTML = contenidoTemario;
        container.appendChild(headerInfo);
    }

    // 2. Renderizar las preguntas usando su ID
    window.bancoDePreguntas.forEach((p) => {
        const card = document.createElement('div');
        const esAnulada = (testId === 'EXAMEN_2025' && p.id === 5);
        card.className = `pregunta-card ${esAnulada ? 'anulada' : ''}`;
        card.id = `card-${p.id}`;

        // USAMOS p.id PARA LA NUMERACIÓN
        card.innerHTML = `
            <span class="flag-btn" onclick="toggleFlag(${p.id})">🚩</span>
            <p><strong>${p.id}.</strong> ${p.enunciado} ${esAnulada ? '<b style="color:red">[ANULADA]</b>' : ''}</p>
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

   // const notaBase = Math.max(0, (aciertos * 1) - (fallos * 0.25));
   // 1. Cálculo de la Nota Base (Penalización 0.25)
    const notaBase = aciertos - (fallos * 0.25);
    
    // 2. Cálculo de la Calificación del Ejercicio
    // Fórmula: ((Nota - 39.50) * 20 / 60.50) + 20
    let calificacionEjercicio = ((notaBase - 39.50) * 20) / 60.50 + 20;

    // Aseguramos que la calificación no sea negativa por la resta de 39.50
    if (calificacionEjercicio < 0) calificacionEjercicio = 0;

    // 3. Interfaz de usuario
    const btnSubmit = document.getElementById('btn-submit') || document.getElementById('btn-finalizar');
    if (btnSubmit) btnSubmit.style.display = 'none';

    const panel = document.getElementById('resultado-panel');
    panel.style.display = 'block';
    panel.classList.remove('hidden');

    // Mostramos la Calificación del Ejercicio como nota principal
    document.getElementById('nota-display').textContent = calificacionEjercicio.toFixed(2);
    document.querySelector('.total').textContent = `/ 40.00`; // Calificación máxima según la fórmula

    // Mostramos el desglose detallado incluyendo la Nota Bruta
    document.getElementById('desglose-display').innerHTML = `
        <div style="margin-top: 10px; border-top: 1px solid #ddd; padding-top: 10px;">
            <p>Aciertos: ${aciertos} | Fallos: ${fallos} | Blancos: ${blancos}</p>
            <p><strong>Nota Bruta:</strong> ${notaBase.toFixed(2)} / ${validas}</p>
            <p style="font-size: 0.85rem; color: #666;">
                Cálculo: ((${notaBase.toFixed(2)} - 39.50) * 20 / 60.50) + 20
            </p>
        </div>
    `;

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