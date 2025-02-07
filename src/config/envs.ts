import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
  PORT: number;
  PAYPAL_CLIENT_ID: string;
  PAYPAL_SECRET: string;
  PAYPAL_SUCCESS_URL: string;
  PAYPAL_CANCEL_URL: string;
  PAYPAL_WEBHOOK_ID: string;
  PAYPAL_API_URL: string;
  PAYPAL_API_VERIFY_WEBHOOK_SIGNATURE: string;
  // DATABASE_URL: string;

  // NATS_SERVERS: string[];
}

const envsSchema = joi
  .object({
    PORT: joi.number().required(),
    PAYPAL_CLIENT_ID: joi.string().required(),
    PAYPAL_SECRET: joi.string().required(),
    PAYPAL_SUCCESS_URL: joi.string().required(),
    PAYPAL_CANCEL_URL: joi.string().required(),
    PAYPAL_WEBHOOK_ID: joi.string().required(),
    PAYPAL_API_URL: joi.string().required(),
    PAYPAL_API_VERIFY_WEBHOOK_SIGNATURE: joi.string().required(),
    // DATABASE_URL: joi.string().required(),

    // NATS_SERVERS: joi.array().items(joi.string()).required(),
  })
  .unknown(true);

const { error, value } = envsSchema.validate({
  ...process.env,
  // NATS_SERVERS: process.env.NATS_SERVERS?.split(','),
});

if (error) throw new Error(`Config validation error: ${error.message}`);

const envVars: EnvVars = value;

export const envs = {
  port: envVars.PORT,
  paypalClientId: envVars.PAYPAL_CLIENT_ID,
  paypalSecret: envVars.PAYPAL_SECRET,
  paypalSuccessUrl: envVars.PAYPAL_SUCCESS_URL,
  paypalCancelUrl: envVars.PAYPAL_CANCEL_URL,
  paypalWebhookId: envVars.PAYPAL_WEBHOOK_ID,
  paypalApiUrl: envVars.PAYPAL_API_URL,
  paypalApiVerifyWebhookSignature: envVars.PAYPAL_API_VERIFY_WEBHOOK_SIGNATURE,
  // databaseUrl: envVars.DATABASE_URL,

  // natsServers: envVars.NATS_SERVERS,
};
