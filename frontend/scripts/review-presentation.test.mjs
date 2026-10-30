import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTypeScript} from './load-typescript.mjs';
const {expectedAnswer,resultBadge,meaningfulFeedback,explanationParts,explanationParagraphs,optionMatches}=await loadTypeScript(new URL('../src/features/student/review-presentation.ts',import.meta.url));
test('keeps custom feedback and useful scoring guidance while removing exact generic messages',()=>{
 assert.equal(meaningfulFeedback('The answer does not match the expected response.'),null);
 assert.equal(meaningfulFeedback(' Correct! '),null);
 const note='The answer does not match the expected response. Explain which unit you used.';
 assert.equal(meaningfulFeedback(note),note);assert.equal(meaningfulFeedback('The numeric value is correct. Include metres.'),'The numeric value is correct. Include metres.');
});
test('preserves official partial-credit and unscored states',()=>{
 assert.equal(resultBadge({pointsAwarded:0},1).label,'Incorrect');assert.equal(resultBadge({pointsAwarded:1},2).label,'Partial');assert.equal(resultBadge({pointsAwarded:null},2).label,'Awaiting review');assert.equal(resultBadge({pointsAwarded:2},2).label,'Correct');
});
test('extracts stored transfer checks without inventing answers',()=>{
 assert.deepEqual(explanationParts('Multiply by the reciprocal. Transfer check: What is 6 ÷ 1/3?'),{body:'Multiply by the reciprocal.',practice:'What is 6 ÷ 1/3?',answer:''});
 assert.deepEqual(explanationParts('Use the ratio.\nCheck your understanding: Find the value.\nAnswer: 18'),{body:'Use the ratio.',practice:'Find the value.',answer:'18'});
 assert.equal(explanationParts('A transfer check helps learners practise.').body,'A transfer check helps learners practise.');
});
test('option matching prefers literal values and supports released letter keys',()=>{
 assert(!optionMatches('', '', 0, ['', 'Two']));
 const options=['A','Choice two','Choice three'];assert(optionMatches('A',options[0],0,options));assert(!optionMatches('A',options[1],1,options));
 assert(optionMatches('b','Choice two',1,['Choice one','Choice two']));assert(optionMatches('false','False',1,['True','False']));assert(!optionMatches('99','Choice two',1,['Choice one','Choice two']));
});
test('expected answers retain numeric units, matching pairs and ordered steps',()=>{
 assert.equal(expectedAnswer({questionType:'NUMERIC',config:{numeric:{acceptedValue:12,unit:'cm'}}}),'12 cm');
 assert.equal(expectedAnswer({questionType:'ORDERING',correctAnswer:'["Heat","Cool"]'}),'Heat → Cool');
 assert.equal(expectedAnswer({questionType:'MATCHING',correctAnswer:'{"0":"1"}',options:{left:['Leaf'],right:['Support','Photosynthesis']}}),'Leaf → Photosynthesis');
 assert.equal(expectedAnswer(undefined),null);
});
test('long explanations gain paragraph breaks while retaining all sentences',()=>{
 const text=Array.from({length:8},(_,i)=>`Sentence ${i+1} explains the mathematical reasoning in this example.`).join(' ');
 const parts=explanationParagraphs(text);assert(parts.length>1);assert.equal(parts.join(' '),text);
});
