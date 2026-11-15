// Original editorial practice. Not presented as a KNEC paper or a MasterModule export.
export const grade9Math = {
 grade:9,subject:'Mathematics',topic:'Mixed KJSEA-style practice',
 introduction:'These five original supplementary questions practise proportional reasoning, equations, geometry, measurement and probability. They are a short untimed sample, not an official KNEC paper or a full KJSEA mock. Attempt each question before opening its worked answer.',
 tips:['Write the relationship or formula before substituting the numbers.','Keep units throughout your working and check whether the answer is reasonable.'],
 questions:[
 {prompt:'A school kitchen pays KES 540 for 3 kg of rice. At the same price per kilogram, what will 5 kg cost?',options:['KES 324','KES 810','KES 900','KES 1,080'],answer:2,explanation:'One kilogram costs 540 ÷ 3 = KES 180. Therefore 5 kg costs 5 × 180 = KES 900. The same unit price must be used for both quantities.'},
 {prompt:'Solve the equation 3(2x − 1) = 21.',options:['x = 3','x = 4','x = 7','x = 12'],answer:1,explanation:'Expand the bracket: 6x − 3 = 21. Add 3 to both sides to get 6x = 24. Divide by 6, so x = 4. Check: 3(8 − 1) = 21.'},
 {prompt:'A rectangular garden is 6 m wide and 8 m long. What is the straight-line distance between opposite corners?',options:['7 m','10 m','14 m','48 m'],answer:1,explanation:'The diagonal is the hypotenuse of a right-angled triangle. Its square is 6² + 8² = 36 + 64 = 100, so the diagonal is √100 = 10 m.'},
 {prompt:'A closed cylindrical container has radius 7 cm and height 10 cm. Using π = 22/7, what is its volume?',options:['440 cm³','770 cm³','1,540 cm³','3,080 cm³'],answer:2,explanation:'Volume = πr²h = (22/7) × 7 × 7 × 10 = 1,540 cm³. Radius is squared; the volume is measured in cubic centimetres, not square centimetres.'},
 {prompt:'A bag contains 3 red, 2 blue and 5 green counters. One counter is picked at random. What is the probability that it is blue?',options:['1/5','1/3','2/5','1/2'],answer:0,explanation:'There are 3 + 2 + 5 = 10 counters altogether, and 2 are blue. The probability is favourable outcomes ÷ total outcomes = 2/10 = 1/5.'}
 ]
};
export const grade7English = {
 grade:7,subject:'English',topic:'Reading and language in context',
 introduction:'Read this original passage before answering. Amina and Brian noticed that their school garden was dry. “Let us ask our teacher before changing the watering plan,” Amina said. Their teacher suggested collecting runoff in a covered container. Brian recorded how much water they collected, while Amina checked the seedlings each morning. After a week, the pair presented their observations to the class. They explained what worked and what they would change next time.',
 tips:['Support comprehension answers with evidence from the passage.','Read each sentence in context before choosing a word or punctuation mark.'],
 questions:[
 {prompt:'Why did Amina suggest asking their teacher first?',options:['To avoid recording observations','To seek guidance before changing the plan','To leave the garden unattended','To ask for examination marks'],answer:1,explanation:'Amina says they should ask the teacher before changing the watering plan. This shows that she wants guidance before taking action, not that she wants to avoid the task.'},
 {prompt:'Which word best describes how Amina and Brian worked?',options:['Carelessly','Secretly','Cooperatively','Independently of each other'],answer:2,explanation:'They shared responsibilities: Brian recorded the water and Amina checked the seedlings. These complementary tasks show cooperation towards a shared purpose.'},
 {prompt:'In the passage, the word “observations” most nearly means:',options:['Things they noticed and recorded','Rules they refused to follow','Tools they bought','Questions they copied'],answer:0,explanation:'Their observations are what they noticed and recorded while checking water and seedlings. The meaning follows from their investigation and presentation to the class.'},
 {prompt:'Choose the sentence with the correct verb form.',options:['The seedlings grows every morning.','The seedlings is growing every morning.','The seedlings grow every morning.','The seedlings has grown every morning.'],answer:2,explanation:'The plural subject “seedlings” takes the verb “grow” in the simple present. “Grows”, “is” and “has” do not agree with this plural subject in these sentences.'},
 {prompt:'Which sentence correctly punctuates direct speech?',options:['Amina said “Let us ask our teacher”.','Amina said, “Let us ask our teacher.”','Amina, said Let us ask our teacher.','“Amina said, Let us ask our teacher.”'],answer:1,explanation:'A reporting clause can be followed by a comma before the quotation. The spoken words are enclosed in quotation marks, with the full stop inside the closing quotation mark here.'}
 ]
};
export const editorialPractice=[grade9Math,grade7English];
