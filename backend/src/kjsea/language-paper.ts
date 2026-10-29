import { MockQuestion, seededRandom, shuffle } from "./mathematics";
/** Original platform-authored stimuli; the uploaded paper informs organisation,
 * not copied passages or an assertion about an official KNEC specification. */
export function languageExam(
  seed: number,
  grade: string,
  subject: string,
): MockQuestion[] {
  const r = seededRandom(seed),
    sw = /kiswahili/i.test(subject),
    questions: MockQuestion[] = [];
  const learners = ["Amina", "Baraka", "Neema", "Otieno"],
    name = learners[Math.floor(r() * learners.length)],
    trees = 24 + 4 * Math.floor(r() * 10),
    half = trees / 2;
  function group(
    section: string,
    title: string,
    text: string,
    items: [string, string, string[], string][],
  ) {
    for (const [prompt, answer, distractors, explanation] of items) {
      const options = shuffle([answer, ...distractors], r);
      questions.push({
        id: `q-${questions.length + 1}`,
        topicId: `language:${section}`,
        topic: title,
        area: section,
        section,
        marks: 1,
        responseType: "CHOICE",
        prompt,
        passage: { title, text },
        options,
        correctIndex: options.indexOf(answer),
        explanation,
        sourceGrade: grade,
      });
    }
  }
  if (!sw) {
    group(
      "A · Dialogue",
      "Read the dialogue and fill gaps 1–5",
      `${name}: Have you finished the notice for our tree-planting day?\nTeacher: Yes. I (1) ____ it yesterday.\n${name}: Where (2) ____ we meet on Saturday?\nTeacher: At the school gate. Bring a bottle of water (3) ____ the day may be hot.\n${name}: Should every learner bring (4) ____ own gloves?\nTeacher: Yes. We can share tools, (5) ____ everyone must handle them carefully.`,
      [
        [
          "Choose the best word for gap 1.",
          "completed",
          ["complete", "completing", "completes"],
          "“Yesterday” requires the simple past: completed.",
        ],
        [
          "Choose the best word for gap 2.",
          "shall",
          ["did", "has", "was"],
          "“Shall we meet” asks about the planned future meeting.",
        ],
        [
          "Choose the best word for gap 3.",
          "because",
          ["although", "unless", "until"],
          "The possible heat gives the reason for bringing water.",
        ],
        [
          "Choose the best word for gap 4.",
          "their",
          ["there", "them", "theirs"],
          "The possessive determiner “their” comes before “own gloves”.",
        ],
        [
          "Choose the best word for gap 5.",
          "but",
          ["or", "so that", "before"],
          "“But” contrasts sharing tools with each learner’s responsibility.",
        ],
      ],
    );
    group(
      "B · Cloze",
      "Read the passage and choose the missing words",
      `Our class wanted to reduce waste. First, we (1) ____ the rubbish produced during one week. We sorted it (2) ____ three groups. Food scraps went into a compost bin, (3) ____ paper was saved for recycling. The class monitor recorded the results (4) ____. After a month, we had (5) ____ bags of rubbish than before.`,
      [
        [
          "Choose the word for gap 1.",
          "measured",
          ["measuring", "measures", "measurement"],
          "The passage reports a completed investigation, so the past verb “measured” fits.",
        ],
        [
          "Choose the word for gap 2.",
          "into",
          ["onto", "over", "amongst"],
          "“Sorted into groups” is the correct expression.",
        ],
        [
          "Choose the word for gap 3.",
          "while",
          ["unless", "until", "despite"],
          "“While” links the two different actions of composting and recycling.",
        ],
        [
          "Choose the word for gap 4.",
          "carefully",
          ["careful", "care", "caring"],
          "An adverb describes how the monitor recorded the results.",
        ],
        [
          "Choose the word for gap 5.",
          "fewer",
          ["less", "little", "much"],
          "Bags are countable, so the comparative is “fewer”.",
        ],
      ],
    );
    group(
      "C · Reading comprehension",
      "A decision at the stream",
      `The school environmental club planned to plant ${trees} seedlings near a stream. When ${name} visited the site, the soil beside the water was soft and small footprints had filled with water. Higher up the bank, the soil held together when squeezed. The club had only two watering cans, and the forecast promised a dry week.\n\nSome members wanted to plant all the seedlings on the first afternoon. ${name} suggested planting ${half} on the higher ground and keeping the others in the shaded nursery. “A planted tree is not yet an established tree,” the learner said. The group agreed to record survival, not merely count planting holes.\n\nAfter seven days, the club compared its notes. The seedlings on the higher ground had needed regular watering, but their roots were firm. The nursery seedlings were also healthy. The members decided to plant the second group only after arranging a watering rota.`,
      [
        [
          "How many seedlings did the club first plan to plant?",
          String(trees),
          [String(half), String(trees + 7), String(trees * 2)],
          "The opening sentence states the planned total.",
        ],
        [
          "Which observation suggests that the stream-side soil was waterlogged?",
          "The footprints filled with water.",
          [
            "The bank was higher.",
            "There were two watering cans.",
            "The nursery was shaded.",
          ],
          "Water collecting in footprints is direct evidence of very wet soil.",
        ],
        [
          "Why was the dry forecast relevant to the decision?",
          "New seedlings would need a reliable supply of water.",
          [
            "The stream would certainly disappear.",
            "Dry weather makes every soil fertile.",
            "The club could avoid keeping records.",
          ],
          "The dry week increased the need to plan watering; the passage does not say the stream would disappear.",
        ],
        [
          "What does “established” mean in this passage?",
          "Rooted and growing successfully in its new place.",
          [
            "Already counted in a notebook.",
            "Planted in the largest hole.",
            "Kept permanently in a nursery.",
          ],
          "The contrast is between placing a tree in a hole and helping it survive.",
        ],
        [
          "Which quality does the learner show?",
          "Careful judgement based on evidence.",
          [
            "Dislike of teamwork.",
            "Refusal to do practical work.",
            "Interest only in finishing quickly.",
          ],
          "The learner considers soil, weather and available equipment before suggesting a plan.",
        ],
      ],
    );
    group(
      "D · Informational reading",
      "A library notice",
      `COMMUNITY LIBRARY — STUDY WEEK\nMonday–Friday: 9 a.m.–5 p.m.\nSaturday: 10 a.m.–2 p.m.\nMembers may borrow two books for seven days. Reference books must remain in the library. Return borrowed books to the desk; do not put them straight on the shelves. A quiet room is available for individual study. Group discussions take place in the courtyard. Please tell the librarian if a book is damaged so that it can be repaired.`,
      [
        [
          "What is the main purpose of this notice?",
          "To explain how visitors should use the library.",
          [
            "To sell the building.",
            "To describe a fictional character.",
            "To invite visitors to a sports match.",
          ],
          "The notice gives opening times and rules for library use.",
        ],
        [
          "When does the library close on Saturday?",
          "2 p.m.",
          ["5 p.m.", "9 a.m.", "10 p.m."],
          "The Saturday opening period ends at 2 p.m.",
        ],
        [
          "Why should a reader take a reference book to the quiet room rather than home?",
          "Reference books must stay inside the library.",
          [
            "All books are damaged.",
            "The courtyard is closed.",
            "No member may borrow any book.",
          ],
          "The notice explicitly distinguishes reference books from borrowed books.",
        ],
        [
          "What should a member do on returning a borrowed book?",
          "Hand it to the desk.",
          [
            "Place it anywhere on a shelf.",
            "Leave it in the courtyard.",
            "Keep it for another month.",
          ],
          "Returning books through the desk allows the library to record returns.",
        ],
        [
          "Which action follows the notice?",
          "Discuss a project with a group in the courtyard.",
          [
            "Hold a loud group discussion in the quiet room.",
            "Take three reference books home.",
            "Hide a damaged page.",
          ],
          "The courtyard is the designated place for group discussion.",
        ],
      ],
    );
    group(
      "E · Poetry",
      "Read the original poem",
      `Before the sun has warmed the hill,\nA tiny seed lies dark and still.\nThe patient rain knocks at its door;\nA green shoot reaches up for more.\nNo crowd applauds the work below,\nYet hidden roots make tall trees grow.`,
      [
        [
          "Which words rhyme in the first two lines?",
          "hill and still",
          ["hill and seed", "sun and dark", "warmed and tiny"],
          "The similar ending sounds in “hill” and “still” make the rhyme.",
        ],
        [
          "Which line gives rain a human action?",
          "The patient rain knocks at its door.",
          [
            "A tiny seed lies dark and still.",
            "A green shoot reaches up for more.",
            "Yet hidden roots make tall trees grow.",
          ],
          "Knocking at a door is a human action used to describe rain.",
        ],
        [
          "What do the hidden roots suggest?",
          "Important growth can happen without being noticed.",
          [
            "Trees grow without roots.",
            "Every seed becomes a crowd.",
            "Rain prevents plants from growing.",
          ],
          "The unseen roots support the visible tree, developing the poem’s message.",
        ],
        [
          "What is the mood of the poem?",
          "Hopeful and reflective.",
          [
            "Angry and threatening.",
            "Mocking and cruel.",
            "Panicked and confused.",
          ],
          "Images of patient rain and growth create a thoughtful, hopeful tone.",
        ],
        [
          "Which title best fits the poem?",
          "Quiet Growth",
          ["A Football Final", "A Crowded Market", "The Broken Window"],
          "The poem focuses on the unnoticed work that supports growth.",
        ],
      ],
    );
    const grammar: [string, string, string[], string][] = [
      [
        "Choose the correct sentence.",
        "Neither of the bags is mine.",
        [
          "Neither of the bags are mine.",
          "Neither of the bags were mines.",
          "Neither of the bags be mine.",
        ],
        "“Neither” takes a singular verb in this construction.",
      ],
      [
        "Complete: If it rains tomorrow, we ____ indoors.",
        "will stay",
        ["stayed", "had stayed", "staying"],
        "The first conditional uses present tense in the if-clause and “will” in the result clause.",
      ],
      [
        "Choose the correctly punctuated sentence.",
        "“Where is my book?” asked Amina.",
        [
          "“Where is my book”, asked Amina?",
          "Where is my book. asked Amina.",
          "“Where is my book!” asked Amina?",
        ],
        "The question mark belongs inside the quotation marks.",
      ],
      [
        "Choose the opposite of “scarce”.",
        "abundant",
        ["rare", "limited", "insufficient"],
        "Abundant means plentiful, the opposite of scarce.",
      ],
      [
        "Choose the closest meaning of “reluctant”.",
        "unwilling",
        ["eager", "certain", "careless"],
        "A reluctant person is unwilling or hesitant.",
      ],
      [
        "Complete: The books belong to us. They are ____.",
        "ours",
        ["our", "us", "we"],
        "The possessive pronoun “ours” stands without a following noun.",
      ],
      [
        "Choose the passive form of “The learners planted the trees.”",
        "The trees were planted by the learners.",
        [
          "The trees planted the learners.",
          "The learners were planting trees.",
          "The trees are plant by learners.",
        ],
        "The object becomes the subject and the past passive uses “were planted”.",
      ],
      [
        "Complete: She has lived here ____ 2020.",
        "since",
        ["for", "during", "until"],
        "“Since” introduces the starting point of a period continuing to the present.",
      ],
      [
        "Choose the correct reported statement: Amina said, “I am ready.”",
        "Amina said that she was ready.",
        [
          "Amina said that I am ready.",
          "Amina said she is was ready.",
          "Amina said that she ready.",
        ],
        "The speaker’s pronoun changes to “she”, and the past reporting verb normally backshifts “am” to “was”.",
      ],
      [
        "Choose the sentence with a comparative adjective.",
        "This path is safer than that one.",
        [
          "This path is safe.",
          "Walk safely on this path.",
          "This is the safest path.",
        ],
        "“Safer” compares two paths; “safest” is superlative.",
      ],
      [
        "Complete: The teacher, together with the learners, ____ arriving.",
        "is",
        ["are", "were", "be"],
        "The head of the subject is the singular noun “teacher”.",
      ],
      [
        "Choose the sentence that shows a reason.",
        "We carried umbrellas because it was raining.",
        [
          "We carried umbrellas although it was sunny.",
          "We carried umbrellas before we left.",
          "We carried umbrellas while we walked.",
        ],
        "“Because” introduces the reason for carrying umbrellas.",
      ],
      [
        "Choose the best closing for a formal letter beginning “Dear Sir or Madam”.",
        "Yours faithfully",
        ["See you soon", "With lots of love", "Cheers, friend"],
        "“Yours faithfully” is the conventional formal closing when the recipient is not named.",
      ],
      [
        "What should come first when summarising a factual passage?",
        "Identify its main ideas.",
        [
          "Copy every sentence.",
          "Add unrelated opinions.",
          "Replace all words with longer words.",
        ],
        "A summary retains the main ideas in a shorter form without introducing new claims.",
      ],
      [
        "Which sentence contains a simile?",
        "The water shone like silver.",
        [
          "The water was cold.",
          "The water filled the tank.",
          "The water ran downhill.",
        ],
        "“Like silver” makes an explicit comparison, forming a simile.",
      ],
    ];
    group(
      "F · Language use",
      "Grammar, vocabulary and functional writing",
      "Choose the best answer to each language question.",
      grammar,
    );
  } else {
    group(
      "A · Mazungumzo",
      "Soma mazungumzo kisha ujibu",
      `${name}: Shikamoo, mwalimu.\nMwalimu: Marahaba. Mmejiandaa kwa shughuli ya kupanda miti?\n${name}: Ndiyo. Tumeleta miche ${trees}, lakini tuna mikebe miwili tu ya kunyweshea.\nMwalimu: Basi tupande miche ${half} leo. Mingine ibaki kwenye kitalu chenye kivuli hadi tuandae ratiba ya kunyweshea.\n${name}: Nitamwomba kila mwanafunzi achague siku ya kusaidia.\nMwalimu: Vizuri. Kupanda ni mwanzo; kuitunza miti ndiyo kazi inayoendelea.`,
      [
        [
          "Salamu “Shikamoo” hutumiwa hasa kuonyesha nini?",
          "Heshima kwa mkubwa",
          ["Hasira kwa mwenzako", "Kukataa agizo", "Kushangaa jambo"],
          "Shikamoo ni salamu ya heshima inayotolewa kwa mtu mkubwa.",
        ],
        [
          "Wanafunzi wana miche mingapi?",
          String(trees),
          [String(half), String(trees + 2), String(trees * 2)],
          "Idadi hii imetajwa wazi katika mazungumzo.",
        ],
        [
          "Kwa nini mwalimu anashauri kupanda nusu ya miche kwanza?",
          "Vifaa vya kunyweshea ni vichache.",
          [
            "Miche yote imekauka.",
            "Wanafunzi hawataki miti.",
            "Shule haina wanafunzi.",
          ],
          "Mikebe miwili pekee inahitaji upangaji wa kazi ili miche itunzwe.",
        ],
        [
          "Ratiba itawasaidia wanafunzi kufanya nini?",
          "Kugawana jukumu la kutunza miche.",
          [
            "Kuacha miche bila maji.",
            "Kufunga shule mapema.",
            "Kuuza mikebe yote.",
          ],
          "Kila mwanafunzi anachagua siku ya kusaidia, hivyo jukumu linagawanywa.",
        ],
        [
          "Kauli ya mwisho ya mwalimu ina maana gani?",
          "Miti inahitaji utunzaji baada ya kupandwa.",
          [
            "Kupanda miti kunatosha bila utunzaji.",
            "Miche haihitaji maji.",
            "Kitalu lazima kifungwe.",
          ],
          "Mwalimu anatofautisha kupanda na kazi ya kuendelea kuitunza miti.",
        ],
      ],
    );
    group(
      "B · Kujaza mapengo",
      "Chagua neno linalofaa",
      `Darasa letu (1) ____ mradi wa kutunza mazingira. Tuligawanya takataka (2) ____ makundi. Karatasi ziliwekwa kando (3) ____ zitumike tena. Kila mwanafunzi alifanya kazi kwa (4) ____. Hatimaye, uwanja ulikuwa (5) ____ kuliko hapo awali.`,
      [
        [
          "Chagua neno la pengo la 1.",
          "lilianzisha",
          ["ilianzisha", "yalianzisha", "kalianzisha"],
          "Darasa ni nomino ya ngeli ya LI–YA, hivyo kiambishi cha umoja ni li-.",
        ],
        [
          "Chagua neno la pengo la 2.",
          "katika",
          ["juu", "mbali", "chini"],
          "Takataka ziligawanywa katika makundi.",
        ],
        [
          "Chagua neno la pengo la 3.",
          "ili",
          ["lakini", "ingawa", "wala"],
          "“Ili” huonyesha kusudi la kuweka karatasi kando.",
        ],
        [
          "Chagua neno la pengo la 4.",
          "bidii",
          ["haraka ya", "mdogo", "zuri"],
          "“Kwa bidii” ni usemi unaoeleza juhudi katika kazi.",
        ],
        [
          "Chagua neno la pengo la 5.",
          "safi",
          ["usafi", "safisha", "kisafi"],
          "Safi ni kivumishi kinachoeleza hali ya uwanja.",
        ],
      ],
    );
    group(
      "C · Ufahamu",
      "Soma taarifa ya maktaba",
      `MAKTABA YA JAMII\nMaktaba hufunguliwa Jumatatu hadi Ijumaa saa tatu asubuhi na kufungwa saa kumi na moja jioni. Jumamosi hufunguliwa saa nne asubuhi hadi saa nane mchana. Mwanachama anaweza kuazima vitabu viwili kwa siku saba. Vitabu vya marejeleo haviruhusiwi kutolewa nje ya maktaba. Vitabu vilivyoazimwa virudishwe mezani kwa mhudumu. Majadiliano ya vikundi yafanyike uani, wala si katika chumba cha kusomea kimya. Kitabu kikiharibika, mjulishe mhudumu.`,
      [
        [
          "Taarifa hii inalenga nini hasa?",
          "Kueleza matumizi na kanuni za maktaba",
          [
            "Kuuza vitabu vyote",
            "Kutangaza mashindano ya riadha",
            "Kusimulia hadithi ya safari",
          ],
          "Taarifa inatoa muda wa huduma na kanuni za matumizi.",
        ],
        [
          "Mwanachama anaweza kuazima vitabu vingapi kwa wakati mmoja?",
          "Viwili",
          ["Vitatu", "Vinne", "Kumi"],
          "Kikomo kilichotajwa ni vitabu viwili.",
        ],
        [
          "Vitabu vya marejeleo vitumiwe wapi?",
          "Ndani ya maktaba",
          ["Nyumbani pekee", "Katika basi", "Sokoni"],
          "Vitabu hivyo haviruhusiwi kutolewa nje ya maktaba.",
        ],
        [
          "Majadiliano ya kikundi yafanyike wapi?",
          "Uani",
          [
            "Chumba cha kusomea kimya",
            "Mezani kwa mhudumu pekee",
            "Popote bila kujali wengine",
          ],
          "Ua umetengwa kwa ajili ya majadiliano.",
        ],
        [
          "Ukiona kurasa zimeharibika, ufanye nini?",
          "Umjulishe mhudumu",
          ["Uzifiche", "Uvitupilie mbali", "Uondoke na kitabu bila kusema"],
          "Taarifa inataka uharibifu uripotiwe kwa mhudumu.",
        ],
      ],
    );
    group(
      "D · Ufahamu wa hadithi",
      "Uamuzi wa Neema",
      `Neema alipewa jukumu la kuandaa maonesho ya miradi ya darasa. Wenzake walitaka kutengeneza bango kubwa, lakini muda uliobaki ulikuwa siku mbili tu. Neema alipendekeza kila kikundi kieleze lengo la mradi, vifaa vilivyotumiwa na kile kilichojifunzwa.\n\n“Bango lenye rangi nyingi halitoshi ikiwa hatuwezi kueleza kazi yetu,” alisema. Wanafunzi waligawana majukumu. Baadhi walipanga maelezo, wengine walikagua vifaa na wengine walifanya mazoezi ya kujibu maswali. Siku ya maonesho, wageni waliweza kufuata hatua za kila mradi. Darasa liligundua kwamba maandalizi mazuri hayapimwi kwa ukubwa wa mapambo pekee.`,
      [
        [
          "Tatizo kuu lililokabili darasa lilikuwa lipi?",
          "Muda mfupi wa maandalizi",
          [
            "Ukosefu wa wageni wote",
            "Kufungwa kwa shule",
            "Kupotea kwa miradi yote",
          ],
          "Walikuwa wamebakisha siku mbili tu.",
        ],
        [
          "Neema alisisitiza jambo gani?",
          "Kueleza kazi na mafunzo ya mradi",
          [
            "Kutegemea rangi za bango pekee",
            "Kuficha vifaa",
            "Kuepuka maswali ya wageni",
          ],
          "Alitaka lengo, vifaa na mafunzo ya mradi yaelezwe.",
        ],
        [
          "Kugawana majukumu kuliwasaidiaje?",
          "Kukamilisha maandalizi kwa ushirikiano",
          [
            "Kuongeza migogoro bila sababu",
            "Kuacha kazi zote kwa mtu mmoja",
            "Kufuta maonesho",
          ],
          "Vikundi vilifanya kazi mbalimbali zinazosaidiana.",
        ],
        [
          "Neema anaonyesha sifa gani?",
          "Busara katika kupanga kazi",
          [
            "Uzembe katika kila jambo",
            "Chuki kwa wenzake",
            "Hofu ya kujifunza",
          ],
          "Alilinganisha muda uliopo na kazi muhimu zinazohitajika.",
        ],
        [
          "Funzo kuu la hadithi ni lipi?",
          "Uelewa na maandalizi ni muhimu kuliko mapambo pekee",
          [
            "Mapambo hayaruhusiwi shuleni",
            "Maswali hayana manufaa",
            "Miradi lazima iwe mikubwa sana",
          ],
          "Mwisho wa hadithi unasisitiza uwezo wa kueleza kazi, si ukubwa wa mapambo.",
        ],
      ],
    );
    group(
      "E · Ushairi",
      "Soma shairi hili la asili",
      `Tone dogo huanguka, juu ya ardhi iliyokauka.\nMbegu ndogo huamuka, mizizi yake hutandazika.\nMti hukua taratibu, kwa utunzaji na juhudi.\nKazi njema huonekana, tukishirikiana kwa bidii.`,
      [
        [
          "Shairi linahusu nini hasa?",
          "Ukuaji na utunzaji wa mimea",
          ["Safari ya baharini", "Biashara ya magari", "Mchezo wa kandanda"],
          "Mbegu, mizizi na mti ni picha kuu zinazotumiwa.",
        ],
        [
          "Neno “taratibu” linaeleza nini?",
          "Jinsi mti unavyokua",
          ["Jina la mwandishi", "Mahali pa shule", "Rangi ya tone"],
          "Taratibu linaeleza namna ya ukuaji.",
        ],
        [
          "Mbegu kuamuka ni matumizi ya mbinu gani?",
          "Tashihisi",
          ["Tanakali ya sauti", "Chuku", "Tashbihi yenye kama"],
          "Mbegu imepewa tendo la kiumbe anayeamka.",
        ],
        [
          "Ni tabia gani inayohimizwa katika mstari wa mwisho?",
          "Ushirikiano na bidii",
          ["Uzembe na chuki", "Kukata tamaa", "Kuharibu mazingira"],
          "Mstari unasema tushirikiane kwa bidii.",
        ],
        [
          "Kichwa kipi kinafaa zaidi?",
          "Utunzaji huleta ukuaji",
          ["Soko la samaki", "Mgeni wa usiku", "Safari ya gari"],
          "Kichwa hicho kinaunganisha ujumbe wa ukuaji na utunzaji.",
        ],
      ],
    );
    const usage: [string, string, string[], string][] = [
      [
        "Chagua wingi wa “kitabu kizuri”.",
        "vitabu vizuri",
        ["vitabu mzuri", "kitabu vizuri", "maktabu nzuri"],
        "Kitabu/vitabu hufuata upatanisho wa KI–VI.",
      ],
      [
        "Kamilisha: Watoto ____ shuleni jana.",
        "walienda",
        ["alienda", "ilienda", "lilienda"],
        "Watoto ni wingi wa mtoto, hivyo wa- hutumiwa.",
      ],
      [
        "Kinyume cha “karibu” ni kipi?",
        "mbali",
        ["jirani", "pamoja", "ndani"],
        "Mbali huonyesha kutokuwa karibu.",
      ],
      [
        "Methali “Haraka haraka haina baraka” inashauri nini?",
        "Kufanya kazi kwa makini",
        ["Kuchelewa kila wakati", "Kukataa kazi", "Kusahau kupanga"],
        "Inatahadharisha dhidi ya pupa inayoweza kuharibu kazi.",
      ],
      [
        "Kamilisha: Mti ____ umeanguka.",
        "huu",
        ["hii", "hiki", "hawa"],
        "Mti ni wa ngeli ya M–MI; kionyeshi cha umoja ni huu.",
      ],
      [
        "Chagua sentensi ya kuuliza.",
        "Utafika lini?",
        ["Amefika mapema.", "Funga mlango.", "Hongera sana!"],
        "Lini linauliza wakati wa kufika.",
      ],
      [
        "Kamilisha: Mimi ____ mwanafunzi.",
        "ni",
        ["wa", "ya", "kwa"],
        "Ni huunganisha kiima na taarifa katika sentensi hii.",
      ],
      [
        "Chagua neno lenye maana ya “furaha”.",
        "shangwe",
        ["huzuni", "hofu", "uchovu"],
        "Shangwe ni hali ya kufurahi.",
      ],
      [
        "Chagua umoja wa “miti mirefu”.",
        "mti mrefu",
        ["mti mirefu", "kiti kirefu", "mti refu"],
        "Miti/mti na mirefu/mrefu hufuata upatanisho wa M–MI.",
      ],
      [
        "Kamilisha: Tukisoma kwa bidii, ____.",
        "tutafaulu",
        ["tulifaulu jana", "hatukuwapo", "alikuwa ameondoka"],
        "Sharti la “tukisoma” linafuatiwa na matokeo “tutafaulu”.",
      ],
      [
        "Neno “mwalimu” ni aina gani ya neno?",
        "Nomino",
        ["Kitenzi", "Kielezi", "Kiunganishi"],
        "Mwalimu hutaja mtu anayefundisha.",
      ],
      [
        "Ni neno lipi linaloonyesha tendo?",
        "andika",
        ["kalamu", "nzuri", "polepole"],
        "Andika ni kitenzi cha kufanya tendo la kuandika.",
      ],
      [
        "Chagua kiunganishi kinachoonyesha sababu.",
        "kwa sababu",
        ["lakini", "au", "ingawa"],
        "Kwa sababu hutanguliza sababu ya jambo.",
      ],
      [
        "Barua rasmi inahitaji jambo gani?",
        "Lugha ya heshima na lengo lililo wazi",
        ["Matusi kwa mpokeaji", "Sentensi zisizoeleweka", "Utani pekee"],
        "Urasmi unahitaji heshima na mawasiliano yenye lengo.",
      ],
      [
        "Unapofupisha habari, unapaswa kufanya nini?",
        "Kuhifadhi hoja kuu bila kuongeza madai mapya",
        [
          "Kunakili kila neno",
          "Kubadili ujumbe kabisa",
          "Kuongeza habari zisizohusika",
        ],
        "Muhtasari huwasilisha hoja kuu kwa maneno machache.",
      ],
    ];
    group(
      "F · Matumizi ya lugha",
      "Sarufi na matumizi ya lugha",
      "Chagua jibu sahihi kwa kila swali.",
      usage,
    );
  }
  return questions;
}
