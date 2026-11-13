#!/usr/bin/env node
// Deliberately narrow production recovery; no business tables are written.
const {createRequire}=require('node:module');
const {resolve}=require('node:path');
const {existsSync}=require('node:fs');
const {execFileSync}=require('node:child_process');
const MIGRATION='20261113190000_music_studio_projects';
function recoveryPlan(failed, state) {
 if(failed.length===0)return {action:'NONE',message:'No failed migrations remain. Deploy the latest commit in Render.'};
 if(failed.length!==1||failed[0].migration_name!==MIGRATION)throw Error('Another migration is unfinished. Stop; this repair does not apply.');
 if(!/relation\s+"(?:public\.)?User"\s+does not exist/i.test(failed[0].logs||''))throw Error('The recorded failure does not match the corrected users-table reference. Stop for review.');
 if(state.schema_name!=='public'||!state.users_table)throw Error('Unexpected database schema or missing users table. Stop for review.');
 if(state.music_table)throw Error('The Music_Studio_Project table already exists. Stop; do not reset or delete it.');
 return {action:'ROLL_BACK_FAILED_RECORD',migration:MIGRATION,message:'The failed CREATE TABLE left no Music Studio table. Only its failed Prisma migration record may be marked rolled back.'};
}
async function main() {
 if(!existsSync(resolve('prisma/schema.prisma')))throw Error('Run this command from the backend directory in Render Shell.');
 if(!process.env.DATABASE_URL)throw Error('The hosting DATABASE_URL is missing. Do not paste it into chat.');
 const localRequire=createRequire(resolve('package.json'));
 const {PrismaClient}=localRequire('@prisma/client');
 const db=new PrismaClient();let plan;
 try {
  const failed=await db.$queryRawUnsafe('SELECT migration_name, logs FROM "_prisma_migrations" WHERE finished_at IS NULL AND rolled_back_at IS NULL');
  const [state]=await db.$queryRawUnsafe(`SELECT current_schema()::text AS schema_name, to_regclass(format('%I.%I',current_schema(),'Music_Studio_Project'))::text AS music_table, to_regclass(format('%I.%I',current_schema(),'users'))::text AS users_table`);
  plan=recoveryPlan(failed,state);console.log(JSON.stringify(plan,null,2));
 }finally{await db.$disconnect();}
 if(plan.action==='NONE')return;
 if(!process.argv.includes('--apply')){console.log('DRY RUN: no changes. Add --apply to mark this exact failed migration rolled back.');return;}
 execFileSync(process.execPath,[localRequire.resolve('prisma/build/index.js'),'migrate','resolve','--rolled-back',MIGRATION],{stdio:'inherit'});
 console.log('Recovery complete. In Render choose Manual Deploy → Deploy latest commit. Do not run a seed or migrate reset.');
}
module.exports={recoveryPlan};
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
