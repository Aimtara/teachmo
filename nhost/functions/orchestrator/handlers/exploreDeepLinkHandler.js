const CATEGORY_MAP = [
  { keyword: 'tutor', category: 'tutoring' },
  { keyword: 'homework', category: 'homework' },
  { keyword: 'sports', category: 'sports' },
  { keyword: 'art', category: 'arts' },
  { keyword: 'club', category: 'clubs' }
];

function deriveCategory(text = '') {
  const normalized = text.toLowerCase();
  const match = CATEGORY_MAP.find((entry) => normalized.includes(entry.keyword));
  return match?.category || 'all';
}

export default {
  async execute(ctx, input) {
    const category = deriveCategory(input.text || '');
    const schoolId = ctx.selected?.schoolId;
    const deepLink = `/explore?category=${encodeURIComponent(category)}${schoolId ? `&school=${schoolId}` : ''}`;

    return {
      result: {
        category,
        schoolId
      },
      ui: {
        type: 'DEEPLINK',
        title: 'Explore opportunities',
        deepLink,
        primaryAction: { label: 'Open explore', action: 'OPEN_DEEPLINK' }
      }
    };
  }
};
