const targets = new Set(['/student/my-pathway','/student/learning-coach','/student/csl','/student/kjsea-mock-test','/student/labs/music','/student/labs/sports/muscle']);
export function productReturnPath(value: unknown, role: string): string | undefined {
 return role === 'STUDENT' && typeof value === 'string' && targets.has(value) ? value : undefined;
}
