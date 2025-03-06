import { Injectable, Logger } from '@nestjs/common';
import {
  CapturedPayment,
  OAuthAuthorizationController,
  PaymentsController,
} from '@paypal/paypal-server-sdk';
import { envs } from 'src/config';
import { PaypalClient } from './paypal.client';

@Injectable()
export class PaypalService {
  private readonly logger: Logger = new Logger('PaypalService');

  constructor(private readonly paypalClient: PaypalClient) {}

  async getTokenOAuth() {
    const oAuthAuthorizationController = new OAuthAuthorizationController(
      this.paypalClient,
    );

    const auth = Buffer.from(
      `${envs.paypalClientId}:${envs.paypalSecret}`,
    ).toString('base64');

    try {
      const { result } = await oAuthAuthorizationController.requestToken({
        authorization: `Basic ${auth}`,
      });

      return result;
    } catch (error) {
      this.logger.error('getTokenOAuth Error:', error);
    }
  }

  async getPaymentDetail(captureId: string): Promise<CapturedPayment> {
    const paymentController = new PaymentsController(this.paypalClient);

    try {
      const { result } = await paymentController.capturesGet(captureId);

      return result;
    } catch (error) {
      this.logger.error('getPaymentDetail Error:', error);
      console.log(error);
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

    const { accessToken } = await this.getTokenOAuth();

    try {
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
      this.logger.error(`Webhook Error:`, error);
      return false;
    }
  }
}
