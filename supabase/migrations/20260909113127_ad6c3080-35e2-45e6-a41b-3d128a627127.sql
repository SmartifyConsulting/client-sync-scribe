-- Prescription: collapse the three fixed medicine slots into one repeating block
UPDATE public.templates
SET content = regexp_replace(
      regexp_replace(
        content,
        '(?is)1\.\s*\[Medication1\].*?Instructions:\s*\[Instructions3\]',
        '[MedicationList]',
        'g'
      ),
      '(?is)(<br\s*/?>\s*){3,}',
      '<br><br>',
      'g'
    )
WHERE name = 'Prescription'
  AND content ~* '\[Medication3\]';

-- Prescription (any stragglers with fewer slots)
UPDATE public.templates
SET content = regexp_replace(content, '(?is)2\.\s*\[Medication2\].*?Instructions:\s*\[Instructions2\]', '', 'g')
WHERE name = 'Prescription' AND content ~* '\[Medication2\]';

-- Medical Certificate: drop dotted handwriting rows
UPDATE public.templates
SET content = regexp_replace(content, '[.·]{6,}', '', 'g')
WHERE name = 'Medical Certificate'
  AND content ~ '[.·]{6,}';