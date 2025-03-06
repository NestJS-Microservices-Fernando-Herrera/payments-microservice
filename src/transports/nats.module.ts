import { DynamicModule, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { NATS_SERVICE, envs } from 'src/config';

const clientsModule: DynamicModule[] = [
  ClientsModule.register([
    {
      name: NATS_SERVICE,
      transport: Transport.NATS,
      options: {
        servers: envs.natsServers,
      },
    },
  ]),
];

@Module({
  imports: clientsModule,
  exports: clientsModule,
})
export class NatsModule {}
