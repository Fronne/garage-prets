-- Retire toutes les données de démonstration (ids « demo- »), sans toucher aux vraies voitures ni aux vrais prêts
DELETE FROM prets WHERE id LIKE 'demo-%' OR vehicule_id LIKE 'demo-%';
DELETE FROM vehicules WHERE id LIKE 'demo-%';
