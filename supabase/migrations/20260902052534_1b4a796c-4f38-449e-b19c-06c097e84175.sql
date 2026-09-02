create extension if not exists pgcrypto;

create type public.slide_type as enum ('normal', 'quiz', 'join', 'leaderboard', 'results');
create type public.room_status as enum ('waiting', 'presenting', 'paused', 'finished', 'closed');
create type public.question_state as enum ('ready', 'question_open', 'question_closed', 'answer_revealed', 'leaderboard');
create type public.scoring_mode as enum ('fixed_points');

create table public.profiles (
  user_id uuid primary key,
  display_name text not null default 'Host',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Users manage their own profile" on public.profiles for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.presentations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  title text not null,
  original_file_path text,
  original_file_name text,
  page_count integer not null default 0,
  processing_status text not null default 'ready' check (processing_status in ('uploading', 'processing', 'ready', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.presentations to authenticated;
grant select on public.presentations to anon;
grant all on public.presentations to service_role;
alter table public.presentations enable row level security;
create policy "Owners manage presentations" on public.presentations for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Public can view demo presentations" on public.presentations for select to anon using (owner_id is null);

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  presentation_id uuid references public.presentations(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'ready', 'archived')),
  last_played_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.quizzes to authenticated;
grant select on public.quizzes to anon;
grant all on public.quizzes to service_role;
alter table public.quizzes enable row level security;
create policy "Owners manage quizzes" on public.quizzes for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Public can view demo quizzes" on public.quizzes for select to anon using (owner_id is null);

create table public.slides (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  slide_number integer not null,
  page_number integer not null,
  slide_type public.slide_type not null default 'normal',
  thumbnail_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (quiz_id, slide_number),
  unique (quiz_id, page_number)
);
grant select, insert, update, delete on public.slides to authenticated;
grant select on public.slides to anon;
grant all on public.slides to service_role;
alter table public.slides enable row level security;
create policy "Owners manage slides" on public.slides for all to authenticated using (exists (select 1 from public.quizzes q where q.id = quiz_id and q.owner_id = auth.uid())) with check (exists (select 1 from public.quizzes q where q.id = quiz_id and q.owner_id = auth.uid()));
create policy "Public can view demo slides" on public.slides for select to anon using (exists (select 1 from public.quizzes q where q.id = quiz_id and q.owner_id is null));

create table public.question_metadata (
  slide_id uuid primary key references public.slides(id) on delete cascade,
  correct_answer char(1) not null check (correct_answer in ('A', 'B', 'C', 'D')),
  points integer not null default 100 check (points > 0),
  timer_seconds integer check (timer_seconds is null or timer_seconds in (10, 15, 20, 30, 45, 60)),
  scoring_mode public.scoring_mode not null default 'fixed_points',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.question_metadata to authenticated;
grant all on public.question_metadata to service_role;
alter table public.question_metadata enable row level security;
create policy "Owners manage question metadata" on public.question_metadata for all to authenticated using (exists (select 1 from public.slides s join public.quizzes q on q.id = s.quiz_id where s.id = slide_id and q.owner_id = auth.uid())) with check (exists (select 1 from public.slides s join public.quizzes q on q.id = s.quiz_id where s.id = slide_id and q.owner_id = auth.uid()));

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete restrict,
  owner_id uuid,
  room_code varchar(6) not null unique check (room_code ~ '^[A-Z2-9]{6}$'),
  status public.room_status not null default 'waiting',
  current_slide_id uuid references public.slides(id) on delete set null,
  question_state public.question_state not null default 'ready',
  question_started_at timestamptz,
  question_ends_at timestamptz,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  ended_at timestamptz,
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.rooms to authenticated;
grant select on public.rooms to anon;
grant all on public.rooms to service_role;
alter table public.rooms enable row level security;
create policy "Owners manage rooms" on public.rooms for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Public can view room state" on public.rooms for select to anon using (true);

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  display_name varchar(40) not null check (char_length(trim(display_name)) between 1 and 40),
  score integer not null default 0 check (score >= 0),
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (room_id, display_name)
);
grant select, insert, update on public.participants to anon, authenticated;
grant delete on public.participants to authenticated;
grant all on public.participants to service_role;
alter table public.participants enable row level security;
create policy "Public can join and see room participants" on public.participants for select to anon using (true);
create policy "Public can join rooms" on public.participants for insert to anon with check (exists (select 1 from public.rooms r where r.id = room_id and r.status in ('waiting', 'presenting')));
create policy "Hosts manage participants" on public.participants for all to authenticated using (exists (select 1 from public.rooms r where r.id = room_id and r.owner_id = auth.uid())) with check (exists (select 1 from public.rooms r where r.id = room_id and r.owner_id = auth.uid()));

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  slide_id uuid not null references public.slides(id) on delete restrict,
  selected_answer char(1) not null check (selected_answer in ('A', 'B', 'C', 'D')),
  submitted_at timestamptz not null default now(),
  is_correct boolean,
  points_awarded integer not null default 0 check (points_awarded >= 0),
  unique (room_id, participant_id, slide_id)
);
grant select, insert on public.answers to anon, authenticated;
grant update on public.answers to authenticated;
grant all on public.answers to service_role;
alter table public.answers enable row level security;
create policy "Public can submit answers" on public.answers for insert to anon with check (exists (select 1 from public.participants p join public.rooms r on r.id = p.room_id where p.id = participant_id and p.room_id = room_id and r.status = 'presenting' and r.question_state = 'question_open'));
create policy "Participants can see their own answer" on public.answers for select to anon using (true);
create policy "Hosts manage answers" on public.answers for all to authenticated using (exists (select 1 from public.rooms r where r.id = room_id and r.owner_id = auth.uid())) with check (exists (select 1 from public.rooms r where r.id = room_id and r.owner_id = auth.uid()));

create table public.room_events (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
grant select on public.room_events to authenticated;
grant all on public.room_events to service_role;
alter table public.room_events enable row level security;
create policy "Hosts can view room history" on public.room_events for select to authenticated using (exists (select 1 from public.rooms r where r.id = room_id and r.owner_id = auth.uid()));

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

grant execute on function public.update_updated_at_column() to authenticated, anon, service_role;

create trigger update_profiles_updated_at before update on public.profiles for each row execute function public.update_updated_at_column();
create trigger update_presentations_updated_at before update on public.presentations for each row execute function public.update_updated_at_column();
create trigger update_quizzes_updated_at before update on public.quizzes for each row execute function public.update_updated_at_column();
create trigger update_slides_updated_at before update on public.slides for each row execute function public.update_updated_at_column();
create trigger update_question_metadata_updated_at before update on public.question_metadata for each row execute function public.update_updated_at_column();
create trigger update_rooms_updated_at before update on public.rooms for each row execute function public.update_updated_at_column();

alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.participants;
alter publication supabase_realtime add table public.answers;

insert into public.presentations (id, owner_id, title, original_file_name, page_count, processing_status)
values ('10000000-0000-4000-8000-000000000001', null, 'Can You Crack the Startup?', 'can-you-crack-the-startup.pdf', 8, 'ready');

insert into public.quizzes (id, owner_id, presentation_id, title, description, status)
values ('20000000-0000-4000-8000-000000000001', null, '10000000-0000-4000-8000-000000000001', 'CAN YOU CRACK THE STARTUP?', 'A fast-paced founder challenge for teams who know their runway from their roadmap.', 'ready');

insert into public.slides (id, quiz_id, slide_number, page_number, slide_type)
values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 1, 1, 'normal'),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 2, 2, 'normal'),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', 3, 3, 'join'),
  ('30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', 4, 4, 'quiz'),
  ('30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000001', 5, 5, 'quiz'),
  ('30000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000001', 6, 6, 'leaderboard'),
  ('30000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000001', 7, 7, 'quiz'),
  ('30000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000001', 8, 8, 'results');

insert into public.question_metadata (slide_id, correct_answer, points, timer_seconds)
values
  ('30000000-0000-4000-8000-000000000004', 'B', 200, 30),
  ('30000000-0000-4000-8000-000000000005', 'D', 300, 20),
  ('30000000-0000-4000-8000-000000000007', 'A', 500, 45);