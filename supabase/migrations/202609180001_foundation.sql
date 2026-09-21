-- Kids Guide managed-cloud foundation. Apply to a new Supabase project.
-- No service-role key is needed by the mobile app. All user access is scoped.
begin;

create schema if not exists kg_private;
revoke all on schema kg_private from public, anon;
grant usage on schema kg_private to authenticated;

create table public.kg_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (length(display_name) <= 100),
  can_publish boolean not null default false
);
create table public.kg_children (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 80),
  date_of_birth date not null
);
create table public.kg_guardians (
  child_id uuid not null references public.kg_children(id) on delete cascade,
  user_id uuid not null references public.kg_profiles(id) on delete cascade,
  primary key (child_id, user_id)
);
create index kg_guardians_user on public.kg_guardians(user_id);
create table public.kg_schools (id uuid primary key default gen_random_uuid(), name text not null);
create table public.kg_classes (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.kg_schools(id), name text not null
);
create table public.kg_class_teachers (
  class_id uuid not null references public.kg_classes(id) on delete cascade,
  user_id uuid not null references public.kg_profiles(id) on delete cascade,
  primary key (class_id, user_id)
);
create index kg_class_teachers_user on public.kg_class_teachers(user_id);
create table public.kg_enrollments (
  class_id uuid not null references public.kg_classes(id) on delete cascade,
  child_id uuid not null references public.kg_children(id) on delete cascade,
  primary key (class_id, child_id)
);
create index kg_enrollments_child on public.kg_enrollments(child_id);

