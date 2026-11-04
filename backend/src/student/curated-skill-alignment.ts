// Explicit curriculum bindings for the platform-authored foundation courses.
// Unknown third-party course titles are never classified by fuzzy matching.
export function curatedSkillAlignment(
  title: string,
  grade: number,
): any | null {
  if (grade < 7 || grade > 12) return null;
  const junior = grade <= 9;
  const entries: Record<string, any> = {
    "First Aid Foundations": {
      subject: junior ? "Integrated Science" : "Physical Education",
    },
    "Research Skills for Student Projects": junior
      ? { subject: "Integrated Science" }
      : { subject: "Community Service Learning" },
    "Python Programming Foundations": junior
      ? { subject: "Pre-Technical Studies" }
      : {
          subject: "Computer Science",
          pathway: "STEM",
          track: "Applied Sciences",
        },
    "Cyber Safety and Networking": junior
      ? { subject: "Pre-Technical Studies" }
      : {
          subject: "Computer Science",
          pathway: "STEM",
          track: "Applied Sciences",
        },
    "Machine Learning Foundations": junior
      ? { subject: "Pre-Technical Studies" }
      : {
          subject: "Computer Science",
          pathway: "STEM",
          track: "Applied Sciences",
        },
    "Robotics with Sensors and Arduino": junior
      ? { subject: "Pre-Technical Studies" }
      : {
          subject: "Electrical Technology",
          pathway: "STEM",
          track: "Technical and Engineering",
        },
    "CAD and Digital Fabrication": junior
      ? { subject: "Pre-Technical Studies" }
      : {
          subject: "Building Construction",
          pathway: "STEM",
          track: "Technical and Engineering",
        },
    "Video Production and Editing": junior
      ? { subject: "Creative Arts" }
      : {
          subject: "Fine Art",
          pathway: "Arts and Sports Science",
          track: "Visual Arts",
        },
    "Smart Agriculture and Climate Technology": {
      subject: "Agriculture",
      ...(junior ? {} : { pathway: "STEM", track: "Applied Sciences" }),
    },
    "Solar Energy Systems Foundations": junior
      ? { subject: "Pre-Technical Studies" }
      : {
          subject: "Electrical Technology",
          pathway: "STEM",
          track: "Technical and Engineering",
        },
  };
  return entries[title] ? { grade, ...entries[title] } : null;
}
