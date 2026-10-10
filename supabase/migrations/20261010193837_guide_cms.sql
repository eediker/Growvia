begin;

create table public.kg_guide_categories (
  id text primary key check (id ~ '^[a-zA-Z0-9-]{1,100}$'),
  names jsonb not null check (jsonb_typeof(names) = 'object' and
    coalesce(length(trim(names->>'tr')), 0) between 1 and 150 and
    coalesce(length(trim(names->>'en')), 0) between 1 and 150),
  illustration_url text check (illustration_url ~ '^https://[^[:space:]]+$'),
  sort_order integer not null default 0
);
create table public.kg_guide_icons (
  id text primary key check (id ~ '^[a-zA-Z0-9-]{1,100}$'),
  name text not null check (length(trim(name)) between 1 and 150),
  image_url text check (image_url ~ '^https://[^[:space:]]+$')
);
alter table public.kg_content
  add column category_id text references public.kg_guide_categories(id),
  add column sort_order integer not null default 0,
  add column icon_id text references public.kg_guide_icons(id),
  add column icon_image_url_snapshot text check (icon_image_url_snapshot ~ '^https://[^[:space:]]+$'),
  add column cover_image_url text check (cover_image_url ~ '^https://[^[:space:]]+$'),
  add column related_activity_id text references public.kg_content(id);
create index kg_guides_category_order on public.kg_content(category_id, sort_order, id) where kind = 'guide';
create index kg_content_icon on public.kg_content(icon_id) where icon_id is not null;
create index kg_content_related_activity on public.kg_content(related_activity_id) where related_activity_id is not null;

insert into public.kg_guide_categories(id, names, sort_order) values
  ('development-periods', '{"tr":"Gelişim Dönemleri","en":"Development stages"}', 10),
  ('behavior-guide', '{"tr":"Davranış Rehberi","en":"Understanding behavior"}', 20),
  ('parenting-approach', '{"tr":"Ebeveynlik ve Yaklaşım","en":"Parenting approaches"}', 30),
  ('daily-life', '{"tr":"Günlük Yaşam","en":"Everyday life"}', 40),
  ('emotional-social', '{"tr":"Duygusal ve Sosyal Gelişim","en":"Emotional and social development"}', 50),
  ('cognitive-language-motor', '{"tr":"Bilişsel, Dil ve Motor Gelişim","en":"Thinking, language and movement"}', 60);
insert into public.kg_guide_icons(id, name) values
  ('guide-icon-leaf','Yaprak'), ('guide-icon-sparkle','Parıltı'), ('guide-icon-heart','Kalp'),
  ('guide-icon-moon','Ay'), ('guide-icon-people','İnsanlar'), ('guide-icon-bulb','Fikir'),
  ('guide-icon-speech','Konuşma'), ('guide-icon-hand','El'), ('guide-icon-face','Yüz'), ('guide-icon-book','Kitap');
update public.kg_content set category_id = 'parenting-approach', sort_order = 10 where kind = 'guide';
update public.kg_content set sort_order = 20 where id = 'guide-repeat' and kind = 'guide';

