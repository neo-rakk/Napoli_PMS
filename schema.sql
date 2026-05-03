-- System Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  agent_id BIGINT REFERENCES agents(id),
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS agents (
  id                   BIGSERIAL PRIMARY KEY,
  nom                  TEXT NOT NULL,
  prenom               TEXT NOT NULL,
  role                 TEXT NOT NULL CHECK(role IN ('admin','accueil','caisse','housekeeping','maintenance','securite')),
  pin_hash             TEXT NOT NULL,
  email                TEXT UNIQUE,
  matricule            TEXT UNIQUE,
  telephone            TEXT,
  actif                INTEGER NOT NULL DEFAULT 1,
  doit_changer_pin     INTEGER NOT NULL DEFAULT 1,
  photo                TEXT,
  derniere_connexion   TIMESTAMP WITH TIME ZONE,
  created_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- For existing tables without these columns:
ALTER TABLE agents ADD COLUMN IF NOT EXISTS matricule TEXT UNIQUE;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS telephone TEXT;

CREATE TABLE IF NOT EXISTS blocs (
  id          BIGSERIAL PRIMARY KEY,
  nom         TEXT NOT NULL UNIQUE,
  code        TEXT UNIQUE,
  description TEXT,
  nb_etages   INTEGER NOT NULL DEFAULT 1,
  actif       INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chambres (
  id                    BIGSERIAL PRIMARY KEY,
  numero                TEXT NOT NULL UNIQUE,
  bloc                  TEXT,
  bloc_id               BIGINT REFERENCES blocs(id),
  etage                 INTEGER,
  type                  TEXT NOT NULL CHECK(type IN ('Single','Twin','Triple','Quad','Suite')),
  capacite_max          INTEGER NOT NULL DEFAULT 1,
  nb_occupants_actuels  INTEGER NOT NULL DEFAULT 0,
  statut                TEXT NOT NULL DEFAULT 'libre'
                        CHECK(statut IN ('libre','partielle','occupee','travaux','bloquee','stock_etage')),
  notes_maintenance     TEXT,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chambres_statut ON chambres(statut);
CREATE INDEX IF NOT EXISTS idx_chambres_bloc ON chambres(bloc);
CREATE INDEX IF NOT EXISTS idx_chambres_type ON chambres(type);

CREATE TABLE IF NOT EXISTS groupes (
  id                    BIGSERIAL PRIMARY KEY,
  nom                   TEXT NOT NULL,
  code                  TEXT NOT NULL UNIQUE,           
  sport                 TEXT,
  type_groupe           TEXT,
  pays                  TEXT,
  responsable_nom       TEXT,
  responsable_contact   TEXT,
  nb_membres_prevus     INTEGER DEFAULT 0,
  nb_membres_actuels    INTEGER DEFAULT 0,
  formule_groupe        TEXT CHECK(formule_groupe IN ('PD','DP','PC')),
  avec_restauration     INTEGER DEFAULT 1,
  date_arrivee          DATE,
  date_depart           DATE,
  statut                TEXT NOT NULL DEFAULT 'en_attente'
                        CHECK(statut IN ('en_attente','actif','checkout','annule')),
  notes                 TEXT,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_groupes_code ON groupes(code);
CREATE INDEX IF NOT EXISTS idx_groupes_statut ON groupes(statut);

CREATE TABLE IF NOT EXISTS clients (
  id                   BIGSERIAL PRIMARY KEY,
  nom                  TEXT NOT NULL,
  prenom               TEXT NOT NULL,
  date_naissance       DATE,
  lieu_naissance       TEXT,
  adresse_residence    TEXT,
  sexe                 TEXT CHECK(sexe IN ('M','F')),
  nationalite          TEXT DEFAULT 'DZ',
  est_etranger         INTEGER NOT NULL DEFAULT 0,
  nin                  TEXT UNIQUE,                    
  type_piece           TEXT,                           
  num_piece            TEXT,                           
  groupe_sanguin       TEXT DEFAULT 'ND'
                       CHECK(groupe_sanguin IN ('A+','A-','B+','B-','AB+','AB-','O+','O-','ND')),
  formule              TEXT CHECK(formule IN ('PD','DP','PC')),
  photo_selfie         TEXT,
  photo_piece_recto    TEXT,
  photo_piece_verso    TEXT,
  statut               TEXT NOT NULL DEFAULT 'en_attente'
                       CHECK(statut IN ('en_attente','enregistre','checkout','annule')),
  groupe_id            BIGINT REFERENCES groupes(id),
  est_mineur           INTEGER NOT NULL DEFAULT 0,
  tuteur_nom           TEXT,
  tuteur_contact       TEXT,
  notes                TEXT,
  created_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_clients_nin ON clients(nin);
CREATE INDEX IF NOT EXISTS idx_clients_statut ON clients(statut);
CREATE INDEX IF NOT EXISTS idx_clients_groupe ON clients(groupe_id);

CREATE TABLE IF NOT EXISTS tarifs (
  id                BIGSERIAL PRIMARY KEY,
  type_chambre      TEXT NOT NULL CHECK(type_chambre IN ('Single','Twin','Triple','Quad','Suite')),
  formule           TEXT NOT NULL CHECK(formule IN ('PD','DP','PC')),
  prix_nuit         DOUBLE PRECISION NOT NULL,
  prix_pdj          DOUBLE PRECISION NOT NULL DEFAULT 0,
  prix_dejeuner     DOUBLE PRECISION NOT NULL DEFAULT 0,
  prix_diner        DOUBLE PRECISION NOT NULL DEFAULT 0,
  date_application  DATE NOT NULL,
  actif             INTEGER NOT NULL DEFAULT 1,
  modifie_par       BIGINT REFERENCES agents(id),
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grands_comptes (
  id               BIGSERIAL PRIMARY KEY,
  nom              TEXT NOT NULL,
  nif              TEXT,                              
  rc               TEXT,                              
  adresse          TEXT,
  telephone        TEXT,
  email            TEXT,
  contact_nom      TEXT,                              
  contact_telephone TEXT,
  plafond_credit   DOUBLE PRECISION NOT NULL DEFAULT 0,
  solde_du         DOUBLE PRECISION NOT NULL DEFAULT 0, 
  statut           TEXT NOT NULL DEFAULT 'actif'
                   CHECK(statut IN ('actif','suspendu','archive')),
  notes            TEXT,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contrats (
  id                     BIGSERIAL PRIMARY KEY,
  grand_compte_id        BIGINT NOT NULL REFERENCES grands_comptes(id),
  reference              TEXT NOT NULL,               
  date_debut             DATE NOT NULL,
  date_fin               DATE NOT NULL,
  delai_paiement_jours   INTEGER NOT NULL DEFAULT 30,
  remise_percent         DOUBLE PRECISION NOT NULL DEFAULT 0, 
  prix_nuit_override     DOUBLE PRECISION,            
  prix_repas_override    DOUBLE PRECISION,
  types_chambres         TEXT[],                      
  formules               TEXT[],                      
  avantages              TEXT,
  actif                  INTEGER NOT NULL DEFAULT 1,
  created_by             BIGINT REFERENCES agents(id),
  created_at             TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bons_de_commande (
  id                  BIGSERIAL PRIMARY KEY,
  grand_compte_id     BIGINT NOT NULL REFERENCES grands_comptes(id),
  contrat_id          BIGINT REFERENCES contrats(id),
  reference_interne   TEXT NOT NULL,
  reference_client    TEXT,                           
  montant_plafond     DOUBLE PRECISION DEFAULT 0,
  montant_consomme    DOUBLE PRECISION DEFAULT 0,
  date_emission       DATE,
  date_expiration     DATE,
  fichier_pdf         TEXT,                           
  statut              TEXT NOT NULL DEFAULT 'actif'
                      CHECK(statut IN ('actif','cloture','annule')),
  notes               TEXT,
  created_by          BIGINT REFERENCES agents(id),
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS factures_globales (
  id                     BIGSERIAL PRIMARY KEY,
  grand_compte_id        BIGINT NOT NULL REFERENCES grands_comptes(id),
  bon_commande_id        BIGINT REFERENCES bons_de_commande(id),
  reference_facture      TEXT NOT NULL UNIQUE,        
  date_debut             DATE NOT NULL,
  date_fin               DATE NOT NULL,
  montant_ht             DOUBLE PRECISION NOT NULL DEFAULT 0,
  montant_tva            DOUBLE PRECISION NOT NULL DEFAULT 0,
  montant_ttc            DOUBLE PRECISION NOT NULL DEFAULT 0,
  montant_regle          DOUBLE PRECISION NOT NULL DEFAULT 0,
  delai_paiement_jours   INTEGER NOT NULL DEFAULT 30,
  date_emission          DATE NOT NULL DEFAULT CURRENT_DATE,
  date_echeance          DATE,
  statut                 TEXT NOT NULL DEFAULT 'provisoire'
                         CHECK(statut IN ('provisoire','validee','partiellement_payee','payee','annulee')),
  notes                  TEXT,
  created_by             BIGINT REFERENCES agents(id),
  created_at             TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reservations (
  id                       BIGSERIAL PRIMARY KEY,
  client_id                BIGINT REFERENCES clients(id),
  groupe_id                BIGINT REFERENCES groupes(id),
  chambre_id               BIGINT REFERENCES chambres(id),
  grand_compte_id          BIGINT REFERENCES grands_comptes(id),
  bon_commande_id          BIGINT REFERENCES bons_de_commande(id),
  agent_id                 BIGINT REFERENCES agents(id),
  agent_checkout_id        BIGINT REFERENCES agents(id),
  tarif_id                 BIGINT REFERENCES tarifs(id),
  prix_nuit_applique       DOUBLE PRECISION DEFAULT 0,
  prix_repas_applique      DOUBLE PRECISION DEFAULT 0,
  date_arrivee             TIMESTAMP WITH TIME ZONE,
  date_depart              TIMESTAMP WITH TIME ZONE,
  date_checkout_prevu      DATE,
  formule                  TEXT CHECK(formule IN ('PD','DP','PC')),
  avec_restauration        INTEGER NOT NULL DEFAULT 1,
  mode_facturation         TEXT NOT NULL DEFAULT 'direct' CHECK(mode_facturation IN ('direct','grand_compte')),
  statut                   TEXT NOT NULL DEFAULT 'pre_inscription'
                           CHECK(statut IN ('pre_inscription','confirmee','checkin','checkout','annulee')),
  est_checkout_anticipe    INTEGER NOT NULL DEFAULT 0,
  motif_checkout_anticipe  TEXT,
  notes                    TEXT,
  created_at               TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reservations_chambre ON reservations(chambre_id);
CREATE INDEX IF NOT EXISTS idx_reservations_client ON reservations(client_id);
CREATE INDEX IF NOT EXISTS idx_reservations_groupe ON reservations(groupe_id);
CREATE INDEX IF NOT EXISTS idx_reservations_statut ON reservations(statut);
CREATE INDEX IF NOT EXISTS idx_reservations_gc ON reservations(grand_compte_id);

CREATE TABLE IF NOT EXISTS sessions_caisse (
  id                 BIGSERIAL PRIMARY KEY,
  agent_id           BIGINT NOT NULL REFERENCES agents(id),
  date_ouverture     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  date_cloture       TIMESTAMP WITH TIME ZONE,
  montant_ouverture  DOUBLE PRECISION NOT NULL DEFAULT 0,
  montant_cloture    DOUBLE PRECISION,
  total_especes      DOUBLE PRECISION,
  total_virement     DOUBLE PRECISION,
  total_cheques      DOUBLE PRECISION,
  total_general      DOUBLE PRECISION,
  statut             TEXT NOT NULL DEFAULT 'ouverte'
                     CHECK(statut IN ('ouverte','cloture_demandee','cloturee')),
  valide_par_admin   BIGINT REFERENCES agents(id),
  created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS encaissements (
  id                    BIGSERIAL PRIMARY KEY,
  reservation_id        BIGINT REFERENCES reservations(id),
  client_id             BIGINT REFERENCES clients(id),
  groupe_id             BIGINT REFERENCES groupes(id),
  grand_compte_id       BIGINT REFERENCES grands_comptes(id),
  session_caisse_id     BIGINT REFERENCES sessions_caisse(id),
  agent_id              BIGINT NOT NULL REFERENCES agents(id),
  montant               DOUBLE PRECISION NOT NULL,
  type_paiement         TEXT NOT NULL DEFAULT 'especes'
                        CHECK(type_paiement IN ('especes','virement','cheque','carte')),
  formule               TEXT NOT NULL,
  description           TEXT,
  est_checkout_anticipe INTEGER NOT NULL DEFAULT 0,
  est_b2b               INTEGER NOT NULL DEFAULT 0,
  annule                INTEGER NOT NULL DEFAULT 0,
  annule_par            BIGINT REFERENCES agents(id),
  annule_le             TIMESTAMP WITH TIME ZONE,
  motif_annulation      TEXT,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_encaissements_session ON encaissements(session_caisse_id);
CREATE INDEX IF NOT EXISTS idx_encaissements_reservation ON encaissements(reservation_id);

CREATE TABLE IF NOT EXISTS housekeeping (
  id               BIGSERIAL PRIMARY KEY,
  chambre_id       BIGINT NOT NULL REFERENCES chambres(id),
  bloc_id          BIGINT REFERENCES blocs(id),
  etage            INTEGER,
  agent_id         BIGINT REFERENCES agents(id),
  date_affectation DATE NOT NULL,
  type             TEXT NOT NULL
                   CHECK(type IN ('nettoyage','recouche','depart','approfondi','desinfection')),
  statut           TEXT NOT NULL DEFAULT 'a_faire'
                   CHECK(statut IN ('a_faire','en_cours','fait','controle')),
  priorite         TEXT NOT NULL DEFAULT 'normale'
                   CHECK(priorite IN ('urgente','normale','faible')),
  observations     TEXT,
  heure_debut      TEXT,
  heure_fin        TEXT,
  photo_avant      TEXT,
  photo_apres      TEXT,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hk_consommables_demandes (
  id             BIGSERIAL PRIMARY KEY,
  hk_id          BIGINT NOT NULL REFERENCES housekeeping(id),
  agent_id       BIGINT REFERENCES agents(id),
  produit        TEXT NOT NULL,
  quantite       INTEGER NOT NULL DEFAULT 1,
  unite          TEXT DEFAULT 'unité',
  statut         TEXT NOT NULL DEFAULT 'demande'
                 CHECK(statut IN ('demande','fourni','refuse')),
  notes          TEXT,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maintenance (
  id                 BIGSERIAL PRIMARY KEY,
  chambre_id         BIGINT NOT NULL REFERENCES chambres(id),
  signale_par        BIGINT NOT NULL REFERENCES agents(id),
  assigne_a          BIGINT REFERENCES agents(id),
  bloc               TEXT,
  etage              INTEGER,
  date_signalement   DATE NOT NULL DEFAULT CURRENT_DATE,
  description        TEXT NOT NULL,
  priorite           TEXT NOT NULL DEFAULT 'normale'
                     CHECK(priorite IN ('urgente','normale','faible')),
  statut             TEXT NOT NULL DEFAULT 'signale'
                     CHECK(statut IN ('signale','en_cours','resolu','suspendu')),
  photo_probleme     TEXT,
  photo_intervention TEXT,
  photo_reparation   TEXT,
  date_resolution    TIMESTAMP WITH TIME ZONE,
  created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maintenance_pieces_demandees (
  id             BIGSERIAL PRIMARY KEY,
  maintenance_id BIGINT REFERENCES maintenance(id),
  agent_id       BIGINT REFERENCES agents(id),
  designation    TEXT NOT NULL,
  reference      TEXT,
  quantite       INTEGER NOT NULL DEFAULT 1,
  quantite_commandee INTEGER,
  urgence        TEXT NOT NULL DEFAULT 'normale'
                 CHECK(urgence IN ('immediate','normale','differee')),
  statut         TEXT DEFAULT 'en_attente'
                 CHECK(statut IN ('en_attente','commande','recu','mis_a_disposition','refuse')),
  notes          TEXT,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS presences (
  id            BIGSERIAL PRIMARY KEY,
  agent_id      BIGINT NOT NULL REFERENCES agents(id),
  date          DATE NOT NULL,
  heure_arrivee TEXT,
  heure_depart  TEXT,
  poste         TEXT,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id                BIGSERIAL PRIMARY KEY,
  agent_id          BIGINT REFERENCES agents(id),
  action            TEXT NOT NULL,
  table_cible       TEXT,
  enregistrement_id BIGINT,
  details           TEXT,
  ip_address        TEXT,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS facture_globale_lignes (
  id                  BIGSERIAL PRIMARY KEY,
  facture_globale_id  BIGINT NOT NULL REFERENCES factures_globales(id),
  reservation_id      BIGINT REFERENCES reservations(id),
  client_nom          TEXT,
  chambre_numero      TEXT,
  date_arrivee        DATE,
  date_depart         DATE,
  nb_nuits            INTEGER,
  formule             TEXT,
  prix_nuit_ht        DOUBLE PRECISION DEFAULT 0,
  prix_repas_ht       DOUBLE PRECISION DEFAULT 0,
  montant_ht          DOUBLE PRECISION NOT NULL DEFAULT 0,
  description         TEXT,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS paiements_b2b (
  id                  BIGSERIAL PRIMARY KEY,
  facture_globale_id  BIGINT NOT NULL REFERENCES factures_globales(id),
  grand_compte_id     BIGINT NOT NULL REFERENCES grands_comptes(id),
  montant             DOUBLE PRECISION NOT NULL,
  type_paiement       TEXT NOT NULL CHECK(type_paiement IN ('virement','cheque','especes','compensation')),
  reference_paiement  TEXT,                           
  date_paiement       DATE NOT NULL DEFAULT CURRENT_DATE,
  notes               TEXT,
  agent_id            BIGINT REFERENCES agents(id),
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reservation_extras (
  id             BIGSERIAL PRIMARY KEY,
  reservation_id BIGINT NOT NULL REFERENCES reservations(id),
  type           TEXT NOT NULL,                       
  description    TEXT,
  montant        DOUBLE PRECISION NOT NULL,
  created_by     BIGINT REFERENCES agents(id),
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION recalculer_statut_chambre(p_chambre_id BIGINT)
RETURNS TEXT AS $$
DECLARE
  v_nb_occ INTEGER;
  v_cap_max INTEGER;
  v_statut TEXT;
BEGIN
  SELECT nb_occupants_actuels, capacite_max, statut
  INTO v_nb_occ, v_cap_max, v_statut
  FROM chambres WHERE id = p_chambre_id;

  IF v_statut IN ('travaux', 'bloquee', 'stock_etage') THEN
    RETURN v_statut;
  END IF;

  IF v_nb_occ <= 0 THEN RETURN 'libre';
  ELSIF v_nb_occ < v_cap_max THEN RETURN 'partielle';
  ELSE RETURN 'occupee';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocs ENABLE ROW LEVEL SECURITY;
ALTER TABLE chambres ENABLE ROW LEVEL SECURITY;
ALTER TABLE groupes ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarifs ENABLE ROW LEVEL SECURITY;
ALTER TABLE grands_comptes ENABLE ROW LEVEL SECURITY;
ALTER TABLE contrats ENABLE ROW LEVEL SECURITY;
ALTER TABLE bons_de_commande ENABLE ROW LEVEL SECURITY;
ALTER TABLE factures_globales ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions_caisse ENABLE ROW LEVEL SECURITY;
ALTER TABLE encaissements ENABLE ROW LEVEL SECURITY;
ALTER TABLE housekeeping ENABLE ROW LEVEL SECURITY;
ALTER TABLE hk_consommables_demandes ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_pieces_demandees ENABLE ROW LEVEL SECURITY;
ALTER TABLE presences ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE facture_globale_lignes ENABLE ROW LEVEL SECURITY;
ALTER TABLE paiements_b2b ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_extras ENABLE ROW LEVEL SECURITY;

-- Add basic Open policies since backend is server-side with Node.js
DO $$ 
BEGIN
    -- agents
    DROP POLICY IF EXISTS "Allow all operations" ON agents;
    CREATE POLICY "Allow all operations" ON agents FOR ALL USING (true);
    -- blocs
    DROP POLICY IF EXISTS "Allow all operations" ON blocs;
    CREATE POLICY "Allow all operations" ON blocs FOR ALL USING (true);
    -- chambres
    DROP POLICY IF EXISTS "Allow all operations" ON chambres;
    CREATE POLICY "Allow all operations" ON chambres FOR ALL USING (true);
    -- groupes
    DROP POLICY IF EXISTS "Allow all operations" ON groupes;
    CREATE POLICY "Allow all operations" ON groupes FOR ALL USING (true);
    -- clients
    DROP POLICY IF EXISTS "Allow all operations" ON clients;
    CREATE POLICY "Allow all operations" ON clients FOR ALL USING (true);
    -- tarifs
    DROP POLICY IF EXISTS "Allow all operations" ON tarifs;
    CREATE POLICY "Allow all operations" ON tarifs FOR ALL USING (true);
    -- grands_comptes
    DROP POLICY IF EXISTS "Allow all operations" ON grands_comptes;
    CREATE POLICY "Allow all operations" ON grands_comptes FOR ALL USING (true);
    -- contrats
    DROP POLICY IF EXISTS "Allow all operations" ON contrats;
    CREATE POLICY "Allow all operations" ON contrats FOR ALL USING (true);
    -- bons_de_commande
    DROP POLICY IF EXISTS "Allow all operations" ON bons_de_commande;
    CREATE POLICY "Allow all operations" ON bons_de_commande FOR ALL USING (true);
    -- factures_globales
    DROP POLICY IF EXISTS "Allow all operations" ON factures_globales;
    CREATE POLICY "Allow all operations" ON factures_globales FOR ALL USING (true);
    -- reservations
    DROP POLICY IF EXISTS "Allow all operations" ON reservations;
    CREATE POLICY "Allow all operations" ON reservations FOR ALL USING (true);
    -- sessions_caisse
    DROP POLICY IF EXISTS "Allow all operations" ON sessions_caisse;
    CREATE POLICY "Allow all operations" ON sessions_caisse FOR ALL USING (true);
    -- encaissements
    DROP POLICY IF EXISTS "Allow all operations" ON encaissements;
    CREATE POLICY "Allow all operations" ON encaissements FOR ALL USING (true);
    -- housekeeping
    DROP POLICY IF EXISTS "Allow all operations" ON housekeeping;
    CREATE POLICY "Allow all operations" ON housekeeping FOR ALL USING (true);
    -- hk_consommables_demandes
    DROP POLICY IF EXISTS "Allow all operations" ON hk_consommables_demandes;
    CREATE POLICY "Allow all operations" ON hk_consommables_demandes FOR ALL USING (true);
    -- maintenance
    DROP POLICY IF EXISTS "Allow all operations" ON maintenance;
    CREATE POLICY "Allow all operations" ON maintenance FOR ALL USING (true);
    -- maintenance_pieces_demandees
    DROP POLICY IF EXISTS "Allow all operations" ON maintenance_pieces_demandees;
    CREATE POLICY "Allow all operations" ON maintenance_pieces_demandees FOR ALL USING (true);
    -- presences
    DROP POLICY IF EXISTS "Allow all operations" ON presences;
    CREATE POLICY "Allow all operations" ON presences FOR ALL USING (true);
    -- audit_log
    DROP POLICY IF EXISTS "Allow all operations" ON audit_log;
    CREATE POLICY "Allow all operations" ON audit_log FOR ALL USING (true);
    -- facture_globale_lignes
    DROP POLICY IF EXISTS "Allow all operations" ON facture_globale_lignes;
    CREATE POLICY "Allow all operations" ON facture_globale_lignes FOR ALL USING (true);
    -- paiements_b2b
    DROP POLICY IF EXISTS "Allow all operations" ON paiements_b2b;
    CREATE POLICY "Allow all operations" ON paiements_b2b FOR ALL USING (true);
    -- reservation_extras
    DROP POLICY IF EXISTS "Allow all operations" ON reservation_extras;
    CREATE POLICY "Allow all operations" ON reservation_extras FOR ALL USING (true);
END $$;
