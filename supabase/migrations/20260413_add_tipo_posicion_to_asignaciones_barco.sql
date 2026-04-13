alter table public.asignaciones_barco
add column if not exists tipo_posicion text not null default 'banco';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'asignaciones_barco_tipo_posicion_check'
  ) then
    alter table public.asignaciones_barco
    add constraint asignaciones_barco_tipo_posicion_check
    check (tipo_posicion in ('banco', 'tambor', 'timonel'));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'asignaciones_barco_posicion_especial_null_check'
  ) then
    alter table public.asignaciones_barco
    add constraint asignaciones_barco_posicion_especial_null_check
    check (
      tipo_posicion = 'banco'
      or (banco is null and lado is null)
    );
  end if;
end
$$;

create unique index if not exists asignaciones_barco_tambor_unico_idx
  on public.asignaciones_barco (barco_id)
  where tipo_posicion = 'tambor';

create unique index if not exists asignaciones_barco_timonel_unico_idx
  on public.asignaciones_barco (barco_id)
  where tipo_posicion = 'timonel';
