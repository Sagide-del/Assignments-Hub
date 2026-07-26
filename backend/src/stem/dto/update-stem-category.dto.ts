import { PartialType } from '@nestjs/mapped-types';
import { CreateStemCategoryDto } from './create-stem-category.dto';

export class UpdateStemCategoryDto extends PartialType(CreateStemCategoryDto) {}
