DROP TRIGGER IF EXISTS trg_vote_ledger_prevent_delete ON vote_ledger;
DROP TRIGGER IF EXISTS trg_vote_ledger_prevent_update ON vote_ledger;
DROP FUNCTION IF EXISTS prevent_vote_ledger_modification();
DROP TABLE IF EXISTS vote_ledger;
