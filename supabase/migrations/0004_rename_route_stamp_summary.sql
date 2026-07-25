do $$
begin
  if to_regclass('public.passport_country_summaries') is not null
    and to_regclass('public.route_stamp_country_summaries') is null then
    alter table public.passport_country_summaries
      rename to route_stamp_country_summaries;
  end if;
end
$$;
