# Mentor's Guide

PROMPT LOVABLE — WEB APLIKASI MUTABAAH GURU

Buat sebuah web aplikasi bernama:

MUTABAAH GURU

Deskripsi:
Aplikasi monitoring dan evaluasi mutabaah guru berbasis Mentor dan Binaan.

Tujuan aplikasi adalah memudahkan setiap Binaan mengisi mutabaah satu kali setiap minggu, kemudian sistem otomatis menghitung nilai dan memasukkan hasilnya ke rekap Mentor masing-masing.

PENTING:
Aplikasi harus benar-benar berfungsi end-to-end, bukan hanya membuat tampilan UI.

==================================================

1. KONSEP UTAMA SISTEM

==================================================

Struktur utama:

MENTOR
↓
BINAAN
↓
MUTABAAH MINGGUAN
↓
NILAI OTOMATIS
↓
REKAP MENTOR

Contoh:

Mentor:
Abi Azam

Binaan:

Abi Willy

Abi Early

Abi Marres

Abi Helmi

Semua nilai mutabaah keempat Binaan tersebut otomatis masuk ke rekap Abi Azam.

Jika ada Mentor lain:

Mentor:
Abi Fulan

Binaan:

Abi Ahmad

Abi Rizal

Abi Umar

Data mereka hanya masuk ke rekap Abi Fulan.

Jangan sampai data antar-Mentor tercampur.

==================================================

2. ROLE PENGGUNA

==================================================

Gunakan 3 jenis role:

ADMIN

Admin memiliki akses penuh.

Admin dapat:

Login

Menambah Mentor

Mengedit Mentor

Menonaktifkan Mentor

Menambah Binaan

Mengedit Binaan

Menentukan Mentor setiap Binaan

Mengelola indikator mutabaah

Mengatur target mutabaah

Membuat/mengelola periode mingguan

Melihat seluruh rekap

Melihat seluruh nilai

Export data

MENTOR

Mentor memiliki akun login.

Mentor dapat:

Login

Melihat daftar Binaan miliknya

Melihat nilai mingguan

Melihat nilai bulanan

Melihat detail nilai Binaan

Melihat riwayat mutabaah

Melihat Binaan yang belum mengisi

Melihat rekap dalam bentuk tabel

Mentor TIDAK boleh melihat Binaan milik Mentor lain.

BINAAN

Binaan TIDAK PERLU LOGIN.

Binaan cukup membuka satu link:

/mutabaah

Kemudian:

Mengisi nama

Memilih Mentor

Mengisi mutabaah mingguan

Submit

Tidak perlu username.
Tidak perlu password.

==================================================

3. HALAMAN AWAL BINAAN

==================================================

Buat halaman publik:

MUTABAAH GURU

Subjudul:

Pengisian Mutabaah Pekanan

Tampilkan periode aktif:

Mutabaah Pekan
3–9 Agustus 2026

Form:

Nama Binaan

Input nama dengan pilihan/autocomplete dari daftar Binaan yang sudah terdaftar.

Jangan membiarkan nama bebas yang tidak terdaftar.

Mentor

Dropdown Mentor.

Setelah Binaan dipilih, sistem harus memvalidasi bahwa Binaan tersebut memang berada di bawah Mentor yang dipilih.

Contoh:

Abi Willy → Abi Azam

Jika Abi Willy memilih Abi Fulan:

Tampilkan:

Mentor yang dipilih tidak sesuai dengan data Binaan. Silakan pilih Mentor yang benar.

Jangan simpan data jika relasi tidak sesuai.

==================================================

4. FORM MUTABAAH MINGGUAN

==================================================

Pengisian dilakukan SATU KALI PER MINGGU.

Jangan menggunakan checklist harian.

Jangan meminta Binaan memasukkan nilai secara manual.

Gunakan tabel.

Tampilan:

NoMutabaahTargetCapaian1Tahajud3xPilihan2Witir3xPilihan3Dhuha5xPilihan4Rawatib21 rakaatPilihan5Al-Matsurat7xPilihan6Tilawah Qur'an1 juzPilihan7Olahraga1xPilihan8Baca Buku1xPilihan9Infak3xPilihan

Kolom Capaian menggunakan dropdown/radio/select.

Binaan TIDAK mengetik angka secara manual.

==================================================

5. PILIHAN CAPAIAN

==================================================

Tahajud

