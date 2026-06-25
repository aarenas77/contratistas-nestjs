import { Controller, Get, NotFoundException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AvatarsService } from './avatars.service';
import { Public } from '../../auth/decorators/public.decorator';

@ApiTags('Avatars')
@Controller('avatars')
export class AvatarsController {
  constructor(private readonly service: AvatarsService) {}

  @Get('random')
  @Public()
  @ApiOperation({
    summary: 'Devuelve la URL de una imagen de perfil aleatoria',
    description:
      'Endpoint público. Elige aleatoriamente una imagen del pool de avatares ' +
      'y devuelve su URL absoluta. Pensado para asignar una foto al iniciar sesión.',
  })
  random(): { url: string } {
    const avatar = this.service.getRandom();
    if (!avatar) {
      throw new NotFoundException('No hay imágenes de avatar disponibles');
    }
    return avatar;
  }
}
