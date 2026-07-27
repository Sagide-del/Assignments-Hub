import { Module } from '@nestjs/common';
import { IndependentStudentsController } from './independent-students.controller';
import { IndependentStudentsService } from './independent-students.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [IndependentStudentsController],
  providers: [IndependentStudentsService],
})
export class IndependentStudentsModule {}