create function kg_private.valid_translations(p_kind text, p_status text, p_translations jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare pair record; value jsonb;
begin
  if p_translations is null or jsonb_typeof(p_translations) <> 'object' or p_translations = '{}'::jsonb then return false; end if;
  if p_status = 'published' and not (p_translations ? 'tr' and p_translations ? 'en') then return false; end if;
  for pair in select * from jsonb_each(p_translations) loop
    value := pair.value;
    if pair.key not in ('tr', 'en') or jsonb_typeof(value) <> 'object' then return false; end if;
    if coalesce(jsonb_typeof(value->'title'), '') <> 'string' or length(trim(value->>'title')) not between 1 and 150
      or coalesce(jsonb_typeof(value->'summary'), '') <> 'string' or length(trim(value->>'summary')) not between 1 and 1000
      or coalesce(jsonb_typeof(value->'steps'), '') <> 'array' or coalesce(jsonb_typeof(value->'materials'), '') <> 'array'
      or coalesce(jsonb_typeof(value->'body'), '') <> 'string' or length(value->>'body') > 20000
      or coalesce(jsonb_typeof(value->'parentTip'), '') <> 'string' or length(value->>'parentTip') > 2000
      or coalesce(jsonb_typeof(value->'safetyNote'), '') <> 'string' or length(value->>'safetyNote') > 2000 then return false; end if;
    if jsonb_array_length(value->'steps') > 30 or jsonb_array_length(value->'materials') > 30 then return false; end if;
    if exists (select 1 from jsonb_array_elements((value->'steps') || (value->'materials')) item
      where jsonb_typeof(item) <> 'string' or length(trim(item #>> '{}')) not between 1 and 2000) then return false; end if;
    if p_status = 'published' and ((p_kind = 'activity' and jsonb_array_length(value->'steps') = 0)
      or (p_kind <> 'activity' and length(trim(value->>'body')) = 0)) then return false; end if;
  end loop;
  return true;
end $$;

create table public.kg_content (
  id text primary key check (id ~ '^[a-zA-Z0-9-]{1,100}$'),
  kind text not null check (kind in ('activity', 'story', 'guide')),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  area text not null check (area in ('discovery', 'nature', 'movement', 'language', 'connection')),
  min_age_months integer not null check (min_age_months >= 12),
  max_age_months integer not null check (max_age_months <= 95 and max_age_months >= min_age_months),
  duration_minutes integer not null check (duration_minutes between 1 and 120),
  translations jsonb not null,
  constraint kg_content_complete_translations check (kg_private.valid_translations(kind, status, translations))
);
create index kg_content_browse on public.kg_content(status, kind, min_age_months, max_age_months);
create table public.kg_posts (
  id uuid primary key check (id <> '00000000-0000-0000-0000-000000000000'),
  class_id uuid not null references public.kg_classes(id) on delete cascade,
  teacher_id uuid not null references public.kg_profiles(id),
  activity_id text not null references public.kg_content(id),
  message text not null check (length(trim(message)) between 1 and 2000),
  language text not null check (language in ('tr', 'en')),
  created_at timestamptz not null default now()
);
create index kg_posts_feed on public.kg_posts(class_id, created_at desc, id);
create table public.kg_completions (
  id uuid primary key check (id <> '00000000-0000-0000-0000-000000000000'),
  child_id uuid not null references public.kg_children(id) on delete cascade,
  activity_id text not null references public.kg_content(id),
  recorded_by uuid not null references public.kg_profiles(id),
  completed_at timestamptz not null default now()
);
create index kg_completions_history on public.kg_completions(child_id, completed_at desc);

-- Private security-definer helpers avoid recursive RLS while returning only
-- relationship predicates for the authenticated caller. Never trust metadata roles.
create function kg_private.is_guardian(p_child_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.kg_guardians where child_id = p_child_id and user_id = (select auth.uid()))
$$;
create function kg_private.can_teach(p_class_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.kg_class_teachers where class_id = p_class_id and user_id = (select auth.uid()))
$$;
create function kg_private.can_view_class(p_class_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select kg_private.can_teach(p_class_id) or exists(select 1 from public.kg_enrollments e
    join public.kg_guardians g on g.child_id = e.child_id where e.class_id = p_class_id and g.user_id = (select auth.uid()))
$$;
create function kg_private.can_publish() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select can_publish from public.kg_profiles where id = (select auth.uid())), false)
$$;
create function kg_private.new_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.kg_profiles(id, display_name) values (new.id, left(coalesce(new.raw_user_meta_data->>'name', ''), 100));
  return new;
end $$;
create trigger kg_auth_profile after insert on auth.users for each row execute function kg_private.new_profile();
insert into public.kg_profiles(id, display_name)
  select id, left(coalesce(raw_user_meta_data->>'name', ''), 100) from auth.users on conflict do nothing;

alter table public.kg_profiles enable row level security;
alter table public.kg_children enable row level security;
alter table public.kg_guardians enable row level security;
alter table public.kg_schools enable row level security;
alter table public.kg_classes enable row level security;
alter table public.kg_class_teachers enable row level security;
alter table public.kg_enrollments enable row level security;
alter table public.kg_content enable row level security;
alter table public.kg_posts enable row level security;
alter table public.kg_completions enable row level security;

create policy kg_profile_read on public.kg_profiles for select to authenticated using
  (id = (select auth.uid()) or exists(select 1 from public.kg_class_teachers t where t.user_id = kg_profiles.id and kg_private.can_view_class(t.class_id)));
create policy kg_profile_edit_name on public.kg_profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy kg_child_read on public.kg_children for select to authenticated using (kg_private.is_guardian(id));
create policy kg_guardian_read on public.kg_guardians for select to authenticated using (user_id = (select auth.uid()));
create policy kg_school_read on public.kg_schools for select to authenticated using
  (exists(select 1 from public.kg_classes c where c.school_id = kg_schools.id and kg_private.can_view_class(c.id)));
create policy kg_class_read on public.kg_classes for select to authenticated using (kg_private.can_view_class(id));
create policy kg_class_teacher_read on public.kg_class_teachers for select to authenticated using (kg_private.can_view_class(class_id));
create policy kg_enrollment_read on public.kg_enrollments for select to authenticated using
  (kg_private.is_guardian(child_id) or kg_private.can_teach(class_id));
create policy kg_content_read on public.kg_content for select to authenticated using (status = 'published' or kg_private.can_publish());
create policy kg_content_insert on public.kg_content for insert to authenticated with check (kg_private.can_publish());
create policy kg_content_update on public.kg_content for update to authenticated using (kg_private.can_publish()) with check (kg_private.can_publish());
create policy kg_post_read on public.kg_posts for select to authenticated using (kg_private.can_view_class(class_id));
create policy kg_post_insert on public.kg_posts for insert to authenticated with check (
  teacher_id = (select auth.uid()) and kg_private.can_teach(class_id)
  and exists(select 1 from public.kg_content c where c.id = activity_id and c.status = 'published' and c.kind = 'activity'));
create policy kg_completion_read on public.kg_completions for select to authenticated using (kg_private.is_guardian(child_id));
create policy kg_completion_insert on public.kg_completions for insert to authenticated with check (
  kg_private.is_guardian(child_id) and recorded_by = (select auth.uid())
  and exists(select 1 from public.kg_content c where c.id = activity_id and c.status = 'published' and c.kind = 'activity'));
create policy kg_completion_delete on public.kg_completions for delete to authenticated using (kg_private.is_guardian(child_id));

revoke all on public.kg_profiles, public.kg_children, public.kg_guardians, public.kg_schools, public.kg_classes,
  public.kg_class_teachers, public.kg_enrollments, public.kg_content, public.kg_posts, public.kg_completions from anon, authenticated;
grant select on public.kg_profiles, public.kg_children, public.kg_guardians, public.kg_schools, public.kg_classes,
  public.kg_class_teachers, public.kg_enrollments, public.kg_content, public.kg_posts, public.kg_completions to authenticated;
grant update(display_name) on public.kg_profiles to authenticated;
grant insert, update on public.kg_content to authenticated;
grant insert(id, class_id, teacher_id, activity_id, message, language) on public.kg_posts to authenticated;
grant insert(id, child_id, activity_id, recorded_by), delete on public.kg_completions to authenticated;

create function kg_private.content_json(c public.kg_content) returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object('id', c.id, 'kind', c.kind, 'status', c.status, 'area', c.area,
    'minAgeMonths', c.min_age_months, 'maxAgeMonths', c.max_age_months, 'durationMinutes', c.duration_minutes, 'translations', c.translations)
$$;
create function kg_private.search_text(p_text text) returns text language sql immutable set search_path = '' as $$
  select translate(lower(coalesce(p_text, '')), 'çğıöşüİ', 'cgiosui')
$$;

create function public.kg_me() returns jsonb language plpgsql stable set search_path = '' as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  select jsonb_build_object('id', p.id, 'name', coalesce(nullif(p.display_name, ''), auth.jwt()->>'email', ''),
    'email', coalesce(auth.jwt()->>'email', ''), 'isTeacher', exists(select 1 from public.kg_class_teachers where user_id = auth.uid()),
    'canEditContent', p.can_publish) into result from public.kg_profiles p where p.id = auth.uid();
  if result is null then raise exception 'notFound'; end if;
  return result;
end $$;
create function public.kg_children() returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'dateOfBirth', date_of_birth) order by name), '[]'::jsonb) from public.kg_children
$$;
create function public.kg_create_child(p_name text, p_date_of_birth date) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare child_id uuid := gen_random_uuid(); caller uuid := auth.uid();
begin
  if caller is null then raise exception 'unauthorized'; end if;
  if p_name is null or length(trim(p_name)) not between 1 and 80 or p_date_of_birth is null
    or p_date_of_birth > (current_date - interval '1 year')::date or p_date_of_birth <= (current_date - interval '8 years')::date then raise exception 'invalid'; end if;
  perform pg_advisory_xact_lock(hashtext(caller::text));
  if (select count(*) from public.kg_guardians where user_id = caller) >= 20 then raise exception 'invalid'; end if;
  insert into public.kg_children(id, name, date_of_birth) values (child_id, trim(p_name), p_date_of_birth);
  insert into public.kg_guardians(child_id, user_id) values (child_id, caller);
  return jsonb_build_object('id', child_id, 'name', trim(p_name), 'dateOfBirth', p_date_of_birth);
