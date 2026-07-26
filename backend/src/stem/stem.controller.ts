import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CreateStemCategoryDto } from './dto/create-stem-category.dto';
import { CreateStemSubjectDto } from './dto/create-stem-subject.dto';
import { UpdateStemCategoryDto } from './dto/update-stem-category.dto';
import { UpdateStemSubjectDto } from './dto/update-stem-subject.dto';
import { StemService } from './stem.service';

@Controller('stem')
export class StemController {
  constructor(private readonly stemService: StemService) {}

  @Get('categories')
  findCategories() {
    return this.stemService.findCategories();
  }

  @Post('categories')
  @Roles(Role.PLATFORM_ADMIN)
  createCategory(@Body() dto: CreateStemCategoryDto) {
    return this.stemService.createCategory(dto);
  }

  @Patch('categories/:id')
  @Roles(Role.PLATFORM_ADMIN)
  updateCategory(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStemCategoryDto) {
    return this.stemService.updateCategory(id, dto);
  }

  @Get('subjects')
  findSubjects() {
    return this.stemService.findSubjects();
  }

  @Post('subjects')
  @Roles(Role.PLATFORM_ADMIN)
  createSubject(@Body() dto: CreateStemSubjectDto) {
    return this.stemService.createSubject(dto);
  }

  @Patch('subjects/:id')
  @Roles(Role.PLATFORM_ADMIN)
  updateSubject(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStemSubjectDto) {
    return this.stemService.updateSubject(id, dto);
  }
}
