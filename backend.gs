/**
 * BACKEND GOOGLE APPS SCRIPT (backend.gs)
 * 
 * Atualizado com:
 * 1. doPost: rota 'buyRaffle' (reserva do convidado) e 'confirmPayment' (baixa do admin)
 * 2. doGet: rota padrão (cotas e tickets para o sorteio) e rota 'adminList' (lista de reservas para o painel)
 */

const SPREADSHEET_ID = "1TopALI7FAZMiG65z9NBYTlTx23kJWkY_4mBGJq5Gvrq9r-Epnz3HYY9Y";
const SHEET_RSVP = "Confirmações";
const SHEET_RIFA = "Rifa";
const ADMIN_PASSWORD = "Lum@06112020";

function getSpreadsheet() {
  try {
    return SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (e) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || "{}");
    const ss = getSpreadsheet();

    // Rota 1: Convidado reservando cotas
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
        "Pendente (Aguardando Pix)"
      ]);

      return jsonResponse({ ok: true, message: "Reserva realizada com sucesso!" });
    }

    // Rota 2: Admin confirmando o Pix pelo painel
    if (payload.action === "confirmPayment") {
      if (payload.password !== ADMIN_PASSWORD) {
        return jsonResponse({ ok: false, error: "Senha incorreta!" });
      }

      const sheetRifa = ss.getSheetByName(SHEET_RIFA);
      if (!sheetRifa) return jsonResponse({ ok: false, error: "Aba Rifa não encontrada." });

      const rowIndex = parseInt(payload.rowIndex, 10);
      if (!rowIndex || rowIndex < 2) return jsonResponse({ ok: false, error: "Linha inválida." });

      // Coluna 7 é a coluna de Status
      const currentStatus = sheetRifa.getRange(rowIndex, 7).getValue();
      const newStatus = payload.status || "Confirmado";
      sheetRifa.getRange(rowIndex, 7).setValue(newStatus);

      return jsonResponse({ ok: true, message: `Status alterado para ${newStatus} com sucesso!` });
    }

    // Rota 3: RSVP tradicional
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

function doGet(e) {
  try {
    const ss = getSpreadsheet();
    const sheetRifa = ss.getSheetByName(SHEET_RIFA);

    if (!sheetRifa) {
      return jsonResponse({ ok: true, takenQuotas: [], paidTickets: [], orders: [] });
    }

    const data = sheetRifa.getDataRange().getValues();

    // Rota especial do painel admin
    if (e && e.parameter && e.parameter.action === "adminList") {
      if (e.parameter.password !== ADMIN_PASSWORD) {
        return jsonResponse({ ok: false, error: "Senha incorreta!" });
      }

      const orders = [];
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        orders.push({
          rowIndex: i + 1, // 1-indexed para facilitar o update
          date: row[0] instanceof Date ? Utilities.formatDate(row[0], "GMT-3", "dd/MM/yyyy HH:mm") : String(row[0]),
          groupId: String(row[1] || ""),
          buyer: String(row[2] || "Sem Nome"),
          quotas: String(row[3] || ""),
          qty: row[4],
          amount: row[5],
          status: String(row[6] || "Pendente")
        });
      }
      return jsonResponse({ ok: true, orders: orders.reverse() }); // Mais recentes primeiro
    }

    // Rota padrão (para a página pública carregar cotas e sorteador)
    const taken = [];
    const paidTickets = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const buyer = String(row[2] || "Convidado").trim();
      const rawCotas = String(row[3] || "").split(",");
      const status = String(row[6] || "").toLowerCase();

      rawCotas.forEach(c => {
        const num = parseInt(c.trim(), 10);
        if (!isNaN(num)) {
          taken.push(num);
          // Apenas confirmados/pagos entram no sorteio oficial
          if (status.includes("confirmado") || status.includes("pago")) {
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