end $$;
create function public.kg_content_list(p_kind text default null, p_age_months integer default null, p_search text default null,
  p_language text default null, p_offset integer default 0, p_limit integer default 100)
returns jsonb language plpgsql stable set search_path = '' as $$
declare result jsonb; skip integer := greatest(coalesce(p_offset, 0), 0); take integer := greatest(1, least(coalesce(p_limit, 100), 100));
begin
  if (p_kind is not null and p_kind not in ('activity', 'story', 'guide')) or (p_age_months is not null and p_age_months not between 12 and 95)
    or (p_language is not null and p_language not in ('tr', 'en')) or length(p_search) > 200 then raise exception 'invalid'; end if;
  with filtered as (
    select c.* from public.kg_content c where c.status = 'published' and (p_kind is null or c.kind = p_kind)
      and (p_age_months is null or p_age_months between c.min_age_months and c.max_age_months)
      and (coalesce(trim(p_search), '') = '' or exists(select 1 from jsonb_each(c.translations) t
        where (p_language is null or t.key = p_language) and strpos(kg_private.search_text((t.value->>'title') || ' ' || (t.value->>'summary')), kg_private.search_text(trim(p_search))) > 0))
  ), page as (select * from filtered order by id offset skip limit take)
  select jsonb_build_object('items', coalesce((select jsonb_agg(kg_private.content_json(p::public.kg_content) order by p.id) from page p), '[]'::jsonb),
    'total', (select count(*) from filtered), 'offset', skip, 'limit', take) into result;
  return result;
end $$;
create function public.kg_content_by_id(p_id text) returns jsonb language plpgsql stable set search_path = '' as $$
declare result jsonb;
begin
  select kg_private.content_json(c) into result from public.kg_content c where c.id = p_id and c.status = 'published';
  if result is null then raise exception 'notFound'; end if;
  return result;
end $$;
create function public.kg_classes() returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'schoolName', s.name, 'canPost', kg_private.can_teach(c.id)) order by c.name), '[]'::jsonb)
    from public.kg_classes c join public.kg_schools s on s.id = c.school_id
