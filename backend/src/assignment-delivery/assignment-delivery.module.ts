import { Module } from '@nestjs/common';
import { AssignmentDeliveryService } from './assignment-delivery.service';

@Module({
  providers: [AssignmentDeliveryService],
  exports: [AssignmentDeliveryService],
})
export class AssignmentDeliveryModule {}
