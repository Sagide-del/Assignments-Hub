// ============================================================================
// KICD Senior School Career Pathways catalog (Grades 10-12)
// ----------------------------------------------------------------------------
// The 3 KICD pathways (STEM / Arts & Sports / Social Sciences), each split
// into 3 tracks, each fully populated with the content a Grade 9-12 student
// needs to evaluate it: required KCSE subjects/grades, realistic Kenyan
// salary ranges, Kenyan + international university programs, skills
// developed, job outlook, and concrete next steps. Consumed by
// prisma/seed.ts, which upserts each pathway/track by `key` — safe to rerun
// and safe to extend (add a career, tweak a salary band) without touching
// any other seed data.
//
// Salary ranges are monthly, in KES, and reflect realistic Kenyan market
// entry-to-mid-career bands as of 2026 — deliberately wide because Kenyan pay
// varies hugely by employer (multinational vs. local, Nairobi vs. rural) and
// experience level; they're meant to give students a sense of scale, not a
// guarantee.
// ============================================================================

export interface PathwayCareerSeed {
  title: string;
  description: string;
  salaryMinKES: number;
  salaryMaxKES: number;
}

export interface PathwayUniversityKenyaSeed {
  name: string;
  programs: string[];
}

export interface PathwayUniversityIntlSeed {
  name: string;
  country: string;
  programs: string[];
}

export interface PathwaySubjectRequirementSeed {
  subject: string;
  minGrade: string;
}

export interface TrackSeed {
  key: string;
  name: string;
  description: string;
  icon: string;
  // Display order of this track within its pathway (0-based).
  order: number;
  requiredSubjects: PathwaySubjectRequirementSeed[];
  minMeanGrade: string;
  // Fixed vocabulary used by the recommendation quiz on the frontend and
  // PathwaysService's scoring engine — keep values from this set:
  // science, technology, engineering, healthcare, environment, agriculture,
  // art, design, music, performing, film, sports, fitness, languages,
  // writing, media, law, government, business, finance, helping-people,
  // building-things, numbers, research
  interestTags: string[];
  careers: PathwayCareerSeed[];
  skills: string[];
  jobOutlook: string;
  jobGrowthRate: string;
  universitiesKenya: PathwayUniversityKenyaSeed[];
  universitiesIntl: PathwayUniversityIntlSeed[];
  degreeDurationYears: number;
  nextSteps: string[];
  extracurriculars: string[];
  certifications: string[];
  workExperience: string[];
}

export interface PathwaySeed {
  key: string;
  name: string;
  description: string;
  icon: string;
  colorHex: string;
  order: number;
  tracks: TrackSeed[];
}

