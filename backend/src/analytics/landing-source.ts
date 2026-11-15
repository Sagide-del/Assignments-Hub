// Attribution is a bounded editorial identifier, never a URL, query string or identity.
export const BLOG_LANDING_SOURCES = [
 'blog/cbc-grading-levels-explained',
 'blog/csl-ideas-for-students',
 'blog/core-vs-essential-mathematics',
 'blog/kjsea-past-papers-and-mocks',
 'blog/senior-school-pathways-cbc',
 'blog/grade-7-mathematics-revision-help',
 'blog/career-compass-kenyan-students',
] as const;
export function validLandingSource(value: unknown): string | null {
 return typeof value === 'string' && (BLOG_LANDING_SOURCES as readonly string[]).includes(value) ? value : null;
}
export function blogPaymentReport(registrations: {landing_source:string|null;_count:{_all:number}}[], payments: {studentId:number;landing_source:string|null;amountKES:number}[]) {
 const rows = new Map<string,{landing_source:string|null;registrations:number;payingLearners:number;confirmedKES:number;ids:Set<number>}>();
 for(const source of [...BLOG_LANDING_SOURCES,null])rows.set(source??'unattributed',{landing_source:source,registrations:0,payingLearners:0,confirmedKES:0,ids:new Set()});
 for(const r of registrations){const key=validLandingSource(r.landing_source)??'unattributed';rows.get(key)!.registrations+=r._count._all;}
 for(const p of payments){const row=rows.get(validLandingSource(p.landing_source)??'unattributed')!;row.ids.add(p.studentId);row.confirmedKES+=p.amountKES;}
 return [...rows.values()].map(({ids,...row})=>({...row,payingLearners:ids.size})).sort((a,b)=>b.payingLearners-a.payingLearners||b.confirmedKES-a.confirmedKES);
}
