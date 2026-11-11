import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? 'dev-secret',
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    const account = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { status: true, role: true },
    });
    if (!account || (account.role !== 'ADMIN' && account.status !== 'ACTIVE')) {
      throw new ForbiddenException('Esta cuenta todavía no está habilitada.');
    }
    return { ...payload, status: account.status };
  }
}
