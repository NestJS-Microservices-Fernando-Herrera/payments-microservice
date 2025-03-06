import { Injectable } from '@nestjs/common';
import { Client } from '@paypal/paypal-server-sdk';
import { envs } from 'src/config';

// export class PaypalClient  {
//   private readonly paypalClient: Client;

//   constructor() {
//     this.paypalClient = new Client({
//       clientCredentialsAuthCredentials: {
//         oAuthClientId: envs.paypalClientId,
//         oAuthClientSecret: envs.paypalSecret,
//       },
//     });
//   }

//   valueOf(): Client {
//     return this.paypalClient;
//   }
// }

@Injectable()
export class PaypalClient extends Client {
  constructor() {
    super({
      clientCredentialsAuthCredentials: {
        oAuthClientId: envs.paypalClientId,
        oAuthClientSecret: envs.paypalSecret,
      },
    });
  }
}
