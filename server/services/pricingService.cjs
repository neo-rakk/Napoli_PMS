'use strict';
const db = require('../db/database.cjs');

async function getPublicTarif(type_chambre, formule) {
  const tarif = await db.get(
    "SELECT * FROM tarifs WHERE type_chambre = $1 AND formule = $2 AND actif = 1", 
    [type_chambre, formule]
  );
  return tarif;
}

function calcRepas(tarif) {
  if (!tarif) return 0;
  return (tarif.prix_pdj || 0) + (tarif.prix_dejeuner || 0) + (tarif.prix_diner || 0);
}

async function getActiveContract(grand_compte_id, dateRef) {
  const d = dateRef || new Date();
  const dateStr = d.toISOString().split('T')[0];
  const contrat = await db.get(
    "SELECT * FROM contrats WHERE grand_compte_id = $1 AND actif = 1 AND date_debut <= $2 AND date_fin >= $2", 
    [grand_compte_id, dateStr]
  );
  return contrat;
}

async function resolveReservationPricing({ type_chambre, formule, grandCompteId, dateRef }) {
  const publicTarif = await getPublicTarif(type_chambre, formule);
  if (!publicTarif) {
    throw new Error(`Aucun tarif public trouvé pour Chambre ${type_chambre} / Formule ${formule}`);
  }

  const contrat = grandCompteId ? await getActiveContract(grandCompteId, dateRef) : null;

  if (!grandCompteId || !contrat) {
    return { 
      source: 'public', 
      tarif_id: publicTarif.id,
      prix_nuit: publicTarif.prix_nuit, 
      prix_repas: calcRepas(publicTarif) 
    };
  }

  const factor = 1 - (contrat.remise_percent || 0) / 100;
  return {
    source: 'contrat',
    tarif_id: publicTarif.id,
    prix_nuit: contrat.prix_nuit_override ?? (publicTarif.prix_nuit * factor),
    prix_repas: contrat.prix_repas_override ?? (calcRepas(publicTarif) * factor),
    contrat_id: contrat.id
  };
}

module.exports = { resolveReservationPricing, getPublicTarif, calcRepas, getActiveContract };
