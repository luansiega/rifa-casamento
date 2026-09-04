const TICKET_PRICE = 100;
const TOTAL_NUMBERS = 100;

// Mock inicial para testar o visual antes de plugar o Apps Script
const mockData = {
  3: { status: 'reserved', buyer: 'M. Silva' },
  7: { status: 'paid', buyer: 'A. Costa' },
  12: { status: 'paid', buyer: 'J. Pedro' },
  45: { status: 'reserved', buyer: 'C. Ramos' }
};

let selectedNumbers = new Set();

const grid = document.getElementById('numbersGrid');
const floatingBar = document.getElementById('floatingBar');
const selectedCountText = document.getElementById('selectedCountText');
const totalPriceText = document.getElementById('totalPriceText');
const btnContinue = document.getElementById('btnContinue');
const modal = document.getElementById('checkoutModal');
const btnCloseModal = document.getElementById('btnCloseModal');
const form = document.getElementById('reservationForm');
const stepForm = document.getElementById('stepForm');
const stepPix = document.getElementById('stepPix');
const selectedTags = document.getElementById('selectedTags');
const pixTotalValue = document.getElementById('pixTotalValue');
const btnCopyPix = document.getElementById('btnCopyPix');
const pixKeyInput = document.getElementById('pixKeyInput');
const btnFinish = document.getElementById('btnFinish');

function renderGrid() {
  grid.innerHTML = '';
  let soldCount = 0;

  for (let i = 1; i <= TOTAL_NUMBERS; i++) {
    const cell = document.createElement('div');
    cell.classList.add('num-cell');
    
    const formattedNum = String(i).padStart(2, '0');
    const mock = mockData[i];

    if (mock) {
      cell.classList.add(mock.status);
      cell.innerHTML = `
        <span class="num-label">${formattedNum}</span>
        <span class="num-buyer">${mock.buyer}</span>
      `;
      soldCount++;
    } else {
      cell.innerHTML = `<span class="num-label">${formattedNum}</span>`;
      
      if (selectedNumbers.has(i)) {
        cell.classList.add('selected');
      }

      cell.addEventListener('click', () => toggleSelect(i));
    }

    grid.appendChild(cell);
  }

  updateStats(soldCount);
}

function toggleSelect(number) {
  if (selectedNumbers.has(number)) {
    selectedNumbers.delete(number);
  } else {
    selectedNumbers.add(number);
  }
  updateFloatingBar();
  renderGrid();
}

function updateFloatingBar() {
  const count = selectedNumbers.size;
  if (count > 0) {
    floatingBar.classList.add('active');
    selectedCountText.innerText = `${count} ${count === 1 ? 'número selecionado' : 'números selecionados'}`;
    totalPriceText.innerText = `R$ ${(count * TICKET_PRICE).toFixed(2).replace('.', ',')}`;
  } else {
    floatingBar.classList.remove('active');
  }
}

function updateStats(soldCount) {
  const totalOccupied = soldCount;
  const available = TOTAL_NUMBERS - totalOccupied;
  document.getElementById('statSold').innerText = `${totalOccupied} ocupados`;
  document.getElementById('statAvailable').innerText = `${available} disponíveis`;
  document.getElementById('progressFill').style.width = `${(totalOccupied / TOTAL_NUMBERS) * 100}%`;
}

// Modal Checkout
btnContinue.addEventListener('click', () => {
  if (selectedNumbers.size === 0) return;

  selectedTags.innerHTML = '';
  Array.from(selectedNumbers).sort((a,b) => a - b).forEach(n => {
    const tag = document.createElement('span');
    tag.classList.add('num-tag');
    tag.innerText = `Nº ${String(n).padStart(2, '0')}`;
    selectedTags.appendChild(tag);
  });

  stepForm.classList.remove('hidden');
  stepPix.classList.add('hidden');
  modal.classList.add('active');
});

btnCloseModal.addEventListener('click', () => {
  modal.classList.remove('active');
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('fullName').value.trim();
  const whatsapp = document.getElementById('whatsapp').value.trim();

  if (!name.includes(' ')) {
    alert('Por favor, informe seu nome e pelo menos um sobrenome.');
    return;
  }

  // Simula reserva local
  const names = name.split(' ');
  const shortName = `${names[0][0]}. ${names[names.length - 1]}`;
  
  selectedNumbers.forEach(n => {
    mockData[n] = { status: 'reserved', buyer: shortName };
  });

  const total = selectedNumbers.size * TICKET_PRICE;
  pixTotalValue.innerText = `R$ ${total.toFixed(2).replace('.', ',')}`;

  selectedNumbers.clear();
  updateFloatingBar();
  renderGrid();

  stepForm.classList.add('hidden');
  stepPix.classList.remove('hidden');
});

btnCopyPix.addEventListener('click', () => {
  pixKeyInput.select();
  navigator.clipboard.writeText(pixKeyInput.value);
  btnCopyPix.innerText = 'Copiado!';
  setTimeout(() => { btnCopyPix.innerText = 'Copiar'; }, 2000);
});

btnFinish.addEventListener('click', () => {
  modal.classList.remove('active');
});

// Inicia
renderGrid();
