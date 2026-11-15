import type { Prisma } from '@prisma/client';
import {validLandingSource} from './landing-source';
// Caller holds the learner row lock used by the existing payment transaction.
// Set an untracked learner's first source, but never overwrite registration attribution.
export async function paymentLandingSource(tx:Prisma.TransactionClient,userId:number,candidate:unknown):Promise<string|null>{
 const user=await tx.user.findUniqueOrThrow({where:{id:userId},select:{landing_source:true}});
 if(user.landing_source!==null)return validLandingSource(user.landing_source);
 const source=validLandingSource(candidate);if(!source)return null;
 await tx.user.updateMany({where:{id:userId,landing_source:null},data:{landing_source:source}});
 return source;
}
