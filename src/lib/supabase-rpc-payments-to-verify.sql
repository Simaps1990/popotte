-- Cette vue RPC permet de récupérer tous les paiements à vérifier pour l'admin (utilisé côté front)
create or replace function rpc_payments_to_verify()
returns table (
  notification_id uuid,
  user_id uuid,
  user_email text,
  user_username text,
  user_full_name text,
  total_amount numeric,
  notified_at timestamptz
) as $$
begin
  return query
    select
      pn.id as notification_id,
      pn.user_id,
      u.email as user_email,
      p.username as user_username,
      (p.first_name || ' ' || p.last_name) as user_full_name,
      pn.total_amount::numeric,
      pn.notified_at
    from public.payment_notifications pn
    join auth.users u on u.id = pn.user_id
    left join public.profiles p on p.id = u.id
    where pn.status = 'pending'
    order by pn.notified_at asc;
end;
$$ language plpgsql security definer;
