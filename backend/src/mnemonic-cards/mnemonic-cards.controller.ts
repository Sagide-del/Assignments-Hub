import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AuditAction } from '../common/decorators/audit.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CreateMnemonicCardDto } from './dto/create-mnemonic-card.dto';
import { UpdateMnemonicCardDto } from './dto/update-mnemonic-card.dto';
import { MnemonicCardsService } from './mnemonic-cards.service';

@Controller('mnemonic-cards')
export class MnemonicCardsController {
  constructor(private readonly mnemonicCardsService: MnemonicCardsService) {}

  @Get()
  @Roles(Role.STUDENT, Role.PLATFORM_ADMIN)
  findAll(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('subject') subject?: string,
    @Query('topic') topic?: string,
  ) {
    return this.mnemonicCardsService.findAll(actor, { subject, topic });
  }

  @Get('admin/summary')
  @Roles(Role.PLATFORM_ADMIN)
  summary() {
    return this.mnemonicCardsService.getSummary();
  }

  @Post()
  @Roles(Role.PLATFORM_ADMIN)
  @AuditAction('mnemonic_card.create')
  create(@Body() dto: CreateMnemonicCardDto) {
    return this.mnemonicCardsService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.PLATFORM_ADMIN)
  @AuditAction('mnemonic_card.update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMnemonicCardDto,
  ) {
    return this.mnemonicCardsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.PLATFORM_ADMIN)
  @AuditAction('mnemonic_card.delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.mnemonicCardsService.remove(id);
  }
}
