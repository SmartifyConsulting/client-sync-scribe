#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localesDir = path.join(__dirname, 'src/i18n/locales');

// Comprehensive calendar translations for all languages
const calendarTranslations = {
  "af.json": {
    "calendar": {
      "months": {
        "january": "Januarie",
        "february": "Februarie",
        "march": "Maart",
        "april": "April",
        "may": "Mei",
        "june": "Junie",
        "july": "Julie",
        "august": "Augustus",
        "september": "September",
        "october": "Oktober",
        "november": "November",
        "december": "Desember"
      },
      "monthsShort": {
        "jan": "Jan",
        "feb": "Feb",
        "mar": "Mrt",
        "apr": "Apr",
        "may": "Mei",
        "jun": "Jun",
        "jul": "Jul",
        "aug": "Aug",
        "sep": "Sep",
        "oct": "Okt",
        "nov": "Nov",
        "dec": "Des"
      },
      "days": {
        "sunday": "Sondag",
        "monday": "Maandag",
        "tuesday": "Dinsdag",
        "wednesday": "Woensdag",
        "thursday": "Donderdag",
        "friday": "Vrydag",
        "saturday": "Saterdag"
      },
      "daysShort": {
        "sun": "Son",
        "mon": "Maa",
        "tue": "Din",
        "wed": "Woe",
        "thu": "Don",
        "fri": "Vry",
        "sat": "Sat"
      },
      "daysNarrow": {
        "s": "S",
        "m": "M",
        "t": "D",
        "w": "W",
        "f": "V"
      }
    }
  },
  "zu.json": {
    "calendar": {
      "months": {
        "january": "UMasingizane",
        "february": "UNhlolanja",
        "march": "UNdlovu",
        "april": "UMubuyazi",
        "may": "UKhala",
        "june": "UThando",
        "july": "UNtulikazi",
        "august": "UNcwaba",
        "september": "UMandulekhela",
        "october": "UMfumela",
        "november": "ULwezi",
        "december": "UZibandela"
      },
      "monthsShort": {
        "jan": "Mas",
        "feb": "Nhl",
        "mar": "Ndl",
        "apr": "Mub",
        "may": "Kha",
        "jun": "Tha",
        "jul": "Unt",
        "aug": "Unc",
        "sep": "Man",
        "oct": "Umf",
        "nov": "Ulw",
        "dec": "Uzi"
      },
      "days": {
        "sunday": "UMsonto",
        "monday": "UMsombuluko",
        "tuesday": "ULwesibili",
        "wednesday": "ULwesithathu",
        "thursday": "ULwesine",
        "friday": "ULwesihlanu",
        "saturday": "UMgqibelo"
      },
      "daysShort": {
        "sun": "Mso",
        "mon": "Msm",
        "tue": "Lwe",
        "wed": "Lwt",
        "thu": "Lwn",
        "fri": "Lwh",
        "sat": "Mgq"
      },
      "daysNarrow": {
        "s": "M",
        "m": "M",
        "t": "L",
        "w": "L",
        "f": "L"
      }
    }
  },
  "xh.json": {
    "calendar": {
      "months": {
        "january": "Januwari",
        "february": "Februwari",
        "march": "Matshi",
        "april": "Aprili",
        "may": "Meyi",
        "june": "Juni",
        "july": "Juli",
        "august": "Agasti",
        "september": "Septemba",
        "october": "Oktowba",
        "november": "Novemba",
        "december": "Disemba"
      },
      "monthsShort": {
        "jan": "Jan",
        "feb": "Feb",
        "mar": "Mat",
        "apr": "Apr",
        "may": "Mey",
        "jun": "Jun",
        "jul": "Jul",
        "aug": "Aga",
        "sep": "Sep",
        "oct": "Okt",
        "nov": "Nov",
        "dec": "Dis"
      },
      "days": {
        "sunday": "iSonto",
        "monday": "uMvulo",
        "tuesday": "uLwesibini",
        "wednesday": "uLwesithathu",
        "thursday": "uLwesine",
        "friday": "uLwesihlanu",
        "saturday": "umgqibelo"
      },
      "daysShort": {
        "sun": "Son",
        "mon": "Mvu",
        "tue": "Lwb",
        "wed": "Lwt",
        "thu": "Lwn",
        "fri": "Lwh",
        "sat": "Umg"
      },
      "daysNarrow": {
        "s": "S",
        "m": "M",
        "t": "L",
        "w": "L",
        "f": "L"
      }
    }
  },
  "sn.json": {
    "calendar": {
      "months": {
        "january": "Ndira",
        "february": "Kukadzi",
        "march": "Kurume",
        "april": "Kubvumbi",
        "may": "Chivabvu",
        "june": "Chikumi",
        "july": "Chikunguru",
        "august": "Nenyoni",
        "september": "Gunyana",
        "october": "Gumiguru",
        "november": "Mbudzi",
        "december": "Zvita"
      },
      "monthsShort": {
        "jan": "Ndi",
        "feb": "Kuk",
        "mar": "Kur",
        "apr": "Kub",
        "may": "Chi",
        "jun": "Chk",
        "jul": "Chg",
        "aug": "Nen",
        "sep": "Gun",
        "oct": "Gum",
        "nov": "Mbu",
        "dec": "Zvi"
      },
      "days": {
        "sunday": "Svondo",
        "monday": "Muvhuro",
        "tuesday": "Chipiri",
        "wednesday": "Chishanu",
        "thursday": "Chinai",
        "friday": "Chishanu",
        "saturday": "Mugovera"
      },
      "daysShort": {
        "sun": "Svo",
        "mon": "Muv",
        "tue": "Chi",
        "wed": "Chs",
        "thu": "Chn",
        "fri": "Chs",
        "sat": "Mug"
      },
      "daysNarrow": {
        "s": "S",
        "m": "M",
        "t": "C",
        "w": "C",
        "f": "C"
      }
    }
  },
  "sw.json": {
    "calendar": {
      "months": {
        "january": "Januari",
        "february": "Februari",
        "march": "Machi",
        "april": "Aprili",
        "may": "Mei",
        "june": "Juni",
        "july": "Julai",
        "august": "Agosti",
        "september": "Septemba",
        "october": "Oktoba",
        "november": "Novemba",
        "december": "Desemba"
      },
      "monthsShort": {
        "jan": "Jan",
        "feb": "Feb",
        "mar": "Mac",
        "apr": "Apr",
        "may": "Mei",
        "jun": "Jun",
        "jul": "Jul",
        "aug": "Ago",
        "sep": "Sep",
        "oct": "Okt",
        "nov": "Nov",
        "dec": "Des"
      },
      "days": {
        "sunday": "Jumapili",
        "monday": "Jumatatu",
        "tuesday": "Jumanne",
        "wednesday": "Jumatano",
        "thursday": "Alhamisi",
        "friday": "Ijumaa",
        "saturday": "Jumamosi"
      },
      "daysShort": {
        "sun": "Jum",
        "mon": "Jmt",
        "tue": "Jmn",
        "wed": "Jmt",
        "thu": "Alh",
        "fri": "Iju",
        "sat": "Jms"
      },
      "daysNarrow": {
        "s": "J",
        "m": "J",
        "t": "J",
        "w": "J",
        "f": "A"
      }
    }
  },
  "ha.json": {
    "calendar": {
      "months": {
        "january": "Januwari",
        "february": "Febraurai",
        "march": "Maris",
        "april": "Aprilu",
        "may": "Mayu",
        "june": "Juni",
        "july": "Julai",
        "august": "Agusta",
        "september": "Satumba",
        "october": "Oktoba",
        "november": "Nuwamba",
        "december": "Disamba"
      },
      "monthsShort": {
        "jan": "Jan",
        "feb": "Feb",
        "mar": "Mar",
        "apr": "Apr",
        "may": "May",
        "jun": "Jun",
        "jul": "Jul",
        "aug": "Agu",
        "sep": "Sat",
        "oct": "Okt",
        "nov": "Nuw",
        "dec": "Dis"
      },
      "days": {
        "sunday": "Lahadi",
        "monday": "Litini",
        "tuesday": "Talata",
        "wednesday": "Laraba",
        "thursday": "Alhamis",
        "friday": "Jumma",
        "saturday": "Asabar"
      },
      "daysShort": {
        "sun": "Lah",
        "mon": "Lit",
        "tue": "Tal",
        "wed": "Lar",
        "thu": "Alh",
        "fri": "Jum",
        "sat": "Asa"
      },
      "daysNarrow": {
        "s": "L",
        "m": "L",
        "t": "T",
        "w": "L",
        "f": "J"
      }
    }
  },
  "ig.json": {
    "calendar": {
      "months": {
        "january": "Januari",
        "february": "Februwari",
        "march": "Maachii",
        "april": "Eprel",
        "may": "Mee",
        "june": "Juni",
        "july": "Julai",
        "august": "Ọgọọst",
        "september": "Septemba",
        "october": "Ọktọba",
        "november": "Novemba",
        "december": "Disemba"
      },
      "monthsShort": {
        "jan": "Jan",
        "feb": "Feb",
        "mar": "Maa",
        "apr": "Epr",
        "may": "Mee",
        "jun": "Jun",
        "jul": "Jul",
        "aug": "Ọgọ",
        "sep": "Sep",
        "oct": "Ọkt",
        "nov": "Nov",
        "dec": "Dis"
      },
      "days": {
        "sunday": "Sọnde",
        "monday": "Mọndee",
        "tuesday": "Tuzde",
        "wednesday": "Wenezde",
        "thursday": "Tọzde",
        "friday": "Fraidee",
        "saturday": "Satọde"
      },
      "daysShort": {
        "sun": "Sọn",
        "mon": "Mọn",
        "tue": "Tuz",
        "wed": "Wen",
        "thu": "Tọz",
        "fri": "Fra",
        "sat": "Sat"
      },
      "daysNarrow": {
        "s": "S",
        "m": "M",
        "t": "T",
        "w": "W",
        "f": "F"
      }
    }
  },
  "ar.json": {
    "calendar": {
      "months": {
        "january": "يناير",
        "february": "فبراير",
        "march": "مارس",
        "april": "أبريل",
        "may": "مايو",
        "june": "يونيو",
        "july": "يوليو",
        "august": "أغسطس",
        "september": "سبتمبر",
        "october": "أكتوبر",
        "november": "نوفمبر",
        "december": "ديسمبر"
      },
      "monthsShort": {
        "jan": "ين",
        "feb": "فب",
        "mar": "مار",
        "apr": "أبر",
        "may": "ماي",
        "jun": "يون",
        "jul": "يول",
        "aug": "أغ",
        "sep": "سب",
        "oct": "أك",
        "nov": "نوف",
        "dec": "ديس"
      },
      "days": {
        "sunday": "الأحد",
        "monday": "الإثنين",
        "tuesday": "الثلاثاء",
        "wednesday": "الأربعاء",
        "thursday": "الخميس",
        "friday": "الجمعة",
        "saturday": "السبت"
      },
      "daysShort": {
        "sun": "أح",
        "mon": "إث",
        "tue": "ثل",
        "wed": "أر",
        "thu": "خم",
        "fri": "جم",
        "sat": "سب"
      },
      "daysNarrow": {
        "s": "ح",
        "m": "ث",
        "t": "ث",
        "w": "ر",
        "f": "خ"
      }
    }
  },
  "de.json": {
    "calendar": {
      "months": {
        "january": "Januar",
        "february": "Februar",
        "march": "März",
        "april": "April",
        "may": "Mai",
        "june": "Juni",
        "july": "Juli",
        "august": "August",
        "september": "September",
        "october": "Oktober",
        "november": "November",
        "december": "Dezember"
      },
      "monthsShort": {
        "jan": "Jan",
        "feb": "Feb",
        "mar": "Mär",
        "apr": "Apr",
        "may": "Mai",
        "jun": "Jun",
        "jul": "Jul",
        "aug": "Aug",
        "sep": "Sep",
        "oct": "Okt",
        "nov": "Nov",
        "dec": "Dez"
      },
      "days": {
        "sunday": "Sonntag",
        "monday": "Montag",
        "tuesday": "Dienstag",
        "wednesday": "Mittwoch",
        "thursday": "Donnerstag",
        "friday": "Freitag",
        "saturday": "Samstag"
      },
      "daysShort": {
        "sun": "So",
        "mon": "Mo",
        "tue": "Di",
        "wed": "Mi",
        "thu": "Do",
        "fri": "Fr",
        "sat": "Sa"
      },
      "daysNarrow": {
        "s": "S",
        "m": "M",
        "t": "D",
        "w": "M",
        "f": "D"
      }
    }
  },
  "el.json": {
    "calendar": {
      "months": {
        "january": "Ιανουάριος",
        "february": "Φεβρουάριος",
        "march": "Μάρτιος",
        "april": "Απρίλιος",
        "may": "Μάιος",
        "june": "Ιούνιος",
        "july": "Ιούλιος",
        "august": "Αύγουστος",
        "september": "Σεπτέμβριος",
        "october": "Οκτώβριος",
        "november": "Νοέμβριος",
        "december": "Δεκέμβριος"
      },
      "monthsShort": {
        "jan": "Ιαν",
        "feb": "Φεβ",
        "mar": "Μάρ",
        "apr": "Απρ",
        "may": "Μάι",
        "jun": "Ιούν",
        "jul": "Ιούλ",
        "aug": "Αύγ",
        "sep": "Σεπ",
        "oct": "Οκτ",
        "nov": "Νοέ",
        "dec": "Δεκ"
      },
      "days": {
        "sunday": "Κυριακή",
        "monday": "Δευτέρα",
        "tuesday": "Τρίτη",
        "wednesday": "Τετάρτη",
        "thursday": "Πέμπτη",
        "friday": "Παρασκευή",
        "saturday": "Σάββατο"
      },
      "daysShort": {
        "sun": "Κυρ",
        "mon": "Δευ",
        "tue": "Τρί",
        "wed": "Τετ",
        "thu": "Πέμ",
        "fri": "Παρ",
        "sat": "Σάβ"
      },
      "daysNarrow": {
        "s": "Κ",
        "m": "Δ",
        "t": "Τ",
        "w": "Τ",
        "f": "Π"
      }
    }
  },
  "es.json": {
    "calendar": {
      "months": {
        "january": "Enero",
        "february": "Febrero",
        "march": "Marzo",
        "april": "Abril",
        "may": "Mayo",
        "june": "Junio",
        "july": "Julio",
        "august": "Agosto",
        "september": "Septiembre",
        "october": "Octubre",
        "november": "Noviembre",
        "december": "Diciembre"
      },
      "monthsShort": {
        "jan": "Ene",
        "feb": "Feb",
        "mar": "Mar",
        "apr": "Abr",
        "may": "May",
        "jun": "Jun",
        "jul": "Jul",
        "aug": "Ago",
        "sep": "Sep",
        "oct": "Oct",
        "nov": "Nov",
        "dec": "Dic"
      },
      "days": {
        "sunday": "Domingo",
        "monday": "Lunes",
        "tuesday": "Martes",
        "wednesday": "Miércoles",
        "thursday": "Jueves",
        "friday": "Viernes",
        "saturday": "Sábado"
      },
      "daysShort": {
        "sun": "Dom",
        "mon": "Lun",
        "tue": "Mar",
        "wed": "Mié",
        "thu": "Jue",
        "fri": "Vie",
        "sat": "Sab"
      },
      "daysNarrow": {
        "s": "D",
        "m": "L",
        "t": "M",
        "w": "M",
        "f": "J"
      }
    }
  },
  "fr.json": {
    "calendar": {
      "months": {
        "january": "Janvier",
        "february": "Février",
        "march": "Mars",
        "april": "Avril",
        "may": "Mai",
        "june": "Juin",
        "july": "Juillet",
        "august": "Août",
        "september": "Septembre",
        "october": "Octobre",
        "november": "Novembre",
        "december": "Décembre"
      },
      "monthsShort": {
        "jan": "Jan",
        "feb": "Fév",
        "mar": "Mar",
        "apr": "Avr",
        "may": "Mai",
        "jun": "Jun",
        "jul": "Jul",
        "aug": "Aoû",
        "sep": "Sep",
        "oct": "Oct",
        "nov": "Nov",
        "dec": "Déc"
      },
      "days": {
        "sunday": "Dimanche",
        "monday": "Lundi",
        "tuesday": "Mardi",
        "wednesday": "Mercredi",
        "thursday": "Jeudi",
        "friday": "Vendredi",
        "saturday": "Samedi"
      },
      "daysShort": {
        "sun": "Dim",
        "mon": "Lun",
        "tue": "Mar",
        "wed": "Mer",
        "thu": "Jeu",
        "fri": "Ven",
        "sat": "Sam"
      },
      "daysNarrow": {
        "s": "D",
        "m": "L",
        "t": "M",
        "w": "M",
        "f": "J"
      }
    }
  },
  "he.json": {
    "calendar": {
      "months": {
        "january": "ינואר",
        "february": "פברואר",
        "march": "מרץ",
        "april": "אפריל",
        "may": "מאי",
        "june": "יוני",
        "july": "יולי",
        "august": "אוגוסט",
        "september": "ספטמבר",
        "october": "אוקטובר",
        "november": "נובמבר",
        "december": "דצמבר"
      },
      "monthsShort": {
        "jan": "ינו",
        "feb": "פבר",
        "mar": "מרץ",
        "apr": "אפר",
        "may": "מאי",
        "jun": "יוני",
        "jul": "יולי",
        "aug": "אוג",
        "sep": "ספט",
        "oct": "אוק",
        "nov": "נוב",
        "dec": "דצמ"
      },
      "days": {
        "sunday": "ראשון",
        "monday": "שני",
        "tuesday": "שלישי",
        "wednesday": "רביעי",
        "thursday": "חמישי",
        "friday": "שישי",
        "saturday": "שבת"
      },
      "daysShort": {
        "sun": "ראש",
        "mon": "שני",
        "tue": "שלי",
        "wed": "רבי",
        "thu": "חמי",
        "fri": "שיש",
        "sat": "שבת"
      },
      "daysNarrow": {
        "s": "א",
        "m": "ב",
        "t": "ג",
        "w": "ד",
        "f": "ה"
      }
    }
  },
  "hi.json": {
    "calendar": {
      "months": {
        "january": "जनवरी",
        "february": "फरवरी",
        "march": "मार्च",
        "april": "अप्रैल",
        "may": "मई",
        "june": "जून",
        "july": "जुलाई",
        "august": "अगस्त",
        "september": "सितंबर",
        "october": "अक्टूबर",
        "november": "नवंबर",
        "december": "दिसंबर"
      },
      "monthsShort": {
        "jan": "जन",
        "feb": "फर",
        "mar": "मार",
        "apr": "अप्र",
        "may": "मई",
        "jun": "जून",
        "jul": "जुल",
        "aug": "अग",
        "sep": "सित",
        "oct": "अक्ट",
        "nov": "नव",
        "dec": "दिस"
      },
      "days": {
        "sunday": "रविवार",
        "monday": "सोमवार",
        "tuesday": "मंगलवार",
        "wednesday": "बुधवार",
        "thursday": "गुरुवार",
        "friday": "शुक्रवार",
        "saturday": "शनिवार"
      },
      "daysShort": {
        "sun": "रवि",
        "mon": "सोम",
        "tue": "मंग",
        "wed": "बुध",
        "thu": "गुरु",
        "fri": "शुक्र",
        "sat": "शनि"
      },
      "daysNarrow": {
        "s": "र",
        "m": "स",
        "t": "म",
        "w": "ब",
        "f": "ग"
      }
    }
  },
  "it.json": {
    "calendar": {
      "months": {
        "january": "Gennaio",
        "february": "Febbraio",
        "march": "Marzo",
        "april": "Aprile",
        "may": "Maggio",
        "june": "Giugno",
        "july": "Luglio",
        "august": "Agosto",
        "september": "Settembre",
        "october": "Ottobre",
        "november": "Novembre",
        "december": "Dicembre"
      },
      "monthsShort": {
        "jan": "Gen",
        "feb": "Feb",
        "mar": "Mar",
        "apr": "Apr",
        "may": "Mag",
        "jun": "Giu",
        "jul": "Lug",
        "aug": "Ago",
        "sep": "Set",
        "oct": "Ott",
        "nov": "Nov",
        "dec": "Dic"
      },
      "days": {
        "sunday": "Domenica",
        "monday": "Lunedì",
        "tuesday": "Martedì",
        "wednesday": "Mercoledì",
        "thursday": "Giovedì",
        "friday": "Venerdì",
        "saturday": "Sabato"
      },
      "daysShort": {
        "sun": "Dom",
        "mon": "Lun",
        "tue": "Mar",
        "wed": "Mer",
        "thu": "Gio",
        "fri": "Ven",
        "sat": "Sab"
      },
      "daysNarrow": {
        "s": "D",
        "m": "L",
        "t": "M",
        "w": "M",
        "f": "G"
      }
    }
  },
  "ja.json": {
    "calendar": {
      "months": {
        "january": "1月",
        "february": "2月",
        "march": "3月",
        "april": "4月",
        "may": "5月",
        "june": "6月",
        "july": "7月",
        "august": "8月",
        "september": "9月",
        "october": "10月",
        "november": "11月",
        "december": "12月"
      },
      "monthsShort": {
        "jan": "1月",
        "feb": "2月",
        "mar": "3月",
        "apr": "4月",
        "may": "5月",
        "jun": "6月",
        "jul": "7月",
        "aug": "8月",
        "sep": "9月",
        "oct": "10月",
        "nov": "11月",
        "dec": "12月"
      },
      "days": {
        "sunday": "日曜日",
        "monday": "月曜日",
        "tuesday": "火曜日",
        "wednesday": "水曜日",
        "thursday": "木曜日",
        "friday": "金曜日",
        "saturday": "土曜日"
      },
      "daysShort": {
        "sun": "日",
        "mon": "月",
        "tue": "火",
        "wed": "水",
        "thu": "木",
        "fri": "金",
        "sat": "土"
      },
      "daysNarrow": {
        "s": "日",
        "m": "月",
        "t": "火",
        "w": "水",
        "f": "木"
      }
    }
  },
  "ko.json": {
    "calendar": {
      "months": {
        "january": "1월",
        "february": "2월",
        "march": "3월",
        "april": "4월",
        "may": "5월",
        "june": "6월",
        "july": "7월",
        "august": "8월",
        "september": "9월",
        "october": "10월",
        "november": "11월",
        "december": "12월"
      },
      "monthsShort": {
        "jan": "1월",
        "feb": "2월",
        "mar": "3월",
        "apr": "4월",
        "may": "5월",
        "jun": "6월",
        "jul": "7월",
        "aug": "8월",
        "sep": "9월",
        "oct": "10월",
        "nov": "11월",
        "dec": "12월"
      },
      "days": {
        "sunday": "일요일",
        "monday": "월요일",
        "tuesday": "화요일",
        "wednesday": "수요일",
        "thursday": "목요일",
        "friday": "금요일",
        "saturday": "토요일"
      },
      "daysShort": {
        "sun": "일",
        "mon": "월",
        "tue": "화",
        "wed": "수",
        "thu": "목",
        "fri": "금",
        "sat": "토"
      },
      "daysNarrow": {
        "s": "일",
        "m": "월",
        "t": "화",
        "w": "수",
        "f": "목"
      }
    }
  },
  "nl.json": {
    "calendar": {
      "months": {
        "january": "Januari",
        "february": "Februari",
        "march": "Maart",
        "april": "April",
        "may": "Mei",
        "june": "Juni",
        "july": "Juli",
        "august": "Augustus",
        "september": "September",
        "october": "Oktober",
        "november": "November",
        "december": "December"
      },
      "monthsShort": {
        "jan": "Jan",
        "feb": "Feb",
        "mar": "Mrt",
        "apr": "Apr",
        "may": "Mei",
        "jun": "Jun",
        "jul": "Jul",
        "aug": "Aug",
        "sep": "Sep",
        "oct": "Okt",
        "nov": "Nov",
        "dec": "Dec"
      },
      "days": {
        "sunday": "Zondag",
        "monday": "Maandag",
        "tuesday": "Dinsdag",
        "wednesday": "Woensdag",
        "thursday": "Donderdag",
        "friday": "Vrijdag",
        "saturday": "Zaterdag"
      },
      "daysShort": {
        "sun": "Zo",
        "mon": "Ma",
        "tue": "Di",
        "wed": "Wo",
        "thu": "Do",
        "fri": "Vr",
        "sat": "Za"
      },
      "daysNarrow": {
        "s": "Z",
        "m": "M",
        "t": "D",
        "w": "W",
        "f": "V"
      }
    }
  },
  "pl.json": {
    "calendar": {
      "months": {
        "january": "Styczeń",
        "february": "Luty",
        "march": "Marzec",
        "april": "Kwiecień",
        "may": "Maj",
        "june": "Czerwiec",
        "july": "Lipiec",
        "august": "Sierpień",
        "september": "Wrzesień",
        "october": "Październik",
        "november": "Listopad",
        "december": "Grudzień"
      },
      "monthsShort": {
        "jan": "Sty",
        "feb": "Lut",
        "mar": "Mar",
        "apr": "Kwie",
        "may": "Maj",
        "jun": "Cze",
        "jul": "Lip",
        "aug": "Sie",
        "sep": "Wrz",
        "oct": "Paź",
        "nov": "Lis",
        "dec": "Gru"
      },
      "days": {
        "sunday": "Niedziela",
        "monday": "Poniedziałek",
        "tuesday": "Wtorek",
        "wednesday": "Środa",
        "thursday": "Czwartek",
        "friday": "Piątek",
        "saturday": "Sobota"
      },
      "daysShort": {
        "sun": "Nd",
        "mon": "Pn",
        "tue": "Wt",
        "wed": "Śr",
        "thu": "Czw",
        "fri": "Pt",
        "sat": "Sob"
      },
      "daysNarrow": {
        "s": "N",
        "m": "P",
        "t": "W",
        "w": "Ś",
        "f": "C"
      }
    }
  },
  "pt.json": {
    "calendar": {
      "months": {
        "january": "Janeiro",
        "february": "Fevereiro",
        "march": "Março",
        "april": "Abril",
        "may": "Maio",
        "june": "Junho",
        "july": "Julho",
        "august": "Agosto",
        "september": "Setembro",
        "october": "Outubro",
        "november": "Novembro",
        "december": "Dezembro"
      },
      "monthsShort": {
        "jan": "Jan",
        "feb": "Fev",
        "mar": "Mar",
        "apr": "Abr",
        "may": "Mai",
        "jun": "Jun",
        "jul": "Jul",
        "ago": "Ago",
        "sep": "Set",
        "oct": "Out",
        "nov": "Nov",
        "dec": "Dez"
      },
      "days": {
        "sunday": "Domingo",
        "monday": "Segunda",
        "tuesday": "Terça",
        "wednesday": "Quarta",
        "thursday": "Quinta",
        "friday": "Sexta",
        "saturday": "Sábado"
      },
      "daysShort": {
        "sun": "Dom",
        "mon": "Seg",
        "tue": "Ter",
        "wed": "Qua",
        "thu": "Qui",
        "fri": "Sex",
        "sat": "Sab"
      },
      "daysNarrow": {
        "s": "D",
        "m": "S",
        "t": "T",
        "w": "Q",
        "f": "Q"
      }
    }
  },
  "ru.json": {
    "calendar": {
      "months": {
        "january": "Январь",
        "february": "Февраль",
        "march": "Март",
        "april": "Апрель",
        "may": "Май",
        "june": "Июнь",
        "july": "Июль",
        "august": "Август",
        "september": "Сентябрь",
        "october": "Октябрь",
        "november": "Ноябрь",
        "december": "Декабрь"
      },
      "monthsShort": {
        "jan": "Янв",
        "feb": "Фев",
        "mar": "Мар",
        "apr": "Апр",
        "may": "Май",
        "jun": "Июн",
        "jul": "Июл",
        "aug": "Авг",
        "sep": "Сен",
        "oct": "Окт",
        "nov": "Ноя",
        "dec": "Дек"
      },
      "days": {
        "sunday": "Воскресенье",
        "monday": "Понедельник",
        "tuesday": "Вторник",
        "wednesday": "Среда",
        "thursday": "Четверг",
        "friday": "Пятница",
        "saturday": "Суббота"
      },
      "daysShort": {
        "sun": "Вс",
        "mon": "Пн",
        "tue": "Вт",
        "wed": "Ср",
        "thu": "Чт",
        "fri": "Пт",
        "sat": "Сб"
      },
      "daysNarrow": {
        "s": "В",
        "m": "П",
        "t": "В",
        "w": "С",
        "f": "Ч"
      }
    }
  },
  "tr.json": {
    "calendar": {
      "months": {
        "january": "Ocak",
        "february": "Şubat",
        "march": "Mart",
        "april": "Nisan",
        "may": "Mayıs",
        "june": "Haziran",
        "july": "Temmuz",
        "august": "Ağustos",
        "september": "Eylül",
        "october": "Ekim",
        "november": "Kasım",
        "december": "Aralık"
      },
      "monthsShort": {
        "jan": "Oca",
        "feb": "Şub",
        "mar": "Mar",
        "apr": "Nis",
        "may": "May",
        "jun": "Haz",
        "jul": "Tem",
        "aug": "Ağu",
        "sep": "Eyl",
        "oct": "Eki",
        "nov": "Kas",
        "dec": "Ara"
      },
      "days": {
        "sunday": "Pazar",
        "monday": "Pazartesi",
        "tuesday": "Salı",
        "wednesday": "Çarşamba",
        "thursday": "Perşembe",
        "friday": "Cuma",
        "saturday": "Cumartesi"
      },
      "daysShort": {
        "sun": "Paz",
        "mon": "Pzt",
        "tue": "Sal",
        "wed": "Çar",
        "thu": "Per",
        "fri": "Cum",
        "sat": "Cmt"
      },
      "daysNarrow": {
        "s": "P",
        "m": "P",
        "t": "S",
        "w": "Ç",
        "f": "P"
      }
    }
  },
  "yo.json": {
    "calendar": {
      "months": {
        "january": "Oṣu Kínní",
        "february": "Oṣu Keèjì",
        "march": "Oṣu Kẹta",
        "april": "Oṣu Kẹrin",
        "may": "Oṣu Karun",
        "june": "Oṣu Kẹfa",
        "july": "Oṣu Keje",
        "august": "Oṣu Kẹjọ",
        "september": "Oṣu Kẹsọ",
        "october": "Oṣu Kẹwa",
        "november": "Oṣu Kọkandun",
        "december": "Oṣu Kọkanléélọ"
      },
      "monthsShort": {
        "jan": "Kín",
        "feb": "Keè",
        "mar": "Kẹt",
        "apr": "Kẹr",
        "may": "Kar",
        "jun": "Kẹf",
        "jul": "Kej",
        "aug": "Kẹj",
        "sep": "Kẹs",
        "oct": "Kẹw",
        "nov": "Kọk1",
        "dec": "Kọk2"
      },
      "days": {
        "sunday": "Àìkú",
        "monday": "Ajé",
        "tuesday": "Ìṣẹ́gun",
        "wednesday": "Ọjọ́rú",
        "thursday": "Ọjọ́bọ",
        "friday": "Ẹtì",
        "saturday": "Àbámẹ́ta"
      },
      "daysShort": {
        "sun": "Àìk",
        "mon": "Ajé",
        "tue": "Ìṣẹ",
        "wed": "Ọjr",
        "thu": "Ọjb",
        "fri": "Ẹtì",
        "sat": "Àbá"
      },
      "daysNarrow": {
        "s": "À",
        "m": "A",
        "t": "Ì",
        "w": "Ọ",
        "f": "Ẹ"
      }
    }
  },
  "zh.json": {
    "calendar": {
      "months": {
        "january": "1月",
        "february": "2月",
        "march": "3月",
        "april": "4月",
        "may": "5月",
        "june": "6月",
        "july": "7月",
        "august": "8月",
        "september": "9月",
        "october": "10月",
        "november": "11月",
        "december": "12月"
      },
      "monthsShort": {
        "jan": "1月",
        "feb": "2月",
        "mar": "3月",
        "apr": "4月",
        "may": "5月",
        "jun": "6月",
        "jul": "7月",
        "aug": "8月",
        "sep": "9月",
        "oct": "10月",
        "nov": "11月",
        "dec": "12月"
      },
      "days": {
        "sunday": "星期日",
        "monday": "星期一",
        "tuesday": "星期二",
        "wednesday": "星期三",
        "thursday": "星期四",
        "friday": "星期五",
        "saturday": "星期六"
      },
      "daysShort": {
        "sun": "日",
        "mon": "一",
        "tue": "二",
        "wed": "三",
        "thu": "四",
        "fri": "五",
        "sat": "六"
      },
      "daysNarrow": {
        "s": "日",
        "m": "一",
        "t": "二",
        "w": "三",
        "f": "四"
      }
    }
  },
  "en.json": {
    "calendar": {
      "months": {
        "january": "January",
        "february": "February",
        "march": "March",
        "april": "April",
        "may": "May",
        "june": "June",
        "july": "July",
        "august": "August",
        "september": "September",
        "october": "October",
        "november": "November",
        "december": "December"
      },
      "monthsShort": {
        "jan": "Jan",
        "feb": "Feb",
        "mar": "Mar",
        "apr": "Apr",
        "may": "May",
        "jun": "Jun",
        "jul": "Jul",
        "aug": "Aug",
        "sep": "Sep",
        "oct": "Oct",
        "nov": "Nov",
        "dec": "Dec"
      },
      "days": {
        "sunday": "Sunday",
        "monday": "Monday",
        "tuesday": "Tuesday",
        "wednesday": "Wednesday",
        "thursday": "Thursday",
        "friday": "Friday",
        "saturday": "Saturday"
      },
      "daysShort": {
        "sun": "Sun",
        "mon": "Mon",
        "tue": "Tue",
        "wed": "Wed",
        "thu": "Thu",
        "fri": "Fri",
        "sat": "Sat"
      },
      "daysNarrow": {
        "s": "S",
        "m": "M",
        "t": "T",
        "w": "W",
        "f": "F"
      }
    }
  }
};

// Read and update each locale file
Object.entries(calendarTranslations).forEach(([filename, translations]) => {
  const filePath = path.join(localesDir, filename);

  try {
    // Read the file and remove BOM if present
    let fileContent = fs.readFileSync(filePath, 'utf8');
    if (fileContent.charCodeAt(0) === 0xFEFF) {
      fileContent = fileContent.slice(1);
    }
    const json = JSON.parse(fileContent);

    // Merge or overwrite the calendar section
    json.calendar = translations.calendar;

    // Write back without BOM
    fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n', 'utf8');
    console.log(`✓ Updated ${filename}`);
  } catch (error) {
    console.error(`✗ Error updating ${filename}: ${error.message}`);
  }
});

console.log('\nAll calendar translations have been added to all language files!');
