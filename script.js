/* =========================================================
   RIFA DE CASAMENTO • LUAN & MADU (1 A 100)
   ========================================================= */

// URL do Google Apps Script publicado
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx3TT-BFivmXn1QyPHjBXMfGsh_m5o8YkoRNk2CZ0XcmiRlXnYWXAkR4t-T55hyNRS7/exec";

// Configurações gerais
const TOTAL_QUOTAS = 100;
const WHATSAPP_PHONE = "5521974879191"; // 97487-9191 com DDD 21
const PIX_KEY = "10299329992"; // Chave Pix fornecida

let selectedQuotas = [];
let takenQuotas = []; // Carregado em tempo real do Google Sheets

/* =========================================================
   CÁLCULO DE COMBOS E PREÇOS
   1 cota = R$ 100
   2 cotas = R$ 200
   3 cotas = R$ 300
   6 cotas (Combo Padrinho) = R$ 500 (1 cota bônus)
   ========================================================= */
function calculatePrice(count) {
  if (count <= 0) return 0;
  if (count >= 6) return Math.floor(count / 6) * 500 + calculatePrice(count % 6);
  return count * 100;
}

/* =========================================================
   CARREGAMENTO E RENDERIZAÇÃO DA GRADE
   ========================================================= */
async function loadTakenQuotas() {
  try {
    if (SCRIPT_URL && !SCRIPT_URL.includes("SEU_ID_DO_SCRIPT")) {
      const res = await fetch(SCRIPT_URL);
      const data = await res.json();
      if (data.ok && Array.isArray(data.takenQuotas)) {
        takenQuotas = data.takenQuotas;
      }
    }
  } catch (e) {
    console.log("Modo offline / cotas padrão:", e);
  }
  renderQuotaGrid();
}

function renderQuotaGrid() {
  const grid = document.getElementById("quota-grid");
  if (!grid) return;
  grid.innerHTML = "";

  for (let i = 1; i <= TOTAL_QUOTAS; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "quota-num";
    btn.textContent = String(i).padStart(3, "0");

    const isTaken = takenQuotas.includes(i);
    const isSelected = selectedQuotas.includes(i);

    if (isTaken) {
      btn.classList.add("taken");
      btn.disabled = true;
      btn.title = "Cota já reservada";
    } else if (isSelected) {
      btn.classList.add("selected");
      btn.onclick = () => toggleQuota(i);
    } else {
      btn.onclick = () => toggleQuota(i);
    }

    grid.appendChild(btn);
  }

  updateCheckoutBar();
}

function toggleQuota(num) {
  if (takenQuotas.includes(num)) return;
  
  if (selectedQuotas.includes(num)) {
    selectedQuotas = selectedQuotas.filter(n => n !== num);
  } else {
    selectedQuotas.push(num);
    selectedQuotas.sort((a, b) => a - b);
  }
  
  renderQuotaGrid();
}

function selectCombo(quantity) {
  selectedQuotas = [];
  const available = [];
  
  for (let i = 1; i <= TOTAL_QUOTAS; i++) {
    if (!takenQuotas.includes(i)) {
      available.push(i);
    }
  }

  if (available.length < quantity) {
    alert("Não há cotas livres suficientes para este combo!");
    return;
  }

  // Seleciona as primeiras disponíveis
  selectedQuotas = available.slice(0, quantity);
  renderQuotaGrid();
}

function updateCheckoutBar() {
  const bar = document.getElementById("rifa-checkout-bar");
  const summary = document.getElementById("selected-summary");
  const total = document.getElementById("selected-total");
  if (!bar) return;

  if (selectedQuotas.length === 0) {
    bar.classList.add("hidden");
  } else {
    bar.classList.remove("hidden");
    const val = calculatePrice(selectedQuotas.length);
    const formattedNumbers = selectedQuotas.map(n => String(n).padStart(3, "0")).join(", ");
    summary.textContent = `${selectedQuotas.length} cota(s) [${formattedNumbers}]`;
    total.textContent = `Total: R$ ${val},00`;
  }
}

