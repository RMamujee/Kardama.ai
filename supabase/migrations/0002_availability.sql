-- Fix get_booked_slots: query the jobs table (source of truth) instead of
-- booking_requests.preferred_arrival_times which doesn't exist in this schema.
-- Also corrects the candidate slot list to match TIMES in IntakeForm.jsx.

-- Handles both 12h ("8:00am", "1:00pm") and 24h ("08:00", "13:00") time strings.
create or replace function slot_to_minutes(s text)
returns int
language plpgsql
immutable
as $$
declare
  parts text[];
  hour int;
  minute int;
  is_pm boolean;
begin
  if s is null then return null; end if;
  -- 24h format: "08:00", "13:00"
  if s ~ '^\d{1,2}:\d{2}$' then
    return split_part(s, ':', 1)::int * 60 + split_part(s, ':', 2)::int;
  end if;
  -- 12h format: "8:00am", "1:00pm"
  parts := regexp_match(lower(s), '^(\d+):(\d+)(am|pm)$');
  if parts is null then return null; end if;
  hour   := parts[1]::int;
  minute := parts[2]::int;
  is_pm  := parts[3] = 'pm';
  if is_pm and hour <> 12 then hour := hour + 12; end if;
  if not is_pm and hour = 12 then hour := 0; end if;
  return hour * 60 + minute;
end;
$$;

-- Returns 12h slot strings (matching IntakeForm TIMES) that are fully booked.
-- A slot is full when every configured team has a conflicting job.
create or replace function get_booked_slots(check_date date, duration_minutes int)
returns text[]
language plpgsql
security definer
stable
as $$
declare
  total_teams int;
  candidate   text;
  -- Must match the TIMES constant in IntakeForm.jsx exactly
  candidates  text[] := array['8:00am', '9:00am', '10:00am', '11:00am', '1:00pm', '2:00pm'];
  result      text[] := array[]::text[];
  cand_start  int;
  cand_end    int;
  busy_teams  int;
begin
  select count(distinct team_id) into total_teams
  from cleaners
  where team_id is not null;

  -- No teams configured → no slots are blocked
  if coalesce(total_teams, 0) = 0 then
    return result;
  end if;

  foreach candidate in array candidates loop
    cand_start := slot_to_minutes(candidate);
    cand_end   := cand_start + duration_minutes;

    -- Count distinct teams whose job overlaps [cand_start, cand_end).
    -- jobs.scheduled_time is stored in 24h format; slot_to_minutes handles both.
    select count(distinct j.team_id) into busy_teams
    from jobs j
    where j.scheduled_date = check_date
      and j.status not in ('cancelled')
      and j.team_id is not null
      and slot_to_minutes(j.scheduled_time) < cand_end
      and slot_to_minutes(j.scheduled_time) + coalesce(j.estimated_duration, 150) + 30 > cand_start;

    if busy_teams >= total_teams then
      result := array_append(result, candidate);
    end if;
  end loop;

  return result;
end;
$$;

grant execute on function slot_to_minutes(text)           to anon, authenticated;
grant execute on function get_booked_slots(date, int)     to anon, authenticated;
