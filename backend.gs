/**
 * BACKEND GOOGLE APPS SCRIPT (backend.gs)
 * 
 * Instruções:
 * 1. Abra o Google Sheets do casamento (onde já existe a aba de RSVP "Confirmações").
 * 2. Vá em Extensões > Apps Script.
 * 3. Atualize o código do backend para conter as funções abaixo (ou substitua se for arquivo único).
 * 4. Certifique-se de criar uma aba chamada "Rifa" com os cabeçalhos:
 *    Data/Hora | Grupo ID | Comprador | Cotas | Qtd | Valor (R$) | Status
 * 5. Clique em Implantar > Gerenciar implantações > Editar > Nova versão > Implantar.
 * 6. Copie a URL do Web App gerada e cole na variável SCRIPT_URL em script.js.
 */

const SPREADSHEET_ID = "1p49fw8iNIkNSbn1e1N-DQtqTmQKBybvr0DEsPd7rSow";
const SHEET_RSVP = "Confirmações";
const SHEET_RIFA = "Rifa";

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || "{}");
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // Rota da Rifa
    if (payload.action === "buyRaffle") {
      let sheetRifa = ss.getSheetByName(SHEET_RIFA);
      if (!sheetRifa) {
        sheetRifa = ss.insertSheet(SHEET_RIFA);
        sheetRifa.appendRow(["Data/Hora", "Grupo ID", "Comprador", "Cotas", "Qtd", "Valor (R$)", "Status"]);
      }

      sheetRifa.appendRow([
        new Date(),
        payload.groupId || "",
        payload.buyerName || "",
        payload.quotas.join(", "),
        payload.quotas.length,
        payload.totalAmount,
        "Pendente (Aguardando Pix)" // Altere manualmente para 'Confirmado' ou 'Pago' ao conferir o Pix
      ]);

      return jsonResponse({ ok: true, message: "Reserva realizada com sucesso!" });
    }

    // Rota tradicional do RSVP (caso compartilhe o mesmo backend)
    const sheet = ss.getSheetByName(SHEET_RSVP);
    if (!sheet) throw new Error("Aba 'Confirmações' não encontrada.");

    const responseId = Utilities.getUuid();
    const submittedAt = new Date(payload.submittedAt || new Date());
    const rows = (payload.responses || []).map(item => [
      submittedAt,
      responseId,
      payload.invitationGroup || "",
      payload.contactName || "",
      item.guest || "",
      item.presence || "",
      payload.note || ""
    ]);

    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    return jsonResponse({ ok: true, responseId, savedRows: rows.length });

  } catch (error) {
    return jsonResponse({ ok: false, error: String(error && error.message ? error.message : error) });
  }
}

// Retorna as cotas reservadas/pagas e tickets aptos para o sorteador
function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetRifa = ss.getSheetByName(SHEET_RIFA);

    if (!sheetRifa) {
      return jsonResponse({ ok: true, takenQuotas: [], paidTickets: [] });
    }

    const data = sheetRifa.getDataRange().getValues();
    const taken = [];
    const paidTickets = []; // Array de { number: 14, buyer: "Nome" }

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const buyer = String(row[2] || "Convidado").trim();
      const rawCotas = String(row[3] || "").split(",");
      const status = String(row[6] || "").toLowerCase();

      rawCotas.forEach(c => {
        const num = parseInt(c.trim(), 10);
        if (!isNaN(num)) {
          taken.push(num);
          // Se confirmado, pago ou em branco no teste, entra no sorteador
          if (status.includes("confirmado") || status.includes("pago") || status === "") {
            paidTickets.push({ number: num, buyer: buyer });
          }
        }
      });
    }

    return jsonResponse({
      ok: true,
      takenQuotas: taken,
      paidTickets: paidTickets
    });

  } catch (err) {
    return jsonResponse({ ok: false, takenQuotas: [], paidTickets: [], error: String(err) });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