Target 3x:

0x

1x

2x

3x atau lebih

Witir

Target 3x:

0x

1x

2x

3x atau lebih

Dhuha

Target 5x:

0x

1x

2x

3x

4x

5x atau lebih

Rawatib

Target 21 rakaat:

0–5 rakaat

6–10 rakaat

11–15 rakaat

16–20 rakaat

21 rakaat atau lebih

Namun simpan nilai numeriknya di database agar perhitungan tetap akurat.

Al-Matsurat

Target 7x:

0x

1x

2x

3x

4x

5x

6x

7x atau lebih

Tilawah Qur'an

Target 1 juz:

0 juz

¼ juz

½ juz

¾ juz

1 juz atau lebih

Olahraga

Target 1x:

0x

1x atau lebih

Baca Buku

Target 1x:

0x

1x atau lebih

Infak

Target 3x:

0x

1x

2x

3x atau lebih

==================================================

6. PERHITUNGAN NILAI OTOMATIS

==================================================

Binaan tidak perlu menghitung nilai.

Sistem menghitung otomatis.

Rumus:

Nilai = (Capaian / Target) × 100

Nilai maksimal adalah 100.

Jika capaian melebihi target:

Tetap 100.

Contoh:

Tahajud:
Target 3
Capaian 2

Nilai:

2 / 3 × 100 = 66,67

Dibulatkan menjadi:

67

Contoh:

Dhuha:
Target 5
Capaian 4

Nilai:

4 / 5 × 100 = 80

Rawatib:
Target 21
Capaian 18

Nilai:

18 / 21 × 100 = 85,71

Dibulatkan:

86

==================================================

7. NILAI AKHIR BINAAN

==================================================

Nilai akhir Binaan adalah rata-rata dari 9 indikator.

Contoh:

Tahajud = 67
Witir = 100
Dhuha = 80
Rawatib = 86
Al-Matsurat = 71
Tilawah = 50
Olahraga = 100
Baca Buku = 0
Infak = 67

Sistem menghitung rata-rata otomatis.

Tampilkan:

Nilai Akhir: 69,0

==================================================

8. KATEGORI NILAI

==================================================

Gunakan:

90–100:
Sangat Baik

80–89:
Baik

70–79:
Cukup

60–69:
Perlu Peningkatan

0–59:
Perlu Perhatian

==================================================

9. SUBMIT MUTABAAH

==================================================

Ketika Binaan menekan:

SUBMIT MUTABAAH

Lakukan:

Validasi nama.

Validasi Mentor.

Validasi hubungan Binaan dengan Mentor.

Validasi semua indikator telah diisi.

Ambil periode aktif.

Simpan submission.

Simpan seluruh capaian.

Hitung nilai setiap indikator.

Hitung nilai akhir.

Simpan nilai akhir.

Hubungkan submission dengan Binaan.

Hubungkan Binaan dengan Mentor melalui mentor_id.

Setelah berhasil:

Tampilkan:

Alhamdulillah, Mutabaah berhasil disimpan.

Binaan:
Abi Willy

Mentor:
Abi Azam

Periode:
3–9 Agustus 2026

Nilai:
87

Status:
Baik

==================================================

10. CEGAH DUPLIKASI

==================================================

Satu Binaan hanya boleh mempunyai satu submission pada satu periode.

Contoh:

Abi Willy
Periode:
3–9 Agustus 2026

Tidak boleh ada dua submission.

Gunakan unique constraint:

binaan_id + period_id

Jika sudah mengisi:

Tampilkan:

Mutabaah pekan ini sudah diisi.

Jangan membuat data baru.

==================================================

11. DASHBOARD MENTOR

==================================================

Mentor harus login.

Setelah login:

REKAP MUTABAAH

Mentor:
Abi Azam

Periode:
3–9 Agustus 2026

Tampilkan tabel:

NoBinaanTahajudWitirDhuhaRawatibAl-MatsuratTilawahOlahragaBukuInfakNilaiStatus1Abi Willy10010080861001001001006792Sangat Baik2Abi Early67100100908610010010010094Sangat Baik3Abi Marres100678010010010010010010094Sangat Baik4Abi Helmi676760717150100676768Perlu Peningkatan

Di bawah tabel:

Rata-rata Nilai Binaan: 87

Sudah Mengisi: 4

Belum Mengisi: 0

==================================================

12. REKAP MENTOR PER MINGGU

