const canvas = document.getElementById('simuladorCanvas');
const ctx = canvas.getContext('2d');

const tipoInput = document.getElementById('input-tipo');
const h0Input = document.getElementById('input-h0');
const angleInput = document.getElementById('input-angle');
const angleVal = document.getElementById('angle-val');
const v0Input = document.getElementById('input-v0');

const timeDisplay = document.getElementById('time-display');
const xDisplay = document.getElementById('x-display');
const yDisplay = document.getElementById('y-display');
const vyDisplay = document.getElementById('vy-display');

const mundo = {
    gravidade: 9.81,
    escala: 15,
    soloY: 380,
    origemX: 50
};

// --- Estado do Simulador ---
const paletaCores = ['#e53935', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa'];
let contagemDisparos = 0;
let trajetoriasSalvas = [];

let projetil = {
    x: 0, y: 0, vx: 0, vy: 0,
    rastro: [], ativo: false, tempo: 0, corAtual: '#e53935'
};

// --- Configuração do Gráfico ---
const chartCtx = document.getElementById('kinematicsChart').getContext('2d');
let kinematicsChart = new Chart(chartCtx, {
    type: 'scatter',
    data: { datasets: [] },
    options: { 
        responsive: true, maintainAspectRatio: false,
        scales: {
            x: { type: 'linear', position: 'bottom', title: { display: true, text: 'Distância Horizontal (m)' }, min: 0 },
            y: { title: { display: true, text: 'Altura (m)' }, min: 0 }
        },
        plugins: { tooltip: { enabled: false } }
    }
});

// --- FUNÇÃO DE RENDERIZAÇÃO ---
function renderizarMundo() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Solo
    ctx.fillStyle = "#8d6e63";
    ctx.fillRect(0, mundo.soloY, canvas.width, 20);

    // Calcular Altura Inicial do Canhão
    const h0Metros = parseFloat(h0Input.value) || 0;
    const h0Pixels = h0Metros * mundo.escala;
    const baseCanhaoY = mundo.soloY - h0Pixels;

    // Desenhar Torre (se houver altura)
    if (h0Pixels > 0) {
        ctx.fillStyle = "#546e7a";
        ctx.fillRect(mundo.origemX - 15, baseCanhaoY, 30, h0Pixels);
    }

    // Desenhar Canhão
    const rad = (angleInput.value * Math.PI) / 180;
    ctx.save();
    ctx.translate(mundo.origemX, baseCanhaoY); 
    ctx.rotate(-rad); 
    
    ctx.fillStyle = "#37474f";
    ctx.fillRect(0, -10, 45, 20); 
    
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fillStyle = "#263238";
    ctx.fill();
    ctx.restore();

    // Rastro antigo
    trajetoriasSalvas.forEach(traj => {
        traj.pontos.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = traj.cor;
            ctx.fill();
        });
    });

    // Rastro atual
    projetil.rastro.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = projetil.corAtual;
        ctx.fill();
    });

    // Bolinha ativa
    if (projetil.ativo) {
        ctx.beginPath();
        ctx.arc(projetil.x, projetil.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = projetil.corAtual;
        ctx.fill();
        ctx.strokeStyle = "#000";
        ctx.stroke();
    }
}

// --- FÍSICA E LÓGICA ---
function disparar() {
    if (projetil.ativo) return;

    const v0 = parseFloat(v0Input.value);
    const angulo = parseFloat(angleInput.value);
    const rad = (angulo * Math.PI) / 180;
    
    const h0Metros = parseFloat(h0Input.value) || 0;
    const h0Pixels = h0Metros * mundo.escala;
    const baseCanhaoY = mundo.soloY - h0Pixels;

    projetil.corAtual = paletaCores[contagemDisparos % paletaCores.length];
    
    const tipoLabel = tipoInput.options[tipoInput.selectedIndex].text;
    kinematicsChart.data.datasets.push({
        label: `Tiro ${contagemDisparos + 1} (${tipoLabel}, V₀=${v0})`,
        borderColor: projetil.corAtual,
        backgroundColor: projetil.corAtual,
        data: [],
        showLine: true,
        tension: 0.4
    });
    
    contagemDisparos++;
    projetil.tempo = 0;
    projetil.rastro = [];
    
    // Posição de Saída da bolinha
    projetil.x = mundo.origemX + Math.cos(rad) * 45;
    projetil.y = baseCanhaoY - Math.sin(rad) * 45; 
    
    projetil.vx = v0 * Math.cos(rad);
    projetil.vy = -v0 * Math.sin(rad); 
    
    projetil.ativo = true;
    atualizarFisica();
}