export const PATHWAY_CATALOG: PathwaySeed[] = [
  // ==========================================================================
  // 1. STEM — Science, Technology, Engineering & Mathematics
  // ==========================================================================
  {
    key: 'stem',
    name: 'STEM',
    description:
      'Science, Technology, Engineering & Mathematics — for students who enjoy solving problems with numbers, experiments, and hands-on building. Leads to careers in medicine, research, technology, and engineering.',
    icon: 'fa-flask',
    colorHex: '#BBD125',
    order: 0,
    tracks: [
      {
        key: 'pure-sciences',
        name: 'Pure Sciences',
        description:
          'Biology, Chemistry, Physics and Mathematics at depth — the foundation for medicine, research science, and laboratory-based careers.',
        icon: 'fa-flask-vial',
        order: 0,
        requiredSubjects: [
          { subject: 'Mathematics', minGrade: 'B+' },
          { subject: 'Biology', minGrade: 'B+' },
          { subject: 'Chemistry', minGrade: 'B+' },
          { subject: 'Physics', minGrade: 'B+' },
        ],
        minMeanGrade: 'B+',
        interestTags: ['science', 'healthcare', 'research', 'helping-people', 'environment'],
        careers: [
          {
            title: 'Research Scientist',
            description: 'Designs and runs experiments in academic, government, or private-sector laboratories.',
            salaryMinKES: 120000,
            salaryMaxKES: 250000,
          },
          {
            title: 'Medical Doctor',
            description: 'Diagnoses and treats patients in hospitals and clinics after medical school and internship.',
            salaryMinKES: 200000,
            salaryMaxKES: 500000,
          },
          {
            title: 'Pharmacist',
            description: 'Dispenses medication and advises on drug safety in hospitals, pharmacies, or manufacturing.',
            salaryMinKES: 100000,
            salaryMaxKES: 200000,
          },
          {
            title: 'Environmental Scientist',
            description: 'Studies ecosystems and advises on conservation, pollution control, and climate policy.',
            salaryMinKES: 80000,
            salaryMaxKES: 180000,
          },
          {
            title: 'Biotechnologist',
            description: 'Applies biology and lab science to develop medicines, vaccines, and agricultural products.',
            salaryMinKES: 90000,
            salaryMaxKES: 200000,
          },
        ],
        skills: [
          'Critical Thinking',
          'Analytical Skills',
          'Research Methods',
          'Data Analysis',
          'Laboratory Skills',
          'Scientific Writing',
        ],
        jobOutlook:
          'High demand in healthcare, research, technology, and environmental sectors, both in Kenya and internationally.',
        jobGrowthRate: '8-10% annually',
        universitiesKenya: [
          { name: 'University of Nairobi', programs: ['BSc Biology', 'BSc Chemistry', 'BSc Physics'] },
          { name: 'Kenyatta University', programs: ['BSc Biotechnology', 'BSc Biochemistry'] },
          { name: 'Moi University', programs: ['BSc Microbiology', 'BSc Analytical Chemistry'] },
          { name: 'Egerton University', programs: ['BSc Agricultural Science', 'BSc Environmental Science'] },
          { name: 'JKUAT', programs: ['BSc Industrial Chemistry', 'BSc Medical Laboratory Science'] },
        ],
        universitiesIntl: [
          { name: 'Oxford University', country: 'UK', programs: ['BSc Biological Sciences', 'BSc Chemistry'] },
          { name: 'MIT', country: 'USA', programs: ['BSc Physics', 'BSc Biology'] },
        ],
        degreeDurationYears: 4,
        nextSteps: [
          'Maintain a B+ average in Mathematics and all three sciences through Senior School',
          'Sit KCSE with Mathematics, Biology, Chemistry and Physics as core examined subjects',
          'Shortlist university programs early — Medicine and Pharmacy have competitive cut-off points',
          'Register for KUCCPS placement as soon as it opens after KCSE results',
        ],
        extracurriculars: [
          'Science Club',
          'Kenya Science and Engineering Fair (KSEF)',
          'Debate club (for scientific communication)',
          'Coding or robotics club',
        ],
        certifications: ['First Aid certification (Kenya Red Cross)', 'Basic laboratory safety certification'],
        workExperience: [
          'Hospital or clinic attachment during school holidays',
          'Research institute internship (e.g. KEMRI, ICIPE)',
          'Volunteering at a local health facility',
        ],
      },
      {
        key: 'applied-sciences',
        name: 'Applied Sciences',
        description:
          'Agriculture, Computer Studies and Home Science — practical, technology-driven sciences that solve everyday problems in food, farming, and digital systems.',
        icon: 'fa-microchip',
        order: 1,
        requiredSubjects: [
          { subject: 'Mathematics', minGrade: 'B' },
          { subject: 'Agriculture', minGrade: 'B' },
          { subject: 'Computer Studies', minGrade: 'B' },
          { subject: 'Biology', minGrade: 'B-' },
        ],
        minMeanGrade: 'B',
        interestTags: ['technology', 'agriculture', 'science', 'building-things'],
        careers: [
          {
            title: 'Software Developer',
            description: 'Builds websites, mobile apps, and business systems for local and global companies.',
            salaryMinKES: 90000,
            salaryMaxKES: 300000,
          },
          {
            title: 'Agricultural Officer / Agronomist',
            description: 'Advises farmers on crop management, soil health, and yield improvement.',
            salaryMinKES: 70000,
            salaryMaxKES: 180000,
          },
          {
            title: 'ICT Systems Administrator',
            description: 'Manages an organization\'s computer networks, servers, and digital security.',
            salaryMinKES: 80000,
            salaryMaxKES: 200000,
          },
          {
            title: 'Food & Nutrition Consultant',
            description: 'Advises institutions and individuals on diet, food safety, and nutrition planning.',
            salaryMinKES: 60000,
            salaryMaxKES: 150000,
          },
          {
            title: 'Agribusiness Manager',
            description: 'Runs the commercial side of farming operations — supply chains, sales, and finance.',
            salaryMinKES: 90000,
            salaryMaxKES: 220000,
          },
        ],
        skills: [
          'Problem-Solving',
          'Programming Logic',
          'Farm & Resource Management',
          'Nutrition Planning',
          'Data Analysis',
          'Systems Thinking',
        ],
        jobOutlook:
          'Rapidly growing demand in Kenya\'s tech and agribusiness sectors — both pillars of Vision 2030 — with agri-tech creating new hybrid roles.',
        jobGrowthRate: '10-15% annually (ICT sector)',
        universitiesKenya: [
          { name: 'University of Nairobi', programs: ['BSc Computer Science', 'BSc Agriculture'] },
          { name: 'JKUAT', programs: ['BSc Computer Technology', 'BSc Horticulture'] },
          { name: 'Egerton University', programs: ['BSc Agriculture', 'BSc Agribusiness Management'] },
          { name: 'Kenyatta University', programs: ['BSc Home Economics', 'BSc Computer Science'] },
          { name: 'Strathmore University', programs: ['Bachelor of Business Information Technology'] },
        ],
        universitiesIntl: [
          { name: 'University of Cape Town', country: 'South Africa', programs: ['BSc Computer Science'] },
          { name: 'Wageningen University', country: 'Netherlands', programs: ['BSc Agricultural Sciences'] },
        ],
        degreeDurationYears: 4,
        nextSteps: [
          'Build a portfolio of small coding projects or a school farm/kitchen-garden project',
          'Keep Mathematics and your chosen applied subject (Agriculture/Computer Studies/Home Science) strong',
          'Explore short online courses (e.g. freeCodeCamp, Google Digital Skills for Africa) alongside schoolwork',
          'Look into KUCCPS cluster subject weighting for your target degree early',
        ],
        extracurriculars: ['Coding club', '4-K Club (Young Farmers)', 'Home Science exhibitions and competitions'],
        certifications: ['Cisco or Google IT certifications', 'Certificate in Agribusiness Management'],
        workExperience: [
          'Attachment at an agribusiness or agrovet',
          'ICT internship at a local firm',
          'Leading a school farm or kitchen-garden project',
        ],
      },
      {
        key: 'technical-studies',
        name: 'Technical Studies',
        description:
          'Aviation, Building & Construction, Electricity, Metalwork, Power Mechanics and Woodwork — hands-on technical training for Kenya\'s booming infrastructure and manufacturing sectors.',
        icon: 'fa-helmet-safety',
        order: 2,
        requiredSubjects: [
          { subject: 'Mathematics', minGrade: 'B-' },
          { subject: 'Physics', minGrade: 'B-' },
          { subject: 'Chosen Technical Subject', minGrade: 'B' },
        ],
        minMeanGrade: 'B-',
        interestTags: ['engineering', 'building-things', 'technology'],
        careers: [
          {
            title: 'Aviation Technician',
            description: 'Maintains and inspects aircraft systems for airlines and maintenance organizations.',
            salaryMinKES: 100000,
            salaryMaxKES: 250000,
          },
          {
            title: 'Civil Engineer / Construction Manager',
            description: 'Designs and oversees construction of roads, buildings, and other infrastructure.',
            salaryMinKES: 100000,
            salaryMaxKES: 280000,
          },
          {
            title: 'Electrical Engineer / Electrician',
            description: 'Designs, installs, and maintains electrical systems in buildings and industry.',
            salaryMinKES: 70000,
            salaryMaxKES: 200000,
          },
          {
            title: 'Mechanical / Automotive Engineer',
            description: 'Designs, builds, and maintains engines, machines, and vehicle systems.',
            salaryMinKES: 80000,
            salaryMaxKES: 220000,
          },
          {
            title: 'Fabrication Specialist (Metalwork/Woodwork)',
            description: 'Designs and builds custom metal or wood structures, furniture, and fittings.',
            salaryMinKES: 50000,
            salaryMaxKES: 150000,
          },
        ],
        skills: [
          'Technical Drawing',
          'Hands-on Craftsmanship',
          'Precision Measurement',
          'Safety Compliance',
          'Project Management',
          'Problem-Solving',
        ],
        jobOutlook:
          'Strong demand driven by Kenya\'s infrastructure boom (roads, housing, energy) and growing aviation sector.',
        jobGrowthRate: '7-12% annually',
        universitiesKenya: [
          {
            name: 'JKUAT',
            programs: ['BSc Civil Engineering', 'BSc Mechanical Engineering', 'BSc Electrical & Electronic Engineering'],
          },
          { name: 'University of Nairobi', programs: ['BSc Civil Engineering'] },
          { name: 'Technical University of Kenya', programs: ['BEng Building & Construction', 'BEng Electrical Engineering'] },
          { name: 'East African School of Aviation', programs: ['Diploma in Aviation Technology'] },
          { name: 'Multimedia University of Kenya', programs: ['BEng Mechatronic Engineering'] },
        ],
        universitiesIntl: [
          { name: 'Imperial College London', country: 'UK', programs: ['BEng Civil Engineering'] },
          { name: 'Embry-Riddle Aeronautical University', country: 'USA', programs: ['BSc Aviation Technology'] },
        ],
        degreeDurationYears: 4,
        nextSteps: [
          'Choose one technical subject to specialize in during Senior School (Aviation, Building & Construction, Electricity, Metalwork, Power Mechanics, or Woodwork)',
          'Keep Mathematics and Physics strong — both are required for every engineering program',
          'Consider the diploma-to-degree ladder via TVET institutions if a direct degree isn\'t within reach at first',
          'Visit workshops, construction sites, or an airport open day to see the work firsthand',
        ],
        extracurriculars: ['Young Engineers Club', 'Robotics club', 'National TVET skills competitions'],
        certifications: [
          'NITA (National Industrial Training Authority) trade test certification',
          'EPRA electrical installation certification',
        ],
        workExperience: [
          'Attachment at a construction site, garage, or workshop',
          'School holiday apprenticeship with a licensed artisan or engineer',
        ],
      },
    ],
  },

  // ==========================================================================
  // 2. Arts & Sports
  // ==========================================================================
  {
    key: 'arts',
    name: 'Arts & Sports',
    description:
      'Fine Arts, Performing Arts, and Sports — for students who express themselves through creativity or excel physically. Leads to careers in design, entertainment, media, and athletics.',
    icon: 'fa-palette',
    colorHex: '#2d8f5a',
    order: 1,
    tracks: [
      {
        key: 'fine-arts',
        name: 'Fine Arts',
        description: 'Visual arts, design, and creative expression — for students with a strong eye for composition, color, and craft.',
        icon: 'fa-paintbrush',
        order: 0,
        requiredSubjects: [
          { subject: 'Art & Design', minGrade: 'B' },
          { subject: 'English', minGrade: 'B' },
          { subject: 'Mathematics', minGrade: 'C+' },
        ],
        minMeanGrade: 'B-',
        interestTags: ['art', 'design', 'media'],
        careers: [
          {
            title: 'Graphic Designer',
            description: 'Creates visual content for brands, media, and digital platforms.',
            salaryMinKES: 50000,
            salaryMaxKES: 150000,
          },
          {
            title: 'Interior Designer',
            description: 'Plans and designs functional, attractive spaces for homes and businesses.',
            salaryMinKES: 60000,
            salaryMaxKES: 180000,
          },
          {
            title: 'Fashion Designer',
            description: 'Designs and produces clothing collections for local and international markets.',
            salaryMinKES: 45000,
            salaryMaxKES: 200000,
          },
          {
            title: 'Animator / Illustrator',
            description: 'Creates animated content and illustrations for film, games, and advertising.',
            salaryMinKES: 60000,
            salaryMaxKES: 220000,
          },
          {
            title: 'Art Director (Advertising)',
            description: 'Leads the visual direction of advertising campaigns and creative teams.',
            salaryMinKES: 100000,
            salaryMaxKES: 300000,
          },
        ],
        skills: [
          'Creativity',
          'Visual Composition',
          'Digital Design Software',
          'Color Theory',
          'Client Communication',
          'Portfolio Development',
        ],
        jobOutlook:
          'Growing demand driven by Kenya\'s creative economy, digital marketing boom, and East Africa\'s expanding fashion and design industry.',
        jobGrowthRate: '6-9% annually',
        universitiesKenya: [
          { name: 'Kenyatta University', programs: ['BA Fine Art', 'BA Design'] },
          { name: 'Technical University of Kenya', programs: ['BA Applied Art & Design'] },
          { name: 'Buruburu Institute of Fine Arts', programs: ['Diploma in Fine Art', 'Diploma in Graphic Design'] },
          { name: 'University of Nairobi', programs: ['BA Design'] },
        ],
        universitiesIntl: [
          { name: 'Central Saint Martins', country: 'UK', programs: ['BA Fine Art'] },
          { name: 'Parsons School of Design', country: 'USA', programs: ['BFA Fashion Design'] },
        ],
        degreeDurationYears: 4,
        nextSteps: [
          'Build a portfolio of your best work — sketches, digital pieces, projects — starting now',
          'Enter school and national art competitions and exhibitions',
          'Learn at least one design tool (Canva, Photoshop, or Illustrator) alongside schoolwork',
        ],
        extracurriculars: ['Art club', 'School exhibitions', 'Design and creative youth competitions'],
        certifications: ['Adobe Certified Professional (Photoshop/Illustrator)', 'Short courses in graphic design'],
        workExperience: [
          'Internship at a design agency or media house',
          'Freelance design work for local businesses',
          'Mentorship under a working artist or designer',
        ],
      },
      {
        key: 'performing-arts',
        name: 'Performing Arts',
        description: 'Music, dance, theatre, and film — for students who love performing, storytelling, and creative direction.',
        icon: 'fa-masks-theater',
        order: 1,
        requiredSubjects: [
          { subject: 'Music or Drama & Film', minGrade: 'B' },
          { subject: 'English', minGrade: 'B' },
        ],
        minMeanGrade: 'B-',
        interestTags: ['music', 'performing', 'film', 'media'],
        careers: [
          {
            title: 'Musician / Recording Artist',
            description: 'Writes, performs, and records music for live audiences and streaming platforms.',
            salaryMinKES: 40000,
            salaryMaxKES: 500000,
          },
          {
            title: 'Film / TV Actor',
            description: 'Performs in film, television, and stage productions.',
            salaryMinKES: 40000,
            salaryMaxKES: 300000,
          },
          {
            title: 'Film Director / Producer',
            description: 'Leads the creative and production process for film and television projects.',
            salaryMinKES: 80000,
            salaryMaxKES: 400000,
          },
          {
            title: 'Dance Instructor / Choreographer',
            description: 'Teaches and designs dance routines for performances, film, and events.',
            salaryMinKES: 40000,
            salaryMaxKES: 150000,
          },
          {
            title: 'Theatre Director / Producer',
            description: 'Directs stage productions from casting through to opening night.',
            salaryMinKES: 60000,
            salaryMaxKES: 200000,
          },
        ],
        skills: [
          'Performance Technique',
          'Stage Presence',
          'Creative Direction',
          'Storytelling',
          'Collaboration',
          'Public Speaking',
        ],
        jobOutlook:
          'Rapid growth fueled by Kenya\'s film/TV industry, growing music streaming audiences, and a booming live events industry.',
        jobGrowthRate: '9-14% annually',
        universitiesKenya: [
          { name: 'Kenyatta University', programs: ['BA Music', 'BA Theatre Arts & Film Technology'] },
          { name: 'Multimedia University of Kenya', programs: ['BA Film & TV Production'] },
          { name: 'Sarakasi Trust', programs: ['Performing Arts Training Programme'] },
        ],
        universitiesIntl: [
          { name: 'Juilliard School', country: 'USA', programs: ['BM Music', 'BFA Drama'] },
          { name: 'Royal Academy of Dramatic Art (RADA)', country: 'UK', programs: ['BA Acting'] },
        ],
        degreeDurationYears: 4,
        nextSteps: [
          'Join school drama, music, or dance clubs and perform as often as possible',
          'Enter the Kenya Schools and Colleges Drama Festival and national music festivals',
          'Start building a demo reel, portfolio, or recorded set of your work',
        ],
        extracurriculars: [
          'Drama club',
          'Kenya Schools and Colleges Drama Festival',
          'School and community music festivals',
        ],
        certifications: ['Trinity College London music grades', 'ABRSM music examinations'],
        workExperience: [
          'School drama productions and concerts',
          'Local theatre or studio attachment',
          'Performing at community events and gigs',
        ],
      },
      {
        key: 'sports',
        name: 'Sports',
        description: 'Sports management, coaching, and athletic performance — for students who thrive in physical training, competition, and team leadership.',
        icon: 'fa-person-running',
        order: 2,
        requiredSubjects: [
          { subject: 'Physical Education', minGrade: 'B' },
          { subject: 'Biology', minGrade: 'C+' },
          { subject: 'English', minGrade: 'B' },
        ],
        minMeanGrade: 'B-',
        interestTags: ['sports', 'fitness', 'helping-people'],
        careers: [
          {
            title: 'Professional Athlete',
            description: 'Competes at club, national, or international level in an individual or team sport.',
            salaryMinKES: 50000,
            salaryMaxKES: 1000000,
          },
          {
            title: 'Sports Coach / Trainer',
            description: 'Trains athletes and teams to improve performance and prepare for competition.',
            salaryMinKES: 40000,
            salaryMaxKES: 150000,
          },
          {
            title: 'Sports Manager / Agent',
            description: 'Manages athletes\' careers, contracts, and sponsorship deals.',
            salaryMinKES: 80000,
            salaryMaxKES: 250000,
          },
          {
            title: 'Sports Physiotherapist',
            description: 'Treats and rehabilitates athletes\' injuries to keep them performing safely.',
            salaryMinKES: 90000,
            salaryMaxKES: 200000,
          },
          {
            title: 'Sports Journalist / Broadcaster',
            description: 'Covers sports events and stories for TV, radio, and digital media.',
            salaryMinKES: 60000,
            salaryMaxKES: 180000,
          },
        ],
        skills: [
          'Physical Conditioning',
          'Leadership',
          'Strategic Thinking',
          'Team Management',
          'Discipline',
          'Communication',
        ],
        jobOutlook:
          'Strong growth given Kenya\'s global standing in athletics, expanding football/rugby leagues, and rising investment in sports tourism and management.',
        jobGrowthRate: '7-10% annually',
        universitiesKenya: [
          { name: 'Kenyatta University', programs: ['BEd Physical Education', 'BSc Sports Science'] },
          { name: 'Moi University', programs: ['BSc Sports Science'] },
          { name: 'University of Nairobi', programs: ['Sports Medicine programs'] },
        ],
        universitiesIntl: [
          { name: 'Loughborough University', country: 'UK', programs: ['BSc Sports Science'] },
          { name: 'University of Florida', country: 'USA', programs: ['BSc Sports Management'] },
        ],
        degreeDurationYears: 4,
        nextSteps: [
          'Compete consistently in school, county, and national athletics or league competitions',
          'Balance training with academics — most sports careers still benefit from a degree as a fallback/second career',
          'Seek out a certified coach or club to formally train under',
        ],
        extracurriculars: ['School athletics/football/rugby team', 'Inter-county and national school competitions'],
        certifications: [
          'Athletics Kenya coaching certification',
          'Kenya Football Federation (FKF) coaching badges',
        ],
        workExperience: ['Assistant coaching at a local club', 'Volunteering at sports camps and school tournaments'],
      },
    ],
  },

  // ==========================================================================
  // 3. Social Sciences
  // ==========================================================================
  {
    key: 'social',
    name: 'Social Sciences',
    description:
      'Languages, Humanities, and Business Studies — for students who enjoy communication, ideas, ethics, and how people, markets, and societies work. Leads to careers in law, media, business, and public service.',
    icon: 'fa-scale-balanced',
    colorHex: '#2a69ac',
    order: 2,
    tracks: [
      {
        key: 'languages',
        name: 'Languages',
        description: 'Literature, foreign languages, and communication — for students with a gift for words and cross-cultural connection.',
        icon: 'fa-language',
        order: 0,
        requiredSubjects: [
          { subject: 'English', minGrade: 'B+' },
          { subject: 'Kiswahili', minGrade: 'B' },
          { subject: 'Literature', minGrade: 'B' },
        ],
        minMeanGrade: 'B',
        interestTags: ['languages', 'writing', 'media', 'helping-people'],
        careers: [
          {
            title: 'Translator / Interpreter',
            description: 'Converts written or spoken content between languages for business, media, or government.',
            salaryMinKES: 60000,
            salaryMaxKES: 180000,
          },
          {
            title: 'Journalist / Broadcaster',
            description: 'Researches, writes, and presents news and stories across print, TV, radio, and digital media.',
            salaryMinKES: 50000,
            salaryMaxKES: 200000,
          },
          {
            title: 'Public Relations Specialist',
            description: 'Manages an organization\'s public image, messaging, and media relationships.',
            salaryMinKES: 70000,
            salaryMaxKES: 200000,
          },
          {
            title: 'Diplomat / Foreign Service Officer',
            description: 'Represents Kenya\'s interests abroad through embassies and international relations.',
            salaryMinKES: 120000,
            salaryMaxKES: 350000,
          },
          {
            title: 'Content Writer / Editor',
            description: 'Writes and edits content for publications, brands, and digital platforms.',
            salaryMinKES: 45000,
            salaryMaxKES: 150000,
          },
        ],
        skills: [
          'Written & Verbal Communication',
          'Multilingualism',
          'Cultural Awareness',
          'Research',
          'Persuasive Writing',
          'Media Literacy',
        ],
        jobOutlook:
          'Strong demand in media, diplomacy, international NGOs, and Kenya\'s growing digital content industry.',
        jobGrowthRate: '6-9% annually',
        universitiesKenya: [
          { name: 'University of Nairobi', programs: ['BA Linguistics', 'BA French', 'BA German'] },
          { name: 'Kenyatta University', programs: ['BA English', 'BA Kiswahili'] },
          { name: 'Moi University', programs: ['BA Communication'] },
          { name: 'USIU-Africa', programs: ['BA International Relations', 'BA Journalism'] },
        ],
        universitiesIntl: [
          { name: 'SOAS University of London', country: 'UK', programs: ['BA Languages & Linguistics'] },
          { name: 'Georgetown University', country: 'USA', programs: ['BA Foreign Service'] },
        ],
        degreeDurationYears: 4,
        nextSteps: [
          'Read widely — fiction, news, and non-fiction — in both English and Kiswahili',
          'Practice writing regularly: a journal, school newspaper, or blog',
          'Consider learning a third language (French, German, Chinese, or Arabic)',
        ],
        extracurriculars: ['Debate club / Toastmasters', 'School newspaper or press club', 'Model United Nations (MUN)'],
        certifications: ['DELF/DALF French proficiency', 'IELTS/TOEFL English proficiency'],
        workExperience: ['Internship at a media house or newsroom', 'Communications volunteering with an NGO'],
      },
      {
        key: 'humanities',
        name: 'Humanities',
        description: 'History, citizenship, religious education, and philosophy — for students drawn to ideas, ethics, and how societies are governed.',
        icon: 'fa-landmark',
        order: 1,
        requiredSubjects: [
          { subject: 'History & Government', minGrade: 'B' },
          { subject: 'CRE/IRE', minGrade: 'B' },
          { subject: 'English', minGrade: 'B' },
        ],
        minMeanGrade: 'B-',
        interestTags: ['law', 'government', 'helping-people', 'research'],
        careers: [
          {
            title: 'Lawyer / Advocate',
            description: 'Represents clients and interprets the law in courts, firms, and government.',
            salaryMinKES: 100000,
            salaryMaxKES: 400000,
          },
          {
            title: 'Policy Analyst',
            description: 'Researches and advises government or organizations on public policy decisions.',
            salaryMinKES: 90000,
            salaryMaxKES: 250000,
          },
          {
            title: 'Historian / Museum Curator',
            description: 'Researches and preserves historical records, artifacts, and heritage sites.',
            salaryMinKES: 50000,
            salaryMaxKES: 150000,
          },
          {
            title: 'Religious / Community Leader',
            description: 'Leads faith communities and provides guidance, counsel, and pastoral care.',
            salaryMinKES: 40000,
            salaryMaxKES: 150000,
          },
          {
            title: 'Human Rights Officer',
            description: 'Advocates for and protects human rights through NGOs, government, or international bodies.',
            salaryMinKES: 70000,
            salaryMaxKES: 200000,
          },
        ],
        skills: [
          'Critical Analysis',
          'Ethical Reasoning',
          'Research & Argumentation',
          'Public Speaking',
          'Policy Interpretation',
          'Civic Engagement',
        ],
        jobOutlook:
          'Steady demand in law, governance, and civil society, with Kenya\'s devolved county government structure creating more policy and public-service roles.',
        jobGrowthRate: '5-8% annually',
        universitiesKenya: [
          { name: 'University of Nairobi', programs: ['LLB Law', 'BA History'] },
          { name: 'Kenyatta University', programs: ['BA Philosophy', 'BA Religious Studies'] },
          { name: 'Moi University', programs: ['BA History & Political Science'] },
          { name: 'Strathmore Law School', programs: ['LLB Law'] },
        ],
        universitiesIntl: [
          { name: 'Harvard University', country: 'USA', programs: ['BA Government'] },
          { name: 'University of Oxford', country: 'UK', programs: ['BA History and Politics'] },
        ],
        degreeDurationYears: 4,
        nextSteps: [
          'Practice structured argument and debate — law and policy careers depend on it',
          'Follow current affairs and Kenyan government/county news closely',
          'Note that Law (LLB) typically runs 4-5 years plus a post-degree diploma at the Kenya School of Law',
        ],
        extracurriculars: [
          'Debate club',
          'Model United Nations (MUN)',
          'School Christian Union / Muslim Students Association leadership',
        ],
        certifications: ['Kenya School of Law Advocates Training Programme (post-LLB, for the law track)'],
        workExperience: ['Law firm attachment', 'County government internship', 'Community leadership roles'],
      },
      {
        key: 'business-studies',
        name: 'Business Studies',
        description: 'Business administration, economics, accounting, and finance — for students who like numbers, strategy, and how markets and organizations work.',
        icon: 'fa-briefcase',
        order: 2,
        requiredSubjects: [
          { subject: 'Mathematics', minGrade: 'B' },
          { subject: 'Business Studies', minGrade: 'B' },
          { subject: 'English', minGrade: 'B' },
        ],
        minMeanGrade: 'B',
        interestTags: ['business', 'finance', 'numbers'],
        careers: [
          {
            title: 'Accountant / CPA',
            description: 'Manages financial records, audits, and tax compliance for organizations.',
            salaryMinKES: 70000,
            salaryMaxKES: 250000,
          },
          {
            title: 'Financial Analyst',
            description: 'Analyzes markets and investments to guide business and financial decisions.',
            salaryMinKES: 90000,
            salaryMaxKES: 280000,
          },
          {
            title: 'Entrepreneur / Business Owner',
            description: 'Builds and runs a business — income varies widely with the business\'s success.',
            salaryMinKES: 50000,
            salaryMaxKES: 500000,
          },
          {
            title: 'Bank / Investment Manager',
            description: 'Manages client accounts, lending, or investment portfolios at a financial institution.',
            salaryMinKES: 100000,
            salaryMaxKES: 350000,
          },
          {
            title: 'Marketing Manager',
            description: 'Plans and leads campaigns to grow a brand\'s customers and revenue.',
            salaryMinKES: 80000,
            salaryMaxKES: 250000,
          },
        ],
        skills: [
          'Financial Analysis',
          'Strategic Planning',
          'Negotiation',
          'Leadership',
          'Numeracy',
          'Market Research',
        ],
        jobOutlook:
          'High demand across banking, telecom, manufacturing, and Kenya\'s expanding startup ecosystem — one of Africa\'s leading tech and business hubs.',
        jobGrowthRate: '8-11% annually',
        universitiesKenya: [
          { name: 'University of Nairobi', programs: ['Bachelor of Commerce (BCom)'] },
          { name: 'Strathmore University', programs: ['BCom', 'Bachelor of Business Science'] },
          { name: 'Kenyatta University', programs: ['BCom'] },
          { name: 'JKUAT', programs: ['BSc Actuarial Science', 'BCom'] },
          { name: 'USIU-Africa', programs: ['BSc International Business Administration'] },
        ],
        universitiesIntl: [
          { name: 'London School of Economics', country: 'UK', programs: ['BSc Economics'] },
          { name: 'Wharton School, University of Pennsylvania', country: 'USA', programs: ['BSc Economics/Business'] },
        ],
        degreeDurationYears: 4,
        nextSteps: [
          'Keep Mathematics strong — it underpins accounting, finance, and economics degrees',
          'Start a small school or community enterprise to build real business experience',
          'Learn the basics of budgeting and bookkeeping outside the classroom',
        ],
        extracurriculars: [
          'Young entrepreneurs club / Junior Achievement Kenya',
          'Business plan competitions',
        ],
        certifications: ['CPA Kenya', 'ACCA (Association of Chartered Certified Accountants)'],
        workExperience: [
          'Bank or SACCO attachment',
          'Running a small school-based enterprise',
          'Internship at an accounting or consulting firm',
        ],
      },
    ],
  },
];
