import fs from 'fs';

// Copy working calendar section from en.json and add translations
const enJson = JSON.parse(fs.readFileSync('src/i18n/locales/en.json', 'utf8'));
const enCalendar = enJson.calendar;

const translations = {
  es: {
    months: { january: 'Enero', february: 'Febrero', march: 'Marzo', april: 'Abril', may: 'Mayo', june: 'Junio', july: 'Julio', august: 'Agosto', september: 'Septiembre', october: 'Octubre', november: 'Noviembre', december: 'Diciembre' },
    monthsShort: { jan: 'Ene', feb: 'Feb', mar: 'Mar', apr: 'Abr', may: 'May', jun: 'Jun', jul: 'Jul', aug: 'Ago', sep: 'Sep', oct: 'Oct', nov: 'Nov', dec: 'Dic' },
    days: { sunday: 'Domingo', monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles', thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado' },
    daysShort: { sun: 'Dom', mon: 'Lun', tue: 'Mar', wed: 'Mié', thu: 'Jue', fri: 'Vie', sat: 'Sab' }
  },
  fr: {
    months: { january: 'Janvier', february: 'Février', march: 'Mars', april: 'Avril', may: 'Mai', june: 'Juin', july: 'Juillet', august: 'Août', september: 'Septembre', october: 'Octobre', november: 'Novembre', december: 'Décembre' },
    monthsShort: { jan: 'Jan', feb: 'Fév', mar: 'Mar', apr: 'Avr', may: 'Mai', jun: 'Jun', jul: 'Jul', aug: 'Aoû', sep: 'Sep', oct: 'Oct', nov: 'Nov', dec: 'Déc' },
    days: { sunday: 'Dimanche', monday: 'Lundi', tuesday: 'Mardi', wednesday: 'Mercredi', thursday: 'Jeudi', friday: 'Vendredi', saturday: 'Samedi' },
    daysShort: { sun: 'Dim', mon: 'Lun', tue: 'Mar', wed: 'Mer', thu: 'Jeu', fri: 'Ven', sat: 'Sam' }
  },
  de: {
    months: { january: 'Januar', february: 'Februar', march: 'März', april: 'April', may: 'Mai', june: 'Juni', july: 'Juli', august: 'August', september: 'September', october: 'Oktober', november: 'November', december: 'Dezember' },
    monthsShort: { jan: 'Jan', feb: 'Feb', mar: 'Mär', apr: 'Apr', may: 'Mai', jun: 'Jun', jul: 'Jul', aug: 'Aug', sep: 'Sep', oct: 'Okt', nov: 'Nov', dec: 'Dez' },
    days: { sunday: 'Sonntag', monday: 'Montag', tuesday: 'Dienstag', wednesday: 'Mittwoch', thursday: 'Donnerstag', friday: 'Freitag', saturday: 'Samstag' },
    daysShort: { sun: 'So', mon: 'Mo', tue: 'Di', wed: 'Mi', thu: 'Do', fri: 'Fr', sat: 'Sa' }
  },
  pt: {
    months: { january: 'Janeiro', february: 'Fevereiro', march: 'Março', april: 'Abril', may: 'Maio', june: 'Junho', july: 'Julho', august: 'Agosto', september: 'Setembro', october: 'Outubro', november: 'Novembro', december: 'Dezembro' },
    monthsShort: { jan: 'Jan', feb: 'Fev', mar: 'Mar', apr: 'Abr', may: 'Mai', jun: 'Jun', jul: 'Jul', aug: 'Ago', sep: 'Set', oct: 'Out', nov: 'Nov', dec: 'Dez' },
    days: { sunday: 'Domingo', monday: 'Segunda', tuesday: 'Terça', wednesday: 'Quarta', thursday: 'Quinta', friday: 'Sexta', saturday: 'Sábado' },
    daysShort: { sun: 'Dom', mon: 'Seg', tue: 'Ter', wed: 'Qua', thu: 'Qui', fri: 'Sex', sat: 'Sab' }
  },
  af: {
    months: { january: 'Januarie', february: 'Februarie', march: 'Maart', april: 'April', may: 'Mei', june: 'Junie', july: 'Julie', august: 'Augustus', september: 'September', october: 'Oktober', november: 'November', december: 'Desember' },
    monthsShort: { jan: 'Jan', feb: 'Feb', mar: 'Mrt', apr: 'Apr', may: 'Mei', jun: 'Jun', jul: 'Jul', aug: 'Aug', sep: 'Sep', oct: 'Okt', nov: 'Nov', dec: 'Des' },
    days: { sunday: 'Sondag', monday: 'Maandag', tuesday: 'Dinsdag', wednesday: 'Woensdag', thursday: 'Donderdag', friday: 'Vrydag', saturday: 'Saterdag' },
    daysShort: { sun: 'Son', mon: 'Maa', tue: 'Din', wed: 'Woe', thu: 'Don', fri: 'Vry', sat: 'Sat' }
  }
};

for (const [lang, trans] of Object.entries(translations)) {
  const filepath = `src/i18n/locales/${lang}.json`;
  const json = JSON.parse(fs.readFileSync(filepath, 'utf8'));

  // Rebuild calendar section from scratch
  json.calendar = {
    ...enCalendar,
    months: trans.months,
    monthsShort: trans.monthsShort,
    days: trans.days,
    daysShort: trans.daysShort,
    daysNarrow: ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  };

  fs.writeFileSync(filepath, JSON.stringify(json, null, 2) + '\n');
  console.log(`✅ Fixed ${lang}.json`);
}
