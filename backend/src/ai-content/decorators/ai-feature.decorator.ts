import { SetMetadata } from "@nestjs/common";
import { AiFeature } from "@prisma/client";

export const AI_FEATURE_KEY = "ai-feature";

export const RequiresAiFeature = (feature: AiFeature) =>
  SetMetadata(AI_FEATURE_KEY, feature);
