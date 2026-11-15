// Original generated editorial artwork: illustrative scenes, not documented pupils or events.
const artwork = (name, alt) => ({
 src:`/blog/artwork/${name}-960.webp`,
 srcset:[480,960,1440].map(width=>`/blog/artwork/${name}-${width}.webp ${width}w`).join(', '),
 share:`/blog/artwork/${name}-share.jpg`,
 alt, width:1536, height:1024,
});
export const blogArtwork = {
 'cbc-grading-levels-explained':artwork('grading-feedback','Editorial illustration of a parent and learner reviewing progress together.'),
 'senior-school-pathways-cbc':artwork('career-pathways','Illustrated Kenyan learners exploring branching science, creative and technical pathways.'),
 'kjsea-past-papers-and-mocks':artwork('exam-revision','Illustrative study scene of a Kenyan learner practising with a notebook and study timer.'),
 'csl-ideas-for-students':artwork('community-service','Illustrative community-service scene of Kenyan learners planting a tree with adult supervision.'),
 'core-vs-essential-mathematics':artwork('mathematics','Hand-drawn maths collage with fractions, geometry tools, algebra and an illustrated notebook.'),
 'grade-7-mathematics-revision-help':artwork('mathematics','Maths doodles showing fraction circles, a compass, protractor and worked mathematical symbols.'),
 'career-compass-kenyan-students':artwork('career-pathways','Illustrated young people exploring several possible education and career paths.'),
};