==================================================

Setiap Mentor memiliki nilai otomatis setiap minggu.

Contoh:

NoMentorJumlah BinaanSudah MengisiBelum MengisiNilai MingguanStatus1Abi Azam44087Baik2Abi Fulan54182Baik3Abi Umar65177Cukup

Nilai Mentor dihitung dari:

Rata-rata nilai Binaan yang sudah mengisi pada periode tersebut.

Binaan yang belum mengisi JANGAN dihitung sebagai nilai 0.

==================================================

13. REKAP MENTOR PER BULAN

==================================================

Sistem otomatis menghitung nilai bulanan Mentor.

Contoh:

MentorPekan 1Pekan 2Pekan 3Pekan 4Nilai BulananStatusAbi Azam8285889086,25BaikAbi Fulan7882848682,50BaikAbi Umar7578767977,00Cukup

Rumus:

Nilai Bulanan = rata-rata nilai Mentor setiap minggu yang memiliki data.

==================================================

14. DETAIL BINAAN

==================================================

Mentor dapat klik nama Binaan.

Contoh:

Abi Willy

Tampilkan:

MutabaahTargetCapaianNilaiTahajud3x3x100Witir3x2x67Dhuha5x4x80Rawatib211886Al-Matsurat7x7x100Tilawah1 juz1 juz100Olahraga1x1x100Baca Buku1x1x100Infak3x2x67

Tambahkan riwayat:

PeriodeNilaiStatus20–26 Juli78Cukup27 Juli–2 Agustus84Baik3–9 Agustus87Baik

==================================================

15. ISOLASI DATA MENTOR

==================================================

INI SANGAT PENTING.

Mentor hanya boleh melihat Binaan yang memiliki:

mentor_id = mentor_id akun yang sedang login

Contoh:

Abi Azam memiliki:

Abi Willy

Abi Early

Abi Marres

Abi Helmi

Abi Azam hanya dapat melihat empat orang tersebut.

Jika ada:

Abi Fulan:

Abi Ahmad

Abi Rizal

Maka Abi Azam TIDAK boleh melihat Abi Ahmad dan Abi Rizal.

Begitu juga sebaliknya.

Jangan hanya melakukan filter di frontend.

Terapkan pembatasan di:

Database

Supabase RLS

API/server

Query

Detail Binaan

Rekap

Export

==================================================

16. DATABASE

==================================================

Gunakan Supabase.

Buat tabel:

mentors

id

name

email

status

created_at

binaan

id

name

mentor_id

phone

status

created_at

updated_at

mutabaah_periods

id

start_date

end_date

status

created_at

mutabaah_indicators

id

name

target

unit

active

order_number

mutabaah_submissions

id

binaan_id

mentor_id

period_id

total_score

status

submitted_at

updated_at

mutabaah_entries

id

submission_id

indicator_id

target

realization

achievement_percentage

Pastikan relasi:

mentors
↓
binaan
↓
mutabaah_submissions
↓
mutabaah_entries

Gunakan foreign key.

Simpan mentor_id pada submission untuk menjaga histori dan memudahkan rekap.

==================================================

17. PERIODE MINGGUAN

==================================================

Buat sistem periode mingguan.

Contoh:

3–9 Agustus 2026

10–16 Agustus 2026

17–23 Agustus 2026

Link Binaan tetap sama.

Tidak perlu membuat link baru setiap minggu.

Sistem otomatis menggunakan periode aktif.

==================================================

18. ADMIN

==================================================

Admin dapat mengelola:

Mentor

Tambah

Edit

Nonaktifkan

Reset akses

Binaan

Tambah

Edit

Nonaktifkan

Tentukan Mentor

Indikator

Tambah

Edit

Hapus/nonaktifkan

Ubah target

Ubah satuan

Atur urutan

Periode

Buat periode

Aktifkan periode

Tutup periode

Lihat riwayat

==================================================

19. DASHBOARD ADMIN

==================================================

Tampilkan:

StatistikJumlahTotal Mentor10Total Binaan50Sudah Mengisi43Belum Mengisi7Rata-rata Nilai84

Kemudian tabel:

MentorBinaanSudah MengisiBelum MengisiNilai MingguanNilai BulananAbi Azam4408786Abi Fulan5418282Abi Umar6517779

==================================================

20. EXPORT

==================================================

Admin dapat export seluruh data ke Excel.

