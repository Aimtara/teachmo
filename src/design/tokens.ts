export const enterprisePalette = {
  offWhite: '#FAFAFA',
  slate: '#2F3437',
  teachmoBlue: '#2451FF',
  leafGreen: '#2DBF6E',
  sunriseGold: '#FFC857',
  coral: '#FF6B6B',
  ink: '#121619',
  cloud: '#EEF2F7',
  mist: '#DCE3EA',
  midnight: '#0D1117',
  midnightRaised: '#161B22',
  highContrastBlue: '#003CFF',
  highContrastGold: '#FFB000',
  highContrastGreen: '#008A4B',
  highContrastCoral: '#D71920'
} as const;

export const enterpriseTypography = {
  fontFamily: {
    sans: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    display: 'Poppins, Inter, ui-sans-serif, system-ui, sans-serif',
    mono: '"JetBrains Mono", "SFMono-Regular", Consolas, monospace'
  },
  scale: {
    eyebrow: '0.75rem',
    body: '0.875rem',
    bodyLarge: '1rem',
    h3: '1.25rem',
    h2: '1.75rem',
    h1: '2.5rem'
  },
  lineHeight: {
    tight: '1.1',
    normal: '1.5',
    relaxed: '1.7'
  }
} as const;

export const enterpriseSpacing = {
  density: {
    comfortable: 1,
    compact: 0.82
  },
  grid: {
    base: 4,
    pageMaxWidth: '1440px',
    sidebarExpanded: '18rem',
    sidebarCollapsed: '5.25rem'
  }
} as const;

export const enterpriseMotion = {
  duration: {
    instant: 90,
    fast: 160,
    normal: 240,
    slow: 360
  },
  easing: {
    productive: 'cubic-bezier(0.2, 0, 0, 1)',
    expressive: 'cubic-bezier(0.16, 1, 0.3, 1)',
    emphasized: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
  },
  reducedMotion: 'Use opacity/color state changes only when prefers-reduced-motion is enabled.'
} as const;

export const enterpriseThemes = {
  light: {
    background: enterprisePalette.offWhite,
    foreground: enterprisePalette.slate,
    surface: '#FFFFFF',
    border: enterprisePalette.mist,
    muted: '#65717B',
    primary: enterprisePalette.teachmoBlue,
    success: enterprisePalette.leafGreen,
    warning: enterprisePalette.sunriseGold,
    danger: enterprisePalette.coral
  },
  dark: {
    background: enterprisePalette.midnight,
    foreground: '#F8FAFC',
    surface: enterprisePalette.midnightRaised,
    border: '#2A343F',
    muted: '#A7B1BA',
    primary: '#7F9BFF',
    success: '#6DE09F',
    warning: '#FFD77A',
    danger: '#FF8B8B'
  },
  highContrast: {
    background: '#FFFFFF',
    foreground: '#000000',
    surface: '#FFFFFF',
    border: '#000000',
    muted: '#1F1F1F',
    primary: enterprisePalette.highContrastBlue,
    success: enterprisePalette.highContrastGreen,
    warning: enterprisePalette.highContrastGold,
    danger: enterprisePalette.highContrastCoral
  }
} as const;

export const enterpriseRoles = {
  system_admin: {
    label: 'System Admin',
    context: 'Platform operations',
    mission: 'Protect platform health, approvals, SSO, audit trails, and rollout gates.',
    primaryKpi: 'Operational risk',
    ambientPrompt: 'Surface only critical approvals, incidents, and governance blockers.',
    priorities: ['Approvals', 'Audit trail', 'Security posture', 'Tenant health']
  },
  district_admin: {
    label: 'District Admin',
    context: 'District oversight',
    mission: 'Monitor schools, adoption, integrations, and compliance readiness.',
    primaryKpi: 'District adoption',
    ambientPrompt: 'Prioritize schools with stalled engagement or integration risk.',
    priorities: ['Adoption', 'Integrations', 'Data quality', 'Support risk']
  },
  school_admin: {
    label: 'School Admin',
    context: 'School operations',
    mission: 'Manage teachers, roster health, family engagement, and safety queues.',
    primaryKpi: 'School readiness',
    ambientPrompt: 'Highlight unresolved safety items and classroom workflow blockers.',
    priorities: ['Roster status', 'Teacher workflows', 'Family engagement', 'Compliance']
  },
  teacher: {
    label: 'Teacher',
    context: 'Classroom execution',
    mission: 'Keep classes, assignments, messages, and student progress moving.',
    primaryKpi: 'Classroom momentum',
    ambientPrompt: 'Show reminders only when assignments, messages, or interventions need action.',
    priorities: ['Assignments', 'Messages', 'Learner progress', 'Next actions']
  },
  parent: {
    label: 'Parent',
    context: 'Family support',
    mission: 'Find timely learning activities, events, and teacher communication.',
    primaryKpi: 'Family engagement',
    ambientPrompt: 'Keep the dashboard calm and reveal guidance when a child needs support.',
    priorities: ['Weekly brief', 'Messages', 'Upcoming events', 'Recommended support']
  }
} as const;

export type EnterpriseThemeName = keyof typeof enterpriseThemes;
export type EnterpriseRole = keyof typeof enterpriseRoles;
