// Additive editorial upgrades shared by the static publisher and its tests.
export function enhanceGuides(base,deep){
 const cbc=deep['cbc-grading-levels-explained'];
 cbc.sections[0].table={caption:'Assignment Hub mock-practice rubric — not a universal official report-card conversion',headers:['Band','Practice percentage','Descriptor','Points'],rows:[['EE1','90–100%','Exceeding expectations','8'],['EE2','75–<90%','Exceeding expectations','7'],['ME1','58–<75%','Meeting expectations','6'],['ME2','41–<58%','Meeting expectations','5'],['AE1','31–<41%','Approaching expectations','4'],['AE2','21–<31%','Approaching expectations','3'],['BE1','11–<21%','Below expectations','2'],['BE2','0–<11%','Below expectations','1']]};
 cbc.sections[1]={heading:'An illustrative report-card conversation',paragraphs:['This fictional example uses the platform’s practice rubric, not a real pupil’s record or an official national report. Ask for the assessed skill and teacher’s comment before comparing a school report with these percentage bands.'],table:{caption:'Illustrative practice report: choose a specific next step',headers:['Subject','Practice result','Next step'],rows:[['Mathematics','36% · AE1','Review equivalent fractions'],['English','63% · ME1','Explain an inference using evidence'],['Science','82% · EE2','Apply an idea to a new investigation']]}};
 cbc.sections[5].screenshot={src:'/blog/product/sba-dashboard-demo.webp',alt:'Assignment Hub school assessment dashboard with demonstration SBA and mock projections, not official KCBE results.',width:1440,height:1000,caption:'Demo Academy test data — an internal planning dashboard, not a national report card.'};
 cbc.sections[2].steps=['Choose one missing skill with the teacher.','Attempt a related question independently.','Explain the first correction.','Retry after a gap without hints.','Review the evidence together next week.'];
 cbc.faqs=[{question:'What does EE mean?',answer:'EE means Exceeding Expectation. Ask what evidence shows the learner applying the skill beyond the expected level; it is not a claim that every part of the subject is mastered.'},{question:'Is BE a failing grade?',answer:'BE means Below Expectation for the assessed work. It identifies a need for support, not a permanent label or a complete decision about promotion or a career.'},{question:'How can I help my child improve?',answer:'Ask for one specific missing skill, practise a small example, discuss the correction and retry later. Share repeated difficulties with the teacher.'}];
 const csl=deep['csl-ideas-for-students'];
 const compact=[
 ['Water-saving audit','Paper; borrowed jug','0','Parent; no pipe access','Tap tally','I counted before suggesting a reminder.'],
 ['Tree care','Donated seedling; watering can','0–500','Teacher; approved site','Care schedule','I learned that follow-up matters after planting.'],
 ['Peer reading','Borrowed books','0','Teacher; safeguarding rules','Anonymous session notes','I used patient questions instead of supplying answers.'],
 ['Safe clean-up','Borrowed gloves; bags','0–300','Adult; no hazardous waste','Waste counts','I would put bins where litter collects.'],
 ['Container garden','Reused containers; seeds','0–300','Parent; safe plants','Growth record','I compared growth after regular watering.'],
 ['Local-history interview','Notebook','0','Teacher; informed consent','Approved summary','I checked my interpretation with the speaker.'],
 ['Road-safety posters','Paper; markers','0–200','Teacher; no roadside work','Audience feedback','I simplified the message after feedback.'],
 ['Book sharing','Existing books; register','0','Teacher','Anonymous borrowing counts','I grouped books to make borrowing easier.'],
 ['Digital-skills coaching','Shared device','0 plus data','Parent; no passwords','Lesson outline','I let participants practise with fictional examples.'],
 ['Energy-saving awareness','Paper; tally sheet','0–100','Teacher; no electrical work','Approved observations','I learned to separate observation from assumptions.'],
 ];
 csl.sections[2]={heading:'Ten CSL project cards',paragraphs:['Budgets below are indicative KES estimates using borrowed materials, not quotations. Reflections are fictional examples: submit only your own experience and approved hours.'],projects:compact};
 csl.sections[3].paragraphs=csl.sections[3].paragraphs.slice(1);
 csl.sections[4].paragraphs=csl.sections[4].paragraphs.slice(0,1);delete csl.sections[4].table;
 csl.sections[5].paragraphs=csl.sections[5].paragraphs.slice(0,1);
 csl.sections[5].paragraphs.push('If service reveals an interest in science, design or communication, use the [[senior-school pathways guide|/blog/senior-school-pathways-cbc/]] to explore subjects with the school. Keep the learner’s own contribution and feedback at the centre of that conversation.');
 csl.faqs=[
  {question:'What does CSL mean in CBC?',answer:'CSL means Community Service Learning. It joins a supervised community activity with classroom learning and reflection on the learner’s real contribution.'},
  {question:'What is the importance of CSL in the community?',answer:'A well-planned project responds to a genuine need while developing responsibility, teamwork and reflection. Ask the intended beneficiaries what would be useful rather than assuming that any activity will help.'},
  {question:'What are the steps in Community Service Learning?',answer:'Identify a need, obtain approval, carry out the activity safely, record evidence and hours, and reflect on the experience. Follow the school’s supervision and assessment guidance.'},
  {question:'How many CSL hours do I need?',answer:'Confirm the applicable requirement with the school. Assignment Hub uses a 135-hour platform goal, which is not itself evidence of a universal national rule.'},
 ];
 const maths=deep['core-vs-essential-mathematics'];maths.sections[4].steps=['Name two possible courses.','Check current institutional prerequisites.','Compare the school’s actual combinations.','Discuss mathematical foundations with the teacher.','Agree on support and a review date.'];
 maths.faqs=[
  {question:'What is the difference between Core Mathematics and Essential Mathematics?',answer:'Core Mathematics usually provides greater depth for STEM study, while Essential Mathematics focuses on applied quantitative skills for other pathways. Confirm the current curriculum and your school’s approved combination.'},
  {question:'What does Core Mathematics mean?',answer:'It is the senior-school mathematics route intended to support mathematical depth for STEM study. Check its current design and the school’s approved combination for the actual topics and requirements.'},
  {question:'Is Core Maths hard?',answer:'It can be demanding when earlier foundations are insecure. Targeted examples, independent practice and teacher feedback can help identify and address a specific difficulty.'},
  {question:'Which pathway needs which Mathematics route?',answer:'Core Mathematics supports STEM depth, while Essential Mathematics serves other pathway needs. Confirm the current curriculum, school combination and intended course prerequisites; a broad label is not an admission guarantee.'},
 ];
 deep['senior-school-pathways-cbc'].sections[2].steps=['Review recent work and interests.','Compare current MoE subject combinations.','Check school facilities and provision.','Verify intended course prerequisites.','Discuss costs and keep an alternative route.'];
 const kj=deep['kjsea-past-papers-and-mocks'];
 kj.sections[1]={heading:'Five original Grade 9 practice questions',paragraphs:['Try these supplementary Mathematics examples before revealing the answers; they are not an official KNEC paper or a prediction of its structure.'],questions:[
 ['Three kilograms of rice cost KES 540. What do five kilograms cost at the same rate?','KES 900: 540 ÷ 3 = 180 per kilogram, then 180 × 5.'],
 ['Solve 3(2x − 1) = 21.','x = 4: divide by 3, add 1, then divide by 2.'],
 ['A rectangle measures 6 cm by 8 cm. Find its diagonal.','10 cm: the diagonal is √(6² + 8²) = √100.'],
 ['Find the volume of a cylinder with radius 7 cm and height 10 cm. Use π = 22/7.','1,540 cm³: V = πr²h = (22/7) × 49 × 10.'],
 ['A bag has 2 blue counters and 8 red counters. What is the probability of drawing blue?','1/5: there are 10 equally likely counters, so 2/10 simplifies to 1/5.'],
 ]};
 kj.sections[3].steps=['Monday: learn and explain one missing concept.','Tuesday: retrieve it without notes.','Thursday: mix it with another topic.','Saturday: try a short timed section.','Sunday: review errors and plan the next week.'];
 kj.faqs=[{question:'What is KJSEA?',answer:'KJSEA is the Kenya Junior School Education Assessment at the end of Grade 9. Use current KNEC and school guidance for official assessment information.'},{question:'How many questions are in KJSEA?',answer:'There is no single question count covering all papers. Check the current official format for each learning area; these five original examples are not a full paper.'},{question:'How do I prepare for KJSEA?',answer:'Identify weak topics, practise without notes, review explanations and retry later. Add mixed and timed practice while protecting rest and following the school’s guidance.'}];
 for(const p of base){if(p.slug==='senior-school-pathways-cbc')p.cta={title:'Choose subjects with evidence.',description:'Compare interests and options with Career Compass. Sign-in required.',button_text:'Try the Career Compass',button_link:'/student/career'};if(p.slug==='cbc-grading-levels-explained')p.cta.button_text='Try the Learning Coach';if(p.slug==='csl-ideas-for-students')p.cta.button_text='Start CSL Journey';}
}
