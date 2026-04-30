-- Rename cleaners from old codenames (Bigfoot/Profane/Gypsy/Angle/Gamma)
-- to neutral Cleaner 1-10. Safe to re-run.
UPDATE public.cleaners SET name='Cleaner 1',  initials='C1',  email='cleaner1@kardama.ai'  WHERE id='c1';
UPDATE public.cleaners SET name='Cleaner 2',  initials='C2',  email='cleaner2@kardama.ai'  WHERE id='c2';
UPDATE public.cleaners SET name='Cleaner 3',  initials='C3',  email='cleaner3@kardama.ai'  WHERE id='c3';
UPDATE public.cleaners SET name='Cleaner 4',  initials='C4',  email='cleaner4@kardama.ai'  WHERE id='c4';
UPDATE public.cleaners SET name='Cleaner 5',  initials='C5',  email='cleaner5@kardama.ai'  WHERE id='c5';
UPDATE public.cleaners SET name='Cleaner 6',  initials='C6',  email='cleaner6@kardama.ai'  WHERE id='c6';
UPDATE public.cleaners SET name='Cleaner 7',  initials='C7',  email='cleaner7@kardama.ai'  WHERE id='c7';
UPDATE public.cleaners SET name='Cleaner 8',  initials='C8',  email='cleaner8@kardama.ai'  WHERE id='c8';
UPDATE public.cleaners SET name='Cleaner 9',  initials='C9',  email='cleaner9@kardama.ai'  WHERE id='c9';
UPDATE public.cleaners SET name='Cleaner 10', initials='C10', email='cleaner10@kardama.ai' WHERE id='c10';
