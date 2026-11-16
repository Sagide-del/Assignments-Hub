// Original, hand-authored explanatory diagrams. Source: generate-blog-diagrams.mjs.
const diagram=(name,alt)=>({src:`/blog/diagrams/${name}.svg`,share:`/blog/diagrams/${name}-share.jpg`,alt,width:1536,height:1024,type:'diagram'});
export const blogArtwork={
 'cbc-grading-levels-explained':diagram('cbc-grading','Four CBC performance descriptions connected to reading evidence, locating a gap, practice and review.'),
 'senior-school-pathways-cbc':diagram('stem-pathways','Four STEM areas identified as the KICD 2019 framework, with a reminder to check current MoE school combinations.'),
 'kjsea-past-papers-and-mocks':diagram('revision-cycle','An illustrative study cycle: learn on day one, recall on day two, mix practice on day four and retry on day seven.'),
 'csl-ideas-for-students':diagram('csl-cycle','Five CSL steps: identify a need, obtain approval, act safely, collect evidence and reflect honestly.'),
 'core-vs-essential-mathematics':diagram('math-comparison','Core and Essential Mathematics reasoning examples: simplifying surds and calculating simple interest.'),
 'grade-7-mathematics-revision-help':diagram('fraction-bars','Accurately proportioned bars showing one half equals two quarters equals four eighths, and a common-denominator sum.'),
 'career-compass-kenyan-students':diagram('career-alignment','Three career-planning perspectives: student interests, parent hopes and budget, and Kenyan education and work opportunities.'),
};
