import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CreateLabMediaDto } from './create-lab-media.dto';

export class CreateLabMediaBatchDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLabMediaDto)
  media: CreateLabMediaDto[];
}
