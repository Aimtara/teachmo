# Localization workflows

## Locale resources
- Translation files live in `src/components/shared/translations/` (e.g., `en.json`, `es.json`, `zh.json`).
- Keep keys consistent across locales.

## Language switcher
- The language selector is rendered in the authenticated header (`src/components/layout/Header.jsx`).
- It updates the `lang` query parameter and persists the selection in local storage.

## Routing considerations
- Locale changes update the `lang` query parameter (e.g., `?lang=es`).
- The i18n provider reads the query parameter on load to set the locale.

## Feature flag rollout
- The `FEATURE_I18N` flag controls whether language switching is enabled.
- Enable per tenant using the feature flags admin page or backend flags.

## Adding new locales
1. Add a locale file in `src/components/shared/translations/`.
2. Add the locale code to the `locales` map in `src/components/shared/InternationalizationProvider.jsx`.
3. Add option labels under `language_switcher.options` for each language.
4. Verify the new locale in the UI and update automated tests if needed.
