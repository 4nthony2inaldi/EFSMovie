-- Add refund_budget function (opposite of deduct_budget)
create or replace function refund_budget(p_team_id uuid, p_amount numeric) returns void as $$
  update teams
  set budget_remaining = budget_remaining + p_amount,
      updated_at = now()
  where id = p_team_id;
$$ language sql;

-- Add function for commissioners to manually set team budget
create or replace function set_team_budget(p_team_id uuid, p_new_budget numeric) returns void as $$
  update teams
  set budget_remaining = p_new_budget,
      updated_at = now()
  where id = p_team_id;
$$ language sql;
