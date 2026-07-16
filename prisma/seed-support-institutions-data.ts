// ============================================================================
// Support Institution catalog — real Kenyan institutions and organizations
// relevant to a student with a disability or additional learning need.
// ----------------------------------------------------------------------------
// Compiled from public web sources (school directories, KISE, APDK, and news
// coverage) as of July 2026. Contact details for schools in Kenya change
// often (phone numbers, head teachers, sometimes even names after a merger).
// EVERY entry has a `sourceNote` flagging it as "verify before publishing/
// contacting" — a school admin should confirm current details directly with
// the institution (or via the Ministry of Education's NEMIS school list)
// before this goes in front of real families. Nothing here should be read as
// a diagnosis or a guarantee of admission — it is a starting point.
//
// The single most important entry is the EARC one: for ANY student who
// hasn't already had a formal assessment, that is always the correct first
// recommendation, ahead of any specific school.
// ============================================================================

export interface SupportInstitutionSeed {
  key: string;
  name: string;
  type: 'ASSESSMENT_CENTER' | 'SPECIAL_SCHOOL' | 'INCLUSIVE_MAINSTREAM' | 'VOCATIONAL_TRAINING' | 'SUPPORT_ORGANIZATION';
  categories: Array<
    | 'VISUAL_IMPAIRMENT'
    | 'HEARING_IMPAIRMENT'
    | 'PHYSICAL_DISABILITY'
    | 'INTELLECTUAL_DEVELOPMENTAL'
    | 'AUTISM_SPECTRUM'
    | 'MULTIPLE_DEAFBLIND'
    | 'OTHER_UNSURE'
  >;
  county: string;
  town?: string;
  boardingType?: string;
  ageRange?: string;
  description: string;
  servicesOffered?: string[];
  contactPhone?: string;
  contactEmail?: string;
  website?: string;
  sourceNote: string;
  order: number;
}

const VERIFY_NOTE = 'Compiled from public sources, July 2026 — please verify current contact details and admission status directly with the institution before relying on this.';