/* =========================================================
   MODAL DE CHECKOUT / PIX
   ========================================================= */
function openRifaModal() {
  const modal = document.getElementById("rifa-modal");
  const desc = document.getElementById("modal-quotas-text");
  const pixInput = document.getElementById("pix-key-input");
  
  if (pixInput) pixInput.value = PIX_KEY;

  const val = calculatePrice(selectedQuotas.length);
  const formattedNumbers = selectedQuotas.map(n => String(n).padStart(3, "0")).join(", ");
  
  desc.innerHTML = `Você está reservando <strong>${selectedQuotas.length} cota(s)</strong>: <strong>[${formattedNumbers}]</strong>.<br>Valor total: <strong>R$ ${val},00</strong>.`;
  modal.classList.remove("hidden");
}

function closeRifaModal() {
  document.getElementById("rifa-modal")?.classList.add("hidden");
}

function copyPixKey() {
  const input = document.getElementById("pix-key-input");
  if (!input) return;
  input.select();
  navigator.clipboard.writeText(input.value);
  alert("Chave Pix copiada com sucesso!");
}

document.getElementById("rifa-form")?.addEventListener("submit", async e => {
  e.preventDefault();
  const buyer = document.getElementById("rifa-buyer").value.trim();
  const val = calculatePrice(selectedQuotas.length);
  const btn = document.getElementById("btn-submit-rifa");
  
  btn.disabled = true;
  btn.querySelector("span").textContent = "Enviando reserva...";

  const payload = {
    action: "buyRaffle",
    buyerName: buyer,
    quotas: selectedQuotas,
    totalAmount: val
  };

  try {
    if (SCRIPT_URL && !SCRIPT_URL.includes("SEU_ID_DO_SCRIPT")) {
      await fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });
    }

    // Mensagem para o WhatsApp
    const cotasStr = selectedQuotas.map(n => String(n).padStart(3, "0")).join(", ");
    const msg = encodeURIComponent(
      `Olá! Acabei de reservar as cotas [${cotasStr}] da Rifa de Casamento no nome de "${buyer}" (Total: R$ ${val},00). Segue o comprovante do Pix!`
    );
    window.open(`https://wa.me/${WHATSAPP_PHONE}?text=${msg}`, "_blank");

    closeRifaModal();
    // Marca como reservado localmente
    takenQuotas = [...takenQuotas, ...selectedQuotas];
    selectedQuotas = [];
    renderQuotaGrid();
    alert("Reserva concluída com sucesso! Envie agora o comprovante pelo WhatsApp aberto.");
  } catch (err) {
    console.error(err);
    alert("Erro ao registrar reserva online. Mas não se preocupe: avise os noivos diretamente no WhatsApp!");
  } finally {
    btn.disabled = false;
    btn.querySelector("span").textContent = "Confirmar e Avisar no WhatsApp";
  }
});

/* =========================================================
   SORTEADOR AO VIVO (CLÍMAX DA FESTA)
   ========================================================= */
let paidTicketsList = [];
let drawStep = 3; // 3º lugar -> 2º lugar -> 1º lugar
let winners = { prize3: null, prize2: null, prize1: null };

function celebrate() {
  if (typeof confetti === "function") {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  }
}

