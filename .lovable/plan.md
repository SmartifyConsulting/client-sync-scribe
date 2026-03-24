

# Add Missing Language Translations for Sample Voice Text

## Problem
The `SAMPLE_TEXTS` map in `src/pages/MyPractice.tsx` has 16 entries but the `LANGUAGES` list has 28 languages. Missing translations: Dutch, Greek, Hebrew, Hindi, Indonesian, Italian, Japanese, Korean, Malay, Mandarin Chinese, Polish, Russian, Thai, Turkish, Ukrainian, Vietnamese.

## Solution
**File:** `src/pages/MyPractice.tsx` (lines 869-886)

Add the missing translations of "Welcome to Holarch Health - your 360 degree healthcare holarchy":

| Code | Language | Translation |
|------|----------|-------------|
| `nl` | Dutch | Welkom bij Holarch Health - uw 360 graden gezondheidsholararchie |
| `el` | Greek | Καλώς ήρθατε στο Holarch Health - η 360 μοιρών ολαρχία υγείας σας |
| `he` | Hebrew | ברוכים הבאים ל-Holarch Health - ההולרכיה הבריאותית שלכם ב-360 מעלות |
| `hi` | Hindi | Holarch Health में आपका स्वागत है - आपकी 360 डिग्री स्वास्थ्य होलार्की |
| `id` | Indonesian | Selamat datang di Holarch Health - holarki kesehatan 360 derajat Anda |
| `it` | Italian | Benvenuti in Holarch Health - la vostra olarchia sanitaria a 360 gradi |
| `ja` | Japanese | Holarch Healthへようこそ - あなたの360度ヘルスケアホラーキー |
| `ko` | Korean | Holarch Health에 오신 것을 환영합니다 - 당신의 360도 헬스케어 홀라키 |
| `ms` | Malay | Selamat datang ke Holarch Health - holarki penjagaan kesihatan 360 darjah anda |
| `zh` | Chinese | 欢迎来到Holarch Health - 您的360度健康全息体系 |
| `pl` | Polish | Witamy w Holarch Health - Twoja 360-stopniowa holarchija zdrowia |
| `ru` | Russian | Добро пожаловать в Holarch Health - ваша 360-градусная холархия здоровья |
| `th` | Thai | ยินดีต้อนรับสู่ Holarch Health - โฮลาร์คีสุขภาพ 360 องศาของคุณ |
| `tr` | Turkish | Holarch Health'e hoş geldiniz - 360 derecelik sağlık holarşiniz |
| `uk` | Ukrainian | Ласкаво просимо до Holarch Health - ваша 360-градусна холархія здоров'я |
| `vi` | Vietnamese | Chào mừng bạn đến với Holarch Health - hệ thống chăm sóc sức khỏe toàn diện 360 độ |

### File Modified
| File | Change |
|------|--------|
| `src/pages/MyPractice.tsx` | Add 16 missing language entries to `SAMPLE_TEXTS` |