$$;
create function public.kg_posts(p_class_id uuid, p_offset integer default 0, p_limit integer default 50)
returns jsonb language plpgsql stable set search_path = '' as $$
declare result jsonb; skip integer := greatest(coalesce(p_offset, 0), 0); take integer := greatest(1, least(coalesce(p_limit, 50), 100));
begin
  if not kg_private.can_view_class(p_class_id) then raise exception 'notFound'; end if;
  with page as (select p.*, u.display_name as teacher_name from public.kg_posts p join public.kg_profiles u on u.id = p.teacher_id
    where p.class_id = p_class_id order by p.created_at desc, p.id offset skip limit take)
  select jsonb_build_object('items', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'classId', p.class_id,
    'teacherName', p.teacher_name, 'activityId', p.activity_id, 'message', p.message, 'language', p.language, 'createdAt', p.created_at)
    order by p.created_at desc, p.id) from page p), '[]'::jsonb),
    'total', (select count(*) from public.kg_posts where class_id = p_class_id), 'offset', skip, 'limit', take) into result;
  return result;
end $$;
create function public.kg_share_activity(p_class_id uuid, p_id uuid, p_activity_id text, p_message text, p_language text)
returns void language plpgsql set search_path = '' as $$
declare existing public.kg_posts;
begin
  if not kg_private.can_teach(p_class_id) then raise exception 'notFound'; end if;
  if p_id is null or p_id = '00000000-0000-0000-0000-000000000000' or p_message is null or length(trim(p_message)) not between 1 and 2000
    or p_language is null or p_language not in ('tr', 'en') then raise exception 'invalid'; end if;
  if not exists(select 1 from public.kg_content where id = p_activity_id and status = 'published' and kind = 'activity') then raise exception 'invalid'; end if;
  insert into public.kg_posts(id, class_id, teacher_id, activity_id, message, language)
    values(p_id, p_class_id, auth.uid(), p_activity_id, trim(p_message), p_language) on conflict (id) do nothing;
  select * into existing from public.kg_posts where id = p_id;
  if existing.id is null or existing.class_id <> p_class_id or existing.teacher_id <> auth.uid() or existing.activity_id <> p_activity_id
    or existing.message <> trim(p_message) or existing.language <> p_language then raise exception 'conflict'; end if;
end $$;
create function public.kg_completions(p_child_id uuid) returns jsonb language plpgsql stable set search_path = '' as $$
declare result jsonb;
begin
  if not kg_private.is_guardian(p_child_id) then raise exception 'notFound'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'childId', c.child_id, 'activityId', c.activity_id, 'completedAt', c.completed_at) order by c.completed_at desc), '[]'::jsonb)
    into result from (select * from public.kg_completions where child_id = p_child_id order by completed_at desc limit 250) c;
  return result;
end $$;
create function public.kg_complete(p_child_id uuid, p_activity_id text, p_id uuid) returns jsonb language plpgsql set search_path = '' as $$
declare existing public.kg_completions;
begin
  if not kg_private.is_guardian(p_child_id) then raise exception 'notFound'; end if;
  if p_id is null or p_id = '00000000-0000-0000-0000-000000000000' then raise exception 'invalid'; end if;
  if not exists(select 1 from public.kg_content where id = p_activity_id and status = 'published' and kind = 'activity') then raise exception 'notFound'; end if;
  insert into public.kg_completions(id, child_id, activity_id, recorded_by) values(p_id, p_child_id, p_activity_id, auth.uid()) on conflict(id) do nothing;
  select * into existing from public.kg_completions where id = p_id;
  if existing.id is null or existing.child_id <> p_child_id or existing.activity_id <> p_activity_id then raise exception 'conflict'; end if;
  return jsonb_build_object('id', existing.id, 'childId', existing.child_id, 'activityId', existing.activity_id, 'completedAt', existing.completed_at);
end $$;
create function public.kg_remove_completion(p_child_id uuid, p_id uuid) returns void language plpgsql set search_path = '' as $$
begin
  if not kg_private.is_guardian(p_child_id) then raise exception 'notFound'; end if;
  delete from public.kg_completions where id = p_id and child_id = p_child_id;
end $$;

-- Restrict every application function, including future overloads in this migration.
do $$ declare proc record;
begin
  for proc in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'kg_private' or (n.nspname = 'public' and left(p.proname, 3) = 'kg_') loop
    execute format('revoke all on function %s from public, anon', proc.signature);
    execute format('grant execute on function %s to authenticated', proc.signature);
  end loop;
end $$;
revoke execute on function kg_private.new_profile() from authenticated;
commit;