function atualizarFisica() {
    if (!projetil.ativo) return;

    const dt = 0.05; 
    projetil.tempo += dt;

    projetil.x += projetil.vx * mundo.escala * dt;
    projetil.vy += mundo.gravidade * dt;
    projetil.y += projetil.vy * mundo.escala * dt;

    projetil.rastro.push({x: projetil.x, y: projetil.y});

    const posXMetros = (projetil.x - mundo.origemX) / mundo.escala;
    const posYMetros = (mundo.soloY - projetil.y) / mundo.escala;
    const vyReal = -projetil.vy;
    
    timeDisplay.innerText = projetil.tempo.toFixed(2);
    xDisplay.innerText = posXMetros.toFixed(2);
    yDisplay.innerText = Math.max(0, posYMetros).toFixed(2);
    vyDisplay.innerText = vyReal.toFixed(2);

    if (Math.round(projetil.tempo * 100) % 10 === 0) {
        const datasetAtual = kinematicsChart.data.datasets.length - 1;
        kinematicsChart.data.datasets[datasetAtual].data.push({
            x: parseFloat(posXMetros.toFixed(2)),
            y: parseFloat(Math.max(0, posYMetros).toFixed(2))
        });
        kinematicsChart.update('none'); 
    }

    if (projetil.y >= mundo.soloY) {
        projetil.y = mundo.soloY;
        projetil.ativo = false;
        vyDisplay.innerText = "0.00";
        
        trajetoriasSalvas.push({
            pontos: [...projetil.rastro],
            cor: projetil.corAtual
        });
        
        kinematicsChart.update();
    }

    renderizarMundo();
    if (projetil.ativo) requestAnimationFrame(atualizarFisica);
}

// --- EVENTOS E LISTENERS ---

// Lógica de Troca de Modo
tipoInput.addEventListener('change', () => {
    const tipo = tipoInput.value;
    
    if (tipo === 'horizontal') {
        angleInput.value = 0;
        angleInput.disabled = true;
        if (h0Input.value == 0) h0Input.value = 15; // Evita tiro rasteiro
    } 
    else if (tipo === 'vertical') {
        angleInput.value = 90;
        angleInput.disabled = true;
    } 
    else { 
        angleInput.disabled = false;
    }
    
    angleVal.innerText = `${angleInput.value}°`;
    renderizarMundo();
});

h0Input.addEventListener('input', renderizarMundo);
angleInput.addEventListener('input', () => {
    angleVal.innerText = `${angleInput.value}°`;
    renderizarMundo();
});

document.getElementById('btn-fire').addEventListener('click', disparar);

document.getElementById('btn-clear').addEventListener('click', () => {
    projetil.ativo = false;
    projetil.rastro = [];
    trajetoriasSalvas = [];
    contagemDisparos = 0;
    
    timeDisplay.innerText = "0.00";
    xDisplay.innerText = "0.00";
    yDisplay.innerText = "0.00";
    vyDisplay.innerText = "0.00";
    
    kinematicsChart.data.datasets = [];
    kinematicsChart.update();
    renderizarMundo();
});

document.getElementById('btn-convert').addEventListener('click', () => {
    const kmh = parseFloat(document.getElementById('input-kmh').value);
    if (!isNaN(kmh)) v0Input.value = (kmh / 3.6).toFixed(2);
});

renderizarMundo();