-- Validate optional per-language structured blocks without changing the original body contract.
create function kg_private.valid_guide_blocks(translations jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare locale jsonb; block jsonb; item jsonb; cells jsonb;
begin
  for locale in select value from jsonb_each(translations) loop
    if not (locale ? 'contentBlocks') then continue; end if;
    if jsonb_typeof(locale->'contentBlocks') <> 'array' then return false; end if;
    if jsonb_array_length(locale->'contentBlocks') > 100 then return false; end if;
    for block in select value from jsonb_array_elements(locale->'contentBlocks') loop
      if jsonb_typeof(block) <> 'object' then return false; end if;
      case block->>'type'
        when 'heading', 'subheading' then
          if coalesce(jsonb_typeof(block->'text'), '') <> 'string' or length(block->>'text') > 2000 then return false; end if;
        when 'paragraph' then
          if coalesce(jsonb_typeof(block->'html'), '') <> 'string' or length(block->>'html') > 20000 then return false; end if;
        when 'list' then
          if coalesce(jsonb_typeof(block->'ordered'), '') <> 'boolean' or coalesce(jsonb_typeof(block->'items'), '') <> 'array' then return false; end if;
          if jsonb_array_length(block->'items') > 100 then return false; end if;
          for item in select value from jsonb_array_elements(block->'items') loop
            if jsonb_typeof(item) <> 'string' or length(item #>> '{}') > 2000 then return false; end if;
          end loop;
        when 'table' then
          if coalesce(jsonb_typeof(block->'headers'), '') <> 'array' or coalesce(jsonb_typeof(block->'rows'), '') <> 'array' then return false; end if;
          if jsonb_array_length(block->'headers') not between 1 and 20 or jsonb_array_length(block->'rows') > 100 then return false; end if;
          for cells in select value from jsonb_array_elements(jsonb_build_array(block->'headers') || (block->'rows')) loop
            if jsonb_typeof(cells) <> 'array' then return false; end if;
            if jsonb_array_length(cells) > 20 then return false; end if;
            for item in select value from jsonb_array_elements(cells) loop
              if jsonb_typeof(item) <> 'string' or length(item #>> '{}') > 2000 then return false; end if;
            end loop;
          end loop;
        when 'image' then
          if coalesce(jsonb_typeof(block->'url'), '') <> 'string' or not (block->>'url' ~ '^https://[^[:space:]]+$') then return false; end if;
          if block ? 'alt' and (jsonb_typeof(block->'alt') <> 'string' or length(block->>'alt') > 1000) then return false; end if;
        else return false;
      end case;
    end loop;
  end loop;
  return true;
end $$;
alter table public.kg_content add constraint kg_content_valid_blocks check (kg_private.valid_guide_blocks(translations));

create function kg_private.guide_snapshot() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.kind <> 'guide' and (new.category_id is not null or new.icon_id is not null or new.cover_image_url is not null or new.related_activity_id is not null) then
    raise exception 'invalid';
  end if;
  if new.related_activity_id is not null and not exists (
    select 1 from public.kg_content where id = new.related_activity_id and kind = 'activity' and status = 'published'
  ) then raise exception 'invalid'; end if;
  if tg_op = 'INSERT' then
    new.icon_image_url_snapshot := (select image_url from public.kg_guide_icons where id = new.icon_id);
  elsif new.icon_id is distinct from old.icon_id then
    new.icon_image_url_snapshot := (select image_url from public.kg_guide_icons where id = new.icon_id);
  else
    new.icon_image_url_snapshot := old.icon_image_url_snapshot;
  end if;
  return new;
end $$;
create trigger kg_content_guide_snapshot before insert or update on public.kg_content
for each row execute function kg_private.guide_snapshot();

alter table public.kg_guide_categories enable row level security;
alter table public.kg_guide_icons enable row level security;
create policy kg_categories_read on public.kg_guide_categories for select to authenticated using (true);
create policy kg_categories_insert on public.kg_guide_categories for insert to authenticated with check ((select kg_private.can_publish()));
create policy kg_categories_update on public.kg_guide_categories for update to authenticated using ((select kg_private.can_publish())) with check ((select kg_private.can_publish()));
create policy kg_categories_delete on public.kg_guide_categories for delete to authenticated using ((select kg_private.can_publish()));
create policy kg_icons_read on public.kg_guide_icons for select to authenticated using (true);
create policy kg_icons_insert on public.kg_guide_icons for insert to authenticated with check ((select kg_private.can_publish()));
create policy kg_icons_update on public.kg_guide_icons for update to authenticated using ((select kg_private.can_publish())) with check ((select kg_private.can_publish()));
-- Icons cannot be deleted, and deleting catalog content is limited to guides.
create policy kg_guides_delete on public.kg_content for delete to authenticated using (kind = 'guide' and (select kg_private.can_publish()));
revoke all on public.kg_guide_categories, public.kg_guide_icons from public, anon, authenticated;
grant select, insert, update, delete on public.kg_guide_categories to authenticated;
grant select, insert, update on public.kg_guide_icons to authenticated;
grant delete on public.kg_content to authenticated;

create or replace function kg_private.content_json(c public.kg_content) returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object('id', c.id, 'kind', c.kind, 'status', c.status, 'area', c.area,
    'minAgeMonths', c.min_age_months, 'maxAgeMonths', c.max_age_months, 'durationMinutes', c.duration_minutes, 'translations', c.translations,
    'categoryId', c.category_id, 'sortOrder', c.sort_order, 'iconId', c.icon_id,
    'iconUrl', c.icon_image_url_snapshot, 'coverImageUrl', c.cover_image_url, 'relatedActivityId', c.related_activity_id)
$$;
create function public.kg_guide_categories() returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'names', names, 'illustrationUrl', illustration_url, 'sortOrder', sort_order)
    order by sort_order, id), '[]'::jsonb) from public.kg_guide_categories
