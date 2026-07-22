import { PartialType } from '@nestjs/mapped-types';
import { CreateSkillCategoryDto } from './create-skill-category.dto';
import { CreateSkillProviderDto } from './create-skill-provider.dto';
import { CreateSkillCourseDto } from './create-skill-course.dto';

export class UpdateSkillCategoryDto extends PartialType(CreateSkillCategoryDto) {}
export class UpdateSkillProviderDto extends PartialType(CreateSkillProviderDto) {}
export class UpdateSkillCourseDto extends PartialType(CreateSkillCourseDto) {}
