import { Body, Controller, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto';
import { ProfilesService } from './profiles.service';

@ApiTags('profiles')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Patch('me')
  update(@CurrentUser() user: { sub: string; role: string }, @Body() dto: UpdateProfileDto) {
    return this.profiles.update(user.sub, user.role, dto);
  }
}
