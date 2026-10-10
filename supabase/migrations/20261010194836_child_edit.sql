begin;
grant update(name, date_of_birth) on public.kg_children to authenticated;
create policy kg_child_update on public.kg_children for update to authenticated
using (kg_private.is_guardian(id)) with check (kg_private.is_guardian(id));

create function kg_private.validate_child_edit() returns trigger language plpgsql set search_path = '' as $$
begin
  if length(trim(new.name)) not between 1 and 80 or new.date_of_birth > (current_date - interval '1 year')::date
    or new.date_of_birth <= (current_date - interval '8 years')::date then raise exception 'invalid'; end if;
  new.name := trim(new.name);
  return new;
end $$;
create trigger kg_child_validate_edit before update on public.kg_children
for each row execute function kg_private.validate_child_edit();

create function public.kg_update_child(p_id uuid, p_name text, p_date_of_birth date) returns jsonb
language plpgsql set search_path = '' as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  if p_name is null or length(trim(p_name)) not between 1 and 80 or p_date_of_birth is null
    or p_date_of_birth > (current_date - interval '1 year')::date or p_date_of_birth <= (current_date - interval '8 years')::date then raise exception 'invalid'; end if;
  update public.kg_children set name = trim(p_name), date_of_birth = p_date_of_birth where id = p_id
    returning jsonb_build_object('id', id, 'name', name, 'dateOfBirth', date_of_birth) into result;
  if result is null then raise exception 'notFound'; end if;
  return result;
end $$;
revoke all on function public.kg_update_child(uuid, text, date), kg_private.validate_child_edit() from public, anon;
grant execute on function public.kg_update_child(uuid, text, date) to authenticated;
commit;
