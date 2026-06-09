import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AdminResetPasswordDto } from './dto/admin-reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async adminResetPassword(targetUserId: string, dto: AdminResetPasswordDto) {
    // WHY: Confirm the target exists so the Admin gets a clear 404 instead of a silent no-op.
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${targetUserId} not found`);
    }

    // WHY: Never store raw passwords — bcrypt (cost 10) salts and hashes so a DB leak does not
    // expose credentials. We also null the refresh token hash: a forced reset is typically used on
    // a lost/compromised account, so every existing session of that user must be invalidated.
    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        passwordHash,
        hashedRefreshToken: null,
      },
    });

    return { message: 'Password reset successfully.' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    // WHY: userId comes from the verified JWT, never from the body, so a caller can only ever
    // change their OWN password — there is no user-supplied id to tamper with.
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new UnauthorizedException('Access Denied');
    }

    // WHY: Re-authenticate via the old password. This is the anti-session-hijacking gate: a stolen
    // access token alone is not enough to rotate the password. A mismatch is a 401.
    const oldPasswordMatches = await bcrypt.compare(dto.oldPassword, user.passwordHash);
    if (!oldPasswordMatches) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // WHY: Reject no-op changes so a "new" password is genuinely a rotation, not the same value.
    const sameAsOld = await bcrypt.compare(dto.newPassword, user.passwordHash);
    if (sameAsOld) {
      throw new BadRequestException('New password must be different from the current one');
    }

    // WHY: Hash with the shared cost factor and invalidate other sessions (null refresh hash) so a
    // credential change forces re-authentication everywhere — closing any hijacked session.
    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        hashedRefreshToken: null,
      },
    });

    return { message: 'Password changed successfully. Please log in again.' };
  }
}
