import { Module } from '@nestjs/common';
import { MnemonicCardsController } from './mnemonic-cards.controller';
import { MnemonicCardsService } from './mnemonic-cards.service';

@Module({
  controllers: [MnemonicCardsController],
  providers: [MnemonicCardsService],
})
export class MnemonicCardsModule {}
