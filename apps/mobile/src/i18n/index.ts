import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import { resources } from './resources';
import { settings } from '../config/settings';

void i18n.use(initReactI18next).init({
  resources,
  lng: settings.defaultLanguage === 'system' ? (getLocales()[0]?.languageCode === 'tr' ? 'tr' : 'en') : settings.defaultLanguage,
  fallbackLng: 'en', supportedLngs: ['tr', 'en'], interpolation: { escapeValue: false },
});
export default i18n;
