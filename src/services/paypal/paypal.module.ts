import { Module } from '@nestjs/common';
import { PaypalService } from './paypal.service';
import { PaypalClient } from './paypal.client';

@Module({
  imports: [],
  providers: [PaypalClient, PaypalService],
  exports: [PaypalClient, PaypalService],
})
export class PaypalModule {}
