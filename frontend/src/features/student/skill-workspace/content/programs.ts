import type { CourseLearningPack, RichSkillLesson } from './types';

function guided(
  key: string,
  title: string,
  objective: string,
  sections: RichSkillLesson['sections'],
  steps: string[],
  question: string,
  options: string[],
  answer: number,
  explanation: string,
): RichSkillLesson {
  return {
    key,
    title,
    type: 'GUIDED',
    description: objective,
    objective,
    minutes: 12,
    sections,
    activity: { title: 'Make something to show your learning', steps },
    check: { question, options, answer, explanation },
  };
}
function code(
  key: string,
  title: string,
  objective: string,
  sections: RichSkillLesson['sections'],
  starterCode: string,
  expectedOutput: string,
  solution: string,
  hint: string,
  question: string,
  options: string[],
  answer: number,
  explanation: string,
): RichSkillLesson {
  return {
    ...guided(
      key,
      title,
      objective,
      sections,
      [
        'Predict the example’s result before you run it.',
        'Change the starter code to meet the task and compare the output with the expected result.',
        'Try another value after passing the check and explain the change.',
      ],
      question,
      options,
      answer,
      explanation,
    ),
    type: 'CODE',
    starterCode,
    expectedOutput,
    solution,
    hint,
  };
}
export const otherPacks: CourseLearningPack[] = [
  {
    title: 'Machine Learning Foundations',
    version: 'ml-v1',
    mode: 'MACHINE_LEARNING',
    lessons: [
      code(
        'ml-v1-data',
        'Meet a small dataset',
        'Describe a dataset and calculate an average using Python.',
        [
          {
            title: 'Data comes in observations',
            text: 'A dataset collects observations. In a table, a row often represents one item and a column describes a feature. A measurement is only useful when you know its unit and how it was collected.',
          },
          {
            title: 'Inspect before calculating',
            text: 'Start with a tiny dataset you can check yourself. These invented practice scores are not real learner data. NumPy can calculate their mean.',
            example:
              'import numpy as np\nvalues = np.array([10, 20, 30])\nprint(float(values.mean()))\n# Output: 20.0',
          },
          {
            title: 'An average is not a prediction',
            text: 'The mean describes these observations. It does not explain every individual value or establish why the values differ. Check missing entries and unusual values before drawing conclusions.',
          },
        ],
        'import numpy as np\nscores = np.array([40, 60, 80])\n# Print the mean as a Python float.\nprint(0.0)',
        '60.0',
        'import numpy as np\nscores = np.array([40, 60, 80])\nprint(float(scores.mean()))',
        'Use float(scores.mean()) inside print().',
        'What does a row usually represent in a simple dataset?',
        ['One observation', 'The entire model', 'An automatic explanation of cause'],
        0,
        'A row commonly describes one observation. Always check the dataset’s documentation.',
      ),
      code(
        'ml-v1-split',
        'Keep training and testing separate',
        'Explain why a model should be checked on examples it has not learned from.',
        [
          {
            title: 'Learning from examples',
            text: 'A model uses training data to learn a pattern. Test data is held back until evaluation. Good performance on examples already seen can give a misleading impression.',
          },
          {
            title: 'A small split',
            text: 'For this toy exercise, keep the last two values for testing. Real projects need a split that fits how the data was collected, including time and grouping.',
            example:
              'values = [2, 4, 6, 8, 10]\ntrain = values[:3]\ntest = values[3:]\nprint(len(train), len(test))\n# Output: 3 2',
          },
          {
            title: 'Avoid leakage',
            text: 'Do not use test answers to tune the model and then report the same test result as independent evidence. Decide how to evaluate before repeatedly changing the model.',
          },
        ],
        'values = [2, 4, 6, 8, 10, 12]\n# Keep four values for training and two for testing.\ntrain = values[:1]\ntest = values[1:]\nprint(len(train), len(test))',
        '4 2',
        'values = [2, 4, 6, 8, 10, 12]\ntrain = values[:4]\ntest = values[4:]\nprint(len(train), len(test))',
        'A slice stops before its end index. Use [:4] and [4:].',
        'Why hold back test data?',
        [
          'To evaluate on unseen examples',
          'To make training scores look higher',
          'To remove all difficult examples',
        ],
        0,
        'Unseen test examples give a more useful check of generalisation than training results alone.',
      ),
      code(
        'ml-v1-evaluate',
        'Measure a prediction result',
        'Compare simple predicted labels against known answers.',
        [
          {
            title: 'Predictions can be wrong',
            text: 'A prediction must be compared with a reliable reference answer. Here the labels are invented yes/no outcomes, so you can inspect every comparison.',
          },
          {
            title: 'Count correct labels',
            text: 'Accuracy is the number of correct predictions divided by the total. In the example, zip() pairs each actual label with its prediction. Each equality test gives True or False, and sum() counts the True values. Accuracy alone can hide poor results for rare outcomes.',
            example:
              'actual = [1, 0, 1, 0]\npredicted = [1, 0, 0, 0]\ncorrect = sum(a == p for a, p in zip(actual, predicted))\nprint(correct)\n# Output: 3',
          },
          {
            title: 'Inspect mistakes',
            text: 'Look at which examples failed and whether one type of outcome is repeatedly missed. A score is not a reason to deploy a model in a high-stakes setting.',
          },
        ],
        'actual = [1, 0, 1, 0]\npredicted = [1, 0, 0, 0]\ncorrect = sum(a == p for a, p in zip(actual, predicted))\n# Print percentage accuracy.\nprint(0.0)',
        '75.0',
        'actual = [1, 0, 1, 0]\npredicted = [1, 0, 0, 0]\ncorrect = sum(a == p for a, p in zip(actual, predicted))\nprint(correct / len(actual) * 100)',
        'Divide correct by len(actual), then multiply by 100.',
        'Three correct predictions out of four gives what accuracy?',
        ['25%', '75%', '100%'],
        1,
        '3 ÷ 4 × 100 = 75%. This alone does not tell you which mistakes occurred.',
      ),
      guided(
        'ml-v1-responsible',
        'Decide whether the evidence is enough',
        'Identify missing representation, privacy risks and limits in a model claim.',
        [
          {
            title: 'Ask who is represented',
            text: 'A dataset from one school or season may not represent another setting. Check how observations were selected and whether important groups or conditions are missing.',
          },
          {
            title: 'Protect people',
            text: 'Use the invented datasets in this course. Do not upload classmates’ names, health information, marks or photographs without appropriate authorisation and safeguards.',
          },
          {
            title: 'Write an honest model note',
            text: 'State the purpose, data source, evaluation method, known errors and uses the model is not suitable for. A demonstration is not evidence that a tool is safe for real decisions.',
          },
        ],
        [
          'Write a model note for a pretend plant-watering predictor trained only during a wet month.',
          'Name one missing condition, one evaluation you would add and one decision that should remain with a person.',
        ],
        'A model tested at only one school should be described as…',
        [
          'Proven suitable for every school',
          'A limited result needing broader evaluation',
          'Guaranteed unbiased',
        ],
        1,
        'Evidence from one setting has limits. Broader evaluation is needed before broader claims.',
      ),
    ],
  },
  {
    title: 'Robotics with Sensors and Arduino',
    version: 'robot-v1',
    mode: 'ROBOTICS',
    lessons: [
      {
        ...code(
          'robot-v1-move',
          'Move a simulated robot',
          'Use a command to move a robot on a small grid.',
          [
            {
              title: 'Start in a simulation',
              text: 'This is a virtual grid, not a connected Arduino board. The robot starts at column 2, row 2, facing right. Rows increase downward and columns increase to the right.',
            },
            {
              title: 'Give one clear instruction',
              text: 'forward(1) moves one square in the current direction. backward(1) moves in the opposite direction. The grid boundary keeps the robot inside five rows and five columns.',
              example: 'forward(1)\nprint("Moved one square")',
            },
            {
              title: 'Predict before running',
              text: 'From (2, 2), moving two squares right should end at (4, 2). Count the squares before you run. The arrow shows which way the robot faces.',
            },
          ],
          '# Move two squares forward, then print the message.\nforward(1)\nprint("Moved two squares")',
          'Moved two squares',
          'forward(2)\nprint("Moved two squares")',
          'Change the number passed to forward() from 1 to 2.',
          'Where does forward(2) end when starting at (2, 2) facing right?',
          ['(4, 2)', '(2, 4)', '(0, 2)'],
          0,
          'Facing right increases the column: 2 + 2 = 4. The row stays 2.',
        ),
        targetRobot: { x: 4, y: 2, direction: 1 },
      },
      {
        ...code(
          'robot-v1-turn',
          'Turn before moving',
          'Explain why turning changes direction but not location.',
          [
            {
              title: 'Position and direction differ',
              text: 'A turn changes which way the arrow faces. It does not move the robot to another square. After turning, forward() follows the new direction.',
            },
            {
              title: 'Turn commands',
              text: 'turn_right() rotates a quarter turn clockwise. turn_left() rotates a quarter turn anticlockwise. These commands take no distance argument.',
              example: 'turn_right()\nforward(1)\nprint("Turned and moved")',
            },
            {
              title: 'Trace the route',
              text: 'Starting at the centre facing right, a right turn faces down. One forward step then reaches (2, 3). Draw the arrow after each instruction.',
            },
          ],
          '# Face down, then move one square.\nturn_left()\nforward(1)\nprint("Turned and moved")',
          'Turned and moved',
          'turn_right()\nforward(1)\nprint("Turned and moved")',
          'Use turn_right() instead of turn_left().',
          'What changes when turn_right() runs by itself?',
          ['Only the position', 'Only the direction', 'Both position and battery level'],
          1,
          'The simulated robot rotates without changing its square.',
        ),
        targetRobot: { x: 2, y: 3, direction: 2 },
      },
      {
        ...code(
          'robot-v1-route',
          'Plan a two-part route',
          'Break a route into movement and turning instructions.',
          [
            {
              title: 'Make a route plan',
              text: 'The goal is the bottom-right corner, (4, 4). Begin at (2, 2) facing right. Move across first, then turn down and move again.',
            },
            {
              title: 'Order matters',
              text: 'The same commands in a different order may reach another square. Write down the intermediate position and direction after each command.',
              example: 'forward(2)\nturn_right()\nforward(1)\nprint("Route complete")',
            },
            {
              title: 'Simulation has limits',
              text: 'Real robots can slip, miss a turn or encounter an obstacle. This grid has no real sensors. Treat a successful simulation as a planning exercise, not a tested physical design.',
            },
          ],
          'forward(2)\nturn_right()\nforward(1)\nprint("Route complete")',
          'Route complete',
          'forward(2)\nturn_right()\nforward(2)\nprint("Route complete")',
          'After moving right, you need two downward steps to reach row 4.',
          'Why trace intermediate positions?',
          [
            'To see where an instruction first changes the route incorrectly',
            'To avoid testing',
            'To prove a physical robot is safe',
          ],
          0,
          'Tracing helps locate the first incorrect instruction instead of guessing at the final result.',
        ),
        targetRobot: { x: 4, y: 4, direction: 2 },
      },
      guided(
        'robot-v1-sensors',
        'Connect the simulation to real robotics ideas',
        'Distinguish a sensor, controller and actuator without wiring hardware.',
        [
          {
            title: 'Sense, decide, act',
            text: 'A sensor measures a condition such as light or distance. A controller processes the reading. An actuator, such as a motor, produces an action.',
          },
          {
            title: 'Use a threshold thoughtfully',
            text: 'A rule might say: if an obstacle is closer than a chosen distance, stop. The distance must be checked against speed, sensor error and the real environment.',
          },
          {
            title: 'Plan hardware with supervision',
            text: 'Draw a labelled block diagram first. Actual Arduino circuits require suitable components, voltage ratings and adult supervision. This browser activity does not connect to or verify a physical board.',
          },
        ],
        [
          'Draw a distance sensor → controller → motor diagram for a robot that stops before an obstacle.',
          'Describe one sensor failure and a safe response. Do not wire or power hardware for this activity.',
        ],
        'Which component measures distance?',
        ['The sensor', 'The motor', 'The wheel'],
        0,
        'A distance sensor measures the condition; a motor produces motion.',
      ),
    ],
  },
  {
    title: 'Research Skills for Student Projects',
    version: 'research-v1',
    mode: 'GUIDED',
    lessons: [
      guided(
        'research-v1-question',
        'Ask a question you can investigate',
        'Turn a broad interest into a specific, answerable research question.',
        [
          {
            title: 'Make the question specific',
            text: '“Plants” is a topic. “How does the amount of light affect bean seedling height over two weeks?” identifies what changes, what is measured and a period.',
          },
          {
            title: 'Separate factors',
            text: 'Change one main factor and keep other relevant conditions as similar as possible. Record what you cannot control rather than pretending it has no effect.',
          },
          {
            title: 'Check feasibility and ethics',
            text: 'Choose a small, safe question. Do not experiment on people, animals or hazardous materials without appropriate approval and supervision.',
          },
        ],
        [
          'Write a question about a safe everyday observation and identify the measured outcome.',
          'List two conditions you would keep similar and ask a teacher to review your plan.',
        ],
        'Which question is most testable?',
        [
          'Are plants interesting?',
          'How does daily light duration affect seedling height over two weeks?',
          'Which idea is always best?',
        ],
        1,
        'The question identifies a factor, a measurable outcome and a timeframe.',
      ),
      guided(
        'research-v1-evidence',
        'Keep an evidence notebook',
        'Record observations consistently and distinguish data from interpretation.',
        [
          {
            title: 'Design a table first',
            text: 'Use columns for date, item identifier, measurement and unit. Record the method and equipment so another learner can understand how the data was collected.',
          },
          {
            title: 'Record what happened',
            text: 'Do not change observations to fit your prediction. Note missing measurements and unexpected events. An observation is different from an explanation of why it occurred.',
          },
          {
            title: 'Repeat fairly',
            text: 'Repeated observations can reveal variation. Use the same measurement method each time and keep original records, including results that disagree with your expectation.',
          },
        ],
        [
          'Create a table for three invented seedling measurements, with dates and centimetres. Clearly mark it as practice data.',
          'Write one observation and one possible interpretation in separate sentences.',
        ],
        'Which entry is most useful?',
        [
          'It grew a lot',
          'Seedling A: 8.2 cm, measured from soil to tip on 26 October',
          'The prediction must be right',
        ],
        1,
        'The entry identifies the item, unit, method and date.',
      ),
      guided(
        'research-v1-conclusion',
        'Explain a result and its limits',
        'Use evidence to support a cautious conclusion and acknowledge sources.',
        [
          {
            title: 'Compare with your question',
            text: 'Summarise the measurements that answer the original question. Use a labelled table or graph with units. Do not select only the measurements that support your preferred result.',
          },
          {
            title: 'Avoid claiming more than you tested',
            text: 'A small observation does not establish a universal rule. Explain sample size, uncontrolled factors and what a better follow-up investigation would change.',
          },
          {
            title: 'Credit other people’s work',
            text: 'Record the author or organisation, title, publication date if available, and URL or publication details. Separate quoted words from your own explanation.',
          },
        ],
        [
          'Write a four-sentence report: question, evidence, conclusion and limitation.',
          'Add a source entry for a real reference you used, rather than inventing a citation.',
        ],
        'A cautious conclusion should include…',
        [
          'Only supporting measurements',
          'Evidence and important limitations',
          'A claim that the result applies everywhere',
        ],
        1,
        'A useful conclusion states what the evidence supports and where uncertainty remains.',
      ),
    ],
  },
  {
    title: 'Cyber Safety and Networking',
    version: 'cyber-v1',
    mode: 'GUIDED',
    lessons: [
      guided(
        'cyber-v1-accounts',
        'Protect an account',
        'Explain unique passwords, passphrases and multi-factor authentication.',
        [
          {
            title: 'Use unique credentials',
            text: 'A long, unique password or passphrase reduces the risk from password reuse. A trusted password manager can help. Do not enter a real password into a lesson or share it with classmates.',
          },
          {
            title: 'Add another factor',
            text: 'Multi-factor authentication adds a check beyond a password, such as an authenticator or security key. Keep recovery methods private and securely stored.',
          },
          {
            title: 'Get help after a suspected compromise',
            text: 'Use the service’s official recovery process, tell a responsible adult and secure the connected email account. Never pay someone who promises access through an unofficial route.',
          },
        ],
        [
          'Write a fictional checklist for securing a practice account. Do not include real credentials.',
          'Explain how reusing a password can affect several accounts.',
        ],
        'Which practice best limits damage from one leaked password?',
        [
          'Using it on every website',
          'Using a different strong password for each account',
          'Sending it to a class group',
        ],
        1,
        'Unique passwords prevent one leaked credential from directly unlocking every other account.',
      ),
      guided(
        'cyber-v1-messages',
        'Recognise a suspicious message',
        'Pause, verify and report messages that ask for money or account access.',
        [
          {
            title: 'Look for the request',
            text: 'A message may imitate a school or company and create urgency. Requests for passwords, verification codes or unexpected payments deserve extra care, even if the branding looks familiar.',
          },
          {
            title: 'Verify through another route',
            text: 'Open the service’s known address yourself or use a contact you already trust. Do not use the phone number or link supplied by the suspicious message to verify itself.',
          },
          {
            title: 'Report without spreading it',
            text: 'Tell a responsible adult or the organisation through an official channel. Avoid forwarding sensitive details or clicking attachments to investigate.',
          },
        ],
        [
          'Draft a fictional urgent-payment message and mark two warning signs. Do not send it.',
          'Write the independent route you would use to verify it.',
        ],
        'A message asks for your one-time login code. What should you do?',
        [
          'Send it immediately',
          'Share it with the sender after checking the logo',
          'Keep it private and verify through an official route',
        ],
        2,
        'A verification code can give access to an account. Branding is not proof of identity.',
      ),
      guided(
        'cyber-v1-networks',
        'Trace a safe web request',
        'Describe how a device reaches a service through a network.',
        [
          {
            title: 'Devices communicate through networks',
            text: 'Your device sends data through a local network and other systems to reach a service. A router forwards traffic between networks; a server provides a service.',
          },
          {
            title: 'Names and encryption do different jobs',
            text: 'DNS helps resolve a domain name to a network address. HTTPS protects data in transit to the connected site, but a padlock alone does not prove that the site is trustworthy.',
          },
          {
            title: 'Stay within permission',
            text: 'This course uses diagrams, not network scanning or attempts to access other people’s systems. Only investigate systems you are explicitly authorised to test.',
          },
        ],
        [
          'Draw learner device → router → internet → learning server and label each part.',
          'Explain why checking a domain name still matters when a page uses HTTPS.',
        ],
        'What does HTTPS alone guarantee about a website?',
        [
          'That everything on it is true',
          'That the connection is encrypted to the connected site',
          'That it belongs to your school',
        ],
        1,
        'HTTPS protects the connection; it is not a general guarantee of the site’s honesty or ownership.',
      ),
    ],
  },
  {
    title: 'CAD and Digital Fabrication',
    version: 'cad-v1',
    mode: 'GUIDED',
    lessons: [
      guided(
        'cad-v1-brief',
        'Turn an idea into a measured brief',
        'Describe a simple object using purpose, dimensions and constraints.',
        [
          {
            title: 'Start with the problem',
            text: 'A design brief explains who needs the object and what it should do. For a pencil tray, consider pencil length, available desk space and whether sharp edges could cause harm.',
          },
          {
            title: 'Use units consistently',
            text: 'Sketch the object and label length, width and height in one unit, such as millimetres. A dimension without a unit is ambiguous.',
          },
          {
            title: 'Separate requirements from preferences',
            text: 'A tray fitting inside a 200 mm space is a requirement. Its colour may be a preference. Note material and tool constraints before choosing a shape.',
          },
        ],
        [
          'Draw a pencil tray with labelled length, width and height in millimetres.',
          'Write one fit requirement and one appearance preference.',
        ],
        'Which dimension is unambiguous?',
        ['Length 150', 'Length 150 mm', 'Length fairly long'],
        1,
        'A numerical value with a unit communicates a reproducible dimension.',
      ),
      guided(
        'cad-v1-geometry',
        'Understand a sketch and an extrusion',
        'Explain how a flat profile can become a three-dimensional form.',
        [
          {
            title: 'A sketch defines a profile',
            text: 'A CAD sketch uses points, lines and curves in a plane. Dimensions and constraints describe the intended size and relationships, rather than relying on how a drawing looks.',
          },
          {
            title: 'Extrusion adds depth',
            text: 'Extruding a closed rectangle through a distance creates a rectangular solid. The starting profile and extrusion distance are separate design choices.',
          },
          {
            title: 'Check what the tool actually supports',
            text: 'This lesson uses a paper or digital sketch. It does not contain a full CAD modeller. If you later use CAD software, compare its model dimensions with your original brief.',
          },
        ],
        [
          'Draw a 60 mm by 40 mm rectangle, then a perspective sketch showing a 10 mm extrusion.',
          'Label which measurements belong to the profile and which describes extrusion depth.',
        ],
        'Extruding a closed rectangle adds…',
        [
          'Depth to make a three-dimensional form',
          'A verified fabrication certificate',
          'Automatic material safety',
        ],
        0,
        'An extrusion extends a two-dimensional profile through a specified distance.',
      ),
      guided(
        'cad-v1-prototype',
        'Review a prototype before fabrication',
        'Plan a safe prototype test and recognise manufacturing limits.',
        [
          {
            title: 'Use a low-risk prototype first',
            text: 'A paper or cardboard model can reveal fit problems before material is cut or printed. Compare its dimensions and function with the brief.',
          },
          {
            title: 'Tolerances allow variation',
            text: 'Manufactured parts are not perfectly exact. Fitting parts may need a gap or clearance, depending on the process and material. Do not assume a screen model will fit perfectly.',
          },
          {
            title: 'Use machines only with trained supervision',
            text: 'Laser cutters, printers and other fabrication tools have process-specific hazards. This activity does not authorise machine operation or produce a validated machine-ready file.',
          },
        ],
        [
          'Make a paper mock-up, or draw a test plan if materials are unavailable.',
          'Record one fit problem and one design change. Do not operate fabrication machinery.',
        ],
        'Why test a prototype against the brief?',
        [
          'To check whether it meets the stated requirements',
          'To avoid recording defects',
          'To prove every material is safe',
        ],
        0,
        'A test should compare the result with requirements and identify needed changes.',
      ),
    ],
  },
  {
    title: 'Video Production and Editing',
    version: 'video-v1',
    mode: 'GUIDED',
    lessons: [
      guided(
        'video-v1-story',
        'Plan a short story before recording',
        'Use a simple storyboard to communicate one clear idea.',
        [
          {
            title: 'Choose a purpose and audience',
            text: 'A short educational video works best when it explains one idea. Decide who is watching and what they should understand or be able to do afterwards.',
          },
          {
            title: 'Plan beginning, middle and end',
            text: 'A storyboard pairs each planned shot with its purpose and sound. A three-shot plan might introduce a problem, demonstrate a safe action and summarise the result.',
          },
          {
            title: 'Plan permission and privacy',
            text: 'Obtain appropriate permission before recording people. Avoid showing names, school records or private locations. Use props or drawings when people do not need to appear.',
          },
        ],
        [
          'Draw a three-frame storyboard explaining how to organise a study desk.',
          'Write a sentence describing each shot and its sound.',
        ],
        'What is the main purpose of a storyboard?',
        ['To plan the shots and message before filming', 'To replace consent', 'To guarantee good audio'],
        0,
        'A storyboard helps organise visual storytelling before recording begins.',
      ),
      guided(
        'video-v1-record',
        'Capture clear picture and sound',
        'Identify simple ways to make a recording understandable.',
        [
          {
            title: 'Make the subject visible',
            text: 'Use steady framing and suitable light. Avoid placing the main light behind the subject unless that is intentional. Check the screen before recording.',
          },
          {
            title: 'Listen to a short test',
            text: 'Background noise can make good pictures hard to follow. Record a short test and listen with headphones at a comfortable volume before recording the full sequence.',
          },
          {
            title: 'Keep recording safe',
            text: 'Do not film near traffic, heights or hazardous activities for this task. Choose a stable device position and keep walkways clear.',
          },
        ],
        [
          'Record a short clip of a non-personal object if you have permission and a suitable device; otherwise write a shot plan.',
          'Identify one lighting improvement and one sound improvement.',
        ],
        'What should you do before a long recording?',
        [
          'Record a short test and check picture and sound',
          'Ignore background noise',
          'Film only private information',
        ],
        0,
        'A test recording can reveal problems early without wasting a full session.',
      ),
      guided(
        'video-v1-edit',
        'Build a clear sequence and review it',
        'Plan edits, accessible captions and an appropriate export.',
        [
          {
            title: 'Choose shots for meaning',
            text: 'Keep clips that support the message and remove unnecessary repetition. The order should help a viewer follow what happens and why.',
          },
          {
            title: 'Make the message accessible',
            text: 'Add accurate captions or a transcript where possible. Check text size and contrast. Do not rely on colour alone to convey an important instruction.',
          },
          {
            title: 'Review before sharing',
            text: 'Check permissions, personal information, music rights and the final message. This guided workspace provides a planning activity, not a built-in video editor or publishing service.',
          },
        ],
        [
          'Write an edit list for your three planned shots, including one caption per shot.',
          'Create a pre-sharing checklist covering privacy, permission, sound and readability.',
        ],
        'Which addition helps a viewer who cannot hear the audio?',
        ['Accurate captions', 'Smaller text', 'Unlabelled colour changes'],
        0,
        'Captions communicate spoken content and relevant sound information as text.',
      ),
    ],
  },
  {
    title: 'Smart Agriculture and Climate Technology',
    version: 'agri-v1',
    mode: 'GUIDED',
    lessons: [
      guided(
        'agri-v1-observe',
        'Observe conditions before making decisions',
        'Choose useful measurements for a simple growing experiment.',
        [
          {
            title: 'Begin with the plant’s context',
            text: 'Water needs depend on the crop, soil, weather and stage of growth. A single sensor reading does not tell you everything a plant needs.',
          },
          {
            title: 'Choose and label measurements',
            text: 'Record date, location, soil condition, rainfall or watering, and a consistent measurement method. Include units and distinguish observation from an estimate.',
          },
          {
            title: 'Use safe practice data',
            text: 'Start with invented records or supervised observations. Do not handle pesticides, fertilisers, powered pumps or unfamiliar equipment for this activity.',
          },
        ],
        [
          'Create a labelled table of three invented daily observations for a potted plant.',
          'Explain which values are measured and which are estimates.',
        ],
        'Which record is most useful?',
        [
          'The garden looked fine',
          'Pot A, 26 October, 100 mL added, surface condition recorded',
          'Water always fixes every problem',
        ],
        1,
        'A useful record identifies the item, date, amount and observation.',
      ),
      guided(
        'agri-v1-system',
        'Draw a simple monitoring system',
        'Explain the roles of a sensor, decision rule and human check.',
        [
          {
            title: 'A sensor provides a signal',
            text: 'A soil-moisture sensor measures a property related to moisture. Different sensors need calibration and can be affected by soil and placement.',
          },
          {
            title: 'A rule needs testing',
            text: 'A proposed rule might flag a reading below a chosen threshold. The threshold is not universal: compare readings with actual growing conditions and expert guidance.',
          },
          {
            title: 'Keep a human in control',
            text: 'For a beginner design, show an alert to a person rather than switching an unattended pump. Consider what happens if a sensor disconnects or reports an impossible value.',
          },
        ],
        [
          'Draw sensor → recorded reading → alert → human decision.',
          'Add one failure condition and the safe response. Do not wire a live pump.',
        ],
        'A moisture threshold should be…',
        [
          'Assumed correct for every crop',
          'Checked for the specific sensor and growing conditions',
          'Copied without checking',
        ],
        1,
        'Thresholds depend on equipment, crop and context and should be tested.',
      ),
      guided(
        'agri-v1-evaluate',
        'Compare an intervention fairly',
        'Plan how to judge whether a proposed change helped.',
        [
          {
            title: 'Define a useful outcome',
            text: 'Choose an outcome such as plant growth over a period or water used under comparable conditions. Record the starting point before the change.',
          },
          {
            title: 'Consider competing explanations',
            text: 'Rain, shade, soil or disease might affect the result. Keep conditions similar where possible and note differences you cannot control.',
          },
          {
            title: 'Avoid unsupported claims',
            text: 'A short classroom investigation does not establish farm-wide savings or yield improvements. Report observations, uncertainty and the next test needed.',
          },
        ],
        [
          'Propose a small supervised comparison using plants or clearly labelled fictional records.',
          'Write an evidence-based conclusion that includes one limitation.',
        ],
        'Which claim fits a small classroom trial?',
        [
          'This guarantees higher yield everywhere',
          'In these recorded conditions, this outcome was observed',
          'Climate no longer matters',
        ],
        1,
        'A conclusion should stay within the conditions and evidence actually observed.',
      ),
    ],
  },
  {
    title: 'Solar Energy Systems Foundations',
    version: 'solar-v1',
    mode: 'GUIDED',
    lessons: [
      guided(
        'solar-v1-components',
        'Follow energy through a solar system',
        'Identify the panel, controller, battery, inverter and load.',
        [
          {
            title: 'Panels convert light into electricity',
            text: 'A photovoltaic panel produces electrical power when exposed to light. Its output varies with conditions; a rated number is not a promise of constant output.',
          },
          {
            title: 'Components have different roles',
            text: 'A charge controller manages charging in a suitable battery system. A battery stores energy. An inverter converts suitable DC input to AC output. The load is the device using energy.',
          },
          {
            title: 'Work only with diagrams here',
            text: 'Panels, batteries and inverters can cause electric shock, fire or injury. Do not connect, disconnect, open or test live equipment for this introductory activity.',
          },
        ],
        [
          'Draw sunlight → panel → controller → battery → suitable load; show an inverter only when an AC load requires it.',
          'Label what each component does without wiring any equipment.',
        ],
        'Which component stores energy?',
        ['Battery', 'Sunlight label', 'A wire by itself'],
        0,
        'A battery stores electrical energy through chemical processes; it must be selected and handled appropriately.',
      ),
      guided(
        'solar-v1-energy',
        'Estimate a small device’s energy use',
        'Distinguish power in watts from energy in watt-hours.',
        [
          {
            title: 'Power is a rate',
            text: 'A device rated at 10 W uses energy at a rate of 10 watts under the stated conditions. Power and energy are different quantities.',
          },
          {
            title: 'Multiply by time',
            text: 'A simple estimate is energy in Wh = power in W × time in hours. A 10 W lamp used for 3 hours needs about 30 Wh at the load, before system losses.',
            example: '10 W × 3 h = 30 Wh',
          },
          {
            title: 'An estimate is not a system design',
            text: 'Real selection must consider losses, usable battery capacity, charging conditions, protective devices and manufacturer guidance. Do not choose or install equipment from this calculation alone.',
          },
        ],
        [
          'Estimate the load energy for a fictional 5 W lamp used for 4 hours. Include units.',
          'Explain one reason the system must provide more energy than the simple load estimate.',
        ],
        'A 5 W lamp used for 4 hours uses approximately…',
        ['20 Wh', '20 W per hour', '1.25 Wh'],
        0,
        '5 W × 4 h = 20 Wh, before losses in the rest of a system.',
      ),
      guided(
        'solar-v1-safety',
        'Review a proposal safely',
        'Identify information a qualified installer would need before installation.',
        [
          {
            title: 'Check the intended use',
            text: 'List the devices, their power, operating hours and whether they need AC or DC. Note the conditions and limits of the estimate.',
          },
          {
            title: 'Recognise hazards',
            text: 'Battery short circuits, wrong polarity, unsuitable cables and incorrect protection can be dangerous. Damaged or unfamiliar equipment should be left for a qualified person.',
          },
          {
            title: 'Use qualified supervision',
            text: 'A qualified installer should assess the design and local requirements. This lesson does not provide installation instructions or demonstrate competence to work on electrical systems.',
          },
        ],
        [
          'Prepare a paper checklist of information to give a qualified installer.',
          'Identify two reasons not to test a system by directly connecting a panel and battery.',
        ],
        'Who should verify the installation design and protective measures?',
        [
          'A learner guessing from a single power calculation',
          'A qualified installer following applicable requirements',
          'Anyone with a spare cable',
        ],
        1,
        'Safe system design and installation require appropriate expertise and applicable standards.',
      ),
    ],
  },
];