Mentor hanya dapat export data binaannya sendiri.

Format:

MentorBinaanPeriodeTahajudWitirDhuhaRawatibAl-MatsuratTilawahOlahragaBukuInfakNilai

==================================================

21. DESAIN

==================================================

Gunakan desain:

Modern

Profesional

Bersih

Sederhana

Mobile friendly

Nyaman digunakan melalui HP

Tabel responsif

Form mudah digunakan

Tidak terlalu banyak menu

Untuk halaman Binaan, prioritaskan kemudahan pengisian.

Untuk halaman Mentor, prioritaskan tabel rekap.

==================================================

22. VALIDASI

==================================================

Pastikan:

Nama Binaan harus terdaftar.

Mentor harus dipilih.

Relasi Binaan-Mentor harus valid.

Semua indikator wajib diisi.

Nilai tidak dapat diedit manual.

Nilai dihitung otomatis.

Tidak ada submission ganda pada periode yang sama.

Binaan tidak perlu login.

Mentor wajib login.

Data Mentor tidak tercampur.

Data historis tetap tersimpan.

==================================================

23. TESTING WAJIB

==================================================

Sebelum menyatakan aplikasi selesai, lakukan pengujian end-to-end.

TEST 1:

Buat:

Mentor:
Abi Azam

Binaan:
Abi Willy
Abi Early

Mentor:
Abi Fulan

Binaan:
Abi Ahmad
Abi Rizal

Isi mutabaah:

Abi Willy = 90
Abi Early = 80

Abi Ahmad = 70
Abi Rizal = 60

Login sebagai Abi Azam.

HARUS tampil:

Abi Willy
Abi Early

Rata-rata:
85

TIDAK BOLEH tampil:

Abi Ahmad
Abi Rizal

Login sebagai Abi Fulan.

HARUS tampil:

Abi Ahmad
Abi Rizal

Rata-rata:
65

TIDAK BOLEH tampil:

Abi Willy
Abi Early

==================================================

24. TEST SUBMIT BINAAN

==================================================

Buka:

/mutabaah

Isi:

Nama:
Abi Willy

Mentor:
Abi Azam

Isi seluruh indikator.

Submit.

Pastikan:

Data masuk database.

Nilai setiap indikator dihitung.

Nilai akhir dihitung.

Submission memiliki binaan_id.

Submission memiliki mentor_id.

Submission memiliki period_id.

Mentor Abi Azam langsung melihat data tersebut.

==================================================

25. TEST DUPLIKASI

==================================================

Submit Abi Willy dua kali pada periode yang sama.

Sistem harus menolak submission kedua.

Tampilkan:

Mutabaah pekan ini sudah diisi.

Jangan membuat data duplikat.

==================================================

26. TEST KEAMANAN

==================================================

Coba akses data Binaan Mentor lain melalui:

URL

ID

query parameter

API

manipulasi frontend

Pastikan sistem tetap menolak akses.

==================================================

27. HASIL AKHIR

==================================================

Alur utama harus:

BINAAN BUKA LINK
↓
ISI NAMA
↓
PILIH MENTOR
↓
ISI MUTABAAH MINGGUAN
↓
SUBMIT
↓
DATA TERSIMPAN
↓
NILAI OTOMATIS
↓
NILAI MASUK KE MENTOR YANG SESUAI
↓
MENTOR LOGIN
↓
MELIHAT REKAP BINAANNYA
↓
NILAI MINGGUAN OTOMATIS
↓
NILAI BULANAN OTOMATIS

Tidak boleh ada proses manual untuk memasukkan nilai ke Mentor.

==================================================

28. PRIORITAS UTAMA

==================================================

Jangan hanya membuat UI.

Pastikan fungsi backend, database, authentication, RLS, perhitungan nilai, submit, relasi Mentor-Binaan, dan rekap benar-benar berjalan.

Jika terdapat error Supabase seperti:

column not found

schema cache error

foreign key error

RLS error

permission denied

duplicate submission

data tidak masuk database

perbaiki sumber masalahnya.

Lakukan testing sampai:

Binaan Submit → Database → Perhitungan Nilai → Rekap Mentor

benar-benar berhasil tanpa error.

Aplikasi dianggap selesai hanya jika seluruh alur tersebut telah diuji dan berhasil.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7b88691b-4c71-474e-95ae-75046a780dbd).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
