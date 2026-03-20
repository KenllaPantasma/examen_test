// CONFIGURACIÓN
const ID_ANULADA = 5; 
const ID_RESERVA_SUSTITUTA = 101; 
let segundos = 0;
let cronometroInterval; // Variable para controlar el intervalo

function iniciarCronometro() {
    // Guardamos el intervalo en la variable para poder pararlo luego
    cronometroInterval = setInterval(() => {
        segundos++;
        const h = Math.floor(segundos / 3600).toString().padStart(2, '0');
        const m = Math.floor((segundos % 3600) / 60).toString().padStart(2, '0');
        const s = (segundos % 60).toString().padStart(2, '0');
        document.getElementById('timer').textContent = `${h}:${m}:${s}`;
    }, 1000);
}

function renderizarPreguntas() {
    const container = document.getElementById('quiz-container');
    
    // bancoDePreguntas proviene de tu archivo EXAMEN_2025.js
    bancoDePreguntas.forEach(p => {
        if (p.id === 101) {
            const header = document.createElement('div');
            header.className = 'reserva-header';
            header.innerHTML = "<h3>Preguntas de Reserva</h3><small>Sustituyen a las anuladas por orden</small>";
            container.appendChild(header);
        }

        const card = document.createElement('div');
        const esAnulada = p.id === ID_ANULADA;
        card.className = `pregunta-card ${esAnulada ? 'anulada' : ''}`;
        card.id = `card-${p.id}`;

        card.innerHTML = `
            <span class="flag-btn" onclick="toggleFlag(${p.id})">🚩</span>
            <p><strong>${p.enunciado}</strong> ${esAnulada ? '<b style="color:red"> [ANULADA]</b>' : ''}</p>
            <div class="opciones">
                ${Object.entries(p.opciones).map(([key, val]) => `
                    <label class="opcion-label">
                        <input type="radio" name="p${p.id}" value="${key}" ${esAnulada ? 'disabled' : ''}>
                        ${key}) ${val}
                    </label>
                `).join('')}
            </div>
            <div class="actions-row">
                <button class="btn-clear" onclick="limpiarSeleccion(${p.id})">Borrar respuesta</button>
            </div>
        `;
        container.appendChild(card);
    });
}

function toggleFlag(id) {
    const card = document.getElementById(`card-${id}`);
    const btn = card.querySelector('.flag-btn');
    card.classList.toggle('marked');
    btn.classList.toggle('active');
}

function limpiarSeleccion(id) {
    const radios = document.getElementsByName(`p${id}`);
    radios.forEach(r => r.checked = false);
}

function corregirExamen() {
    // 1. PARAR EL CRONÓMETRO
    clearInterval(cronometroInterval);
    
    let aciertos = 0;
    let fallos = 0;
    let blancos = 0;

    bancoDePreguntas.forEach(p => {
        const input = document.querySelector(`input[name="p${p.id}"]:checked`);
        const card = document.getElementById(`card-${p.id}`);
        const labels = card.querySelectorAll('.opcion-label');

        labels.forEach(l => {
            const radio = l.querySelector('input');
            if (radio.value === p.correcta) l.classList.add('es-correcta');
            if (input && radio.checked && radio.value !== p.correcta) l.classList.add('es-incorrecta');
        });

        // Contamos las 100 primeras (menos la 5) + la 101 de reserva
        const cuentaParaNota = (p.id <= 100 && p.id !== ID_ANULADA) || p.id === ID_RESERVA_SUSTITUTA;

        if (cuentaParaNota) {
            if (!input) {
                blancos++;
            } else if (input.value === p.correcta) {
                aciertos++;
            } else {
                fallos++;
            }
        }
    });

    const notaFinal = Math.max(0, (aciertos * 1) - (fallos * 0.25));
    mostrarResultados(notaFinal, aciertos, fallos, blancos);
}

function mostrarResultados(nota, a, f, b) {
    document.getElementById('btn-submit').style.display = 'none';
    const panel = document.getElementById('resultado-panel');
    panel.classList.remove('hidden');
    panel.style.display = 'block';
    
    // Cambiamos el color del timer para indicar que se ha detenido
    document.getElementById('timer-sticky').style.backgroundColor = '#27ae60'; 

    document.getElementById('nota-display').textContent = nota.toFixed(2);
    document.getElementById('desglose-display').innerHTML = `
        Aciertos: <strong>${a}</strong> | 
        Fallos: <strong>${f}</strong> | 
        En blanco: <strong>${b}</strong><br>
        <small>Tiempo total empleado: ${document.getElementById('timer').textContent}</small>
    `;
    
    panel.scrollIntoView({ behavior: 'smooth' });
}

window.onload = () => {
    renderizarPreguntas();
    iniciarCronometro();
};