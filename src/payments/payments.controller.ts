import { Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentSessionDto } from './dto/payment-session.dto';
import { Request, Response } from 'express';
import { MessagePattern } from '@nestjs/microservices';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-payment-session')
  @MessagePattern('create.payment.session')
  createPaymentSession(@Body() paymentSessionDto: PaymentSessionDto) {
    return this.paymentsService.createPaymentSession(paymentSessionDto);
  }

  @Get('success')
  success(@Query('token') token: string) {
    return this.paymentsService.success(token);
  }
  @Get('cancel')
  cancel() {
    return this.paymentsService.cancel();
  }

  @Post('webhook')
  async paypalWebhook(@Req() req: Request, @Res() res: Response) {
    return this.paymentsService.paypalWebhook(req, res);
  }
}
