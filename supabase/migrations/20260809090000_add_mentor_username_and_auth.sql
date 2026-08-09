-- Migration: Add username column to mentors table and default usernames
-- Date: 2026-08-09

ALTER TABLE public.mentors ADD COLUMN IF NOT EXISTS username text UNIQUE;

UPDATE public.mentors SET username = 'umi_indah' WHERE name = 'Umi Indah';
UPDATE public.mentors SET username = 'umi_melisa' WHERE name = 'Umi Melisa';
UPDATE public.mentors SET username = 'umi_navi' WHERE name = 'Umi Navi';
UPDATE public.mentors SET username = 'umi_novi' WHERE name = 'Umi Novi';
UPDATE public.mentors SET username = 'umi_okti' WHERE name = 'Umi Okti';
UPDATE public.mentors SET username = 'umi_ditha' WHERE name = 'Umi Ditha';
UPDATE public.mentors SET username = 'abi_azam' WHERE name = 'Abi Azam';
UPDATE public.mentors SET username = 'umi_resty' WHERE name = 'Umi Resty';
UPDATE public.mentors SET username = 'umi_nia' WHERE name = 'Umi Nia';
UPDATE public.mentors SET username = 'umi_tiwi' WHERE name = 'Umi Tiwi';
UPDATE public.mentors SET username = 'umi_miftah' WHERE name = 'Umi Miftah';
UPDATE public.mentors SET username = 'abi_endi' WHERE name = 'Abi Endi';
UPDATE public.mentors SET username = 'abi_tama' WHERE name = 'Abi Tama';
