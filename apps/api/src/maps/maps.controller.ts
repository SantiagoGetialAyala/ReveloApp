import { BadRequestException, Controller, Get, ParseFloatPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import colombia from '../catalog/colombia.json';
import { MapsService } from './maps.service';

@ApiTags('maps')
@Controller('maps')
export class MapsController {
  constructor(private readonly maps: MapsService) {}

  @Get('municipalities')
  municipalities() {
    return colombia;
  }

  @Get('route')
  route(
    @Query('originLat') originLat: string,
    @Query('originLng') originLng: string,
    @Query('destinationLat') destinationLat: string,
    @Query('destinationLng') destinationLng: string,
  ) {
    return this.maps.route(
      { lat: Number(originLat), lng: Number(originLng) },
      { lat: Number(destinationLat), lng: Number(destinationLng) },
    );
  }

  @Get('reverse')
  reverse(@Query('lat', ParseFloatPipe) lat: number, @Query('lng', ParseFloatPipe) lng: number) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)
      throw new BadRequestException('Las coordenadas no son válidas.');
    return this.maps.reverse({ lat, lng });
  }

  @Get('geocode')
  geocode(@Query('q') query: string) {
    return this.maps.geocode(query ?? '');
  }
}
