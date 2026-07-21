import { Controller, Get } from '@nestjs/common';
import { StemService } from './stem.service';

@Controller('stem')
export class StemController {
  constructor(private readonly stemService: StemService) {}

  @Get('categories')
  findCategories() {
    return this.stemService.findCategories();
  }

  @Get('subjects')
  findSubjects() {
    return this.stemService.findSubjects();
  }
}
