import type { CourseLearningPack, RichSkillLesson } from './types';
import { firstAidGuides } from './first-aid-guides';
const sources = [
  { title: 'NHS: Fainting', url: 'https://www.nhs.uk/conditions/fainting/' },
  {
    title: 'British Red Cross: Learn first aid',
    url: 'https://www.redcross.org.uk/first-aid/learn-first-aid',
  },
];
const safety =
  'This is an introductory learning activity, not a first-aid qualification. In a real emergency, get a responsible adult and call local emergency services (Kenya: 999 or 112). Follow the emergency dispatcher’s instructions. Never practise emergency procedures on a person who does not need them.';
const lesson = (
  key: string,
  title: string,
  objective: string,
  sections: RichSkillLesson['sections'],
  steps: string[],
  question: string,
  options: string[],
  answer: number,
  explanation: string,
  image: string,
  alt: string,
): RichSkillLesson => ({
  key: `firstaid-v2-${key}`,
  title,
  type: 'GUIDED',
  description: objective,
  objective,
  minutes: 10,
  sections,
  activity: { title: 'Practise the decision, not the procedure', steps },
  check: { question, options, answer, explanation },
  image: {
    src: `/skill-illustrations/${image}.svg`,
    alt,
    caption: 'Learning illustration. Read the instructions and escalation guidance alongside it.',
  },
  safety,
  sources,
});
export const firstAidPack: CourseLearningPack = {
  title: 'First Aid Foundations',
  version: 'firstaid-v2',
  mode: 'GUIDED',
  lessons: [
    lesson(
      'scene',
      'Make the scene safe and get help',
      'Recognise when it is safe to approach and explain how to summon help.',
      [
        {
          title: 'Pause before approaching',
          text: 'Look for traffic, fire, electricity, chemicals or other hazards. Do not enter an unsafe area or touch someone still in contact with electricity. Your safety comes first.',
        },
        {
          title: 'Ask an adult for help',
          text: 'Tell a teacher, parent or another responsible adult what happened. Ask someone specific to call emergency services. Stay calm and use simple, clear words.',
        },
        {
          title: 'Give useful information',
          text: 'Tell the dispatcher your location and a nearby landmark, what happened, whether the person responds and whether they appear to be breathing normally. Stay on the line and follow instructions.',
        },
      ],
      [
        'With a partner, use a pretend classroom situation to identify two hazards. Do not create a real hazard.',
        'Write a short emergency-call message with a location and what you can observe. Do not make a practice call to an emergency number.',
      ],
      'A learner collapses beside a live electrical cable. What comes first?',
      [
        'Touch them to check responsiveness',
        'Keep away from the electrical danger and get urgent adult help',
        'Move the cable with your hand',
      ],
      1,
      'Do not become another casualty. Keep clear and get urgent help to make the electrical danger safe.',
      'scene',
      'A learner stops at a marked hazard while another calls a responsible adult.',
    ),
    lesson(
      'fainting',
      'Help someone who feels faint',
      'Distinguish feeling faint from an unresponsive emergency and choose safe first steps.',
      [
        {
          title: 'Notice the warning signs',
          text: 'A person may feel dizzy, weak, sweaty or sick, look pale or say their vision is fading. These signs have different possible causes; do not try to diagnose the cause.',
        },
        {
          title: 'Help them lie down safely',
          text: 'If they are responsive and feel faint, help them lie flat in a safe place. If there is no injury and it is comfortable, raise their legs slightly. If lying down is not possible, help them sit safely. Do not let them walk away alone. In later pregnancy, lying on the side is preferable.',
        },
        {
          title: 'Watch for an emergency',
          text: 'If they do not respond, get urgent adult help and check whether they are breathing normally. If breathing is absent or abnormal, call emergency services immediately and follow dispatcher instructions, including CPR guidance. If unresponsive but breathing normally, follow trained first-aid or dispatcher guidance to keep the airway open.',
        },
        {
          title: 'Do not rush recovery',
          text: 'Stay with them. Do not give food or drink while they are not fully alert. Seek urgent medical help if they do not wake within about a minute, do not recover fully, have chest pain, breathing difficulty, a serious injury, seizure-like movements, or fainted during exercise. A faint should be medically assessed, especially if it is new or unexplained.',
        },
      ],
      [
        'Use a drawing or mannequin to explain how you would help a responsive person lie down safely. Do not induce fainting or lift a classmate’s legs.',
        'Say what you would tell an adult if the person did not respond or was not breathing normally.',
      ],
      'Someone feels faint but is still responding. What is the best first action?',
      [
        'Make them stand and walk quickly',
        'Help them lie down safely and get an adult',
        'Give them food while they are losing consciousness',
      ],
      1,
      'Help them lie down safely and get adult help. If they become unresponsive, assess breathing and escalate immediately.',
      'fainting',
      'A responsive person rests flat with their lower legs supported, while a helper stays nearby and calls for adult help.',
    ),
    lesson(
      'bleeding',
      'Respond to a small cut',
      'Explain basic hygiene and recognise bleeding that needs urgent help.',
      [
        {
          title: 'Protect yourself',
          text: 'Get an adult. Wash hands and use disposable gloves if available. Avoid direct contact with blood. Do not put yourself at risk to obtain a photograph or inspect a wound.',
        },
        {
          title: 'Control bleeding',
          text: 'For a small cut, apply firm, steady pressure with a clean dressing. Do not remove an embedded object or press directly on it; get urgent help instead. Heavy or persistent bleeding needs urgent medical assistance.',
        },
        {
          title: 'Care for a minor wound',
          text: 'Once bleeding has stopped, a small wound can be rinsed with clean running water and covered with a clean dressing, with adult help. Seek medical advice for deep, dirty or infected wounds, bites or uncertain tetanus protection.',
        },
      ],
      [
        'Using a drawing, identify where a clean dressing would go on a small superficial cut.',
        'Explain why embedded objects and heavy bleeding need urgent adult help. Do not practise on an actual wound.',
      ],
      'What should you do with an object embedded in a wound?',
      ['Pull it out quickly', 'Leave it in place and get urgent help', 'Cover it with soil'],
      1,
      'Removing an embedded object can worsen bleeding. Leave it in place and seek urgent professional help.',
      'bleeding',
      'A clean dressing is pressed onto a simple illustrated forearm, with hand hygiene shown beside it.',
    ),
    lesson(
      'burns',
      'Cool a burn and get help',
      'Explain immediate cooling and avoid common harmful treatments.',
      [
        {
          title: 'Stop contact with the cause',
          text: 'Only if it is safe, move away from the heat source. Get an adult immediately. Electrical and chemical burns require urgent specialist advice; do not enter an unsafe scene.',
        },
        {
          title: 'Cool with running water',
          text: 'Cool a thermal burn under cool or lukewarm running water for 20 minutes as soon as possible. Do not use ice, butter, toothpaste or creams. Keep the rest of the person warm.',
        },
        {
          title: 'Avoid further injury',
          text: 'Remove nearby jewellery or loose clothing before swelling if this can be done easily, but do not remove anything stuck to the burn. Do not burst blisters. Get medical advice about covering and further care.',
        },
        {
          title: 'Know when it is urgent',
          text: 'Get urgent help for large or deep burns, burns to the face, hands, feet or genitals, breathing problems, and chemical or electrical burns. Burns in children should be assessed by a healthcare professional.',
        },
      ],
      [
        'Point to the safe cooling option in the illustration and state how long cooling should continue.',
        'Explain to a partner why ice and household pastes are not appropriate. Do not use hot water or create a real burn for practice.',
      ],
      'Which action is appropriate immediately after a thermal burn?',
      ['Apply ice directly', 'Apply toothpaste', 'Cool under running water for 20 minutes'],
      2,
      'Use cool or lukewarm running water for 20 minutes. Ice and household pastes can worsen injury or interfere with treatment.',
      'burns',
      'An illustrated forearm is cooled under a tap beside a clearly labelled 20-minute timer.',
    ),
    lesson(
      'choking',
      'Recognise choking and seek urgent help',
      'Recognise the difference between an effective cough and a severe airway emergency.',
      [
        {
          title: 'Look and listen',
          text: 'Someone with a partial blockage may still speak, breathe and cough effectively. Encourage them to cough and get an adult. Stay with them and watch for deterioration.',
        },
        {
          title: 'Recognise severe choking',
          text: 'If a person cannot speak, breathe or cough effectively, this is an emergency. Shout for help, ask someone to call emergency services, and get a trained adult to act immediately. Follow dispatcher instructions.',
        },
        {
          title: 'Do not make it worse',
          text: 'Do not give food or drink and do not blindly put fingers into the mouth. Choking techniques differ for infants and other groups. Learn physical techniques through supervised, recognised first-aid training, not by practising on classmates.',
        },
      ],
      [
        'Use written scenarios to distinguish an effective cough from inability to speak or breathe.',
        'Describe how you would summon a trained adult. Do not rehearse thrusts, back blows or mouth sweeps on another person.',
      ],
      'A person cannot speak or breathe and has an ineffective cough. What does this mean?',
      [
        'A severe choking emergency requiring immediate help',
        'They should drink water',
        'They should be left alone to rest',
      ],
      0,
      'These signs suggest a severe airway obstruction. Get immediate trained help and emergency services; follow dispatcher instructions.',
      'help',
      'A helper alerts an adult and calls emergency services while staying near the person.',
    ),
    lesson(
      'response',
      'Explain your emergency response',
      'Bring together scene safety, observation and a clear request for help.',
      [
        {
          title: 'Use a calm sequence',
          text: 'Check that the scene is safe, call a responsible adult, observe responsiveness and normal breathing, and get emergency help when required. Do not delay urgent assistance to finish an activity or take notes.',
        },
        {
          title: 'Communicate observations',
          text: 'Say what you saw rather than making a diagnosis. “They collapsed and are not responding” is more useful than guessing the cause. Give the location accurately.',
        },
        {
          title: 'Stay within your training',
          text: 'Follow the dispatcher and trained helper. You can help by guiding responders to the scene, keeping bystanders back and obtaining equipment when instructed. Do not move an injured person unless there is immediate danger or trained guidance.',
        },
      ],
      [
        'Write a response plan for a person who collapses in a safe classroom: who you alert, what you observe and what you tell responders.',
        'Ask a teacher to review the plan. Discuss the difference between this introductory course and certified practical first-aid training.',
      ],
      'Which message is most useful to an emergency dispatcher?',
      [
        'Something is wrong, goodbye',
        'A person collapsed in Room 2 at our school, is not responding, and I will follow your instructions',
        'I know the diagnosis without checking',
      ],
      1,
      'A clear location and direct observations help the dispatcher choose appropriate next steps. Stay on the line.',
      'help',
      'A phone and location marker show the information needed when asking emergency services for help.',
    ),
  ],
};