$$;
create function public.kg_guide_list(p_category_id text default null, p_age_months integer default null, p_search text default null,
  p_language text default null, p_offset integer default 0, p_limit integer default 100)
returns jsonb language plpgsql stable set search_path = '' as $$
declare result jsonb; skip integer := greatest(coalesce(p_offset, 0), 0); take integer := greatest(1, least(coalesce(p_limit, 100), 100));
begin
  if (p_age_months is not null and p_age_months not between 12 and 95) or (p_language is not null and p_language not in ('tr','en'))
    or length(p_search) > 200 then raise exception 'invalid'; end if;
  with filtered as (
    select c.* from public.kg_content c where c.status = 'published' and c.kind = 'guide'
      and (p_category_id is null or c.category_id = p_category_id)
      and (p_age_months is null or p_age_months between c.min_age_months and c.max_age_months)
      and (coalesce(trim(p_search), '') = '' or exists(select 1 from jsonb_each(c.translations) t
        where (p_language is null or t.key = p_language) and strpos(kg_private.search_text((t.value->>'title') || ' ' || (t.value->>'summary')), kg_private.search_text(trim(p_search))) > 0))
  ), page as (select * from filtered order by sort_order, id offset skip limit take)
  select jsonb_build_object('items', coalesce((select jsonb_agg(kg_private.content_json(p::public.kg_content) order by p.sort_order, p.id) from page p), '[]'::jsonb),
    'total', (select count(*) from filtered), 'offset', skip, 'limit', take) into result;
  return result;
end $$;
revoke all on function public.kg_guide_categories(), public.kg_guide_list(text, integer, text, text, integer, integer) from public, anon;
grant execute on function public.kg_guide_categories(), public.kg_guide_list(text, integer, text, text, integer, integer) to authenticated;
revoke all on function kg_private.valid_guide_blocks(jsonb), kg_private.guide_snapshot() from public, anon;
grant execute on function kg_private.valid_guide_blocks(jsonb) to authenticated;

-- Public editorial imagery only; student/classroom media belongs in private storage.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('guide-media', 'guide-media', true, 5242880, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;
create policy kg_guide_media_read on storage.objects for select to anon, authenticated using (bucket_id = 'guide-media');
create policy kg_guide_media_insert on storage.objects for insert to authenticated
with check (bucket_id = 'guide-media' and (select kg_private.can_publish()));
create policy kg_guide_media_update on storage.objects for update to authenticated
using (bucket_id = 'guide-media' and (select kg_private.can_publish()))
with check (bucket_id = 'guide-media' and (select kg_private.can_publish()));
create policy kg_guide_media_delete on storage.objects for delete to authenticated
using (bucket_id = 'guide-media' and (select kg_private.can_publish()));

commit;
