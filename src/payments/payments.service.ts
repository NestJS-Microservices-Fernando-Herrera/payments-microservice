import { Injectable } from '@nestjs/common';
import {
  CheckoutPaymentIntent,
  Client,
  Item,
  OAuthAuthorizationController,
  OrderApplicationContextLandingPage,
  OrderApplicationContextUserAction,
  OrdersController,
  PaypalPaymentTokenUsageType,
} from '@paypal/paypal-server-sdk';
import { envs } from 'src/config';
import { PaymentSessionDto } from './dto/payment-session.dto';
import { Request, Response } from 'express';

@Injectable()
export class PaymentsService {
  private readonly paypalClient = new Client({
    clientCredentialsAuthCredentials: {
      oAuthClientId: envs.paypalClientId,
      oAuthClientSecret: envs.paypalSecret,
    },
  });

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

      return response.result;
    } catch (error) {
      console.error(error);
    }
  }

  async success(token: string) {
    const ordersController = new OrdersController(this.paypalClient);
    const response = await ordersController.ordersCapture({
      id: token,
    });

    console.log('Success Result', response.result);

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
      const isValid = await this.verifySignature(event, headers);

      if (!isValid) return res.status(400).send('Invalid Signature');

      switch (event.event_type) {
        case 'PAYMENT.CAPTURE.COMPLETED':
          const chargeSucceeded = event;
          // PAYPAL No cuenta con un campo customizado para METADATA
          console.log({ customId: chargeSucceeded.resource.custom_id });
          break;
        default:
          console.log(`Event ${event.event_type} not handled`);
      }

      return res.status(200).json({ sig });
    } catch (error) {
      return res.status(500).send(`Webhook Error: ${error.message}`);
    }
  }

  async verifySignature(event, headers) {
    this.paypalClient.getRequestBuilderFactory();
    const transmissionId = headers['paypal-transmission-id'];
    const sig = headers['paypal-transmission-sig'];
    const timeStamp = headers['paypal-transmission-time'];
    const certUrl = headers['paypal-cert-url'];
    const authAlgo = headers['paypal-auth-algo'];

    const body = {
      auth_algo: authAlgo,
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: sig,
      transmission_time: timeStamp,
      webhook_id: envs.paypalWebhookId,
      webhook_event: event,
    };

    const oAuthAuthorizationController = new OAuthAuthorizationController(
      this.paypalClient,
    );

    const auth = Buffer.from(
      `${envs.paypalClientId}:${envs.paypalSecret}`,
    ).toString('base64');

    try {
      const {
        result: { accessToken },
      } = await oAuthAuthorizationController.requestToken({
        authorization: `Basic ${auth}`,
      });

      const response = await fetch(
        `${envs.paypalApiUrl}${envs.paypalApiVerifyWebhookSignature}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(body),
        },
      );

      const data = await response.json();
      return data.verification_status === 'SUCCESS';
    } catch (error) {
      console.error(`Webhook Error:`, error);
      return false;
    }
  }
}