// Rich illustrated material replaces v1 without deleting its saved records.
const supportingSources: Record<string, { title: string; url: string }[]> = {
  scene: [{ title: 'NHS: First aid', url: 'https://www.nhs.uk/conditions/first-aid/' }],
  fainting: [{ title: 'NHS: Fainting', url: 'https://www.nhs.uk/conditions/fainting/' }],
  bleeding: [{ title: 'NHS: Cuts and grazes', url: 'https://www.nhs.uk/conditions/cuts-and-grazes/' }],
  burns: [{ title: 'NHS: Burns and scalds', url: 'https://www.nhs.uk/conditions/burns-and-scalds/' }],
  choking: [
    {
      title: 'British Red Cross: Choking',
      url: 'https://www.redcross.org.uk/first-aid/learn-first-aid/choking',
    },
  ],
  response: [{ title: 'NHS: First aid', url: 'https://www.nhs.uk/conditions/first-aid/' }],
};
const imageDescriptions: Record<string, string> = {
  scene:
    'An illustrated Kenyan school scene: learners stay back from a damaged cable and water while an adult calls for help. Do not use the picture to judge a safe electrical exclusion distance.',
  fainting:
    'An awake learner rests flat on a mat with legs supported, while an adult stays nearby and another learner calls for help. This example assumes no suspected injury.',
  bleeding:
    'A gloved adult applies a clean dressing with steady direct pressure to a small superficial cut on a learner’s supported forearm.',
  burns:
    'An adult supports a learner’s arm while running water directly cools the affected forearm. The picture cannot establish burn severity or water temperature.',
  choking:
    'An adult summons help for a distressed learner with a hand near the throat. The gesture alone does not establish severity: assess speech, effective cough and breathing.',
  response:
    'An illustrated school team: one adult calls, another stays with the learner, and a third guides a responder to the room.',
};
for (const lesson of firstAidPack.lessons) {
  const topic = lesson.key.replace('firstaid-v2-', '');
  const diagram = lesson.image!;
  lesson.minutes = topic === 'fainting' ? 18 : 15;
  lesson.firstAid = firstAidGuides[topic];
  lesson.image = {
    src: `/skill-illustrations/firstaid-v2-${topic}.webp`,
    label: 'Illustrated scenario',
    alt: imageDescriptions[topic],
    caption: imageDescriptions[topic],
    width: 1536,
    height: 1024,
  };
  lesson.images = [{ ...diagram, label: 'Simplified diagram', width: 800, height: 320 }];
  lesson.sources = supportingSources[topic];
}