async function openDrawStage() {
  const stage = document.getElementById("draw-stage");
  stage.classList.remove("hidden");
  document.body.style.overflow = "hidden";

  try {
    if (SCRIPT_URL && !SCRIPT_URL.includes("SEU_ID_DO_SCRIPT")) {
      const res = await fetch(SCRIPT_URL);
      const data = await res.json();
      if (data.ok && Array.isArray(data.paidTickets)) {
        paidTicketsList = data.paidTickets;
      }
    }
  } catch (err) {
    console.log("Erro ao buscar tickets pagos:", err);
  }

  // Fallback se não houver conexão
  if (!paidTicketsList || !paidTicketsList.length) {
    paidTicketsList = [
      { number: 12, buyer: "Guilherme Siega" },
      { number: 14, buyer: "Queila Antunes" },
      { number: 22, buyer: "Matheus Lopes" },
      { number: 33, buyer: "Aline Oliveira" },
      { number: 45, buyer: "Danieli Ribeiro" },
      { number: 77, buyer: "Walter Siega" },
      { number: 99, buyer: "Jaime Barreto" }
    ];
  }
}

function closeDrawStage() {
  document.getElementById("draw-stage").classList.add("hidden");
  document.body.style.overflow = "";
}

function runDrawStep() {
  if (drawStep < 1) {
    alert("Todos os prêmios já foram sorteados!");
    return;
  }

  // Filtra números que já ganharam prêmio anterior
  const wonNumbers = Object.values(winners).filter(Boolean).map(w => w.number);
  const eligible = paidTicketsList.filter(t => !wonNumbers.includes(t.number));

  if (!eligible.length) {
    alert("Não há cotas aptas restantes para o sorteio!");
    return;
  }

  const btn = document.getElementById("btn-draw");
  btn.disabled = true;
  const numEl = document.getElementById("roulette-number");
  const nameEl = document.getElementById("roulette-name");

  // Animação de roleta por 3.5 segundos
  let counter = 0;
  const interval = setInterval(() => {
    const randomTicket = eligible[Math.floor(Math.random() * eligible.length)];
    numEl.textContent = String(randomTicket.number).padStart(3, "0");
    nameEl.textContent = randomTicket.buyer;
    counter += 70;

    if (counter >= 3500) {
      clearInterval(interval);
      const chosen = eligible[Math.floor(Math.random() * eligible.length)];
      numEl.textContent = String(chosen.number).padStart(3, "0");
      nameEl.textContent = chosen.buyer;

      applyWinner(drawStep, chosen);
      btn.disabled = false;
      drawStep--;

      celebrate();

      // Ajusta o botão e badges para a próxima etapa
      if (drawStep === 2) {
        btn.querySelector("span").textContent = "Sortear 2º Lugar 🎁";
        document.getElementById("step-3").classList.remove("active");
        document.getElementById("step-2").classList.add("active");
      } else if (drawStep === 1) {
        btn.querySelector("span").textContent = "Sortear GRANDE PRÊMIO (1º Lugar)! 🏆";
        document.getElementById("step-2").classList.remove("active");
        document.getElementById("step-1").classList.add("active");
      } else {
        btn.querySelector("span").textContent = "Sorteio Concluído! 🎉";
        btn.disabled = true;
        document.getElementById("step-1").classList.remove("active");
      }
    }
  }, 70);
}

function applyWinner(step, winner) {
  if (step === 3) {
    winners.prize3 = winner;
    const card = document.getElementById("podium-3");
    card.querySelector(".winner-name").textContent = winner.buyer;
    card.querySelector(".winner-cota").textContent = `Cota: ${String(winner.number).padStart(3, "0")}`;
    card.classList.add("revealed");
  } else if (step === 2) {
    winners.prize2 = winner;
    const card = document.getElementById("podium-2");
    card.querySelector(".winner-name").textContent = winner.buyer;
    card.querySelector(".winner-cota").textContent = `Cota: ${String(winner.number).padStart(3, "0")}`;
    card.classList.add("revealed");
  } else if (step === 1) {
    winners.prize1 = winner;
    const card = document.getElementById("podium-1");
    card.querySelector(".winner-name").textContent = winner.buyer;
    card.querySelector(".winner-cota").textContent = `Cota: ${String(winner.number).padStart(3, "0")}`;
    card.classList.add("revealed");
  }
}

// Inicializa a grade ao carregar a página
window.addEventListener("DOMContentLoaded", loadTakenQuotas);
