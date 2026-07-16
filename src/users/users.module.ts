import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersImportService } from './users-import.service';
import { UsersController } from './users.controller';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UsersImportService],
  exports: [UsersService],
})
export class UsersModule {}
