'use strict';

function calculerStatutChambre(nb_occupants_actuels, capacite_max) {
  if (nb_occupants_actuels <= 0) return 'libre';
  if (nb_occupants_actuels < capacite_max) return 'partielle';
  return 'occupee';
}

module.exports = { calculerStatutChambre };
