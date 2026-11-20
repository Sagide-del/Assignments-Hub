import {careerCompassGuide as career} from './career-compass-guide.mjs';
// Structured editorial copy. Rich links use [[label|internal-path]] and are
// validated by the publisher; articles do not accept arbitrary raw HTML.
const section=(heading,paragraphs,extra={})=>({heading,paragraphs,...extra});
export const deepGuides={
'cbc-grading-levels-explained':{
 takeaways:['Read EE, ME, AE and BE alongside the assessed skill and teacher’s comment.','Find one missing step before buying more revision materials.','Review progress calmly; one report is not a career prediction.'],
 sections:[
 section('What EE, ME, AE and BE actually tell you',[
 'CBC performance descriptions summarise evidence from an assessment: Exceeding Expectation, Meeting Expectation, Approaching Expectation and Below Expectation. Before reacting to a letter, establish which task was assessed, what successful performance looked like and whether the learner had an opportunity to demonstrate the skill.',
 'A learner may meet the expectation when calculating an answer but need support when explaining the method. Read the task and teacher’s comment together instead of treating a subject’s overall descriptor as a complete description of everything your child knows.',
 ],{table:{caption:'Turn a descriptor into a useful question',headers:['Level','Ask about the evidence'],rows:[['EE','Can the learner apply the skill in a new situation?'],['ME','Which habits will help maintain this understanding?'],['AE','Which specific step still needs support?'],['BE','What is the smallest foundation to rebuild first?']]}}),
 section('Start a report-card conversation without comparison',[
 'Choose a quiet moment when your child is rested, then ask them to show one piece of work they understand and one they found difficult. Beginning with evidence is more useful than comparing a sibling’s results or demanding an explanation for every lower descriptor at once.',
 'Ask the teacher for an example of the expected response and the first point where the learner’s work differs. A clear request such as “Does she misunderstand the fraction, the instruction or the written explanation?” gives you a practical next step rather than a vague instruction to work harder.',
 ]),
 section('Use a small practice-and-review cycle',[
 'Select one skill for the next week and ask your child to attempt a short question without notes. Check the explanation together, write one correction in the learner’s own words and revisit a similar question after a gap; the aim is to see whether the correction can be used independently.',
 'For fractions, ask the learner to draw the same whole before comparing two values, then move to symbols only when the drawing makes sense. Our [[Grade 7 fractions guide|/blog/grade-7-mathematics-revision-help/]] shows how to identify a missing step instead of repeating a rule that has not been understood.',
 ]),
 section('Watch patterns, not one disappointing afternoon',[
 'Keep a simple record with the date, skill practised, kind of error and what changed on the next attempt. A mark that rises only when a parent gives hints tells a different story from a learner who can explain and apply the method a week later.',
 'If difficulties appear suddenly across several subjects, discuss attendance, workload, language demands and wellbeing with the school. Persistent problems deserve a teacher conversation; adding more worksheets without understanding the pattern can use family time and money without addressing the cause.',
 ],{bullets:['Notice repeated misconceptions rather than isolated slips.','Share two examples of work when asking for school support.','Agree when the teacher and family will review the plan.']}),
 section('Make support fit your household',[
 'A useful learning routine does not require a private study room, a new device or paid tuition. A borrowed book, a short quiet interval and a parent asking the learner to explain one step can create a repeatable routine; choose arrangements your household can sustain.',
 'Explain any limits honestly to the teacher, including shared devices, data costs or a parent’s work schedule. Ask which practice can be done on paper and which feedback matters most, so limited resources are directed at a specific need rather than a long list of activities.',
 ]),
 section('Use digital feedback as evidence for the next lesson',[
 'When using Assignment Hub, start with published work appropriate to the learner’s grade and subjects, then read the feedback after an independent attempt. Treat instant marking as information for the next practice session, not a verdict on intelligence or a replacement for the teacher’s formal assessment.',
 'A report can help identify a revision priority, but it does not automatically establish KCBE eligibility or university admission. For older learners, connect the pattern with the [[Career Compass conversation|/blog/career-compass-kenyan-students/]] and check the school’s current subject and assessment guidance before making pathway decisions.',
 ]),
 ],
 faqs:[
 {question:'Does AE mean my child has failed?',answer:'AE describes performance approaching the expectation on the assessed skill. Ask which step needs support and agree on a small practice plan rather than treating the descriptor as a permanent label.'},
 {question:'Can I convert EE or ME directly into a KCBE grade?',answer:'Do not assume a direct conversion. Formal assessment rules, weighting and reporting must be confirmed with the school and current official guidance.'},
 {question:'How often should we review progress?',answer:'Use a manageable weekly check on the chosen skill, then agree a broader review with the teacher. Look for independent understanding and repeated patterns, not daily pressure to produce a higher score.'},
 ],
 related:['grade-7-mathematics-revision-help','kjsea-past-papers-and-mocks','core-vs-essential-mathematics','career-compass-kenyan-students'],
},
'senior-school-pathways-cbc':{
 takeaways:['Separate a broad pathway label from the actual subjects a school offers.','Use current MoE combinations and institutional requirements when comparing routes.','Test interests through work and feedback, not birth-order stereotypes.'],
 sections:[
 section('Start with the framework, then check current choices',[
 'Kenya’s senior-school discussion includes STEM, Social Sciences, and Arts and Sports Science, but those broad names are only a starting point. The decision a family actually makes concerns a school, an available combination of subjects and the preparation needed to study those subjects successfully.',
 'KICD’s 2019 framework describes four STEM areas: Pure Sciences, Applied Sciences, Technical and Engineering, and Career and Technology Studies. Treat that dated framework as an explanation of the ideas, then verify current names, combinations and availability through the MoE portal and the school rather than assuming every school offers all four.',
 ]),
 section('Understand the different STEM emphases',[
 'Pure-science interests may show up in a learner who enjoys investigating explanations, interpreting results and asking why an observation changed. Applied or technical interests may be visible through agriculture, computing, making, measurement or practical design; these are clues to explore, not tests that determine a learner’s future.',
 'Compare actual subject content before deciding that one route is more prestigious or easier than another. A learner who enjoys building something may still need support with reading, mathematics and documentation, while a learner who likes theory benefits from collecting evidence and testing an explanation in practice.',
 ],{table:{caption:'Questions for a STEM conversation',headers:['Interest','Evidence to collect'],rows:[['Scientific explanations','A question, prediction and interpretation of results'],['Applied problems','A practical need and a reasoned solution'],['Technical design','A drawing, measurement, prototype or improvement'],['Career-related practice','A safe task and a reflection on the skills used']]}}),
 section('Read the combination behind the code',[
 'A code is a catalogue identifier, not a guarantee of employment or admission. Our owner-supplied portal catalogue lists ST2056 as Agriculture, Aviation and Computer Studies; confirm that record against the current portal before using it to shortlist a school or make a formal selection.',
 'Ask how the subjects fit the learner’s interests, what foundations need strengthening and whether the school has the required teaching and practical provision. Keep the current combination beside any intended course requirements, because a broad STEM label alone does not establish eligibility for a particular degree.',
 ]),
 section('Discuss Mathematics without turning it into a label',[
 'Families often ask whether a child must already be excellent at every calculation to consider STEM. A better question is which mathematical foundations the proposed subjects require and whether the learner is willing and able to work on those foundations with appropriate support.',
 'Review the school’s current Mathematics route and the requirements of possible later courses instead of relying on a friend’s account of another school. The [[Core versus Essential Mathematics guide|/blog/core-vs-essential-mathematics/]] provides a comparison and examples without promising that either route opens every university option.',
 ]),
 section('Test an interest before committing to a career title',[
 'Choose a small, safe activity that resembles the kind of thinking the learner wants to explore: explain a science observation, sketch a design, analyse a short source or practise a performance. Ask what they enjoyed, what frustrated them and what they chose to improve after feedback.',
 'Assignment Hub’s public lab previews can show families the type of specialist workspace available before signing in. They are not proof of aptitude, and practical access depends on grade, pathway, subjects and published content; combine digital exploration with teacher observations and the learner’s own work.',
 ],{bullets:['Collect two examples of sustained effort across a term.','Ask a teacher which foundations need attention.','Check whether the school actually offers the preferred combination.']}),
 section('Make the final shortlist a family decision',[
 'Compare at least two realistic routes, including costs, travel, materials and the support each would require. Avoid narrowing the conversation solely because a learner is first-born, because a sibling took another route or because one job title sounds more secure than the available evidence suggests.',
 'Use the [[Career Compass guide|/blog/career-compass-kenyan-students/]] to bring the student’s interests, the parent’s hopes and Kenyan opportunities into one discussion. Record the next action and revisit it each term; the purpose is a better-informed choice, not a prediction that one pathway guarantees a particular salary.',
 ]),
 ],
 faqs:[
 {question:'How many STEM tracks are there in Kenya?',answer:'The KICD 2019 framework describes four STEM areas. Check the current MoE catalogue and school offering before treating those framework labels as today’s available selection options.'},
 {question:'Does a STEM combination guarantee a university place?',answer:'No. Admission depends on current institutional subject, grade and selection requirements, which should be checked directly.'},
 {question:'What if my child is interested in both technology and the arts?',answer:'Explore actual combinations and collect evidence from both interests. Ask the school which approved choices preserve suitable options instead of choosing from stereotypes about careers.'},
 ],
 related:['career-compass-kenyan-students','core-vs-essential-mathematics','cbc-grading-levels-explained','csl-ideas-for-students'],
},
'kjsea-past-papers-and-mocks':{
 takeaways:['Use original practice and official assessment resources for different purposes.','Correct the kind of mistake, not just the final answer.','Spread revision across manageable sessions and return to missed skills.'],
 sections:[
 section('Know what you are downloading or practising',[
 'Parents searching for KJSEA past papers can encounter official resources, commercial predictions and original revision questions presented together. Check who produced a resource, which grade and subject it covers, whether worked answers are supplied and whether any claim of official status is supported by the source.',
 'Assignment Hub’s public Grade 9 Mathematics sample contains original supplementary questions with worked answers; it is not an official KNEC paper or a full timed mock. Use the official KNEC website and school guidance for released assessment information, and respect the access and ownership conditions attached to those resources.',
 ]),
 section('Begin with an independent attempt',[
 'Choose one current topic and let the learner attempt a small set without notes or parent hints. The result is useful because it shows what can be retrieved independently, while a completed worksheet copied from an explanation can hide the very gaps the next session needs to address.',
 'After the attempt, ask the learner to identify the first step that changed when they read the worked answer. Writing “I forgot to use a common denominator” creates a better practice target than copying the correct number or describing the whole subject as difficult.',
 ]),
 section('Sort mistakes before choosing more practice',[
 'Different errors need different responses: a missing concept may need a worked example, a misunderstood command word may need careful reading, and a time problem may need pacing practice. Giving the same additional paper for every error can create more work without correcting the cause.',
 'Keep a short correction record using one example from each repeated error type. If the same difficulty continues, take those examples to the teacher so school and home support address a shared priority rather than several unrelated revision plans.',
 ],{table:{caption:'Match the next action to the error',headers:['Pattern','Useful next action'],rows:[['Idea not understood','Rebuild the concept with a worked example'],['Instruction misread','Underline and explain the command word'],['Method slip','Identify and repeat the first incorrect step'],['Time ran out','Practise pacing on an appropriate short set']]}}),
 section('Use a repeatable weekly rhythm',[
 'An example routine is to study a small concept on day one, retrieve it on day two, mix it with another topic on day four and revisit errors on day seven. Those intervals are an illustration of spacing, not a compulsory formula; adjust the routine to schoolwork, rest and what the learner can manage.',
 'At each return, ask for an answer or explanation before reopening the notes. The [[fractions revision guide|/blog/grade-7-mathematics-revision-help/]] demonstrates this process with a concrete skill, while a teacher can help choose equivalent grade-appropriate examples in other subjects.',
 ]),
 section('Make timed mocks a learning tool',[
 'Use timed practice only when the learner understands the task and can review it afterwards. A timer can reveal pacing difficulties, but repeatedly timing work without discussing the errors may add pressure without strengthening the knowledge needed for the next attempt.',
 'After a mock, agree on one priority and a later check rather than trying to reteach every missed topic that evening. Ask whether the learner can now explain the correction, complete a similar question and recognise when the same method is needed in a differently worded problem.',
 ],{bullets:['Protect sleep and keep revision sessions realistic.','Separate a practice score from the learner’s value or future.','Ask for help when a difficulty remains unclear after correction.']}),
 section('Give parents and digital tools a clear role',[
 'A parent can organise a quiet start, ask the learner to explain a goal and encourage an honest review without supplying every answer. Use a phone-free interval if notifications interrupt concentration, but do not infer a child’s career suitability from social-media habits or one evening’s practice.',
 'Published Assignment Hub activities can support practice and feedback where available, while teachers remain responsible for formal assessment guidance. Use the [[CBC grading guide|/blog/cbc-grading-levels-explained/]] to interpret feedback calmly and the [[Career Compass guide|/blog/career-compass-kenyan-students/]] when discussing longer-term choices.',
 ]),
 ],
 faqs:[
 {question:'Are the free Grade 9 questions official KJSEA past papers?',answer:'No. They are clearly labelled original supplementary practice with worked answers; official assessment resources should be checked through KNEC and the school.'},
 {question:'How many hours should my child revise each day?',answer:'There is no single timetable that suits every learner. Start with a manageable session, protect rest and adjust using school workload and evidence of understanding.'},
 {question:'Should we repeat a whole mock after a low score?',answer:'First identify repeated errors and practise the missing skills. A later mock is more useful when the learner has had an opportunity to understand and apply the corrections.'},
 ],
 related:['grade-7-mathematics-revision-help','cbc-grading-levels-explained','core-vs-essential-mathematics','career-compass-kenyan-students'],
},
'csl-ideas-for-students':{
 takeaways:['Choose a genuine community need and obtain school approval before acting.','Keep consent, supervision, honest evidence and reflection in the plan.','Use the ten ideas as starting points, not as a reason to invent hours.'],
 sections:[
 section('What is CSL? Community Service Learning explained',[
 'Community Service Learning connects classroom learning with a project that addresses a community need and includes reflection on the experience. A strong project allows the learner to explain the need, their contribution, what changed and what they would improve, rather than simply presenting a photograph of an activity.',
 'Its importance lies in both the benefit to the community and the learning involved in planning, listening, cooperation and responsibility. An attractive poster or a large number of claimed hours is weak evidence if the learner cannot describe who needed the activity and how their own work helped.',
 ]),
 section('Follow five practical CSL steps',[
 'Begin by identifying a small need with the intended beneficiaries, then discuss a safe response with the school or responsible adult. Obtain approval before arranging visits, collecting information or buying materials, so the activity fits the school’s guidance and the people it is meant to support.',
 'Carry out the approved work with supervision, record truthful evidence and hours, and write a reflection while the details are still fresh. Confirm current requirements with the school: Assignment Hub’s recording tools support the process but do not establish a national hours rule or replace a teacher’s approval.',
 ],{steps:['Identify a need and listen to the people affected.','Get school approval and agree on supervision.','Carry out the safe, planned activity.','Record evidence and submit hours honestly.','Reflect on the result and the next improvement.']}),
 section('Ten CSL project ideas for Kenyan students',[
 'Start small enough to complete and review: a carefully maintained tree or a repeatable reading session can create better evidence of learning than a large one-day campaign. Choose an activity for which the learner can obtain permission, contribute directly and observe a useful outcome without taking unnecessary risks.',
 'The following ideas are prompts for discussion, not automatic school approval. The [[ten-project CSL planner|/guides/csl-project-planner/]] adds materials, indicative budgets, supervision, evidence and fictional worked reflections that learners should adapt only to work they genuinely completed.',
 ],{examples:['Water-saving audit','Tree care','Peer reading','Supervised clean-up','Container gardening','Local-history interview','Road-safety posters','Book sharing','Digital-skills coaching','Energy-saving campaign']}),
 section('Budget for materials, time and safe supervision',[
 'List what can be borrowed or reused before asking a family to spend money, then confirm any transport, supplies or data costs locally. The planner’s example budgets are planning estimates, not price quotations; an activity does not become stronger learning simply because it is more expensive.',
 'Set clear safety boundaries with the supervisor: no hazardous waste, electrical work, unsupervised home visits or collection of private passwords and documents. Obtain consent for photographs and interviews, and use sketches, anonymous counts or supervisor notes when identifying a person would be unnecessary.',
 ]),
 section('Collect evidence that explains the learning',[
 'A short log can record the date, task, contribution, hours submitted, feedback and a description of the evidence collected. Separate a group’s overall achievement from the learner’s own role, so the record does not imply that every participant completed every part of the work.',
 'A useful reflection might explain why a book-sharing process was confusing and how a clearer borrowing sheet improved it. Use the structure “what happened, what I contributed, what I learned, what I would change,” rather than copying a model paragraph as if it described an experience that never occurred.',
 ],{table:{caption:'Match evidence to the activity',headers:['Project','Possible evidence'],rows:[['Peer reading','A schedule and anonymous session notes'],['Tree care','A watering plan and dated growth observations'],['Waste audit','Safe-category counts and an approved site sketch']]}}),
 section('Connect service with skills and future choices',[
 'Planning a small budget, explaining an idea and responding to feedback are useful in further study, formal employment and informal enterprise. Service can provide examples of those skills, but it should not be presented as a guarantee of a job, an official certificate or university admission.',
 'Use the [[Career Compass guide|/blog/career-compass-kenyan-students/]] to discuss which aspects of the work the learner enjoyed and chose to improve. If the project raises an interest in science or technology, the [[senior-school pathways guide|/blog/senior-school-pathways-cbc/]] can help the family frame a conversation with the school.',
 ]),
 ],
 faqs:[
 {question:'What is the importance of CSL in the community?',answer:'A well-planned project responds to a genuine need while developing responsibility, teamwork and reflection. Ask the intended beneficiaries what would be useful rather than assuming that any activity will help.'},
 {question:'What are the steps in Community Service Learning?',answer:'Identify a need, obtain approval, carry out the activity safely, record evidence and hours, and reflect on the experience. Follow the school’s supervision and assessment guidance.'},
 {question:'Does every learner have to complete 135 hours?',answer:'Confirm the applicable requirement with the school. Assignment Hub uses a 135-hour platform goal, which is not itself evidence of a universal national rule.'},
 ],
 related:['career-compass-kenyan-students','senior-school-pathways-cbc','cbc-grading-levels-explained','kjsea-past-papers-and-mocks'],
},
'core-vs-essential-mathematics':{
 resources:[{text:'KICD curriculum information',href:'https://kicd.ac.ke/'},{text:'Current MoE pathway combinations',href:'https://selection-placement.kemis.go.ke/pathways'}],
 takeaways:['Compare actual curriculum depth, subject combinations and intended course requirements.','Difficulty is a reason to investigate foundations, not a label for a learner.','Try worked examples and confirm institutional requirements before narrowing options.'],
 sections:[
 section('Core vs Essential Mathematics: the difference',[
 'Core Mathematics supports mathematical depth for STEM study, while Essential Mathematics emphasises applied quantitative skills for other pathway needs. Use those descriptions as an orientation, then consult the current curriculum design and the school’s approved combination rather than assuming that the names define every topic or future option.',
 'Neither route alone establishes university eligibility, and neither should be used as a judgement of a learner’s worth. A family needs to compare the proposed subjects, the learner’s current foundations and the published requirements of possible later courses before making a choice.',
 ],{table:{caption:'Compare the questions that matter',headers:['Feature','Core Mathematics','Essential Mathematics'],rows:[['Pathway context','Commonly linked to STEM study','Linked to other pathway needs'],['What to check','Required mathematical depth and applications','Required quantitative skills and applications'],['Future course','Check institutional subject and grade rules','Check the same published admission rules']]}}),
 section('Is Core Maths hard?',[
 'Core Mathematics can be demanding, particularly when a learner is missing earlier number or algebra foundations, but difficulty does not demonstrate a fixed lack of aptitude. Ask where the learner first becomes uncertain: understanding the idea, choosing a method, interpreting a question or carrying out a calculation.',
 'A worked example followed by an independent attempt can reveal whether a small missing step is responsible for a much larger-looking problem. The [[fractions guide|/blog/grade-7-mathematics-revision-help/]] shows how to rebuild an early concept without treating more practice as a punishment or assuming that a lower score predicts a career.',
 ]),
 section('Try an algebraic worked example',[
 'To simplify √50 + √8, first identify square factors: √50 = √(25 × 2) = 5√2 and √8 = √(4 × 2) = 2√2. Both terms now contain the same surd, so adding their coefficients gives 7√2; combining the original expression as √58 would change its meaning.',
 'Ask the learner to explain why the factor of five leaves the square root, then attempt √18 + √8 without looking at the example. The answer is 5√2 because √18 = 3√2; use the explanation, not just the final symbol, as evidence that the method has been understood.',
 ]),
 section('Try an applied worked example',[
 'For simple interest on KES 5,000 at 8% per year over two years, use I = P × r × t with the rate written as 0.08. The interest is 5,000 × 0.08 × 2 = KES 800, giving a total of KES 5,800 under the stated assumptions.',
 'Discuss what the calculation assumes: a fixed annual rate, simple rather than compound interest and no additional fees. These examples illustrate different mathematical tasks, not a complete syllabus boundary; both routes require careful reading, reasoning and an explanation of what the numbers represent.',
 ]),
 section('Check course requirements before closing a door',[
 'Write down two possible training or study routes, then check the institution’s current subject, grade and selection requirements for each. Avoid relying on statements such as “this route always leads to Medicine” or “that route automatically allows Business,” because requirements belong to particular courses and institutions.',
 'Discuss the findings with the school while comparing the actual available subject combinations. The [[STEM pathways guide|/blog/senior-school-pathways-cbc/]] explains why a broad label is not enough, and the [[Career Compass guide|/blog/career-compass-kenyan-students/]] helps keep interests, family resources and realistic options in the same conversation.',
 ]),
 section('Build a practice plan from the first missing step',[
 'Choose one small skill, let the learner attempt it without notes and use the feedback to locate the first incorrect step. Follow the correction with a similar question and return to the skill after a gap, instead of judging understanding only while the worked example is still visible.',
 'Record one sentence about the correction and share repeated difficulties with the teacher. A report-card descriptor or a single mock score is useful evidence for support, but it should not replace a conversation about progress, subject demands and the learner’s willingness to keep working on a foundation.',
 ],{bullets:['Ask the learner to explain the unit, method or assumption.','Use an independent retry to check the correction.','Review the pattern with the teacher if it persists.']}),
 ],
 faqs:[
 {question:'What does Core Mathematics mean?',answer:'It is the senior-school mathematics route intended to support mathematical depth for STEM study. Check its current design and the school’s approved combination for the actual topics and requirements.'},
 {question:'Is Core Maths hard?',answer:'It can be demanding when earlier foundations are insecure. Targeted examples, independent practice and teacher feedback can help identify and address a specific difficulty.'},
 {question:'Does Essential Mathematics automatically qualify a learner for a Business degree?',answer:'No route automatically establishes eligibility. Check the intended institution’s current subject, grade and admission requirements rather than inferring them from a pathway label.'},
 ],
 related:['grade-7-mathematics-revision-help','senior-school-pathways-cbc','career-compass-kenyan-students','kjsea-past-papers-and-mocks'],
},
'grade-7-mathematics-revision-help':{
 takeaways:['Keep the whole and the size of each part clear before applying a rule.','Use one worked example, then an independent attempt and a later retry.','Ask the learner to explain the correction, not just copy an answer.'],
 sections:[
 section('Find the fraction skill that is actually missing',[
 '“Fractions are difficult” can describe several different problems: understanding equal parts, recognising equivalent values, comparing fractions or carrying out an operation. Begin with one example of the learner’s work and ask them to explain what the numerator, denominator and whole represent before selecting more questions.',
 'If a learner shades half of a small rectangle and a quarter of a much larger rectangle, a visual comparison can be misleading unless the whole is kept consistent. Draw equal-sized wholes and equal parts first, then use the diagram to connect the language of the fraction with its written symbols.',
 ]),
 section('Show equivalent fractions before asking for a rule',[
 'A half, two quarters and four eighths can represent the same amount when they refer to the same whole. Divide an equal-length bar into two, four and eight equal parts, shade the matching lengths and ask the learner why the written fractions differ even though the shaded amount is unchanged.',
 'This makes multiplying the numerator and denominator by the same non-zero number a meaningful relationship rather than an instruction to memorise. Ask for another equivalent fraction and an explanation, then change the representation so the learner is not relying only on the appearance of a familiar diagram.',
 ]),
 section('Work through addition with a common denominator',[
 'To add 1/2 and 1/4, describe the parts using the same unit: one half equals two quarters, so two quarters plus one quarter equals three quarters. The denominator remains four because the size of each part has not changed; only the number of those parts has increased.',
 'Ask why 1/2 + 1/4 is not 2/6, using the equal-whole diagram rather than simply crossing out the result. Then invite an independent example, such as 1/3 + 1/6 = 1/2, and check whether the learner can explain the change to sixths before simplifying the final fraction.',
 ],{table:{caption:'Keep the units consistent',headers:['Expression','Common unit','Result'],rows:[['1/2 + 1/4','2 quarters + 1 quarter','3/4'],['1/3 + 1/6','2 sixths + 1 sixth','3/6 = 1/2']]}}),
 section('Separate a concept error from a calculation slip',[
 'A learner who chooses a common denominator but makes one multiplication error needs different support from a learner who adds denominators without understanding the unit. Ask for the first step they can explain confidently and compare it with the worked example before deciding where to restart.',
 'Keep a short correction note in the learner’s own words, such as “I changed both fractions into sixths before adding.” If reading the question is the obstacle, ask the learner to say what is known and what must be found; a method rule alone will not resolve a misunderstood instruction.',
 ]),
 section('Use short retrieval sessions instead of copying pages',[
 'After discussing an example, close the notes and ask the learner to solve a similar question, draw a fraction bar or explain the rule aloud. Check the response, correct the first missing step and revisit the idea later so that familiarity with a page is not mistaken for independent understanding.',
 'Keep the routine realistic for your household, using paper or a shared device rather than assuming extra equipment is necessary. The [[KJSEA revision guide|/blog/kjsea-past-papers-and-mocks/]] explains how the same attempt, correction and later retry can support preparation as learners move into more demanding work.',
 ]),
 section('Use feedback to decide the next step',[
 'Try the matching free fraction sample, read its worked answers and ask the learner to explain one correction before repeating the activity. A higher score immediately after seeing an answer is encouraging, but a later independent attempt provides stronger evidence that the method can be used again.',
 'If the same difficulty persists, show the teacher two examples and ask which foundation to practise next. Use the [[CBC grading guide|/blog/cbc-grading-levels-explained/]] to discuss performance descriptions calmly and the [[Core versus Essential Mathematics guide|/blog/core-vs-essential-mathematics/]] to understand why foundations matter for later choices without predicting a career from Grade 7 work.',
 ],{bullets:['Start with one clear goal and finish with one explained correction.','Praise persistence and useful questions rather than speed alone.','Choose the next activity from the learner’s evidence.']}),
 ],
 faqs:[
 {question:'Why can’t I add the denominators?',answer:'A denominator identifies the size of the parts. To add fractions, express them using a common unit, then add the number of those parts without changing that unit.'},
 {question:'How much fraction practice should we do?',answer:'Start with a small set that can be attempted, explained and reviewed. The purpose is a repeatable routine with understanding, not a large volume of copying.'},
 {question:'What if my child improves only when I give hints?',answer:'Use hints while teaching, then remove them for a similar independent question. A later retry helps you see which part of the method the learner can retrieve without support.'},
 ],
 related:['cbc-grading-levels-explained','kjsea-past-papers-and-mocks','core-vs-essential-mathematics','career-compass-kenyan-students'],
},
'career-compass-kenyan-students':{
 resources:[{text:'Current MoE pathway combinations',href:'https://selection-placement.kemis.go.ke/pathways'},{text:'KNBS employment statistics',href:'https://www.knbs.or.ke/'}],
 takeaways:['Align the Student’s Dream, the Parent’s Hope and Kenyan Reality.','Use family circumstances as planning information, not as a verdict on ability.','Compare actual subjects, total costs and a practical hybrid route, then revisit the plan.'],
 sections:[
 section('The three layers of Career Compass',[],{layers:career.layers}),
 section('Choose subjects before choosing a job title',career.combinations.paragraphs),
 section('Use research to question a stereotype',[
 'Birth order can become a convenient explanation for why one child should lead, earn quickly or follow a sibling’s profession. Ask what evidence you have from the individual learner’s work and interests before turning a family role into a pathway decision; personality findings are not a career-selection test.',
 'Likewise, a financial constraint should prompt a search for realistic support and routes rather than an assumption about ambition. The [[CBC grading guide|/blog/cbc-grading-levels-explained/]] helps separate performance evidence from labels, while the [[pathways guide|/blog/senior-school-pathways-cbc/]] explains why the actual subject combination matters.',
 ]),
 section('Build a hybrid route with evidence',[
 'A hybrid plan combines a qualification with a demonstrable skill, such as IT study and a small portfolio, or agricultural training and supervised experience in a local enterprise. It is a planning option, not a guarantee that freelance work or a business will immediately produce a reliable income.',
 'Choose one safe experiment that can be completed and reviewed before spending heavily: a simple project, a practical investigation or a conversation with a training provider. The [[CSL guide|/blog/csl-ideas-for-students/]] offers community projects that can reveal interests in planning, communication or practical work without inventing achievements.',
 ]),
 section('Compare total costs and keep a second route',[
 'Ask providers about the full cost of study, including accommodation, transport, equipment, materials and any additional charges, rather than comparing tuition alone. Investigate current funding and eligibility conditions directly, and keep records of which information is confirmed and which is still an estimate.',
 'Write down a preferred route and a realistic alternative, with the next requirement to check for each. The [[Mathematics comparison guide|/blog/core-vs-essential-mathematics/]] can support a subject discussion, but the school and institution must confirm current combinations, grades and admission requirements before a family commits.',
 ]),
 section('How to choose without guessing',['Use these five steps as a family checklist, not as a test of whether a child has already settled on a lifelong profession. A useful conversation ends with one practical next action and a date to review what has been learned.'],{checklist:career.checklist}),
 ],
 faqs:[
 {question:'Does being first-born mean a child should choose management?',answer:'No. Birth order is not a validated career-selection tool; use the learner’s interests, work and feedback rather than assigning a profession from sibling position.'},
 {question:'Can Career Compass guarantee a school place or university admission?',answer:'No. It supports planning using available grades, interests and catalogue information; schools, institutions and official selection processes determine eligibility and placement.'},
 {question:'What if university is not currently affordable?',answer:'Compare total costs, current funding conditions and accredited TVET or other suitable routes. Keep an alternative plan while checking what support is actually available.'},
 ],
 related:['senior-school-pathways-cbc','core-vs-essential-mathematics','csl-ideas-for-students','cbc-grading-levels-explained'],
},
};
