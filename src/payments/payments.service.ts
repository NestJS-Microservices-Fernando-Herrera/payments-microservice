import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  CheckoutPaymentIntent,
  Client,
  Item,
  OAuthAuthorizationController,
  OrderApplicationContextLandingPage,
  OrderApplicationContextUserAction,
  OrdersController,
} from '@paypal/paypal-server-sdk';
import { envs, NATS_SERVICE } from 'src/config';
import { PaymentSessionDto } from './dto/payment-session.dto';
import { Request, Response } from 'express';
import { ClientProxy } from '@nestjs/microservices';
import { PaypalClient } from 'src/services/paypal/paypal.client';
import { PaypalService } from 'src/services/paypal/paypal.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger('PaymentService');

  constructor(
    @Inject(NATS_SERVICE) private readonly client: ClientProxy,
    private readonly paypalClient: PaypalClient,
    private readonly paypalService: PaypalService,
  ) {}

  async createPaymentSession(paymentSessionDto: PaymentSessionDto) {
    const { currency, items, orderId } = paymentSessionDto;
    let valueTotalAmount: number = 0;

    const orderItems: Item[] = items.map((item): Item => {
      const valueUnitAmount: number = Math.round(item.price * 100) / 100;
      valueTotalAmount += valueUnitAmount * item.quantity;

      return {
        name: item.name,
        quantity: `${item.quantity}`,
        unitAmount: {
          currencyCode: currency,
          value: `${valueUnitAmount}`,
        },
      };
    });

    // return orderItems

    const ordersController = new OrdersController(this.paypalClient);
    try {
      const response = await ordersController.ordersCreate({
        body: {
          intent: CheckoutPaymentIntent.Capture,
          purchaseUnits: [
            {
              items: orderItems,
              amount: {
                currencyCode: currency,
                value: `${valueTotalAmount}`,
                breakdown: {
                  itemTotal: {
                    currencyCode: currency,
                    value: `${valueTotalAmount}`,
                  },
                },
              },
              customId: orderId,
            },
          ],

          applicationContext: {
            brandName: 'Mi Tienda',
            landingPage: OrderApplicationContextLandingPage.NoPreference,
            userAction: OrderApplicationContextUserAction.PayNow,
            returnUrl: envs.paypalSuccessUrl,
            cancelUrl: envs.paypalCancelUrl,
          },
        },
      });

      // return response.result.links;

      return {
        cancelUrl: envs.paypalCancelUrl,
        successUrl: envs.paypalSuccessUrl,
        url: response.result.links.find((link) => link.rel === 'approve').href,
      };
    } catch (error) {
      console.error(error);
    }
  }

  async success(token: string) {
    const ordersController = new OrdersController(this.paypalClient);
    const response = await ordersController.ordersCapture({
      id: token,
    });

    // console.log('Success Result', response.result);

    // return response.result;
    return {
      ok: true,
      message: 'Payment successful',
    };
  }
  cancel() {
    return {
      ok: false,
      message: 'Payment cancelled',
    };
  }

  async paypalWebhook(req: Request, res: Response) {
    const { headers, body: event } = req;
    const sig = headers['paypal-transmission-sig'];

    try {
      const isValid = await this.paypalService.verifySignature(event, headers);

      if (!isValid) return res.status(400).send('Invalid Signature');

      switch (event.event_type) {
        case 'PAYMENT.CAPTURE.COMPLETED':
          const chargeSucceeded = event;

          const paymentData = await this.paypalService.getPaymentDetail(
            chargeSucceeded.resource.id,
          );

          const payload = {
            paypalPaymentId: chargeSucceeded.id,
            orderId: chargeSucceeded.resource.custom_id,
            receiptUrl: null,
            receiptData: paymentData,
          };

          this.client.emit('payment.succeeded', payload);

          // PAYPAL No cuenta con un campo customizado para METADATA
          // console.log({ customId: chargeSucceeded.resource.custom_id });
          break;
        default:
          console.log(`Event ${event.event_type} not handled`);
      }

      return res.status(200).json({ sig });
    } catch (error) {
      return res.status(500).send(`Webhook Error: ${error.message}`);
    }
  }
}
