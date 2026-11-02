import { Module } from '@nestjs/common';
import { UploadsModule } from '../uploads/uploads.module';
import { SbaEvidenceController } from './sba-evidence.controller';
import { SbaEvidenceService } from './sba-evidence.service';

@Module({ imports: [UploadsModule], controllers: [SbaEvidenceController], providers: [SbaEvidenceService] })
export class SbaEvidenceModule {}
