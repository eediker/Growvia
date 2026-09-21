-- Trusted SQL editor only. Replace both placeholders before running.
-- Create confirmed Auth users, then let the parent add a child in the app.
-- This creates one new classroom per run; it does not change auth credentials.
do $$
declare
  teacher_user_id uuid := '00000000-0000-0000-0000-000000000000';
  enrolled_child_id uuid := '00000000-0000-0000-0000-000000000000';
  school_id uuid := gen_random_uuid();
  classroom_id uuid := gen_random_uuid();
begin
  if not exists(select 1 from public.kg_profiles where id = teacher_user_id) then
    raise exception 'Replace teacher_user_id with an existing Auth user/profile ID';
  end if;
  if not exists(select 1 from public.kg_children where id = enrolled_child_id) then
    raise exception 'Replace enrolled_child_id with the child created by the parent';
  end if;
  insert into public.kg_schools(id, name) values(school_id, 'Little Garden');
  insert into public.kg_classes(id, school_id, name) values(classroom_id, school_id, 'Sunflowers');
  insert into public.kg_class_teachers(class_id, user_id) values(classroom_id, teacher_user_id);
  insert into public.kg_enrollments(class_id, child_id) values(classroom_id, enrolled_child_id);
end $$;
