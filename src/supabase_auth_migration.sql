-- ================================================
-- SimurgRes — Kullanıcı & Rol Sistemi
-- Supabase SQL Editor'da çalıştırın
-- ================================================

-- Kullanıcı profilleri (Supabase Auth ile bağlantılı)
create table if not exists kullanici_profiller (
  id uuid primary key references auth.users(id) on delete cascade,
  ad_soyad text not null,
  rol text not null default 'garson' check (rol in ('garson', 'kasiyer', 'yonetici')),
  aktif boolean default true,
  created_at timestamptz default now()
);

-- RLS
alter table kullanici_profiller enable row level security;

-- Herkes kendi profilini okuyabilir
create policy "profil_okuma" on kullanici_profiller
  for select using (auth.uid() = id);

-- Yönetici tüm profilleri okuyabilir
create policy "yonetici_tum_profiller" on kullanici_profiller
  for all using (
    exists (
      select 1 from kullanici_profiller
      where id = auth.uid() and rol = 'yonetici'
    )
  );

-- Yeni kullanıcı kaydında otomatik profil oluştur
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into kullanici_profiller (id, ad_soyad, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'ad_soyad', new.email),
    coalesce(new.raw_user_meta_data->>'rol', 'garson')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Realtime
alter publication supabase_realtime add table kullanici_profiller;

-- ================================================
-- İlk yönetici kullanıcıyı elle eklemek için:
-- Önce Supabase Auth > Users'dan kullanıcı oluşturun
-- Sonra aşağıdaki komutu o kullanıcının UUID'si ile çalıştırın:
-- UPDATE kullanici_profiller SET rol = 'yonetici' WHERE id = 'UUID_BURAYA';
-- ================================================
