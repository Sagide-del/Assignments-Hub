import { PartialType } from '@nestjs/mapped-types';
import { CreateMnemonicCardDto } from './create-mnemonic-card.dto';

export class UpdateMnemonicCardDto extends PartialType(CreateMnemonicCardDto) {}
