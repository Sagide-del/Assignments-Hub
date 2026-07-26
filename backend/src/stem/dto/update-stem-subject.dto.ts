import { PartialType } from '@nestjs/mapped-types';
import { CreateStemSubjectDto } from './create-stem-subject.dto';

export class UpdateStemSubjectDto extends PartialType(CreateStemSubjectDto) {}
