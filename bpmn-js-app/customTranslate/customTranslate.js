import translations from './translations';

export default function customTranslate(template, replacements) {
  replacements = replacements || {};

  // Traduce el texto si hay una traducción disponible
  template = translations[template] || template;

  // Reemplaza los marcadores de posición si es necesario
  return template.replace(/{([^}]+)}/g, function(_, key) {
    return replacements[key] || '{' + key + '}';
  });
}
