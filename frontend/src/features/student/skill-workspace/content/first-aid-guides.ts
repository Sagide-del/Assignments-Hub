import type { FirstAidGuide } from './types';
export const firstAidGuides: Record<string, FirstAidGuide> = {
  scene: {
    summary:
      'Your first job is to prevent a second casualty. A safe response starts with noticing danger, keeping others clear and getting the right help—not rushing towards the injured person.',
    recognise: [
      'Look for traffic, electricity, fire, smoke, chemicals, broken glass or an unstable structure.',
      'Notice whether a hazard is still active. A wet floor near a damaged cable may be dangerous even if nobody is touching it.',
      'Look for a safe route to an adult or phone. An emergency does not make an unsafe route safe.',
    ],
    actions: [
      {
        title: 'Stop and assess from a safe place',
        text: 'Pause before approaching. Look around and keep well clear of hazards. If the scene is unsafe, do not enter it or try to make it safe yourself.',
        why: 'A helper who is injured cannot help the original casualty and adds another person needing rescue.',
      },
      {
        title: 'Alert others without entering danger',
        text: 'Warn nearby learners and tell them to stay back. Ask a responsible adult to take charge. Do not ask a friend to touch a cable, enter smoke or step into traffic.',
        why: 'Clear instructions can prevent others from following you into the same hazard.',
      },
      {
        title: 'Call for the appropriate emergency help',
        text: 'For immediate danger or a life-threatening injury, call Kenya emergency services on 999 or 112. Give your location, the hazard and what you can observe. If alone, call on speaker and follow instructions.',
        why: 'Responders may need to control the hazard before anyone can safely reach the person.',
      },
      {
        title: 'Reassess before doing anything else',
        text: 'Only approach when it is safe. Introduce yourself to a responsive person, explain that help is coming and listen to them. If their condition changes, tell the adult or dispatcher immediately.',
        why: 'Both the scene and the person’s condition can change. A safe plan is not a one-time decision.',
      },
    ],
    avoid: [
      'Do not touch a person or object still connected to a possible live electrical supply.',
      'Do not enter a road, smoke-filled room, floodwater or an unstable area to attempt a rescue.',
      'Do not crowd, photograph or film the person. Keep their privacy and a clear route for responders.',
    ],
    urgent: [
      'An uncontrolled hazard threatens people nearby.',
      'The person is unresponsive or not breathing normally.',
      'There is severe bleeding, a serious injury or difficulty breathing.',
    ],
    remember: 'Safe scene → alert an adult → emergency help when needed → follow instructions.',
    scenarios: [
      {
        id: 'scene-cable',
        title: 'A cable and a puddle',
        situation:
          'You see a damaged cable beside a puddle outside class. A friend suggests moving it with a ruler.',
        question: 'What should you do?',
        options: [
          'Move it quickly with the ruler',
          'Stay clear, warn others and get an adult to arrange qualified help',
          'Step into the puddle to see whether it is live',
        ],
        answer: 1,
        explanation:
          'Do not test or move the cable. Ordinary classroom objects do not make electrical rescue safe. Keep people clear and get qualified help.',
      },
      {
        id: 'scene-call',
        title: 'The dispatcher asks where you are',
        situation:
          'You are calling for help from a safe place at school. You are frightened and do not know what injury the person has.',
        question: 'Which information is most useful first?',
        options: [
          'An invented diagnosis',
          'Your exact location, nearby landmarks, the hazard and what you can observe',
          'The names of everyone in your class',
        ],
        answer: 1,
        explanation:
          'Give accurate location and observations. You do not need to diagnose the injury to call for help.',
      },
    ],
  },
  fainting: {
    summary:
      'Feeling faint and being unresponsive are different situations. Help a responsive person rest safely, but treat loss of responsiveness or abnormal breathing as an urgent change—not as “just a faint.”',
    recognise: [
      'They may report dizziness, blurred vision, nausea, weakness, feeling hot or sweating.',
      'They may look pale, but colour changes can be difficult to judge across different skin tones. Listen to what they say and watch responsiveness and breathing.',
      'A faint is a brief loss of consciousness. You cannot establish its cause by looking at a person or this illustration.',
    ],
    actions: [
      {
        title: 'Help a responsive person lie down safely',
        text: 'Ask them what they feel and help them lie flat in a safe place. If there is no suspected injury and it is comfortable, support their legs slightly raised. If lying down is not possible, help them sit safely. In later pregnancy, lying on the side is preferable.',
        why: 'Lying down helps prevent a fall and may help a person who is about to faint. Supporting the legs is conditional on safety and comfort—not an instruction to move an injured person.',
      },
      {
        title: 'Get an adult and stay with the person',
        text: 'Ask a responsible adult to help. Keep the area calm and give the person space. Do not make them stand, walk to another room or return to exercise because they say they feel a little better.',
        why: 'Another collapse can cause injury. Continued observation matters even when the person appears to improve.',
      },
      {
        title: 'Respond immediately if they stop responding',
        text: 'Get urgent help and check whether they are breathing normally. Occasional gasps are not normal breathing. If breathing is absent or abnormal, call emergency services immediately and follow dispatcher instructions, including CPR guidance. Do not wait for a teacher to arrive before calling.',
        why: 'An unresponsive person may have a life-threatening emergency. Assuming the cause is a simple faint can delay essential help.',
      },
      {
        title: 'If unresponsive but breathing normally, protect the airway with trained help',
        text: 'Call for emergency help and follow the dispatcher or a trained first aider. They may guide an appropriate recovery position. Do not attempt an unfamiliar movement or move a person with suspected spinal injury unless required for immediate safety or guided airway care.',
        why: 'A person who is not fully conscious may not keep their airway clear. Appropriate positioning depends on the situation and requires trained guidance.',
      },
      {
        title: 'Monitor recovery and arrange medical advice',
        text: 'Keep checking responsiveness and normal breathing. Do not give food or drink until fully alert and able to swallow safely. Once recovered, let them rest and get adult assistance before slowly changing position. Arrange medical advice, especially for a first, new or unexplained faint.',
        why: 'A quick recovery does not explain why the faint happened. A clinician may need to assess an underlying cause.',
      },
    ],
    avoid: [
      'Do not slap, shake, splash water on or crowd the person.',
      'Do not force food, drink, tablets or strong smells into or near the mouth of someone who is not fully alert.',
      'Do not lift an injured person’s legs, force a position, or make them stand immediately.',
      'Do not diagnose dehydration, low blood sugar or “attention-seeking” from appearance alone.',
    ],
    urgent: [
      'They are not breathing normally, are gasping, or cannot be awakened promptly.',
      'They have not awakened within about a minute, or have not recovered fully.',
      'There is chest pain, difficulty breathing, a serious injury, seizure-like movements or repeated episodes.',
      'The collapse happened during exercise, or there are other concerning symptoms.',
    ],
    remember:
      'Responsive and faint: rest safely and get help. Unresponsive or abnormal breathing: emergency response immediately.',
    scenarios: [
      {
        id: 'faint-responsive',
        title: 'Dizzy after assembly',
        situation:
          'A learner says their vision is fading after standing at assembly. They are awake and speaking. No injury is apparent.',
        question: 'What is the safest next step?',
        options: [
          'Ask them to walk quickly to class',
          'Help them lie down safely, get an adult and stay with them',
          'Give a drink while they are becoming less alert',
        ],
        answer: 1,
        explanation:
          'Help prevent a fall. Lying down safely and adult observation are appropriate for a responsive person who feels faint. Keep watching for a change in responsiveness or breathing.',
      },
      {
        id: 'faint-unresponsive',
        title: 'The situation changes',
        situation:
          'The person no longer responds and you notice occasional gasps rather than normal breathing.',
        question: 'What should you do now?',
        options: [
          'Wait several minutes because fainting always resolves',
          'Call emergency services immediately and follow dispatcher instructions',
          'Give water to wake them',
        ],
        answer: 1,
        explanation:
          'Gasps are not normal breathing. This is an emergency; do not delay the call while assuming it is only a faint. Follow dispatcher guidance, including CPR instructions.',
      },
    ],
  },
  bleeding: {
    summary:
      'For a small superficial cut, hygiene and steady pressure are useful first steps. Heavy bleeding, embedded objects or deep wounds are different situations and need urgent adult or professional help.',
    recognise: [
      'A minor cut may cause a small amount of bleeding from a superficial wound.',
      'Bleeding that is heavy, will not stop, or is associated with faintness or a serious injury must not be treated as an ordinary small cut.',
      'An embedded object, a deep or gaping wound, a bite or a heavily contaminated wound needs medical assessment.',
    ],
    actions: [
      {
        title: 'Get help and protect against contact with blood',
        text: 'Ask an adult to help. Wash hands and use disposable gloves if available. The injured person can apply their own pressure if able while clean supplies and adult help are obtained.',
        why: 'Blood contact can transmit infection. Helping does not require exposing yourself to another person’s blood.',
      },
      {
        title: 'Apply steady direct pressure to a small cut',
        text: 'Use a clean dressing or clean cloth over the wound and apply firm, steady pressure. Keep the arm supported if comfortable. Do not repeatedly lift the dressing to inspect the cut.',
        why: 'Repeatedly checking underneath can disturb clotting and restart bleeding.',
      },
      {
        title: 'Know when the situation exceeds a minor cut',
        text: 'If bleeding is heavy or persistent, summon urgent medical help. If an object is embedded, leave it in place and do not press directly on it. Follow a trained first aider or emergency dispatcher.',
        why: 'A deeper injury or embedded object can involve structures you cannot see. Removing the object may worsen bleeding.',
      },
      {
        title: 'Clean and cover once minor bleeding has stopped',
        text: 'With adult help, rinse a small wound with clean running water and cover it with a clean dressing. Seek advice about dirty or deep wounds, animal or human bites, infection signs and tetanus protection.',
        why: 'A clean covering protects the wound, but it does not replace medical review when the injury has additional risks.',
      },
    ],
    avoid: [
      'Do not remove an embedded object.',
      'Do not use soil, ash, household powder or an unclean cloth on a wound.',
      'Do not keep lifting the dressing to look, or share blood-stained equipment.',
      'Do not describe a wound as safe just because bleeding appears small.',
    ],
    urgent: [
      'Heavy, uncontrolled or persistent bleeding.',
      'A deep or gaping wound, loss of feeling or movement, or an embedded object.',
      'Signs of serious illness or injury, including collapse or abnormal breathing.',
      'Increasing redness, swelling, warmth, pus or fever need medical advice.',
    ],
    remember:
      'Protect yourself → steady pressure for a small cut → urgent help for serious bleeding → clean covering when appropriate.',
    scenarios: [
      {
        id: 'cut-dressing',
        title: 'Checking too often',
        situation:
          'A friend has a small cut. An adult has supplied a clean dressing, but your friend keeps lifting it to see whether bleeding has stopped.',
        question: 'What is the useful advice?',
        options: [
          'Keep lifting it every few seconds',
          'Maintain steady pressure rather than repeatedly disturbing the dressing',
          'Rub the wound with an unclean sleeve',
        ],
        answer: 1,
        explanation:
          'Steady pressure helps control bleeding. Lifting the dressing repeatedly can disturb clotting.',
      },
      {
        id: 'cut-glass',
        title: 'A piece of glass',
        situation: 'A learner has glass embedded in a wound. Another learner wants to pull it out.',
        question: 'What should happen?',
        options: [
          'Pull it out before getting help',
          'Leave it in place, get urgent adult/medical help and avoid direct pressure on the object',
          'Push it deeper so it cannot fall out',
        ],
        answer: 1,
        explanation:
          'An embedded object may be limiting bleeding. Leave it in place and seek trained help; do not press directly on it.',
      },
    ],
  },
  burns: {
    summary:
      'After a thermal burn, stop contact with the heat only if safe, cool the affected area with running water, and get appropriate help. Electrical and chemical burns need specialist emergency advice.',
    recognise: [
      'A thermal burn follows contact with heat, hot liquid, steam or a hot surface.',
      'Pain, redness or blistering may occur, but appearance alone cannot establish depth or severity.',
      'A small-looking injury can still require urgent assessment because of its site, cause, the person’s age or other symptoms.',
    ],
    actions: [
      {
        title: 'Stop contact with the heat safely',
        text: 'Get an adult immediately. Move away from the cause only if safe. Do not touch an electrical source or enter a chemical spill to help; arrange specialist emergency assistance.',
        why: 'The source can injure the helper as well as the casualty. Electrical and chemical injuries require a different assessment from an ordinary hot-water burn.',
      },
      {
        title: 'Cool the burned area under running water',
        text: 'Use cool or lukewarm running water for 20 minutes as soon as possible. Direct the water onto the affected area. Keep the rest of the person comfortably warm.',
        why: 'Cooling removes heat from the tissue. Cooling the whole person, especially a child, can make them dangerously cold.',
      },
      {
        title: 'Remove constricting items only if they are not stuck',
        text: 'With adult assistance, remove nearby jewellery and loose clothing if they come away easily. Do not pull off fabric or anything stuck to the burn.',
        why: 'Swelling can make tight items difficult to remove, but pulling stuck material can worsen the injury.',
      },
      {
        title: 'Protect the area and obtain medical advice',
        text: 'Do not burst blisters or apply household remedies. Ask a healthcare professional or trained first aider about appropriate covering and further care. Burns in children should be assessed by a healthcare professional.',
        why: 'The location, cause and extent of a burn matter. Correct covering and follow-up depend on the injury.',
      },
    ],
    avoid: [
      'No ice or ice-cold water directly on the burn.',
      'No butter, toothpaste, cooking oil, creams or household pastes as immediate treatment.',
      'Do not burst blisters or peel off stuck clothing.',
      'Do not delay emergency help for a severe burn while completing a cooling or classroom activity.',
    ],
    urgent: [
      'Breathing difficulty or a burn involving the face or airway.',
      'A large or deep burn, or burns to the hands, feet or genitals.',
      'Electrical or chemical burns.',
      'A child with a burn needs professional assessment; get urgent help for serious symptoms.',
    ],
    remember:
      'Safe removal from heat → cool running water for 20 minutes → keep the rest warm → appropriate medical help.',
    scenarios: [
      {
        id: 'burn-toothpaste',
        title: 'A suggested household remedy',
        situation:
          'Hot water splashes onto a learner’s forearm. Someone offers toothpaste while an adult brings them to a safe sink.',
        question: 'Which choice is appropriate?',
        options: [
          'Apply toothpaste first',
          'Cool the affected area with running water for 20 minutes',
          'Put ice directly onto the skin',
        ],
        answer: 1,
        explanation:
          'Use cool or lukewarm running water promptly. Toothpaste and ice are not appropriate immediate burn treatments.',
      },
      {
        id: 'burn-stuck',
        title: 'A sleeve is stuck',
        situation:
          'After a hot-water spill, part of a learner’s sleeve appears stuck to the burned area. They ask you to pull it away.',
        question: 'What should you do?',
        options: [
          'Pull it off quickly',
          'Leave stuck material in place and get medical guidance',
          'Rub it off with a towel',
        ],
        answer: 1,
        explanation: 'Do not remove material stuck to a burn. Pulling can damage the injured tissue further.',
      },
    ],
  },
  choking: {
    summary:
      'The urgent distinction is whether the person can cough effectively, speak and breathe. A hand at the throat alone does not tell you the severity. A severe airway obstruction needs immediate action from trained help and the emergency dispatcher.',
    recognise: [
      'With a partial blockage, a person may still be able to speak, breathe and cough effectively.',
      'Severe choking may prevent speaking, normal breathing or an effective cough.',
      'Their condition can deteriorate. Keep observing rather than deciding severity from a single gesture or picture.',
    ],
    actions: [
      {
        title: 'Listen for an effective cough',
        text: 'If the person can cough effectively and breathe, encourage them to keep coughing. Get an adult and stay nearby. Watch for difficulty speaking, weak or absent coughing, or worsening breathing.',
        why: 'An effective cough may clear a partial blockage. The response changes if the cough stops being effective.',
      },
      {
        title: 'Treat inability to speak or breathe as an emergency',
        text: 'Shout for immediate help. Ask a specific person to call emergency services while a trained adult acts. If alone, call on speaker and follow the dispatcher’s instructions without waiting for someone else.',
        why: 'A severe obstruction can quickly become life-threatening. Getting help and acting with trained guidance must not be delayed.',
      },
      {
        title: 'Follow age-appropriate trained guidance',
        text: 'Recognised choking techniques differ for infants and other people. This introductory lesson does not teach thrusts or back blows to be rehearsed on classmates. Follow a trained first aider or dispatcher in a real emergency.',
        why: 'Incorrect physical techniques can injure someone. Hands-on skills need appropriate supervised training.',
      },
      {
        title: 'Report a change in responsiveness immediately',
        text: 'If the person becomes unresponsive, tell the dispatcher and follow the emergency instructions given. Do not give food or drink and do not blindly put fingers into the mouth.',
        why: 'An unresponsive person needs an emergency response. Blind finger sweeps can push an object further in or cause injury.',
      },
    ],
    avoid: [
      'Do not give water or food to try to push an obstruction down.',
      'Do not perform blind finger sweeps.',
      'Do not rehearse choking techniques on classmates or siblings.',
      'Do not leave a worsening person alone or wait for the lesson to finish before calling help.',
    ],
    urgent: [
      'They cannot speak, breathe or cough effectively.',
      'They become unresponsive or their breathing is abnormal.',
      'Symptoms persist after an apparent choking incident: obtain medical advice.',
    ],
    remember:
      'Effective cough: encourage and observe. Ineffective cough or no speech/breathing: immediate emergency help.',
    scenarios: [
      {
        id: 'choke-cough',
        title: 'Still coughing strongly',
        situation: 'A learner coughs forcefully after swallowing, can answer you and is breathing.',
        question: 'What should you do first?',
        options: [
          'Encourage coughing, get an adult and keep observing',
          'Give a large drink immediately',
          'Blindly sweep the mouth',
        ],
        answer: 0,
        explanation:
          'A strong effective cough is different from severe obstruction. Encourage it while getting adult help and monitoring for deterioration.',
      },
      {
        id: 'choke-silent',
        title: 'No effective cough',
        situation:
          'The learner cannot answer, cannot breathe normally and is no longer coughing effectively.',
        question: 'What is the priority?',
        options: [
          'Wait for them to settle alone',
          'Summon immediate trained help and emergency services; follow dispatcher instructions',
          'Offer food to dislodge the object',
        ],
        answer: 1,
        explanation:
          'This suggests severe obstruction. Immediate trained help and emergency guidance are needed.',
      },
    ],
  },
  response: {
    summary:
      'A useful emergency response combines safe observation, a clear call, organised help and continued attention to the person. You do not need to invent a diagnosis or do a procedure beyond your training to be useful.',
    recognise: [
      'Identify immediate danger and whether the person responds.',
      'Report normal versus abnormal breathing as accurately as you can.',
      'Notice changes while help is being arranged, including worsening breathing or responsiveness.',
    ],
    actions: [
      {
        title: 'State the location first',
        text: 'Give the school name, exact area, a useful landmark and the best access point. If the dispatcher needs more detail, answer carefully rather than guessing.',
        why: 'An accurate location allows help to find the person. A vague location can delay responders even when the call itself is clear.',
      },
      {
        title: 'Describe observations rather than diagnoses',
        text: 'Say what happened, whether the person responds and whether they are breathing normally. Mention major hazards or serious bleeding. If you do not know, say so.',
        why: 'Direct observations help the dispatcher ask the right questions and give suitable instructions.',
      },
      {
        title: 'Assign simple safe roles',
        text: 'Ask one person to call, another responsible adult to stay with the casualty, and someone to guide responders from the entrance. Only assign tasks that are safe in the situation.',
        why: 'Clear roles reduce confusion and prevent several people assuming someone else has made the call.',
      },
      {
        title: 'Stay connected and report changes',
        text: 'Keep the phone on speaker if appropriate, follow instructions and do not hang up until told. Tell the dispatcher about any change. Protect the person’s privacy and give responders a clear route.',
        why: 'Instructions and priorities may change as the person’s condition changes.',
      },
    ],
    avoid: [
      'Do not delay the call while trying to establish a diagnosis.',
      'Do not post photographs or personal medical details to a class group.',
      'Do not move an injured person unless there is immediate danger or appropriate trained/dispatcher guidance.',
      'Do not make practice calls to real emergency numbers.',
    ],
    urgent: [
      'Unresponsiveness, absent or abnormal breathing, severe bleeding or another life-threatening situation.',
      'A dangerous scene that needs emergency professionals before anyone approaches.',
      'Any deterioration while waiting: tell the dispatcher immediately.',
    ],
    remember: 'Location → observations → follow instructions → report changes → protect privacy.',
    scenarios: [
      {
        id: 'call-location',
        title: 'An unclear location',
        situation:
          'You tell the dispatcher “we are at school,” but they ask which school and where to enter.',
        question: 'What should you do?',
        options: [
          'Hang up because you already called',
          'Give the school name, exact location, landmark and access point',
          'Invent an address',
        ],
        answer: 1,
        explanation:
          'Stay on the call and provide accurate location details. Say when you do not know rather than inventing information.',
      },
      {
        id: 'call-privacy',
        title: 'A friend starts filming',
        situation: 'Help is on the way. A friend wants to film the learner and share the video.',
        question: 'What is the appropriate response?',
        options: [
          'Ask them to stop filming, protect privacy and keep the route clear',
          'Encourage a live stream',
          'Share the person’s medical history in a class group',
        ],
        answer: 0,
        explanation:
          'Protect the person’s dignity and privacy. Useful help is keeping the scene calm, reporting changes and guiding responders.',
      },
    ],
  },
};
