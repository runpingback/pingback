import {
  DynamicModule,
  Logger,
  Module,
  OnModuleInit,
  Inject,
} from '@nestjs/common';
import { DiscoveryModule, DiscoveryService } from '@nestjs/core';
import { PINGBACK_FUNCTION_METADATA, PingbackFunctionMetadata } from './decorators';
import {
  PingbackController,
  PingbackModuleOptions,
  PINGBACK_OPTIONS,
  PINGBACK_REGISTRY,
} from './pingback.controller';

@Module({})
export class PingbackModule implements OnModuleInit {
  private readonly logger = new Logger(PingbackModule.name);

  constructor(
    @Inject(PINGBACK_OPTIONS) private options: PingbackModuleOptions,
    @Inject(PINGBACK_REGISTRY)
    private registry: Map<
      string,
      { instance: any; methodName: string; metadata: PingbackFunctionMetadata }
    >,
    private discovery: DiscoveryService,
  ) {}

  static register(options: PingbackModuleOptions): DynamicModule {
    const registry = new Map<
      string,
      { instance: any; methodName: string; metadata: PingbackFunctionMetadata }
    >();

    return {
      module: PingbackModule,
      imports: [DiscoveryModule],
      controllers: [PingbackController],
      providers: [
        { provide: PINGBACK_OPTIONS, useValue: options },
        { provide: PINGBACK_REGISTRY, useValue: registry },
      ],
      exports: [PINGBACK_OPTIONS, PINGBACK_REGISTRY],
      global: true,
    };
  }

  async onModuleInit() {
    this.scanProviders();
    await this.registerWithPlatform();
  }

  private scanProviders() {
    const providers = this.discovery.getProviders();

    for (const wrapper of providers) {
      const instance = wrapper.instance;
      if (!instance || typeof instance !== 'object') continue;

      let proto: any;
      try {
        proto = Object.getPrototypeOf(instance);
      } catch {
        continue;
      }
      if (!proto || proto === Object.prototype) continue;

      let methodNames: string[];
      try {
        methodNames = Object.getOwnPropertyNames(proto).filter((name) => {
          if (name === 'constructor') return false;
          try {
            return typeof proto[name] === 'function';
          } catch {
            return false;
          }
        });
      } catch {
        continue;
      }

      for (const methodName of methodNames) {
        const meta: PingbackFunctionMetadata | undefined =
          Reflect.getMetadata(PINGBACK_FUNCTION_METADATA, proto, methodName);

        if (meta) {
          this.registry.set(meta.name, { instance, methodName, metadata: meta });
          this.logger.log(`Registered ${meta.type}: ${meta.name}`);
        }
      }
    }

    if (this.registry.size === 0) {
      this.logger.warn('No @Cron or @Task functions found');
    }
  }

  private async registerWithPlatform() {
    if (this.registry.size === 0) return;

    const platformUrl = this.options.platformUrl || 'https://api.pingback.lol';
    const baseUrl = this.options.baseUrl;
    const routePath = this.options.routePath || '/api/pingback';

    if (!baseUrl) {
      this.logger.warn(
        'baseUrl not set — skipping registration. Set baseUrl in PingbackModule.register() or functions will register on first request.',
      );
      return;
    }

    const endpointUrl = `${baseUrl}${routePath}`;
    const functions = Array.from(this.registry.values()).map((entry) => ({
      name: entry.metadata.name,
      type: entry.metadata.type,
      schedule: entry.metadata.schedule,
      options: entry.metadata.options,
    }));

    try {
      const response = await fetch(`${platformUrl}/api/v1/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.options.apiKey}`,
        },
        body: JSON.stringify({ functions, endpoint_url: endpointUrl }),
      });

      if (response.ok) {
        this.logger.log(
          `Registered ${functions.length} function(s) with Pingback`,
        );
      } else {
        const text = await response.text();
        this.logger.error(`Registration failed (${response.status}): ${text}`);
      }
    } catch (err) {
      this.logger.error(
        `Registration error: ${(err as Error).message}`,
      );
    }
  }
}
