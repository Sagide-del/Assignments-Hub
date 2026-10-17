import { SetMetadata } from '@nestjs/common';

export const ALLOW_INDEPENDENT_TRIAL_KEY = 'allowIndependentTrial';

/** Marks the very small set of endpoints available in a learner's trial. */
export const AllowIndependentTrial = () => SetMetadata(ALLOW_INDEPENDENT_TRIAL_KEY, true);