export const SUPPORT_INSTITUTION_CATALOG: SupportInstitutionSeed[] = [
  // ---- Assessment (always the correct first stop) ----
  {
    key: 'earc-kise',
    name: 'Educational Assessment & Resource Centre (EARC) — coordinated by KISE',
    type: 'ASSESSMENT_CENTER',
    categories: ['VISUAL_IMPAIRMENT', 'HEARING_IMPAIRMENT', 'PHYSICAL_DISABILITY', 'INTELLECTUAL_DEVELOPMENTAL', 'AUTISM_SPECTRUM', 'MULTIPLE_DEAFBLIND', 'OTHER_UNSURE'],
    county: 'Nairobi (national) — every county has a Sub-County EARC',
    town: 'Nairobi (Kenya Institute of Special Education HQ)',
    description:
      'The official, government-run starting point for any child suspected of having a disability. EARC officers carry out a free functional assessment (physical, cognitive, sensory) and recommend the type of placement and support the child needs. Every county has a Sub-County Education Office / EARC — ask there first, before choosing a school.',
    servicesOffered: ['Free functional assessment', 'Placement recommendation', 'Referral to appropriate specialists', 'Guidance for parents/guardians'],
    website: 'https://kise.ac.ke/service/educational-assessment-and-resource-centre/',
    sourceNote: VERIFY_NOTE,
    order: 0,
  },
  {
    key: 'kise',
    name: 'Kenya Institute of Special Education (KISE)',
    type: 'SUPPORT_ORGANIZATION',
    categories: ['VISUAL_IMPAIRMENT', 'HEARING_IMPAIRMENT', 'PHYSICAL_DISABILITY', 'INTELLECTUAL_DEVELOPMENTAL', 'AUTISM_SPECTRUM', 'MULTIPLE_DEAFBLIND', 'OTHER_UNSURE'],
    county: 'Nairobi',
    town: 'Nairobi',
    description:
      "Kenya's national body for special needs education — trains teachers, runs the EARC assessment network, and offers early intervention, therapy referrals, and consultations through its Assessment and Research Centre.",
    servicesOffered: ['Functional assessment', 'Early intervention referrals', 'Teacher training', 'Research & resource development'],
    website: 'https://kise.ac.ke/',
    sourceNote: VERIFY_NOTE,
    order: 1,
  },

  // ---- Visual Impairment ----
  {
    key: 'thika-high-school-for-the-blind',
    name: 'Thika High School for the Blind',
    type: 'SPECIAL_SCHOOL',
    categories: ['VISUAL_IMPAIRMENT'],
    county: 'Kiambu',
    town: 'Thika',
    boardingType: 'Boarding',
    description: 'A mixed full-boarding secondary school for visually impaired students, drawing learners from primary schools for the blind across Kenya and neighboring countries.',
    sourceNote: VERIFY_NOTE,
    order: 10,
  },
  {
    key: 'st-lucys-school-for-the-blind',
    name: "St. Lucy's School for the Blind",
    type: 'SPECIAL_SCHOOL',
    categories: ['VISUAL_IMPAIRMENT'],
    county: 'Meru',
    town: 'Igoji',
    boardingType: 'Boarding',
    description: 'A long-established mixed boarding school (primary and secondary) for visually impaired learners, founded in 1958 and supporting around 300 students.',
    contactPhone: '+254 64 22521',
    sourceNote: VERIFY_NOTE,
    order: 11,
  },
  {
    key: 'st-oda-school-for-the-visually-impaired',
    name: 'St. Oda School for the Visually Impaired',
    type: 'SPECIAL_SCHOOL',
    categories: ['VISUAL_IMPAIRMENT'],
    county: 'Siaya',
    town: 'Aluor, South Gem, Wagai',
    boardingType: 'Boarding',
    ageRange: 'Pre-school to Class 8',
    description: 'A mixed boarding primary school for visually impaired learners in South Gem, Siaya County, established by the Franciscan Sisters of St. Anna.',
    sourceNote: VERIFY_NOTE,
    order: 12,
  },

  // ---- Hearing Impairment ----
  {
    key: 'pcea-kambui-school-for-the-deaf',
    name: 'PCEA Kambui School for the Deaf',
    type: 'SPECIAL_SCHOOL',
    categories: ['HEARING_IMPAIRMENT'],
    county: 'Kiambu',
    town: 'Githunguri',
    boardingType: 'Boarding',
    description: 'A mixed boarding primary school for deaf learners, started by the Presbyterian Church of East Africa in 1963.',
    sourceNote: VERIFY_NOTE,
    order: 20,
  },
  {
    key: 'st-marys-school-nyangoma-for-the-deaf',
    name: "St. Mary's School Nyang'oma for the Deaf",
    type: 'SPECIAL_SCHOOL',
    categories: ['HEARING_IMPAIRMENT'],
    county: 'Siaya',
    boardingType: 'Boarding',
    ageRange: 'Nursery to Class 8',
    description: 'Established in 1962, admitting children with hearing disabilities from nursery age through primary school.',
    sourceNote: VERIFY_NOTE,
    order: 21,
  },

  // ---- Physical Disability ----
  {
    key: 'joytown-secondary-school',
    name: 'Joytown Secondary School',
    type: 'SPECIAL_SCHOOL',
    categories: ['PHYSICAL_DISABILITY'],
    county: 'Kiambu',
    town: 'Thika',
    boardingType: 'Boarding',
    description: 'A secondary school specifically for learners with physical disabilities, continuing on from Joytown Primary for students completing primary school.',
    sourceNote: VERIFY_NOTE,
    order: 30,
  },
  {
    key: 'port-reitz-special-school',
    name: 'Port Reitz Special School',
    type: 'SPECIAL_SCHOOL',
    categories: ['PHYSICAL_DISABILITY', 'MULTIPLE_DEAFBLIND'],
    county: 'Mombasa',
    town: 'Changamwe',
    boardingType: 'Day & Boarding',
    description: "A public primary school that combines a day school for the community with a boarding section for physically impaired children, following the standard curriculum alongside physiotherapy and rehabilitation services.",
    servicesOffered: ['Physiotherapy', 'Rehabilitation', 'Inclusive day + boarding model'],
    sourceNote: VERIFY_NOTE,
    order: 31,
  },

  // ---- Intellectual / Developmental / Autism ----
  {
    key: 'jacaranda-special-school',
    name: 'Jacaranda Special School',
    type: 'SPECIAL_SCHOOL',
    categories: ['INTELLECTUAL_DEVELOPMENTAL', 'AUTISM_SPECTRUM'],
    county: 'Nairobi',
    town: 'Kilimani',
    boardingType: 'Day',
    description: 'A government-funded school (established 1946) admitting children with intellectual disabilities, Down syndrome, cerebral palsy, and autism from across the country.',
    sourceNote: VERIFY_NOTE,
    order: 40,
  },
  {
    key: 'bloom-garden-autism-academy',
    name: 'Bloom Garden Autism Academy',
    type: 'SPECIAL_SCHOOL',
    categories: ['AUTISM_SPECTRUM', 'INTELLECTUAL_DEVELOPMENTAL'],
    county: 'Nairobi',
    description: 'Offers services and support for students with autism, ADHD, intellectual disabilities, Down syndrome, and specific learning difficulties.',
    sourceNote: VERIFY_NOTE,
    order: 41,
  },
  {
    key: 'st-geralds-centre',
    name: "St Gerald's Centre",
    type: 'SPECIAL_SCHOOL',
    categories: ['AUTISM_SPECTRUM'],
    county: 'Kiambu',
    town: 'Tigoni, Limuru',
    boardingType: 'Day & Boarding',
    ageRange: '3–16 years',
    description: 'A day and boarding centre offering interventions specifically for children on the autism spectrum.',
    sourceNote: VERIFY_NOTE,
    order: 42,
  },
  {
    key: 'allamano-special-school',
    name: 'Allamano Special School',
    type: 'SPECIAL_SCHOOL',
    categories: ['INTELLECTUAL_DEVELOPMENTAL', 'AUTISM_SPECTRUM', 'PHYSICAL_DISABILITY'],
    county: 'Nyeri',
    boardingType: 'Boarding',
    description: 'A boarding institution providing specialized education, therapy, and care for children with a range of intellectual and physical disabilities, including personalized programs for autism.',
    sourceNote: VERIFY_NOTE,
    order: 43,
  },

  // ---- Vocational training & ongoing support ----
  {
    key: 'apdk',
    name: 'Association for the Physically Disabled of Kenya (APDK)',
    type: 'VOCATIONAL_TRAINING',
    categories: ['PHYSICAL_DISABILITY', 'MULTIPLE_DEAFBLIND', 'OTHER_UNSURE'],
    county: 'Nairobi (national — 10 branches: Mombasa, Nakuru, Kisumu, Kisii, Eldoret, Busia, Machakos, Embu, Siaya)',
    description:
      'One of the longest-running disability organizations in Kenya (since 1958). Offers medical rehabilitation, mobility aids and appliances, vocational training, employment and self-employment support (including microfinance), and community-based rehabilitation — useful both alongside schooling and after Senior School.',
    servicesOffered: ['Vocational training', 'Mobility aids & appliances', 'Microfinance for self-employment', 'Community-based rehabilitation'],
    website: 'https://apdk.org/',
    sourceNote: VERIFY_NOTE,
    order: 50,
  },
];
